"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ActionResult, InviteCode } from "@/lib/types";

// Bascule le statut payé/non payé de tous les pointages effectués d'un
// extra. Le statut est persisté sur time_entries.paye — un rechargement
// de page ne le réinitialise plus. Quand on marque comme payé, l'extra
// reçoit aussi une notification ; annuler par erreur (recliquer) ne
// renvoie pas de notification.
export async function setExtraPaidStatus(
  extraId: string,
  entryIds: string[],
  paye: boolean,
  message?: string
): Promise<ActionResult> {
  await requireAdmin();

  if (entryIds.length === 0) {
    return { error: "Aucun pointage à mettre à jour." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ paye, paye_le: paye ? new Date().toISOString() : null })
    .eq("extra_id", extraId)
    .in("id", entryIds);

  if (error) {
    console.error("setExtraPaidStatus failed:", error);
    return {
      error: `Impossible de mettre à jour le statut de paiement (${error.message}).`,
    };
  }

  if (paye && message) {
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: extraId,
      message,
    });
    if (notifError) {
      console.error("setExtraPaidStatus notification failed:", notifError);
    }
  }

  revalidatePath("/dashboard/team");
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

// Supprime un équipier. Deux variantes :
// - keepHours = false : suppression complète du compte auth, qui
//   entraîne (via ON DELETE CASCADE) la suppression du profil, de ses
//   créneaux et de ses pointages.
// - keepHours = true : le compte auth est conservé pour ne pas casser
//   la chaîne de clés étrangères (donc garder les pointages), mais il
//   est désactivé, marqué "supprimé" (masqué de la liste équipe) et son
//   email est libéré pour permettre une réinscription avec un nouveau
//   code d'invitation, y compris avec la même adresse.
export async function deleteExtra(
  extraId: string,
  keepHours: boolean
): Promise<ActionResult> {
  await requireAdmin();

  const admin = createAdminClient();

  if (!keepHours) {
    const { error } = await admin.auth.admin.deleteUser(extraId);
    if (error) {
      console.error("deleteExtra (full) failed:", error);
      return {
        error: `Impossible de supprimer ce compte (${error.message}).`,
      };
    }
    revalidatePath("/dashboard/team");
    return { success: true };
  }

  const freedEmail = `supprime-${extraId}@plandex.invalid`;
  const { error: authError } = await admin.auth.admin.updateUserById(
    extraId,
    { email: freedEmail, email_confirm: true }
  );
  if (authError) {
    console.error("deleteExtra (keepHours, auth) failed:", authError);
    return {
      error: `Impossible de supprimer ce compte (${authError.message}).`,
    };
  }

  // La mise à jour de "actif" passe par le trigger anti-escalade de
  // privilèges (migration 0007), qui exige une session admin authentifiée
  // (auth.uid() = un admin) plutôt que la clé service-role : on utilise
  // donc le client de la session en cours, déjà vérifiée admin ci-dessus.
  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ actif: false, supprime: true, email: freedEmail })
    .eq("id", extraId);
  if (profileError) {
    console.error("deleteExtra (keepHours, profile) failed:", profileError);
    return {
      error: `Impossible de supprimer ce compte (${profileError.message}).`,
    };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
}
