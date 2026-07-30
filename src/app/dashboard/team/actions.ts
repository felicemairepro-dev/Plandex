"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ActionResult, InviteCode } from "@/lib/types";

export async function markMonthPaid(
  extraId: string,
  mois: string,
  montant: number
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    extra_id: extraId,
    mois,
    montant,
    paye_par: user.id,
  });

  if (error) {
    return { error: "Impossible d'enregistrer ce paiement." };
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hours");
  return { success: true };
}

export async function unmarkMonthPaid(
  extraId: string,
  mois: string
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("extra_id", extraId)
    .eq("mois", mois);

  if (error) {
    return { error: "Impossible d'annuler ce paiement." };
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/hours");
  return { success: true };
}

interface GenerateCodeResult extends ActionResult {
  code?: InviteCode;
}

export async function generateInviteCode(): Promise<GenerateCodeResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_invite_code")
    .single<InviteCode>();

  if (error || !data) {
    return { error: "Impossible de générer un code pour le moment." };
  }

  revalidatePath("/dashboard/team");
  return { success: true, code: data };
}

export async function updateExtra(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const tauxHoraireRaw = String(formData.get("taux_horaire") || "").trim();

  if (!id || !firstName || !lastName) {
    return { error: "Prénom et nom sont obligatoires." };
  }

  let tauxHoraire: number | null = null;
  if (tauxHoraireRaw) {
    tauxHoraire = Number(tauxHoraireRaw.replace(",", "."));
    if (Number.isNaN(tauxHoraire) || tauxHoraire < 0) {
      return { error: "Le taux horaire doit être un nombre positif." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
      taux_horaire: tauxHoraire,
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de mettre à jour ce profil." };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function deleteInviteCode(id: string) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("invite_codes").delete().eq("id", id);

  if (error) {
    throw new Error("Impossible de supprimer ce code.");
  }

  revalidatePath("/dashboard/team");
}

export async function toggleExtraActive(id: string, actif: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ actif })
    .eq("id", id);

  if (error) {
    throw new Error("Impossible de mettre à jour le statut.");
  }

  revalidatePath("/dashboard/team");
}
