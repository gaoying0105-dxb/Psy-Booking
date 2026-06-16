"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ORG_OPTIONS = [
  { value: "school", label: "学校" },
  { value: "hospital", label: "医院" },
  { value: "social", label: "社会" },
] as const;

type OrgType = "school" | "hospital" | "social";

interface Form {
  name: string;
  org_type: OrgType;
  org_name: string;
  bio: string;
  booking_notice: string;
}

export default function CounselorProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [counselorId, setCounselorId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>({
    name: "", org_type: "school", org_name: "", bio: "", booking_notice: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: c } = await supabase
        .from("counselors")
        .select("id, name, org_type, org_name, bio, booking_notice")
        .eq("user_id", session.user.id)
        .single();
      if (c) {
        setCounselorId(c.id);
        setForm({
          name: c.name ?? "",
          org_type: (c.org_type as OrgType) ?? "school",
          org_name: c.org_name ?? "",
          bio: c.bio ?? "",
          booking_notice: c.booking_notice ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!counselorId) return;
    setMsg("");
    setIsSuccess(false);
    if (!form.name.trim()) return setMsg("姓名不能为空");
    setSaving(true);
    const { error } = await supabase
      .from("counselors")
      .update({
        name: form.name.trim(),
        org_type: form.org_type,
        org_name: form.org_name.trim() || null,
        bio: form.bio.trim() || null,
        booking_notice: form.booking_notice.trim() || null,
      })
      .eq("id", counselorId);
    setSaving(false);
    if (error) { setMsg("保存失败：" + error.message); return; }
    setIsSuccess(true);
    setMsg("资料已保存");
  }

  if (loading) return <p className="text-ink/50">加载中…</p>;
  if (!counselorId) return <p className="text-red-600">未找到咨询师档案，请联系管理员</p>;

  return (
    <div className="max-w-lg">
      <form onSubmit={save} className="space-y-6">
        {/* 基本信息 */}
        <div className="card space-y-4">
          <h2 className="font-display text-lg font-bold">基本信息</h2>
          <div>
            <label className="label">姓名 *</label>
            <input className="field" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">机构类型</label>
            <div className="mt-1 flex gap-2">
              {ORG_OPTIONS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => setForm({ ...form, org_type: value })}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    form.org_type === value
                      ? "border-pine bg-pine text-white"
                      : "border-line bg-white hover:border-pine"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">机构名称</label>
            <input className="field" placeholder="如：某某中学心理中心"
              value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          </div>
          <div>
            <label className="label">个人简介</label>
            <textarea className="field min-h-24"
              placeholder="显示在来访者预约页上（可包含资质、擅长方向等）"
              value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>

        {/* 预约须知 */}
        <div className="card space-y-4">
          <h2 className="font-display text-lg font-bold">预约须知</h2>
          <p className="text-sm text-ink/50">
            来访者提交预约后，会在确认页看到这段文字（可留空）
          </p>
          <textarea className="field min-h-36"
            placeholder={"例：\n· 咨询地点：XX 楼 XXX 室\n· 请提前 5 分钟到达\n· 如需取消请提前 48 小时联系"}
            value={form.booking_notice}
            onChange={(e) => setForm({ ...form, booking_notice: e.target.value })} />
        </div>

        {msg && (
          <p className={`text-sm ${isSuccess ? "text-pine" : "text-red-600"}`}>{msg}</p>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "保存中…" : "保存资料"}
        </button>
      </form>
    </div>
  );
}
