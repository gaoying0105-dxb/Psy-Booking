import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/counselor");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "counselor" && profile?.role !== "admin") redirect("/");

  return <>{children}</>;
}
