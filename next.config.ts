import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许服务器组件使用外部包
  serverExternalPackages: ["better-sqlite3", "node-cron"],

  // 输出模式：standalone 用于 Docker 部署
  output: "standalone",

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

  // Webpack 配置优化
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // 将 node_modules 中的包打包到 vendor
            vendor: {
              test: /[/\\]node_modules[/\\]/,
              name: "vendors",
              priority: 10,
              reuseExistingChunk: true,
            },
            // 将 Radix UI 组件单独打包
            radix: {
              test: /[/\\]node_modules[/\\]@radix-ui/,
              name: "radix",
              priority: 20,
              reuseExistingChunk: true,
            },
            // 将 common 代码单独打包
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  // 日志输出优化
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
