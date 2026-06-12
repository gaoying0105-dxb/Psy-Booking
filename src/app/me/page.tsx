"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";
import { hm, hoursUntil, prettyDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

// ===== 个人中心：预约记录 + 取消（48小时规则）=====
export default function MePage() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, time_slots(slot_date, start_time, end_time)")
      .order("created_at", { ascending: false });
    setList((data as Appointment[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: number) {
    if (!confirm("确定要取消这条预约吗？")) return;
    setMsg("");
    const { error } = await supabase.rpc("cancel_appointment", { p_id: id });
    if (error) {
      setMsg(error.message);
    } else {
      setMsg("已取消，该时段已重新开放");
    }
    load();
  }

  if (loading) return <p className="pt-10 text-center text-ink/50">加载中…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">我的预约</h1>
      <p className="mt-2 text-sm text-ink/60">
        「待确认 / 已确认」的预约可在开始前 48 小时以上自行取消；不足 48 小时请联系咨询师处理。
      </p>

      {msg && (
        <p className="mt-4 rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">{msg}</p>
      )}

      {list.length === 0 ? (
        <div className="card mt-8 text-center text-ink/60">
          还没有预约记录，
          <Link href="/book" className="text-pine underline underline-offset-4">
            去预约一次咨询
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {list.map((a) => {
            const slot = a.time_slots;
            const cancellable =
              (a.status === "pending" || a.status === "confirmed") &&
              slot != null &&
              hoursUntil(slot.slot_date, slot.start_time) > 48;
            const tooLate =
              (a.status === "pending" || a.status === "confirmed") &&
              slot != null &&
              hoursUntil(slot.slot_date, slot.start_time) <= 48 &&
              hoursUntil(slot.slot_date, slot.start_time) > 0;

            return (
              <div key={a.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-display text-lg font-bold">
                    {slot
                      ? `${prettyDate(slot.slot_date)} ${hm(slot.start_time)} – ${hm(slot.end_time)}`
                      : "时段信息缺失"}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-sm text-ink/60">来访原因：{a.reason}</p>
                <p className="mt-1 text-xs text-ink/40">
                  提交于 {new Date(a.created_at).toLocaleString("zh-CN")}
                </p>
                <div className="mt-3">
                  {cancellable && (
                    <button onClick={() => cancel(a.id)} className="btn-danger !px-4 !py-1.5 text-xs">
                      取消预约
                    </button>
                  )}
                  {tooLate && (
                    <p className="text-xs text-amber">
                      距开始不足 48 小时，无法自行取消，请联系咨询师
                    </p>
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
