import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, changePassword } from "@/lib/api/auth";
import { changePasswordSchema } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const validated = changePasswordSchema.parse(body);

    const result = await changePassword(user.id, validated.oldPassword, validated.newPassword);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "密码修改成功" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 });
  }
}
