import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("counselors")
    .select("*, profiles(email)")
    .order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 401 });
  }
  const { email, password, slug, name, bio, org_type, org_name } = await req.json();
  if (!email || !password || !slug || !name || !org_type) {
    return NextResponse.json({ error: "缺少必填项" }, { status: 400 });
  }

  const admin = getAdminClient();

  // 创建 auth 用户（直接确认邮箱，无需验证链接）
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const userId = authData.user.id;

  // 更新 profile 角色
  const { error: profileError } = await admin.rpc("admin_set_role", {
    p_user_id: userId,
    p_role: "counselor",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 插入 counselors 记录
  const { data: counselor, error: counselorError } = await admin
    .from("counselors")
    .insert({
      user_id: userId,
      slug,
      name,
      bio: bio || null,
      org_type,
      org_name: org_name || null,
    })
    .select()
    .single();
  if (counselorError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: counselorError.message }, { status: 500 });
  }

  return NextResponse.json({ counselor });
}
