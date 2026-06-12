-- ============================================================
-- 初始化数据：默认预约须知 + 未来14天的示例时段
-- 在运行完 schema.sql 之后运行
-- ============================================================

-- 默认预约须知（之后可在管理后台直接修改）
insert into public.site_settings (key, value) values
('booking_notice',
'1. 请提前 5 分钟到达咨询室，保持手机静音。
2. 如需取消预约，请至少提前 48 小时在"我的预约"中操作。
3. 距开始时间不足 48 小时如有特殊情况，请直接联系咨询师处理。
4. 无故失约累计 2 次将暂停预约权限。
5. 咨询内容严格保密，请放心倾诉。')
on conflict (key) do nothing;

-- 生成未来 14 天（跳过周末）的示例时段：
-- 上午 09:00、10:00，下午 14:00、15:00、16:00，每场 50 分钟
-- 不需要可以删掉这段，或之后在管理后台逐个删除/屏蔽
insert into public.time_slots (slot_date, start_time, end_time)
select d::date, t.start_time, t.end_time
from generate_series(current_date + 1, current_date + 14, interval '1 day') as d
cross join (values
  (time '09:00', time '09:50'),
  (time '10:00', time '10:50'),
  (time '14:00', time '14:50'),
  (time '15:00', time '15:50'),
  (time '16:00', time '16:50')
) as t(start_time, end_time)
where extract(isodow from d) < 6  -- 1-5 周一到周五
on conflict (slot_date, start_time) do nothing;

-- ============================================================
-- 设置管理员：先用你的邮箱在网站上注册一个账号，然后运行下面这句
-- （把邮箱换成你自己的）
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
