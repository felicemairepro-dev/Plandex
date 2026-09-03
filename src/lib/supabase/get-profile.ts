import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Every dashboard layout/page calls getProfile() independently. React's
// per-request cache dedupes those into a single auth.getUser() + profile
// fetch instead of re-hitting Supabase once per component.
export const getProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, actif, taux_horaire")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
});
