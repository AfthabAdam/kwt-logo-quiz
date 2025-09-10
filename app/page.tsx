"use client";
import React, { useEffect, useRef, useState } from "react";

/** Set this to your Google Sheet CSV (File → Share → Publish to web → CSV) */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT3zOAarfvLQ4MKqV3R_om5nh_TRqhrsOUGkTHoPBOqLNoM8kieHFQa9grZzs3LLbgwPHIzPwU-FbrV/pub?output=csv";

/* -------------------------- Helpers -------------------------- */

type Level = "Easy" | "Medium" | "Hard";
type LogoRow = { id: string; level: Level; image: string; answers: string[]; hint: string };

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  let out = (s || "").toString().toLowerCase();
  out = out
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/\bco(mpany)?\b/g, " company")
    .replace(/\bltd\b|\blimited\b/g, "")
    .replace(/\binc(orporated)?\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  out = out.replace(/[^\p{L}\p{N}\s]/gu, "");
  return out;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/** Makes image paths safe (adds leading slash, encodes spaces, fixes backslashes & /public) */
function safeSrc(src: string) {
  if (!src) return "";
  let s = src.trim();
  s = s.replace(/\\/g, "/");
  if (s.toLowerCase().startsWith("public/")) s = s.slice(6);
  if (!/^https?:\/\//i.test(s) && !s.startsWith("/")) s = "/" + s;
  s = s.replace(/ /g, "%20");
  s = s.replace(/([^:]\/)\/+/g, "$1");
  return s;
}

function levelOutline(lvl: Level) {
  if (lvl === "Easy") return "bg-gradient-to-r from-green-400 to-green-600";
  if (lvl === "Medium") return "bg-gradient-to-r from-yellow-400 to-yellow-600";
  return "bg-gradient-to-r from-red-400 to-red-600";
}

/** Tiny CSV parser: id,level,image,answers,hint */
function parseCSV(text: string): LogoRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",").map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  return rows
    .map((line) => {
      const cells = line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.replace(/^"(.*)"$/, "$1").trim());
      const get = (name: string) => cells[idx(name)] ?? "";
      return {
        id: get("id"),
        level: get("level") as Level,
        image: get("image"),
        answers: (get("answers") || "").split("|").map((a) => a.trim()).filter(Boolean),
        hint: get("hint"),
      } as LogoRow;
    })
    .filter((r) => r.id && r.level && r.image);
}

function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
function sampleUnique<T extends { id: string }>(pool: T[], count: number) {
  const unique = uniqueById(pool);
  return shuffle(unique).slice(0, Math.min(count, unique.length));
}
function buildDeck(level: Level, all: LogoRow[]) {
  const easy = all.filter((r) => r.level === "Easy");
  const med = all.filter((r) => r.level === "Medium");
  const hard = all.filter((r) => r.level === "Hard");
  if (level === "Easy") return sampleUnique(easy, 12);
  if (level === "Medium") return sampleUnique([...easy, ...med], 24);
  return sampleUnique([...easy, ...med, ...hard], 48); // Hard
}

/* -------------------------- Component -------------------------- */

export default function KWTLogoQuiz() {
  const [view, setView] = useState<"home" | "game" | "completed">("home");
  const [level, setLevel] = useState<Level | null>(null);
  const [allLogos, setAllLogos] = useState<LogoRow[]>([]);
  const [deck, setDeck] = useState<(LogoRow & { value: string; correct: boolean; showHint: boolean })[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [toast, setToast] = useState("");

  // NEW: reveal allowance
  const [revealsLeft, setRevealsLeft] = useState(2);

  const solvedCount = deck.filter((d) => d.correct && !d.revealed).length;
  const total = deck.length;
  const running = view === "game";
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Load Google Sheet
  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then((r) => r.text())
      .then((text) => {
        const rows = parseCSV(text);
        setAllLogos(rows);
      })
      .catch(() => setAllLogos([]));
  }, []);

  // Timer
  // ✅ fixed
useEffect(() => {
  let id: ReturnType<typeof setInterval> | undefined;
  if (running) {
    id = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  return () => {
    if (id) clearInterval(id);
  };
}, [running]);


  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1400);
    return () => clearTimeout(id);
  }, [toast]);

// Finish when all cards are correct (revealed or user-solved)
useEffect(() => {
  if (view !== "game" || total === 0) return;
  const allCorrect = deck.every((c) => c.correct);
  if (allCorrect) {
    setFinalTime(elapsed);
    setView("completed");
  }
}, [deck, total, view, elapsed]);

  const startLevel = (lvl: Level) => {
    const base = buildDeck(lvl, allLogos);
    if (!base.length) {
      setToast("No logos for this level yet. Check your sheet.");
      return;
    }
    const items = base.map((item) => ({ ...item, value: "", correct: false, showHint: false, revealed: false, }));
    setLevel(lvl);
    setDeck(items);
    setElapsed(0);
    setFinalTime(0);
    setRevealsLeft(2); // reset reveal allowance each game
    setView("game");
  };

  const checkAnswer = (card: LogoRow, typed: string) =>
    (card.answers || []).some((a) => normalize(a) === normalize(typed));

  const updateCardValue = (i: number, val: string) => {
    setDeck((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], value: val };
      return next;
    });
  };

  const submitCard = (i: number) => {
    setDeck((prev) => {
      const next = [...prev];
      const card = next[i];
      if (card.correct) return prev;
      if (checkAnswer(card, card.value)) {
        next[i] = { ...card, correct: true, showHint: false };
        queueMicrotask(() => {
          const later = next.findIndex((c, j) => !c.correct && j > i);
          const first = next.findIndex((c) => !c.correct);
          const target = later !== -1 ? later : first;
          if (target !== -1 && inputRefs.current[target]) {
            inputRefs.current[target]?.focus();
            inputRefs.current[target]?.select?.();
          }
        });
      }
      return next;
    });
  };

  /** Share (used for score + for reveal reward) */
  const onShare = async () => {
    const text = `🏆 I solved ${solvedCount} Kuwaiti logos on ${level} in just ${formatTime(
  finalTime || elapsed
)}.
Think you can beat me? ⏱️
👉 Play now: ${window.location.href}`;

    if (navigator.share) {
      await navigator.share({ text, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
      setToast("Copied result to clipboard!");
    } else {
      setToast("Sharing not supported. Copy manually.");
    }
  };

  /** Rewarded share: grants +2 reveals */
  const shareForReveals = async () => {
    await onShare();
    setRevealsLeft((n) => n + 2);
    setToast("+2 reveals unlocked!");
  };

  /** Reveal one: auto-solve one unsolved card */
  const revealOne = () => {
  if (revealsLeft <= 0) return;

  setDeck((prev) => {
    const next = [...prev];

    // pick the FIRST unsolved card (visually left-to-right, top-to-bottom)
    const pick = next.findIndex((c) => !c.correct);
    if (pick === -1) return prev;

    const card = next[pick];

    // use first alias as the revealed answer
    const answer = (card.answers[0] || "").trim();
    next[pick] = { ...card, value: answer, correct: true, showHint: false, revealed: true, };

    // focus to the next remaining unsolved
    queueMicrotask(() => {
      const later = next.findIndex((c, j) => !c.correct && j > pick);
      const first = next.findIndex((c) => !c.correct);
      const target = later !== -1 ? later : first;
      if (target !== -1 && inputRefs.current[target]) {
        inputRefs.current[target]?.focus();
        inputRefs.current[target]?.select?.();
      }
    });

    return next;
  });

  setRevealsLeft((n) => n - 1);
};


  /* Header with logo sizes per view */
  const Header = () => (
    <header className="max-w-2xl mx-auto text-center py-6">
      <div className="flex items-center justify-center">
        <img
          src={safeSrc("/brand/kwt-logo-quiz.svg")}
          alt="KWT Logo Quiz"
          className={view === "home" ? "h-40 sm:h-80 w-auto" : "h-10 sm:h-12 w-auto"}
        />
      </div>
      {view === "home" && (
        <p className="text-[14px] sm:text-[18px] lg:text-[24px] text-gray-500 mt-[6px]">
          Guess the Kuwaiti brands by their logos
        </p>
      )}
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      {/* HOME */}
      {view === "home" && (
        <div className="max-w-xl mx-auto px-4 pb-16">
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Choose Level</h2>
              <div className="text-xs text-gray-500">
                {allLogos.length ? `Loaded ${allLogos.length} logos` : "Loading logos…"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["Easy", "Medium", "Hard"] as Level[]).map((lvl) => {
  const outline = levelOutline(lvl);

  return (
    <button
      key={lvl}
      onClick={() => startLevel(lvl)}
      disabled={!allLogos.length}
      className={
        "rounded-2xl p-1 transition " +
        outline +
        (allLogos.length ? " hover:opacity-95" : " opacity-60 cursor-not-allowed")
      }
    >
      {/* Inner white card */}
      <span className="block rounded-xl bg-white p-6 text-center">
        <div className="text-lg font-bold">{lvl}</div>
        <div className="text-sm text-gray-600">
          {lvl === "Easy" ? 12 : lvl === "Medium" ? 24 : 48} logos
        </div>
        <div className="mt-2 text-xs text-gray-400">Tap to start →</div>
      </span>
    </button>
  );
})}

            </div>
          </div>
        </div>
      )}

      {/* GAME */}
      {view === "game" && (
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm">
              <span className="font-semibold">Level:</span> {level}
            </div>
            <div className="text-sm text-gray-500">
              Solved: <span className="font-semibold">{solvedCount}</span> / {total}
            </div>
            <div className="text-sm font-mono bg-white px-3 py-1 rounded-full border border-gray-200">
              {formatTime(elapsed)}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">All logos</div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                {/* Reveal one */}
                <button
                  onClick={revealOne}
                  disabled={revealsLeft <= 0 || solvedCount === total}
                  className={`px-2 py-1 rounded-lg ${
                    revealsLeft > 0 && solvedCount !== total
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title={revealsLeft > 0 ? "Reveal a correct answer" : "No reveals left"}
                >
                  Reveal one ({Math.max(revealsLeft, 0)} left)
                </button>

                {/* Share to get 2 more reveals */}
                {revealsLeft <= 0 && solvedCount !== total && (
                  <button
                    onClick={shareForReveals}
                    className="px-2 py-1 rounded-lg bg-gray-900 text-white hover:opacity-90"
                    title="Share to unlock +2 reveals"
                  >
                    Share to get +2
                  </button>
                )}

                {/* Old hint button */}
                <button
                  onClick={() =>
                    setDeck((prev) => {
                      const next = [...prev];
                      const idx = next.findIndex((c) => !c.correct && !c.showHint);
                      if (idx !== -1) next[idx] = { ...next[idx], showHint: true };
                      else {
                        const any = next.findIndex((c) => !c.correct);
                        if (any !== -1) next[any] = { ...next[any], showHint: !next[any].showHint };
                      }
                      return next;
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Show a hint
                </button>
              </div>
            </div>

            {/* Grid of logo cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {deck.map((card, i) => (
                <div
                  key={card.id + i}
                  className={`rounded-2xl border p-3 bg-white relative overflow-hidden ${
                    card.correct ? "opacity-85" : ""
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-square w-full rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                    <img
                      src={safeSrc(card.image)}
                      alt={card.id}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = safeSrc("/file.svg");
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.6";
                        (e.currentTarget as HTMLImageElement).title = `Missing: ${card.image}`;
                      }}
                    />
                  </div>

                  {/* Input (auto-solve) */}
                  <input
                    ref={(el) => (inputRefs.current[i] = el)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={card.correct}
                    value={card.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCardValue(i, val);
                      if (checkAnswer(card, val)) submitCard(i);
                    }}
                    placeholder={card.correct ? "Correct ✅" : "Type brand name…"}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      card.correct
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    }`}
                  />

                  {/* Hint */}
                  {card.showHint && !card.correct && (
                    <div className="mt-2 text-[11px] text-gray-500">Hint: {card.hint}</div>
                  )}

                  {/* Solved badge */}
                  {card.correct && (
  card.revealed ? (
    <div className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
      Revealed
    </div>
  ) : (
    <div className="absolute top-2 right-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
      Solved
    </div>
  )
)}
                </div>
              ))}
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => setView("home")} className="text-sm text-gray-500 hover:underline">
              ← Back to Home
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED */}
      {view === "completed" && (
        <div className="max-w-xl mx-auto px-4 pb-16">
          <div className="bg-white rounded-2xl shadow p-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold">All done!</h2>
            <div className="text-sm text-gray-600">
  Score: <span className="font-semibold">{solvedCount}</span>
</div>
            <div className="text-sm text-gray-600">
              Time: <span className="font-mono bg-gray-100 rounded px-2 py-1">{formatTime(finalTime)}</span>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={() => onShare()} className="rounded-xl px-4 py-3 bg-gray-900 text-white font-medium hover:opacity-90">
                Challenge your friends
              </button>
              <button onClick={() => setView("home")} className="rounded-xl px-4 py-3 bg-gray-100 font-medium hover:bg-gray-200">
                Play again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
