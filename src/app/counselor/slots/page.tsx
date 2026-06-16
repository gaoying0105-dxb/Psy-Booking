"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hm, prettyDate } from "@/lib/format";

interface SlotWithAppt {
  id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: "open" | "blocked";
  appointments: { id: number; status: string }[];
}

const TEMPLATE = [
  ["09:00", "09:50"],
  ["10:00", "10:50"],
  ["14:00", "14:50"],
  ["15:00", "15:50"],
  ["16:00", "16:50"],
];

export default function CounselorSlotsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [counselorId, setCounselorId] = useState<number | null>(null);
  const [noCounselor, setNoCounselor] = useState(false);
  const [slots, setSlots] = useState<SlotWithAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:50");

  const load = useCallback(async (cId: number) => {
    const today = new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("time_slots")
      .select("*, appointments(id, status)")
      .eq("counselor_id", cId)
      .gte("slot_date", today)
      .order("slot_date")
      .order("start_time");
    if (error) setMsg(error.message);
    setSlots((data as SlotWithAppt[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: c, error: cError } = await supabase
        .from("counselors")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      console.log("counselor query:", c, cError);
      if (!c) { setNoCounselor(true); setLoading(false); return; }
      setCounselorId(c.id);
      load(c.id);
    }
    init();
  }, [supabase, load]);

  function isTaken(s: SlotWithAppt) {
    return s.appointments.some((a) => a.status === "pending" || a.status === "confirmed");
  }

  async function addOne() {
    if (!counselorId) return;
    setMsg("");
    if (!date) return setMsg("请先选择日期");
    if (start >= end) return setMsg("结束时间必须晚于开始时间");
    const { error } = await supabase
      .from("time_slots")
      .insert({ slot_date: date, start_time: start, end_time: end, counselor_id: counselorId });
    setMsg(error ? (error.code === "23505" ? "该日期已存在相同开始时间的时段" : error.message) : "已添加");
    load(counselorId);
  }

  async function addTemplate() {
    if (!counselorId) return;
    setMsg("");
    if (!date) return setMsg("请先选择日期");
    const rows = TEMPLATE.map(([s, e]) => ({
      slot_date: date, start_time: s, end_time: e, counselor_id: counselorId,
    }));
    const { error } = await supabase
      .from("time_slots")
      .upsert(rows, { onConflict: "slot_date,start_time,counselor_id", ignoreDuplicates: true });
    setMsg(error ? error.message : "已按模板批量添加（重复的自动跳过）");
    load(counselorId);
  }

  async function toggleBlock(s: SlotWithAppt) {
    if (!counselorId) return;
    setMsg("");
    const next = s.status === "open" ? "blocked" : "open";
    if (next === "blocked" && isTaken(s)) {
      if (!confirm("该时段已有进行中的预约，屏蔽不会自动取消预约。仍要屏蔽吗？")) return;
    }
    const { error } = await supabase.from("time_slots").update({ status: next }).eq("id", s.id);
    setMsg(error ? error.message : next === "blocked" ? "已屏蔽，用户端不再显示" : "已解除屏蔽");
    load(counselorId);
  }

  async function remove(s: SlotWithAppt) {
    if (!counselorId) return;
    if (s.appointments.length > 0) { setMsg("该时段已有预约记录，不能删除（可改用屏蔽）"); return; }
    if (!confirm("确定删除该时段吗？")) return;
    const { error } = await supabase.from("time_slots").delete().eq("id", s.id);
    setMsg(error ? "删除失败：该时段存在预约记录，请改用屏蔽" : "已删除");
    load(counselorId);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SlotWithAppt[]>();
    for (const s of slots) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    return map;
  }, [slots]);

  if (noCounselor) return (
    <div className="card text-center text-ink/60">未找到您的咨询师档案，请联系管理员配置。</div>
  );

  return (
    <div>
      <div className="card">
        <h2 className="font-display text-lg font-bold">新增时段</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">日期</label>
            <input type="date" className="field !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">开始</label>
            <input type="time" className="field !w-auto" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">结束</label>
            <input type="time" className="field !w-auto" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button onClick={addOne} className="btn-primary">添加单个</button>
          <button onClick={addTemplate} className="btn-ghost">
            按模板添加整天（{TEMPLATE.length} 个时段）
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">{msg}</p>}

      {loading ? (
        <p className="mt-6 text-ink/50">加载中…</p>
      ) : grouped.size === 0 ? (
        <p className="mt-8 text-center text-sm text-ink/50">暂无时段，先在上方添加</p>
      ) : (
        <div className="mt-6 space-y-6">
          {[...grouped.entries()].map(([d, daySlots]) => (
            <div key={d}>
              <h3 className="mb-2 font-display font-bold">{prettyDate(d)}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {daySlots.map((s) => (
                  <div key={s.id} className={`card !p-4 ${s.status === "blocked" ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{hm(s.start_time)} – {hm(s.end_time)}</span>
                      <span className="text-xs">
                        {s.status === "blocked" ? (
                          <span className="text-red-500">已屏蔽</span>
                        ) : isTaken(s) ? (
                          <span className="text-amber">已被预约</span>
                        ) : (
                          <span className="text-pine">开放中</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => toggleBlock(s)} className="btn-ghost !px-3 !py-1 text-xs">
                        {s.status === "open" ? "屏蔽" : "解除屏蔽"}
                      </button>
                      <button onClick={() => remove(s)} className="btn-danger !px-3 !py-1 text-xs">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
