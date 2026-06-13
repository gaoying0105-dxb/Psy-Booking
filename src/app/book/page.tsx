"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AvailableSlot } from "@/lib/types";
import { hm, prettyDate, validateEmail, validatePhone } from "@/lib/format";

// ===== 预约页：选日期 → 选时段 → 填表单 =====
export default function BookPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // 表单
  const [form, setForm] = useState({ name: "", class_name: "", phone: "", email: "", reason: "", age: "", gender: "", emergency_contact: "", emergency_phone: "" });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 加载未来 30 天可预约时段 + 用户资料自动填充
  useEffect(() => {
    async function load() {
      const today = new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10); // 北京时间今天
      const end = new Date(Date.now() + 30 * 864e5 + 8 * 36e5).toISOString().slice(0, 10);

      const [{ data: slotData }, { data: userData }] = await Promise.all([
        supabase.rpc("get_available_slots", { p_from: today, p_to: end }),
        supabase.auth.getUser(),
      ]);

      const list: AvailableSlot[] = slotData ?? [];
      setSlots(list);
      const firstDate = list.find((s) => !s.is_taken)?.slot_date ?? list[0]?.slot_date ?? "";
      setSelectedDate(firstDate);

      // 用上次填过的资料自动填充
      const user = userData.user;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, class_name, phone, email")
          .eq("id", user.id)
          .single();
        if (profile) {
          setForm((f) => ({
            ...f,
            name: profile.name ?? "",
            class_name: profile.class_name ?? "",
            phone: profile.phone ?? "",
            email: profile.email ?? user.email ?? "",
          }));
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  // 按日期分组
  const dates = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const s of slots) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    return map;
  }, [slots]);

  const daySlots = dates.get(selectedDate) ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!selectedSlot) return setMsg("请先选择一个时段");
    if (!form.name.trim() || !form.class_name.trim() || !form.reason.trim())
      return setMsg("请完整填写所有必填项");
    if (!validatePhone(form.phone)) return setMsg("请输入 11 位手机号");
    if (!validateEmail(form.email)) return setMsg("请输入正确的邮箱");

    setSubmitting(true);
    const { data: apptId, error: bookError } = await supabase.rpc("book_appointment", {
      p_slot_id: selectedSlot.id,
      p_name: form.name,
      p_class: form.class_name,
      p_phone: form.phone,
      p_email: form.email,
      p_reason: form.reason,
    });

    if (bookError) {
      setMsg(bookError.message);
      router.refresh();
      setSubmitting(false);
      return;
    }

    // 更新选填字段
    if (apptId && (form.age || form.gender || form.emergency_contact || form.emergency_phone)) {
      await supabase.from("appointments").update({
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        emergency_contact: form.emergency_contact || null,
        emergency_phone: form.emergency_phone || null,
      }).eq("id", apptId);
    }

    setSubmitting(false);
    router.push(`/book/success?id=${apptId}`);
  }

  if (loading) return <p className="pt-10 text-center text-ink/50">正在加载可预约时段…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">预约咨询</h1>
      <p className="mt-2 text-sm text-ink/60">选择时段后填写信息，提交后等待咨询师确认。</p>

      {slots.length === 0 ? (
        <div className="card mt-8 text-center text-ink/60">
          近期暂无可预约时段，请过几天再来看看。
        </div>
      ) : (
        <>
          {/* 第一步：选日期 */}
          <section className="mt-8">
            <h2 className="label !text-base">① 选择日期</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...dates.keys()].map((d) => {
                const allTaken = dates.get(d)!.every((s) => s.is_taken);
                return (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition-colors ${
                      selectedDate === d
                        ? "border-pine bg-pine text-white"
                        : allTaken
                        ? "border-line bg-white text-ink/30"
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

          {/* 第二步：选时段 */}
          <section className="mt-6">
            <h2 className="label !text-base">② 选择时段</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  disabled={s.is_taken}
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-ink/30 ${
                    selectedSlot?.id === s.id
                      ? "border-pine bg-pine text-white"
                      : "border-line bg-white hover:border-pine"
                  }`}
                >
                  {hm(s.start_time)} – {hm(s.end_time)}
                  {s.is_taken && <div className="text-xs">已约满</div>}
                </button>
              ))}
            </div>
          </section>

          {/* 第三步：填写信息 */}
          <form onSubmit={submit} className="card mt-8 space-y-4">
            <h2 className="font-display text-lg font-bold">③ 填写预约信息</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">姓名 *</label>
                <input className="field" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">班级 *</label>
                <input className="field" placeholder="如：高二(3)班" value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
              </div>
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
            {/* 选填信息 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">年龄 <span className="text-ink/40 font-normal">（选填）</span></label>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={120}
                  placeholder="如：17"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div>
                <label className="label">性别 <span className="text-ink/40 font-normal">（选填）</span></label>
                <div className="flex gap-2 mt-1">
                  {([["male", "男"], ["female", "女"], ["other", "其他"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, gender: form.gender === val ? "" : val })}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                        form.gender === val
                          ? "border-pine bg-pine text-white"
                          : "border-line bg-white hover:border-pine"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">紧急联系人 <span className="text-ink/40 font-normal">（选填）</span></label>
                <input
                  className="field"
                  placeholder="姓名"
                  value={form.emergency_contact}
                  onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                />
              </div>
              <div>
                <label className="label">紧急联系人电话 <span className="text-ink/40 font-normal">（选填）</span></label>
                <input
                  className="field"
                  inputMode="numeric"
                  placeholder="手机号"
                  value={form.emergency_phone}
                  onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">想聊聊什么 *</label>
              <textarea
                className="field min-h-24"
                placeholder="简单描述一下来访原因，方便咨询师提前了解（内容严格保密）"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            {selectedSlot && (
              <p className="rounded-xl bg-pine-soft px-4 py-2.5 text-sm text-pine">
                已选：{prettyDate(selectedSlot.slot_date)} {hm(selectedSlot.start_time)} – {hm(selectedSlot.end_time)}
              </p>
            )}
            {msg && <p className="text-sm text-red-600">{msg}</p>}

            <button className="btn-primary w-full" disabled={submitting}>
              {submitting ? "提交中…" : "提交预约"}
            </button>
            <p className="text-center text-xs text-ink/50">
              提交后状态为「待确认」，咨询师确认后生效；如需取消请提前 48 小时
            </p>
          </form>
        </>
      )}
    </div>
  );
}
