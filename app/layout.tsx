import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "KWT Logo Quiz – Guess Kuwaiti Brands",
  description: "Test your knowledge of Kuwaiti brands by guessing their logos! Challenge your friends and share your score.",
  keywords: ["Kuwait", "Logo Quiz", "Brands", "Game", "KWT", "Quiz Game"],
  openGraph: {
    title: "KWT Logo Quiz – Guess Kuwaiti Brands",
    description: "Can you guess all the Kuwaiti brands by their logos? Play now!",
    url: "https://kwtlogoquiz.com",
    siteName: "KWT Logo Quiz",
    images: [
      {
        url: "/brand/kwt-logo-quiz-og.png", // add this file in public/brand
        width: 1200,
        height: 630,
        alt: "KWT Logo Quiz",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KWT Logo Quiz",
    description: "Guess Kuwaiti brands by their logos!",
    images: ["/brand/kwt-logo-quiz-og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        {children}

        {/* Google Analytics (replace G-XXXXXXXXXX with your real ID) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-9LLH1L3N0T');
            `,
          }}
        />
      </body>
    </html>
  );
}
