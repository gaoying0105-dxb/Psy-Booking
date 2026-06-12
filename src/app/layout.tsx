import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "心语预约 · 心理咨询预约",
  description: "校园心理咨询在线预约系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 衬线中文字体（浏览器运行时加载，不影响构建） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
        <footer className="border-t border-line py-8 text-center text-xs text-ink/50">
          心语预约 · 咨询内容严格保密
        </footer>
      </body>
    </html>
  );
}
