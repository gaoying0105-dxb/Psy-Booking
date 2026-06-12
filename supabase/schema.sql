-- ============================================================
-- 心理咨询预约系统 数据库结构
-- 在 Supabase Dashboard → SQL Editor 中整段粘贴运行一次即可
-- ============================================================

-- ---------- 1. 表结构 ----------

-- 用户资料表（与 Supabase Auth 的 auth.users 一一对应）
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  class_name text,
  phone      text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 可预约时段表（由管理员配置）
create table public.time_slots (
  id         bigint generated always as identity primary key,
  slot_date  date not null,
  start_time time not null,
  end_time   time not null,
  -- open = 开放预约, blocked = 被管理员屏蔽
  status     text not null default 'open' check (status in ('open', 'blocked')),
  created_at timestamptz not null default now(),
  unique (slot_date, start_time),
  check (end_time > start_time)
);

-- 预约记录表
create table public.appointments (
  id           bigint generated always as identity primary key,
  user_id      uuid   not null references public.profiles(id),
  slot_id      bigint not null references public.time_slots(id) on delete restrict,
  name         text not null,
  class_name   text not null,
  phone        text not null,
  email        text not null,
  reason       text not null,
  -- pending=待确认  confirmed=已确认  cancelled=已取消  rejected=已拒绝  no_show=失约
  status       text not null default 'pending'
               check (status in ('pending', 'confirmed', 'cancelled', 'rejected', 'no_show')),
  cancelled_by text, -- user / admin
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 核心约束：同一时段最多只能有一条"进行中"(待确认/已确认)的预约
-- 即使两个人同时点提交，数据库层面也保证不会重复预约
create unique index one_active_appointment_per_slot
  on public.appointments (slot_id)
  where status in ('pending', 'confirmed');

create index idx_appointments_user on public.appointments (user_id, created_at desc);

-- 站点设置（预约须知等，key-value 形式，方便以后扩展）
create table public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- 操作日志（预约/取消等关键动作留痕）
create table public.operation_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ---------- 2. 触发器 ----------

-- 新用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 自动维护 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_appointments_updated
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- 防止普通用户把自己的 role 改成 admin（提权攻击防护）
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception '无权修改角色';
  end if;
  return new;
end;
$$;

-- ---------- 3. 辅助函数 ----------

-- 判断当前登录用户是否为管理员
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- 把时段的日期+时间换算成北京时间的时间戳
create or replace function public.slot_starts_at(p_date date, p_time time)
returns timestamptz
language sql immutable
as $$
  select (p_date + p_time) at time zone 'Asia/Shanghai';
$$;

-- ---------- 4. 业务函数（核心逻辑都在数据库端强制执行）----------

-- 查询某日期范围内的可预约时段（含是否已被约满）
-- 用 security definer 是因为普通用户看不到别人的预约记录，
-- 但需要知道哪些时段已被占用
create or replace function public.get_available_slots(p_from date, p_to date)
returns table (
  id bigint, slot_date date, start_time time, end_time time, is_taken boolean
)
language sql stable security definer set search_path = public
as $$
  select
    s.id, s.slot_date, s.start_time, s.end_time,
    exists (
      select 1 from appointments a
      where a.slot_id = s.id and a.status in ('pending', 'confirmed')
    ) as is_taken
  from time_slots s
  where s.status = 'open'
    and s.slot_date between p_from and p_to
  order by s.slot_date, s.start_time;
$$;

-- 提交预约（包含：登录校验 / 失约黑名单 / 时段有效性 / 冲突检查）
create or replace function public.book_appointment(
  p_slot_id bigint,
  p_name text, p_class text, p_phone text, p_email text, p_reason text
)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_slot   time_slots;
  v_id     bigint;
  v_noshow int;
begin
  if auth.uid() is null then
    raise exception '请先登录';
  end if;

  -- 基本校验
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_class), '') = ''
     or coalesce(trim(p_phone), '') = '' or coalesce(trim(p_email), '') = ''
     or coalesce(trim(p_reason), '') = '' then
    raise exception '请完整填写所有必填项';
  end if;
  if p_phone !~ '^1\d{10}$' then
    raise exception '手机号格式不正确';
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception '邮箱格式不正确';
  end if;

  -- 失约 ≥ 2 次的用户禁止预约（对应需求：不守约记录用于限制预约权限）
  select count(*) into v_noshow
  from appointments
  where user_id = auth.uid() and status = 'no_show';
  if v_noshow >= 2 then
    raise exception '由于多次失约，您的预约权限已被暂停，请直接联系咨询师';
  end if;

  -- 同一用户同时只能有一条进行中的预约，防止刷占时段
  if exists (
    select 1 from appointments
    where user_id = auth.uid() and status in ('pending', 'confirmed')
  ) then
    raise exception '您已有一条进行中的预约，完成或取消后才能再次预约';
  end if;

  -- 锁定时段行，防并发
  select * into v_slot from time_slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'open' then
    raise exception '该时段不可预约';
  end if;
  if slot_starts_at(v_slot.slot_date, v_slot.start_time) <= now() then
    raise exception '该时段已过期';
  end if;
  if exists (
    select 1 from appointments
    where slot_id = p_slot_id and status in ('pending', 'confirmed')
  ) then
    raise exception '手慢了，该时段刚刚被别人预约';
  end if;

  insert into appointments (user_id, slot_id, name, class_name, phone, email, reason)
  values (auth.uid(), p_slot_id, trim(p_name), trim(p_class), trim(p_phone), trim(p_email), trim(p_reason))
  returning id into v_id;

  -- 顺手保存资料，下次预约自动填充
  update profiles
  set name = trim(p_name), class_name = trim(p_class), phone = trim(p_phone)
  where id = auth.uid();

  insert into operation_logs (user_id, action, detail)
  values (auth.uid(), 'book', jsonb_build_object('appointment_id', v_id, 'slot_id', p_slot_id));

  return v_id;
end;
$$;

-- 用户取消预约（48 小时规则在这里强制执行，前端无法绕过）
create or replace function public.cancel_appointment(p_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_appt appointments;
  v_slot time_slots;
begin
  select * into v_appt from appointments where id = p_id for update;

  if not found or v_appt.user_id <> auth.uid() then
    raise exception '预约不存在';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception '当前状态不可取消';
  end if;

  select * into v_slot from time_slots where id = v_appt.slot_id;

  -- 核心规则：距开始时间不足 48 小时不允许自行取消
  if slot_starts_at(v_slot.slot_date, v_slot.start_time) - now() <= interval '48 hours' then
    raise exception '距预约开始不足48小时，无法自行取消。如有特殊情况请联系咨询师，由咨询师在后台处理';
  end if;

  update appointments
  set status = 'cancelled', cancelled_by = 'user'
  where id = p_id;
  -- 取消后该时段自动恢复"可预约"——因为可约判断就是"没有进行中的预约"

  insert into operation_logs (user_id, action, detail)
  values (auth.uid(), 'cancel', jsonb_build_object('appointment_id', p_id));
end;
$$;

-- ---------- 5. 行级安全策略 (RLS) ----------
-- RLS 是 Supabase 的安全基石：前端直连数据库，靠这些策略控制谁能读写什么

alter table public.profiles       enable row level security;
alter table public.time_slots     enable row level security;
alter table public.appointments   enable row level security;
alter table public.site_settings  enable row level security;
alter table public.operation_logs enable row level security;

-- profiles：只能看/改自己的；管理员可以看所有
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- time_slots：所有人可读（首页/预约页要展示）；只有管理员能增删改
create policy "slots_select" on public.time_slots
  for select using (true);
create policy "slots_admin_insert" on public.time_slots
  for insert with check (public.is_admin());
create policy "slots_admin_update" on public.time_slots
  for update using (public.is_admin()) with check (public.is_admin());
create policy "slots_admin_delete" on public.time_slots
  for delete using (public.is_admin());

-- appointments：用户只能看自己的；管理员看所有、可更新状态
-- 注意：没有 insert 策略 —— 预约只能通过 book_appointment 函数提交
create policy "appt_select" on public.appointments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "appt_admin_update" on public.appointments
  for update using (public.is_admin()) with check (public.is_admin());

-- site_settings：所有人可读；管理员可写
create policy "settings_select" on public.site_settings
  for select using (true);
create policy "settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- operation_logs：仅管理员可读（写入都走 security definer 函数）
create policy "logs_admin_select" on public.operation_logs
  for select using (public.is_admin());

-- ---------- 6. 函数执行权限 ----------
grant execute on function public.get_available_slots(date, date) to anon, authenticated;
grant execute on function public.book_appointment(bigint, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_appointment(bigint) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
