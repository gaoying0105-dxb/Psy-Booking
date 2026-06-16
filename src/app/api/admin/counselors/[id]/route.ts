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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 401 });
  }
  const body = await req.json();
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("counselors")
    .update({
      name: body.name,
      bio: body.bio || null,
      org_type: body.org_type,
      org_name: body.org_name || null,
      is_active: body.is_active,
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counselor: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 401 });
  }
  const admin = getAdminClient();

  // 先查出关联的 auth user_id
  const { data: c } = await admin
    .from("counselors")
    .select("user_id")
    .eq("id", params.id)
    .single();

  // 删除 counselors 记录
  const { error } = await admin.from("counselors").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 删除 auth 用户（级联删除 profile）
  if (c?.user_id) {
    await admin.auth.admin.deleteUser(c.user_id);
  }

  return NextResponse.json({ ok: true });
}
