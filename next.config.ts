import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许服务器组件使用外部包
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
