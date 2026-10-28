"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { parisWallTimeToISOString } from "@/lib/date-utils";
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
      heure_arrivee: arrivee ? parisWallTimeToISOString(date, arrivee) : null,
      heure_depart: depart ? parisWallTimeToISOString(date, depart) : null,
      corrige_par_admin: true,
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de corriger ce pointage." };
  }

  revalidatePath("/dashboard/hours");
  return { success: true };
}

// Crée un pointage pour un créneau qui n'en a encore aucun — permet à un
// admin de saisir lui-même l'arrivée/le départ d'un équipier qui n'a jamais
// pointé via son propre compte.
export async function createTimeEntry(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const shiftId = String(formData.get("shiftId") || "");
  const extraId = String(formData.get("extraId") || "");
  const date = String(formData.get("date") || "");
  const arrivee = String(formData.get("heure_arrivee") || "");
  const depart = String(formData.get("heure_depart") || "");

  if (!shiftId || !extraId || !date) {
    return { error: "Créneau invalide." };
  }
  if (!arrivee && !depart) {
    return { error: "Renseignez au moins une heure." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").insert({
    shift_id: shiftId,
    extra_id: extraId,
    heure_arrivee: arrivee ? parisWallTimeToISOString(date, arrivee) : null,
    heure_depart: depart ? parisWallTimeToISOString(date, depart) : null,
    corrige_par_admin: true,
  });

  if (error) {
    console.error("createTimeEntry failed:", error);
    return { error: `Impossible d'ajouter ce pointage (${error.message}).` };
  }

  revalidatePath("/dashboard/hours");
  return { success: true };
}
