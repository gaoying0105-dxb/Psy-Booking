import { createBrowserClient } from "@supabase/ssr";

// 浏览器端 Supabase 客户端（在客户端组件中使用）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
