import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "学生请假管理系统",
  description: "为学校开发的学生请假管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${plusJakartaSans.variable} ${notoSansSC.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
