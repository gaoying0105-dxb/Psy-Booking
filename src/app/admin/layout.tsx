import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// 管理后台布局：服务端校验管理员身份，非管理员直接跳走
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <span className="mr-2 font-display text-xl font-bold">管理后台</span>
        <Link href="/admin" className="btn-ghost !px-4 !py-1.5 text-xs">预约管理</Link>
        <Link href="/admin/slots" className="btn-ghost !px-4 !py-1.5 text-xs">时段管理</Link>
        <Link href="/admin/settings" className="btn-ghost !px-4 !py-1.5 text-xs">预约须知</Link>
      </div>
      {children}
    </div>
  );
}
