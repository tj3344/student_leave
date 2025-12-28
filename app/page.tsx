import Link from "next/link";
import { School, CheckCircle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8 rounded-3xl glass p-10 shadow-soft-lg mx-4">
        <div className="text-center">
          {/* Logo 图标 */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-soft mb-6">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            学生请假管理系统
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            高效管理学生请假、审核与退费
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="group flex w-full items-center justify-center rounded-xl bg-gradient-primary px-6 py-3.5 text-base font-semibold text-white shadow-soft hover:shadow-soft-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
          >
            登录系统
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <div className="rounded-2xl bg-muted/50 p-5 border-soft space-y-3">
            <h3 className="text-sm font-semibold text-foreground">系统功能</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                请假申请与审核流程
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                自动计算退费金额
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                学生档案管理
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                数据导入导出
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
