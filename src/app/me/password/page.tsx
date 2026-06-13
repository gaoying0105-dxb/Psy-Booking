"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (password.length < 6) return setMsg("密码至少 6 位");
    if (password !== confirm) return setMsg("两次输入的密码不一致");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMsg("修改失败：" + error.message);
    setSuccess(true);
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="font-display text-3xl font-bold">修改密码</h1>
      {success ? (
        <div className="card mt-8 text-center text-pine">密码已修改成功！</div>
      ) : (
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
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "提交中…" : "确认修改"}
          </button>
        </form>
      )}
    </div>
  );
}