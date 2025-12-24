import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/api/auth";
import type { LoginInput } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginInput;
    const result = await login(body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 401 });
    }

    return NextResponse.json({ user: result.user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
