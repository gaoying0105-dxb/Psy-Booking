// 与数据库表对应的 TypeScript 类型

export type AppointmentStatus =
  | "pending"    // 待确认
  | "confirmed"  // 已确认
  | "cancelled"  // 已取消
  | "rejected"   // 已拒绝
  | "no_show";   // 失约

export interface AvailableSlot {
  id: number;
  slot_date: string;  // "2026-06-15"
  start_time: string; // "09:00:00"
  end_time: string;
  is_taken: boolean;
}

export interface TimeSlot {
  id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: "open" | "blocked";
}

export interface Appointment {
  id: number;
  user_id: string;
  slot_id: number;
  name: string;
  class_name: string;
  phone: string;
  email: string;
  reason: string;
  age?: number | null;
  gender?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  reply_message?: string | null;
  status: AppointmentStatus;
  cancelled_by: string | null;
  created_at: string;
  time_slots: {
    slot_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  class_name: string | null;
  phone: string | null;
  role: "user" | "admin";
}
