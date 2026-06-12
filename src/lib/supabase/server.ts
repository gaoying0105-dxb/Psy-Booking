import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// 服务端 Supabase 客户端（在服务端组件 / Route Handler 中使用）
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在服务端组件中调用 set 会报错，可安全忽略
            // （middleware 会负责刷新会话）
          }
        },
      },
    }
  );
}
