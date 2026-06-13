"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

useEffect(() => {
  async function handleReset() {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    if (token_hash && type === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "recovery",
      });
      if (!error) {
        window.history.replaceState({}, "", "/auth/reset");
        setReady(true);
      } else {
        setMsg("链接已失效，请重新发送重置邮件");
      }
    } else {
      setMsg("链接无效，请重新发送重置邮件");
    }
  }
  handleReset();
}, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (password.length < 6) return setMsg("密码至少 6 位");
    if (password !== confirm) return setMsg("两次输入的密码不一致");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMsg("重置失败：" + error.message);
    setMsg("密码已重置成功，即将跳转…");
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-sm pt-10 text-center text-ink/50">
        正在验证链接，请稍候…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="font-display text-3xl font-bold">重置密码</h1>
      <form onSubmit={submit} className="card mt-8 space-y-4">
        <div>
          <label className="label">新密码</label>
          <input className="field" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
        </div>
        <div>
          <label className="label">确认新密码</label>
          <input className="field" type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="再输入一次" />
        </div>
        {msg && <p className="text-sm text-pine">{msg}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "提交中…" : "确认重置"}
        </button>
      </form>
    </div>
  );
}