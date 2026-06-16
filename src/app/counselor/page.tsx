"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { hm, prettyDate, STATUS_TEXT } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待确认" },
  { value: "confirmed", label: "已确认" },
  { value: "cancelled", label: "已取消" },
  { value: "rejected", label: "已拒绝" },
  { value: "no_show", label: "失约" },
];

interface ConfirmForm {
  mode: "online" | "offline";
  link: string;
  location: string;
  note: string;
}

export default function CounselorPage() {
  const supabase = useMemo(() => createClient(), []);
  const [counselorId, setCounselorId] = useState<number | null>(null);
  const [noCounselor, setNoCounselor] = useState(false);
  const [list, setList] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [confirmForms, setConfirmForms] = useState<Record<number, ConfirmForm>>({});
  const [confirming, setConfirming] = useState<number | null>(null);

  const load = useCallback(async (cId: number) => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, time_slots(slot_date, start_time, end_time)")
      .eq("counselor_id", cId)
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setList((data as Appointment[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login?next=/counselor';
        return;
      }

      const userId = session.user.id;
      console.log("[counselor] querying counselors with user_id:", userId);

      const { data: c, error: cError } = await supabase
        .from("counselors")
        .select("id")
        .eq("user_id", userId)
        .single();

      console.log("[counselor] counselor query result:", c, "error:", cError);

      if (!c) { setNoCounselor(true); setLoading(false); return; }
      setCounselorId(c.id);
      load(c.id);
    }
    init();
  }, [supabase, load]);

  async function setStatus(id: number, status: AppointmentStatus) {
    const labels: Record<string, string> = {
      rejected: "拒绝这条预约",
      cancelled: "取消这条预约",
      no_show: "将该用户标记为失约（累计 2 次将无法再预约）",
    };
    if (!confirm(`确定要${labels[status]}吗？`)) return;
    setMsg("");
    const { error } = await supabase
      .from("appointments")
      .update({ status, cancelled_by: status === "cancelled" ? "admin" : null })
      .eq("id", id);
    if (error) setMsg(error.message);
    else setMsg(`操作成功：已${STATUS_TEXT[status]}`);
    if (counselorId) load(counselorId);
  }

  function openConfirmForm(id: number) {
    setConfirmForms(prev => ({
      ...prev,
      [id]: prev[id] ?? { mode: "online", link: "", location: "", note: "" },
    }));
  }

  function closeConfirmForm(id: number) {
    setConfirmForms(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  function updateConfirmForm(id: number, patch: Partial<ConfirmForm>) {
    setConfirmForms(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function submitConfirm(a: Appointment) {
    const f = confirmForms[a.id];
    if (!f) return;
    const detail = f.mode === "online"
      ? `咨询方式：线上视频\n会议链接：${f.link || "（待发送）"}`
      : `咨询方式：线下面谈\n咨询地点：${f.location || "（待确认）"}`;
    const replyMessage = f.note ? `${detail}\n备注：${f.note}` : detail;

    setConfirming(a.id);
    setMsg("");
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed", reply_message: replyMessage })
      .eq("id", a.id);
    if (error) { setMsg(error.message); setConfirming(null); return; }

    const res = await fetch("/api/send-confirm-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: a.id }),
    });
    const json = await res.json();
    setConfirming(null);
    closeConfirmForm(a.id);
    if (!res.ok) setMsg(`预约已确认，但邮件发送失败：${json.error}`);
    else setMsg(`已确认预约并发送通知邮件至 ${a.email}`);
    if (counselorId) load(counselorId);
  }

  const filtered = filter === "all" ? list : list.filter((a) => a.status === filter);

  if (loading) return <p className="text-ink/50">加载中…</p>;
  if (noCounselor) return (
    <div className="card text-center text-ink/60">
      未找到您的咨询师档案，请联系管理员配置。
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
              filter === f.value ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-70">{list.filter((a) => a.status === f.value).length}</span>
            )}
          </button>
        ))}
      </div>

      {msg && <p className="mt-4 rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">{msg}</p>}

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/50">暂无记录</p>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map((a) => {
            const slot = a.time_slots;
            return (
              <div key={a.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-display font-bold">
                    {slot ? `${prettyDate(slot.slot_date)} ${hm(slot.start_time)} – ${hm(slot.end_time)}` : "时段缺失"}
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                <div className="mt-3 grid gap-x-6 gap-y-1 text-sm text-ink/80 sm:grid-cols-2">
                  <p>姓名：{a.name}（{a.class_name}）</p>
                  <p>手机：{a.phone}</p>
                  <p>邮箱：{a.email}</p>
                  <p className="text-ink/50">提交于 {new Date(a.created_at).toLocaleString("zh-CN")}</p>
                </div>
                <p className="mt-2 rounded-xl bg-mist px-4 py-2 text-sm">来访原因：{a.reason}</p>
                {(a.age || a.gender || a.emergency_contact || a.emergency_phone) && (
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/70">
                    {a.age && <span>年龄：{a.age} 岁</span>}
                    {a.gender && <span>性别：{a.gender === "male" ? "男" : a.gender === "female" ? "女" : "其他"}</span>}
                    {a.emergency_contact && <span>紧急联系人：{a.emergency_contact}</span>}
                    {a.emergency_phone && <span>紧急联系人电话：{a.emergency_phone}</span>}
                  </div>
                )}

                {/* 确认内联表单 */}
                {a.status === "pending" && confirmForms[a.id] && (
                  <div className="mt-3 space-y-3 rounded-xl border border-pine/30 bg-pine-soft/20 p-4">
                    <p className="text-sm font-medium text-pine">填写确认信息后发送通知邮件</p>
                    <div className="flex gap-2">
                      {(["online", "offline"] as const).map((m) => (
                        <button key={m} type="button"
                          onClick={() => updateConfirmForm(a.id, { mode: m })}
                          className={`flex-1 rounded-lg border py-1.5 text-sm transition-colors ${
                            confirmForms[a.id].mode === m ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
                          }`}>
                          {m === "online" ? "线上" : "线下"}
                        </button>
                      ))}
                    </div>
                    {confirmForms[a.id].mode === "online" ? (
                      <input className="field text-sm" placeholder="会议链接（如腾讯会议链接）"
                        value={confirmForms[a.id].link}
                        onChange={e => updateConfirmForm(a.id, { link: e.target.value })} />
                    ) : (
                      <input className="field text-sm" placeholder="线下地点（如：咨询室 308）"
                        value={confirmForms[a.id].location}
                        onChange={e => updateConfirmForm(a.id, { location: e.target.value })} />
                    )}
                    <textarea className="field min-h-16 text-sm" placeholder="备注（选填）"
                      value={confirmForms[a.id].note}
                      onChange={e => updateConfirmForm(a.id, { note: e.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => submitConfirm(a)} disabled={confirming === a.id}
                        className="btn-primary !px-4 !py-1.5 text-xs">
                        {confirming === a.id ? "发送中…" : "确认并发送通知"}
                      </button>
                      <button onClick={() => closeConfirmForm(a.id)} className="btn-ghost !px-4 !py-1.5 text-xs">
                        取消
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === "pending" && !confirmForms[a.id] && (
                    <button onClick={() => openConfirmForm(a.id)} className="btn-primary !px-4 !py-1.5 text-xs">确认</button>
                  )}
                  {a.status === "pending" && (
                    <button onClick={() => setStatus(a.id, "rejected")} className="btn-danger !px-4 !py-1.5 text-xs">拒绝</button>
                  )}
                  {(a.status === "pending" || a.status === "confirmed") && (
                    <button onClick={() => setStatus(a.id, "cancelled")} className="btn-ghost !px-4 !py-1.5 text-xs">取消预约</button>
                  )}
                  {a.status === "confirmed" && (
                    <button onClick={() => setStatus(a.id, "no_show")} className="btn-danger !px-4 !py-1.5 text-xs">标记失约</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
