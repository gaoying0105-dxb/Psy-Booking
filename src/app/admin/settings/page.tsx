"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ===== 管理后台：预约须知编辑 =====
export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notice, setNotice] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "booking_notice")
      .single()
      .then(({ data }) => setNotice(data?.value ?? ""));
  }, [supabase]);

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "booking_notice", value: notice, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? error.message : "已保存，预约成功页将显示最新内容");
  }

  return (
    <div className="max-w-2xl">
      <div className="card">
        <h2 className="font-display text-lg font-bold">预约须知</h2>
        <p className="mt-1 text-sm text-ink/60">
          显示在用户预约成功的确认页上，支持多行（如违约规则、到访提示等）。
        </p>
        <textarea
          className="field mt-4 min-h-56"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
        />
        {msg && <p className="mt-3 text-sm text-pine">{msg}</p>}
        <button onClick={save} disabled={saving} className="btn-primary mt-4">
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
