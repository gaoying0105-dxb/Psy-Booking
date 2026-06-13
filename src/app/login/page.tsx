"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/format";

function LoginForm() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/book";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!validateEmail(email)) return setMsg("请输入正确的邮箱地址");
    if (password.length < 6) return setMsg("密码至少 6 位");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg("登录失败：" + (error.message === "Invalid login credentials" ? "邮箱或密码错误" : error.message));
      window.location.href = next;
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setMsg("注册失败：" + error.message);
      if (data.session) {
        // 关闭了邮箱验证时会直接返回会话
        window.location.href = next;
      } else {
        setMsg("注册成功！请前往邮箱点击确认链接，然后回来登录。");
        setMode("login");
      }
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-center font-display text-3xl font-bold">
        {mode === "login" ? "欢迎回来" : "创建账号"}
      </h1>
      <p className="mt-2 text-center text-sm text-ink/60">
        {mode === "login" ? "登录后即可预约咨询" : "注册只需要一个邮箱"}
      </p>

      <form onSubmit={submit} className="card mt-8 space-y-4">
        <div>
          <label className="label">邮箱</label>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">密码</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {msg && <p className="text-sm text-amber">{msg}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
        </button>
        <button
          type="button"
          className="w-full text-center text-sm text-pine underline-offset-4 hover:underline"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }}
        >
          {mode === "login" ? "还没有账号？去注册" : "已有账号？去登录"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
