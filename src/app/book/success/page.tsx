"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";
import { hm, prettyDate } from "@/lib/format";

// ===== 预约成功确认页：展示详情 + 可配置的预约须知 =====
function SuccessContent() {
  const supabase = useMemo(() => createClient(), []);
  const id = useSearchParams().get("id");
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, time_slots(slot_date, start_time, end_time)")
          .eq("id", id)
          .single(),
        supabase.from("site_settings").select("value").eq("key", "booking_notice").single(),
      ]);
      setAppt(a as Appointment | null);
      setNotice(s?.value ?? "");
    }
    load();
  }, [id, supabase]);

  if (!appt) return <p className="pt-10 text-center text-ink/50">加载中…</p>;
  const slot = appt.time_slots;

  return (
    <div className="mx-auto max-w-lg pt-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-soft text-3xl">
          ✓
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">预约已提交</h1>
        <p className="mt-2 text-sm text-ink/60">
          当前状态为「待确认」，咨询师确认后即可生效
        </p>
      </div>

      <div className="card mt-8 space-y-3 text-sm">
        <Row k="预约时间" v={slot ? `${prettyDate(slot.slot_date)} ${hm(slot.start_time)} – ${hm(slot.end_time)}` : "—"} />
        <Row k="姓名" v={appt.name} />
        <Row k="班级" v={appt.class_name} />
        <Row k="手机号" v={appt.phone} />
        <Row k="邮箱" v={appt.email} />
        <Row k="来访原因" v={appt.reason} />
      </div>

      {notice && (
        <div className="card mt-4 border-amber/30 bg-amber/5">
          <h2 className="font-display font-bold text-amber">预约须知</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink/80">{notice}</p>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/me" className="btn-primary">查看我的预约</Link>
        <Link href="/" className="btn-ghost">返回首页</Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-20 shrink-0 text-ink/50">{k}</span>
      <span className="break-all">{v}</span>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
