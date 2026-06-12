// 时间与文案的小工具函数（统一按北京时间处理）

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/** "09:00:00" -> "09:00" */
export function hm(t: string) {
  return t.slice(0, 5);
}

/** 时段开始时间（北京时间）对应的 Date 对象 */
export function slotStartDate(slot_date: string, start_time: string) {
  // 形如 "2026-06-15T09:00:00+08:00"，明确指定北京时区，
  // 这样无论访问者本地在哪个时区，算出的时间点都一致
  const t = start_time.length === 5 ? start_time + ":00" : start_time;
  return new Date(`${slot_date}T${t}+08:00`);
}

/** "2026-06-15" -> "6月15日 周一" */
export function prettyDate(d: string) {
  const m = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  // 04:00 UTC 即北京时间当天中午 12 点，用 getUTCDay 可稳定取得"北京时间这天是周几"
  const w = new Date(`${d}T04:00:00Z`).getUTCDay();
  return `${m}月${day}日 周${WEEKDAYS[w]}`;
}

/** 距时段开始还有多少小时（可为负） */
export function hoursUntil(slot_date: string, start_time: string) {
  return (slotStartDate(slot_date, start_time).getTime() - Date.now()) / 36e5;
}

export const STATUS_TEXT: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  cancelled: "已取消",
  rejected: "已拒绝",
  no_show: "失约",
};

export function validatePhone(p: string) {
  return /^1\d{10}$/.test(p);
}

export function validateEmail(e: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}
