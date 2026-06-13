import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

function formatTime(t: string) {
  return t.slice(0, 5); // "09:00:00" → "09:00"
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${y}年${m}月${day}日`;
}

export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json();
  if (!appointmentId) {
    return NextResponse.json({ error: "缺少 appointmentId" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("*, time_slots(slot_date, start_time, end_time)")
    .eq("id", appointmentId)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: "预约记录不存在" }, { status: 404 });
  }

  const slot = appt.time_slots;
  if (!slot) {
    return NextResponse.json({ error: "时段信息缺失" }, { status: 500 });
  }

  const timeStr = `${formatDate(slot.slot_date)} ${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`;
  const replyLines = (appt.reply_message ?? "").split("\n").filter(Boolean);
  const detailHtml = replyLines.map((l: string) => `<p style="margin:4px 0">${l}</p>`).join("");

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2d3a2e">
  <h2 style="color:#3a6b4a;margin-bottom:8px">您的咨询预约已确认 ✓</h2>
  <p>您好，${appt.name}，您的预约已由咨询师确认，以下是详情：</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr>
      <td style="padding:8px 12px;background:#f5f7f5;border-radius:8px 0 0 8px;width:90px;color:#666">预约时间</td>
      <td style="padding:8px 12px;background:#f5f7f5;border-radius:0 8px 8px 0;font-weight:600">${timeStr}</td>
    </tr>
  </table>
  <div style="background:#eef4f0;border-radius:10px;padding:14px 16px;margin:12px 0">
    ${detailHtml || "<p style='margin:0;color:#666'>（无额外说明）</p>"}
  </div>
  <p style="margin-top:20px;font-size:13px;color:#888">
    如有疑问或需要调整，请尽早联系咨询师。<br/>
    祝您一切顺利。
  </p>
  <p style="margin-top:24px;font-size:13px;color:#aaa">— 心语预约</p>
</div>`;

  const transporter = nodemailer.createTransport({
    host: "smtp.126.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"心语预约" <${process.env.SMTP_USER}>`,
      to: appt.email,
      subject: `【心语预约】您的咨询预约已确认（${timeStr}）`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "邮件发送失败：" + message }, { status: 500 });
  }
}
