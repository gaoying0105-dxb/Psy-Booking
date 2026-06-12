# 心语预约 · 心理咨询预约系统

基于 **Next.js + Supabase** 的心理咨询在线预约网站，部署在 **Vercel**，全程免费额度运行。

## 功能

- 🗓 预约：选日期 → 选时段 → 填写信息（姓名/班级/手机/邮箱/来访原因）
- ✅ 确认页展示可配置的「预约须知」
- 👤 个人中心：预约记录、状态跟踪、48 小时前可自行取消
- 🛠 管理后台：预约确认/拒绝/取消、时段配置与屏蔽、失约标记（2 次禁约）、须知编辑
- 🔒 安全：Postgres RLS + 数据库函数强制执行业务规则，前端无法绕过

## 快速开始

1. 阅读 **docs/部署配置指南.md**（5 步上线，约 20 分钟）
2. 想看懂代码 → **docs/项目文档.md**

## 本地开发

```bash
cp .env.local.example .env.local  # 填入 Supabase 的 URL 和 anon key
npm install
npm run dev                        # http://localhost:3000
```

## 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres + RLS) · Vercel · GitHub Actions (数据库保活)
