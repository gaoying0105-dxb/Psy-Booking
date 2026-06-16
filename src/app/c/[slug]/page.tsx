"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AvailableSlot, Counselor } from "@/lib/types";
import { hm, prettyDate, validateEmail, validatePhone } from "@/lib/format";

const ORG_LABEL: Record<string, string> = {
  school: "学校心理中心",
  hospital: "医院 / 诊所",
  social: "社会机构",
};

export default function CounselorBookPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [form, setForm] = useState({
    name: "", class_name: "", phone: "", email: "", reason: "",
    age: "", gender: "", emergency_contact: "", emergency_phone: "",
  });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("counselors")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!c) { setNotFound(true); setLoading(false); return; }
      setCounselor(c as Counselor);

      const today = new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10);
      const end30 = new Date(Date.now() + 30 * 864e5 + 8 * 36e5).toISOString().slice(0, 10);

      const { data: slotData } = await supabase
        .from("time_slots")
        .select("id, slot_date, start_time, end_time, appointments(id, status)")
        .eq("counselor_id", c.id)
        .eq("status", "open")
        .gte("slot_date", today)
        .lte("slot_date", end30)
        .order("slot_date")
        .order("start_time");

      const list: AvailableSlot[] = (slotData ?? []).map((s: any) => ({
        id: s.id,
        slot_date: s.slot_date,
        start_time: s.start_time,
        end_time: s.end_time,
        is_taken: (s.appointments as { id: number; status: string }[])
          .some((a) => ["pending", "confirmed"].includes(a.status)),
      }));
      setSlots(list);

      // 恢复上次选中的时段
      const savedSlotId = sessionStorage.getItem(`c_slot_${slug}`);
      if (savedSlotId) {
        const saved = list.find((s) => s.id === Number(savedSlotId) && !s.is_taken);
        if (saved) {
          setSelectedDate(saved.slot_date);
          setSelectedSlot(saved);
        } else {
          sessionStorage.removeItem(`c_slot_${slug}`);
          const firstDate = list.find((s) => !s.is_taken)?.slot_date ?? list[0]?.slot_date ?? "";
          setSelectedDate(firstDate);
        }
      } else {
        const firstDate = list.find((s) => !s.is_taken)?.slot_date ?? list[0]?.slot_date ?? "";
        setSelectedDate(firstDate);
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, class_name, phone, email")
          .eq("id", userData.user.id)
          .single();
        if (profile) {
          setForm((f) => ({
            ...f,
            name: profile.name ?? "",
            class_name: profile.class_name ?? "",
            phone: profile.phone ?? "",
            email: profile.email ?? userData.user!.email ?? "",
          }));
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase, slug]);

  // 选中时段后滚动到操作区
  useEffect(() => {
    if (selectedSlot && actionRef.current) {
      setTimeout(() => {
        actionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedSlot]);

  const dates = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const s of slots) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    return map;
  }, [slots]);

  const daySlots = dates.get(selectedDate) ?? [];

  function selectSlot(s: AvailableSlot) {
    setSelectedSlot(s);
    sessionStorage.setItem(`c_slot_${slug}`, String(s.id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!selectedSlot) return setMsg("请先选择一个时段");
    if (!form.name.trim() || !form.reason.trim()) return setMsg("请完整填写所有必填项");
    if (counselor?.org_type === "school" && !form.class_name.trim()) return setMsg("请填写班级");
    if (!validatePhone(form.phone)) return setMsg("请输入 11 位手机号");
    if (!validateEmail(form.email)) return setMsg("请输入正确的邮箱");

    setSubmitting(true);
    const classForRpc = counselor?.org_type === "school" ? form.class_name : "无";

    const { data: apptId, error: bookError } = await supabase.rpc("book_appointment", {
      p_slot_id: selectedSlot.id,
      p_name: form.name,
      p_class: classForRpc,
      p_phone: form.phone,
      p_email: form.email,
      p_reason: form.reason,
    });

    if (bookError) { setMsg(bookError.message); setSubmitting(false); return; }

    if (apptId) {
      await supabase.from("appointments").update({
        counselor_id: counselor!.id,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
      }).eq("id", apptId);
    }

    sessionStorage.removeItem(`c_slot_${slug}`);
    setSubmitting(false);
    router.push(`/book/success?id=${apptId}`);
  }

  if (loading) return <p className="pt-10 text-center text-ink/50">加载中…</p>;
  if (notFound) return (
    <div className="mx-auto max-w-sm pt-20 text-center text-ink/60">找不到该咨询师</div>
  );

  const isHospital = counselor!.org_type === "hospital";
  const isSocial = counselor!.org_type === "social";
  const showAgeGender = isHospital || isSocial;
  const loginUrl = `/login?next=/c/${slug}`;

  return (
    <div className="mx-auto max-w-2xl">
      {/* 咨询师简介 */}
      <div className="card mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pine-soft font-display text-xl font-bold text-pine">
            {counselor!.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{counselor!.name}</h1>
            <p className="text-sm text-ink/50">
              {ORG_LABEL[counselor!.org_type]}
              {counselor!.org_name ? ` · ${counselor!.org_name}` : ""}
            </p>
            {counselor!.bio && (
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{counselor!.bio}</p>
            )}
          </div>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="card text-center text-ink/60">该咨询师暂无可预约时段，请稍后再来。</div>
      ) : (
        <>
          {/* 选日期 */}
          <section className="mt-4">
            <h2 className="label !text-base">① 选择日期</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...dates.keys()].map((d) => {
                const allTaken = dates.get(d)!.every((s) => s.is_taken);
                return (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition-colors ${
                      selectedDate === d ? "border-pine bg-pine text-white"
                      : allTaken ? "border-line bg-white text-ink/30"
                      : "border-line bg-white hover:border-pine"
                    }`}
                  >
                    {prettyDate(d)}
                    {allTaken && <span className="ml-1 text-xs">满</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 选时段 */}
          <section className="mt-6">
            <h2 className="label !text-base">② 选择时段</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  disabled={s.is_taken}
                  onClick={() => selectSlot(s)}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-ink/30 ${
                    selectedSlot?.id === s.id ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
                  }`}
                >
                  {hm(s.start_time)} – {hm(s.end_time)}
                  {s.is_taken && <div className="text-xs">已约满</div>}
                </button>
              ))}
            </div>
          </section>

          {/* 选完时段后的操作区 */}
          {selectedSlot && (
            <div ref={actionRef} className="mt-8 scroll-mt-24">
              {!isLoggedIn ? (
                /* 未登录提示 */
                <div className="card space-y-4 text-center">
                  <p className="font-display text-lg font-bold">③ 登录后继续预约</p>
                  <p className="text-sm text-ink/60">
                    请先登录或注册账号，完成后将自动回到此页继续预约
                  </p>
                  <p className="rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">
                    已选：{prettyDate(selectedSlot.slot_date)} {hm(selectedSlot.start_time)} – {hm(selectedSlot.end_time)}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a href={loginUrl} className="btn-primary flex-1 text-center">
                      去注册
                    </a>
                    <a href={loginUrl} className="btn-ghost flex-1 text-center">
                      已有账号，去登录
                    </a>
                  </div>
                </div>
              ) : (
                /* 已登录：显示表单 */
                <form onSubmit={submit} className="card space-y-4">
                  <h2 className="font-display text-lg font-bold">③ 填写预约信息</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">姓名 *</label>
                      <input className="field" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    {counselor!.org_type === "school" && (
                      <div>
                        <label className="label">班级 *</label>
                        <input className="field" placeholder="如：高二(3)班" value={form.class_name}
                          onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
                      </div>
                    )}
                    {showAgeGender && (
                      <>
                        <div>
                          <label className="label">年龄 <span className="font-normal text-ink/40">（选填）</span></label>
                          <input className="field" type="number" min={1} max={120} placeholder="如：25"
                            value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">性别 <span className="font-normal text-ink/40">（选填）</span></label>
                          <div className="mt-1 flex gap-2">
                            {(["male", "female", "other"] as const).map((v) => (
                              <button key={v} type="button"
                                onClick={() => setForm({ ...form, gender: form.gender === v ? "" : v })}
                                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                  form.gender === v ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"
                                }`}>
                                {v === "male" ? "男" : v === "female" ? "女" : "其他"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {isHospital && (
                      <>
                        <div>
                          <label className="label">紧急联系人 <span className="font-normal text-ink/40">（选填）</span></label>
                          <input className="field" placeholder="姓名" value={form.emergency_contact}
                            onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">紧急联系人电话 <span className="font-normal text-ink/40">（选填）</span></label>
                          <input className="field" inputMode="numeric" placeholder="手机号" value={form.emergency_phone}
                            onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="label">手机号 *</label>
                      <input className="field" inputMode="numeric" maxLength={11} value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">邮箱 *</label>
                      <input className="field" type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">来访原因 *</label>
                    <textarea className="field min-h-24"
                      placeholder="简单描述一下来访原因，方便咨询师提前了解（内容严格保密）"
                      value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                  </div>
                  <p className="rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">
                    已选：{prettyDate(selectedSlot.slot_date)} {hm(selectedSlot.start_time)} – {hm(selectedSlot.end_time)}
                  </p>
                  {msg && <p className="text-sm text-red-600">{msg}</p>}
                  <button className="btn-primary w-full" disabled={submitting}>
                    {submitting ? "提交中…" : "提交预约"}
                  </button>
                  <p className="text-center text-xs text-ink/50">
                    提交后状态为「待确认」，咨询师确认后生效；如需取消请提前 48 小时
                  </p>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
