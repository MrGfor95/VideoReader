import { APP_METADATA } from "@/app/constants";
import type { RootLayoutProps } from "@/app/types";
import "./globals.css";

export const metadata = APP_METADATA;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-950 font-sans text-white antialiased"
      >
        {children}
      </body>
    </html>
  );
}
