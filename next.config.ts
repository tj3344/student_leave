import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许服务器组件使用外部包
  serverExternalPackages: ["better-sqlite3", "node-cron"],

  // 输出模式：standalone 用于 Docker 部署
  output: "standalone",

  // 禁用构建时的 ESLint 检查
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 禁用构建时的 TypeScript 类型检查
  typescript: {
    ignoreBuildErrors: true,
  },

  // React 严格模式（开发环境）
  reactStrictMode: true,

  // 压缩优化
  compress: true,

  // 生产环境 source map 配置
  productionBrowserSourceMaps: false,

  // 移除 powered by header
  poweredByHeader: false,

  // 图片优化配置
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 实验性功能
  experimental: {
    // 启用优化包导入
    optimizePackageImports: [
      "@radix-ui/react-icons",
      "lucide-react",
      "date-fns",
    ],
  },

  // 注意：不要自定义 webpack splitChunks。
  // 覆盖 splitChunks 会导致 Next.js chunk 清单错乱，CSS 文件被当作
  // JS chunk 以 <script async> 预加载，浏览器执行 CSS 内容报
  // "SyntaxError: Invalid character: '@'"（Safari 控制台红错）。
  // Next.js 默认分包已足够，样式由 <link rel="stylesheet"> 正常加载。

  // 日志输出优化
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
