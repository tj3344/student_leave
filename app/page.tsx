import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">学生请假管理系统</h1>
          <p className="mt-3 text-lg text-gray-600">
            高效管理学生请假、审核与退费
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            登录系统
          </Link>

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">系统功能</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 请假申请与审核流程</li>
              <li>• 自动计算退费金额</li>
              <li>• 学生档案管理</li>
              <li>• 数据导入导出</li>
              <li>• 营养餐资格管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
