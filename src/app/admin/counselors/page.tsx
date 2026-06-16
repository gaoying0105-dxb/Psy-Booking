"use client";

import { useCallback, useEffect, useState } from "react";
import type { Counselor } from "@/lib/types";

const ORG_OPTIONS = [
  { value: "school", label: "学校" },
  { value: "hospital", label: "医院" },
  { value: "social", label: "社会" },
] as const;

const ORG_LABEL: Record<string, string> = {
  school: "学校", hospital: "医院", social: "社会",
};

interface NewForm {
  email: string; password: string; slug: string; name: string;
  bio: string; org_type: "school" | "hospital" | "social"; org_name: string;
}

interface EditForm {
  name: string; bio: string;
  org_type: "school" | "hospital" | "social"; org_name: string; is_active: boolean;
}

const EMPTY_NEW: NewForm = {
  email: "", password: "", slug: "", name: "", bio: "", org_type: "school", org_name: "",
};

export default function CounselorsPage() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>(EMPTY_NEW);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", bio: "", org_type: "school", org_name: "", is_active: true,
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/counselors");
    const json = await res.json();
    console.log('counselors data:', json, 'ok:', res.ok);
    if (!res.ok) { setMsg(json.error); setLoading(false); return; }
    setCounselors(Array.isArray(json) ? json : (json.counselors ?? []));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCounselor() {
    if (!newForm.email || !newForm.password || !newForm.slug || !newForm.name) {
      return setMsg("请填写所有必填项（ID、姓名、邮箱、密码）");
    }
    setCreating(true);
    setMsg("");
    const res = await fetch("/api/admin/counselors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { setMsg("创建失败：" + json.error); return; }
    setMsg(`咨询师「${json.counselor.name}」创建成功，专属链接：/c/${json.counselor.slug}`);
    setShowNew(false);
    setNewForm(EMPTY_NEW);
    load();
  }

  function startEdit(c: Counselor) {
    setEditId(c.id);
    setEditForm({ name: c.name, bio: c.bio ?? "", org_type: c.org_type, org_name: c.org_name ?? "", is_active: c.is_active });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/counselors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg("保存失败：" + json.error); return; }
    setMsg("已更新");
    setEditId(null);
    load();
  }

  async function toggleActive(c: Counselor) {
    setMsg("");
    const res = await fetch(`/api/admin/counselors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: c.name, bio: c.bio, org_type: c.org_type, org_name: c.org_name,
        is_active: !c.is_active,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg(json.error); return; }
    setMsg(c.is_active ? `「${c.name}」已停用` : `「${c.name}」已启用`);
    load();
  }

  async function deleteCounselor(c: Counselor) {
    if (!confirm(`确定删除咨询师「${c.name}」？\n\n此操作将同时删除其登录账号，不可恢复。`)) return;
    setMsg("");
    const res = await fetch(`/api/admin/counselors/${c.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { setMsg("删除失败：" + json.error); return; }
    setMsg("已删除");
    load();
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
    setMsg("专属链接已复制到剪贴板");
  }

  if (loading) return <p className="text-ink/50">加载中…</p>;

  return (
    <div className="space-y-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">共 {counselors.length} 位咨询师</p>
        <button
          onClick={() => { setShowNew(!showNew); setMsg(""); }}
          className="btn-primary !px-4 !py-1.5 text-xs"
        >
          {showNew ? "收起" : "+ 新增咨询师"}
        </button>
      </div>

      {msg && (
        <p className="rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">{msg}</p>
      )}

      {/* 新增表单 */}
      {showNew && (
        <div className="card space-y-4">
          <h2 className="font-display text-lg font-bold">新增咨询师</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">咨询师 ID *</label>
              <input className="field" placeholder="如：school001（作为专属链接后缀，创建后不可改）"
                value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })} />
            </div>
            <div>
              <label className="label">姓名 *</label>
              <input className="field" value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label">机构类型 *</label>
              <div className="mt-1 flex gap-2">
                {ORG_OPTIONS.map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => setNewForm({ ...newForm, org_type: value })}
                    className={`flex-1 rounded-xl border px-2 py-2 text-sm transition-colors ${
                      newForm.org_type === value ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">机构名称</label>
              <input className="field" placeholder="如：某某中学心理中心"
                value={newForm.org_name} onChange={(e) => setNewForm({ ...newForm, org_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">个人简介</label>
              <textarea className="field min-h-16" placeholder="显示在来访者预约页上"
                value={newForm.bio} onChange={(e) => setNewForm({ ...newForm, bio: e.target.value })} />
            </div>
            <div>
              <label className="label">登录邮箱 *</label>
              <input className="field" type="email" value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
            </div>
            <div>
              <label className="label">初始密码 *</label>
              <input className="field" type="password" placeholder="至少 6 位" value={newForm.password}
                onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createCounselor} disabled={creating} className="btn-primary !px-4 !py-1.5 text-xs">
              {creating ? "创建中…" : "确认创建"}
            </button>
            <button onClick={() => { setShowNew(false); setNewForm(EMPTY_NEW); }} className="btn-ghost !px-4 !py-1.5 text-xs">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 咨询师列表 */}
      {counselors.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/50">暂无咨询师，点击上方按钮添加</p>
      ) : (
        <div className="space-y-3">
          {counselors.map((c) => (
            <div key={c.id} className={`card ${!c.is_active ? "opacity-60" : ""}`}>
              {editId === c.id ? (
                /* 编辑模式 */
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">姓名</label>
                      <input className="field" value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">机构类型</label>
                      <div className="mt-1 flex gap-2">
                        {ORG_OPTIONS.map(({ value, label }) => (
                          <button key={value} type="button"
                            onClick={() => setEditForm({ ...editForm, org_type: value })}
                            className={`flex-1 rounded-xl border px-2 py-1.5 text-xs transition-colors ${
                              editForm.org_type === value ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">机构名称</label>
                      <input className="field" value={editForm.org_name}
                        onChange={(e) => setEditForm({ ...editForm, org_name: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">个人简介</label>
                      <textarea className="field min-h-16" value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(c.id)} disabled={saving} className="btn-primary !px-4 !py-1.5 text-xs">
                      {saving ? "保存中…" : "保存"}
                    </button>
                    <button onClick={() => setEditId(null)} className="btn-ghost !px-4 !py-1.5 text-xs">取消</button>
                  </div>
                </div>
              ) : (
                /* 展示模式 */
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold">{c.name}</span>
                      <span className="rounded-full bg-pine-soft px-2 py-0.5 text-xs text-pine">
                        {ORG_LABEL[c.org_type]}{c.org_name ? ` · ${c.org_name}` : ""}
                      </span>
                      {!c.is_active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-ink/40">已停用</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="btn-ghost !px-3 !py-1 text-xs">编辑</button>
                      <button onClick={() => toggleActive(c)} className="btn-ghost !px-3 !py-1 text-xs">
                        {c.is_active ? "停用" : "启用"}
                      </button>
                      <button onClick={() => deleteCounselor(c)} className="btn-danger !px-3 !py-1 text-xs">删除</button>
                    </div>
                  </div>
                  {c.bio && <p className="mt-1 text-sm text-ink/60">{c.bio}</p>}
                  <div className="mt-2 flex items-center gap-2 text-sm text-ink/50">
                    <span>专属链接：/c/{c.slug}</span>
                    <button
                      onClick={() => copyLink(c.slug)}
                      className="rounded bg-mist px-2 py-0.5 text-xs transition-colors hover:bg-pine-soft hover:text-pine"
                    >
                      复制
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
