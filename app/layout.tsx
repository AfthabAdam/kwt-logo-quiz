import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "KWT Logo Quiz – Guess Kuwaiti Brands",
  description: "Test your knowledge of Kuwaiti brands. Guess logos, race against the timer, and challenge your friends!",
  openGraph: {
    title: "KWT Logo Quiz – Guess Kuwaiti Brands",
    description: "Can you guess all the Kuwaiti brands by their logos? Play now!",
    url: "https://kwtlogoquiz.com",
    siteName: "KWT Logo Quiz",
    images: [{ url: "/brand/kwt-logo-quiz-og.png", width: 1200, height: 630 }],
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
        {/* GA script can sit here if you added it */}
      </body>
    </html>
  );
}
