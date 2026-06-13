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

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, time_slots(slot_date, start_time, end_time)")
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setList((data as Appointment[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: AppointmentStatus) {
    const labels: Record<string, string> = {
      confirmed: "确认这条预约",
      rejected: "拒绝这条预约",
      cancelled: "取消这条预约（管理员操作不受48小时限制）",
      no_show: "将该用户标记为失约（累计2次将无法再预约）",
    };
    if (!confirm(`确定要${labels[status]}吗？`)) return;
    setMsg("");
    const { error } = await supabase
      .from("appointments")
      .update({ status, cancelled_by: status === "cancelled" ? "admin" : null })
      .eq("id", id);
    if (error) setMsg(error.message);
    else setMsg(`操作成功：已${STATUS_TEXT[status]}`);
    load();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条记录吗？此操作不可恢复。`)) return;
    setDeleting(true);
    setMsg("");
    const ids = [...selected];
    const { error } = await supabase
      .from("appointments")
      .delete()
      .in("id", ids);
    setDeleting(false);
    if (error) setMsg("删除失败：" + error.message);
    else setMsg(`已删除 ${ids.length} 条记录`);
    load();
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  }

  const filtered = filter === "all" ? list : list.filter((a) => a.status === filter);
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  if (loading) return <p className="text-ink/50">加载中…</p>;

  return (
    <div>
      {/* 筛选 */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setSelected(new Set()); }}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
              filter === f.value
                ? "border-pine bg-pine text-white"
                : "border-line bg-white hover:border-pine"
            }`}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-70">
                {list.filter((a) => a.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 批量操作栏 */}
      {filtered.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded accent-pine"
            />
            全选（{filtered.length} 条）
          </label>
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="btn-danger !px-4 !py-1.5 text-xs"
            >
              {deleting ? "删除中…" : `删除选中 (${selected.size})`}
            </button>
          )}
        </div>
      )}

      {msg && (
        <p className="mt-4 rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">{msg}</p>
      )}

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/50">暂无记录</p>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map((a) => {
            const slot = a.time_slots;
            const isSelected = selected.has(a.id);
            return (
              <div
                key={a.id}
                className={`card cursor-pointer transition-colors ${isSelected ? "border-pine bg-pine-soft/30" : ""}`}
                onClick={() => toggleSelect(a.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(a.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-4 w-4 rounded accent-pine shrink-0"
                    />
                    <div className="font-display font-bold">
                      {slot
                        ? `${prettyDate(slot.slot_date)} ${hm(slot.start_time)} – ${hm(slot.end_time)}`
                        : "时段缺失"}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                <div className="mt-3 grid gap-x-6 gap-y-1 text-sm text-ink/80 sm:grid-cols-2 pl-7">
                  <p>姓名：{a.name}（{a.class_name}）</p>
                  <p>手机：{a.phone}</p>
                  <p>邮箱：{a.email}</p>
                  <p className="text-ink/50">
                    提交于 {new Date(a.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <p className="mt-2 rounded-xl bg-mist px-4 py-2 text-sm ml-7">
                  来访原因：{a.reason}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 pl-7" onClick={e => e.stopPropagation()}>
                  {a.status === "pending" && (
                    <>
                      <button onClick={() => setStatus(a.id, "confirmed")} className="btn-primary !px-4 !py-1.5 text-xs">确认</button>
                      <button onClick={() => setStatus(a.id, "rejected")} className="btn-danger !px-4 !py-1.5 text-xs">拒绝</button>
                    </>
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
