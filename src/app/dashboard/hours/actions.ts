"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ActionResult } from "@/lib/types";

export async function correctTimeEntry(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const date = String(formData.get("date") || "");
  const arrivee = String(formData.get("heure_arrivee") || "");
  const depart = String(formData.get("heure_depart") || "");

  if (!id || !date) {
    return { error: "Pointage invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({
      heure_arrivee: arrivee ? new Date(`${date}T${arrivee}:00`).toISOString() : null,
      heure_depart: depart ? new Date(`${date}T${depart}:00`).toISOString() : null,
      corrige_par_admin: true,
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de corriger ce pointage." };
  }

  revalidatePath("/dashboard/hours");
  return { success: true };
}
