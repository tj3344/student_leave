import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { getUsers } from "@/lib/api/users";
import { hasPermission, PERMISSIONS } from "@/lib/constants";
import { exportUsersToExcel, workbookToBlob } from "@/lib/utils/excel";
import { logExport } from "@/lib/utils/logger";
import { checkExportLimit } from "@/lib/utils/export";

/**
 * GET /api/users/export - 导出用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证权限
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(currentUser.role, PERMISSIONS.USER_EXPORT)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const is_active = searchParams.get("is_active");

    // 构建查询参数（不分页，获取所有）
    const params: {
      role?: string;
      is_active?: number;
      limit: number;
    } = {
      limit: 10000, // 获取所有数据
    };

    if (role) {
      params.role = role;
    }
    if (is_active) {
      params.is_active = parseInt(is_active, 10);
    }

    // 获取用户数据（不分页，获取所有）
    const result = getUsers(params);

    // 检查导出行数是否超过系统限制
    const limitCheck = await checkExportLimit(result.data.length);
    if (!limitCheck.canExport) {
      return NextResponse.json({ error: limitCheck.message }, { status: 400 });
    }

    // 生成 Excel 文件
    const workbook = exportUsersToExcel(result.data);
    const blob = workbookToBlob(workbook);

    // 记录日志
    await logExport(currentUser.id, "users", `导出用户列表，共 ${result.data.length} 条记录`);

    // 生成文件名并编码（支持中文）
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const encodedFilename = encodeURIComponent(`用户列表_${timestamp}.xlsx`);

    // 设置响应头
    return new NextResponse(blob as Blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("导出用户列表失败:", error);
    return NextResponse.json({ error: "导出用户列表失败" }, { status: 500 });
  }
}
