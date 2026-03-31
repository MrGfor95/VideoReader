import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Video to AI Dialogue Doc",
  description: "Turn YouTube subtitles into a polished AI dialogue document.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950 font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
