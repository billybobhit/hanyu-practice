import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "漢語練習 — HanYu Chinese Practice",
  description: "Master Mandarin through deep Socratic AI conversations. Upload study materials and practice with an AI tutor.",
  openGraph: {
    title: "漢語練習 — HanYu",
    description: "AI-powered Socratic Chinese conversation practice",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
