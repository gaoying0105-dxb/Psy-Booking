"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (mounted) setRole(data?.role ?? null);
      } else {
        setRole(null);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [supabase, pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const link = (href: string, text: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        pathname === href ? "bg-pine-soft text-pine font-medium" : "hover:text-pine"
      }`}
    >
      {text}
    </Link>
  );

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-mist/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 font-display text-lg font-bold text-pine">
          心语预约
        </Link>

        {/* 未登录 */}
        {!email && link("/", "首页")}

        {/* admin */}
        {role === "admin" && (
          <>
            {link("/", "首页")}
            {link("/admin", "预约管理")}
            {link("/admin/counselors", "咨询师管理")}
            {link("/admin/settings", "系统设置")}
          </>
        )}

        {/* counselor */}
        {role === "counselor" && (
          <>
            {link("/counselor", "我的预约")}
            {link("/counselor/slots", "时段管理")}
            {link("/counselor/profile", "个人资料")}
            {link("/me/password", "修改密码")}
          </>
        )}

        {/* user */}
        {role === "user" && (
          <>
            {link("/", "首页")}
            {link("/me", "我的预约")}
            {link("/me/password", "修改密码")}
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden text-xs text-ink/50 sm:inline">{email}</span>
              <button onClick={logout} className="btn-ghost !px-4 !py-1.5 text-xs">退出</button>
            </>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-1.5 text-xs">
              登录 / 注册
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
