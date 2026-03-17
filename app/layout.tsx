import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

// 启动自动备份调度器（仅在服务端）
if (typeof window === "undefined") {
  import("@/lib/cron/backup").then(({ startBackupScheduler }) => {
    try {
      startBackupScheduler();
    } catch (error) {
      console.error("[Backup] 启动调度器失败:", error);
    }
  });

  // 初始化数据库触发器
  import("@/lib/db/triggers").then(async ({ ensureTriggersInitialized }) => {
    try {
      const wasInitialized = await ensureTriggersInitialized();
      if (wasInitialized) {
        console.log("[DB] 触发器已自动初始化");
      } else {
        console.log("[DB] 触发器检查完成，已存在");
      }
    } catch (error) {
      console.error("[DB] 触发器初始化失败:", error);
    }
  });
}

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
