"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Shift, TimeEntry } from "@/lib/types";

interface ClockResult extends ActionResult {
  entry?: TimeEntry;
}

export async function clockIn(shiftId: string): Promise<ClockResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("clock_in", { p_shift_id: shiftId })
    .single<TimeEntry>();

  if (error || !data) {
    return { error: "Impossible d'enregistrer l'arrivée." };
  }

  revalidatePath("/dashboard");
  return { success: true, entry: data };
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ lu: true }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("user_id", user.id)
    .eq("lu", false);
  revalidatePath("/dashboard");
}

interface RequestReplacementResult extends ActionResult {
  shift?: Shift;
}

export async function requestReplacement(
  shiftId: string
): Promise<RequestReplacementResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("request_shift_replacement", { p_shift_id: shiftId })
    .single<Shift>();

  if (error || !data) {
    return {
      error:
        "Impossible de demander un remplacement pour ce créneau.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true, shift: data };
}

export async function clockOut(shiftId: string): Promise<ClockResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("clock_out", { p_shift_id: shiftId })
    .single<TimeEntry>();

  if (error || !data) {
    return { error: "Impossible d'enregistrer le départ." };
  }

  revalidatePath("/dashboard");
  return { success: true, entry: data };
}
