import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/api/auth";
import { upgradeSemester, getUpgradePreview } from "@/lib/api/semester-upgrade";
import { PERMISSIONS } from "@/lib/constants";
import { logOperation } from "@/lib/utils/logger";
import type { SemesterUpgradeRequest } from "@/types";

// GET /api/semesters/upgrade?source_semester_id=1&target_semester_id=2 - 获取升级预览
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.SYSTEM_UPGRADE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sourceSemesterId = searchParams.get("source_semester_id");
    const targetSemesterId = searchParams.get("target_semester_id");
    const upgradeMode = searchParams.get("upgrade_mode") as "semester" | "year" | null;

    if (!sourceSemesterId || !targetSemesterId) {
      return NextResponse.json(
        { error: "缺少 source_semester_id 或 target_semester_id 参数" },
        { status: 400 }
      );
    }

    const preview = await getUpgradePreview(
      parseInt(sourceSemesterId, 10),
      parseInt(targetSemesterId, 10),
      upgradeMode || "year"
    );

    if (!preview) {
      return NextResponse.json({ error: "学期不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: preview });
  } catch (error) {
    console.error("Get upgrade preview error:", error);
    return NextResponse.json({ error: "获取升级预览失败" }, { status: 500 });
  }
}

// POST /api/semesters/upgrade - 执行学期升级
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.SYSTEM_UPGRADE)) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await request.json()) as SemesterUpgradeRequest;
    const upgradeMode = body.upgrade_mode || "year";

    // 参数验证
    if (!body.source_semester_id || !body.target_semester_id) {
      return NextResponse.json(
        { error: "缺少 source_semester_id 或 target_semester_id 参数" },
        { status: 400 }
      );
    }

    if (!body.grade_ids || body.grade_ids.length === 0) {
      return NextResponse.json({ error: "请至少选择一个年级" }, { status: 400 });
    }

    // 执行升级
    const result = await upgradeSemester(body);

    // 记录操作日志
    if (result.success) {
      const modeText = upgradeMode === "year" ? "学年升级" : "学期迁移";
      const graduatedText = result.data?.graduated_students_count
        ? `, 毕业学生 ${result.data.graduated_students_count} 人`
        : "";
      await logOperation(
        user.id,
        "upgrade",
        "semesters",
        `${modeText}: 学期 ${body.source_semester_id} -> ${body.target_semester_id}, 年级 ${body.grade_ids.length} 个, 班级 ${result.data?.classes_created} 个, 学生 ${result.data?.students_created} 个${graduatedText}`
      );
    } else {
      await logOperation(
        user.id,
        "upgrade",
        "semesters",
        `学生升级失败: ${result.message}`
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upgrade semester error:", error);
    return NextResponse.json({ error: "学期升级失败" }, { status: 500 });
  }
}
