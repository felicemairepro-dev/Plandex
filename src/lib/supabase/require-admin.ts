import "server-only";
import { getProfile } from "@/lib/supabase/get-profile";

export async function requireAdmin() {
  const { user, profile } = await getProfile();
  if (!user || !profile || profile.role !== "admin") {
    throw new Error("Accès refusé.");
  }
  return { user, profile };
}
