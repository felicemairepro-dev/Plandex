"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { sendShiftAssignedEmail } from "@/lib/email";
import type { ActionResult, ShiftStatus } from "@/lib/types";

function readShiftFields(formData: FormData) {
  return {
    date: String(formData.get("date") || ""),
    heure_debut: String(formData.get("heure_debut") || ""),
    heure_fin: String(formData.get("heure_fin") || ""),
    lieu: String(formData.get("lieu") || "").trim(),
    poste: String(formData.get("poste") || "").trim(),
    extra_id: String(formData.get("extra_id") || ""),
    statut: String(formData.get("statut") || "confirme") as ShiftStatus,
  };
}

function validateShift(fields: ReturnType<typeof readShiftFields>) {
  if (
    !fields.date ||
    !fields.heure_debut ||
    !fields.heure_fin ||
    !fields.lieu ||
    !fields.poste ||
    !fields.extra_id
  ) {
    return "Tous les champs sont obligatoires.";
  }
  if (fields.heure_fin <= fields.heure_debut) {
    return "L'heure de fin doit être après l'heure de début.";
  }
  return null;
}

export async function createShift(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const fields = readShiftFields(formData);
  const validationError = validateShift(fields);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({ ...fields, cree_par: user.id })
    .select("id, date, heure_debut, heure_fin, lieu, poste")
    .single();

  if (error || !shift) {
    return { error: "Impossible de créer ce créneau." };
  }

  const { data: extra } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", fields.extra_id)
    .single<{ email: string | null; full_name: string | null }>();

  if (extra?.email) {
    await sendShiftAssignedEmail({
      to: extra.email,
      extraFirstName: extra.full_name?.split(" ")[0] || "",
      shift,
    });
  }

  await supabase.from("notifications").insert({
    user_id: fields.extra_id,
    message: `Nouveau créneau assigné le ${new Date(`${fields.date}T00:00:00`).toLocaleDateString("fr-FR")} (${fields.poste})`,
  });

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateShift(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const fields = readShiftFields(formData);
  const validationError = validateShift(fields);
  if (!id || validationError) {
    return { error: validationError || "Créneau invalide." };
  }

  const supabase = await createClient();

  const { data: previousShift } = await supabase
    .from("shifts")
    .select("extra_id, remplacement_demande")
    .eq("id", id)
    .single<{ extra_id: string; remplacement_demande: boolean }>();

  const { error } = await supabase
    .from("shifts")
    .update({ ...fields, remplacement_demande: false })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de modifier ce créneau." };
  }

  if (previousShift?.remplacement_demande) {
    await supabase.from("notifications").insert({
      user_id: previousShift.extra_id,
      message: `Votre demande de remplacement pour le créneau du ${new Date(`${fields.date}T00:00:00`).toLocaleDateString("fr-FR")} a été traitée.`,
    });
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelShift(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ statut: "annule" satisfies ShiftStatus, remplacement_demande: false })
    .eq("id", id);

  if (error) {
    throw new Error("Impossible d'annuler ce créneau.");
  }

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard");
}
