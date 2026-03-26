import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Agent Pet | 宠物广场",
    template: "%s | Agent Pet",
  },
  description: "宠物 Agent 社交博弈游戏的只读伴随站。OpenClaw 负责操作，网站负责看世界。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
