"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ActionResult, InviteCode } from "@/lib/types";

export interface AddTeamMemberResult extends ActionResult {
  // false quand le membre a été créé sans email : pas d'invitation envoyée,
  // donc pas d'accès de connexion tant qu'un email n'est pas ajouté plus
  // tard (via "Modifier").
  invited?: boolean;
}

// Ajoute manuellement un équipier, sans passer par un code d'invitation.
// Seul le prénom est obligatoire ; tous les autres champs sont facultatifs :
// - avec un email : crée le compte et envoie l'invitation Supabase pour
//   choisir le mot de passe via /update-password (même lien que "mot de
//   passe oublié").
// - sans email : crée quand même le compte (requis par la contrainte
//   profiles.id -> auth.users.id) mais sans accès de connexion ni email
//   envoyé — juste une fiche équipe, utilisable tout de suite pour le
//   planning et le taux horaire.
export async function addTeamMember(
  _prevState: AddTeamMemberResult,
  formData: FormData
): Promise<AddTeamMemberResult> {
  await requireAdmin();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const tauxHoraireRaw = String(formData.get("taux_horaire") || "").trim();

  if (!firstName) {
    return { error: "Le prénom est obligatoire." };
  }

  let tauxHoraire: number | null = null;
  if (tauxHoraireRaw) {
    tauxHoraire = Number(tauxHoraireRaw.replace(",", "."));
    if (Number.isNaN(tauxHoraire) || tauxHoraire < 0) {
      return { error: "Le taux horaire doit être un nombre positif." };
    }
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const admin = createAdminClient();

  let userId: string;
  if (email) {
    const host = (await headers()).get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    const { data, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, phone: phone || null, role: "extra" },
        redirectTo: `${protocol}://${host}/auth/confirm?next=/update-password`,
      });

    if (inviteError || !data.user) {
      console.error("addTeamMember failed:", inviteError);
      return {
        error:
          inviteError?.code === "email_exists"
            ? "Un compte existe déjà avec cet email."
            : `Impossible d'ajouter ce membre (${inviteError?.message}).`,
      };
    }
    userId = data.user.id;
  } else {
    const { data, error: createError } = await admin.auth.admin.createUser({
      user_metadata: { full_name: fullName, phone: phone || null, role: "extra" },
    });

    if (createError || !data.user) {
      console.error("addTeamMember (sans email) failed:", createError);
      return {
        error: `Impossible d'ajouter ce membre (${createError?.message}).`,
      };
    }
    userId = data.user.id;
  }

  if (tauxHoraire !== null) {
    const supabase = await createClient();
    const { error: tauxError } = await supabase
      .from("profiles")
      .update({ taux_horaire: tauxHoraire })
      .eq("id", userId);
    if (tauxError) {
      console.error("addTeamMember taux_horaire failed:", tauxError);
    }
  }

  revalidatePath("/dashboard/team");
  return { success: true, invited: Boolean(email) };
}

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
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const tauxHoraireRaw = String(formData.get("taux_horaire") || "").trim();
  const previousEmail = String(formData.get("previousEmail") || "")
    .trim()
    .toLowerCase();

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

  // Une fiche créée sans email n'a pas de compte de connexion actif : lui en
  // ajouter un ici active aussi l'accès (met à jour l'email d'authentification
  // et envoie un lien pour choisir le mot de passe).
  const activatingEmail = Boolean(email) && email !== previousEmail;
  if (activatingEmail) {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    });
    if (authError) {
      console.error("updateExtra (email) failed:", authError);
      return {
        error:
          authError.code === "email_exists"
            ? "Un compte existe déjà avec cet email."
            : `Impossible de mettre à jour l'email (${authError.message}).`,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
      email: email || null,
      taux_horaire: tauxHoraire,
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de mettre à jour ce profil." };
  }

  if (activatingEmail) {
    const host = (await headers()).get("host");
    const protocol = host?.startsWith("localhost") ? "http" : "https";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${protocol}://${host}/auth/confirm?next=/update-password`,
      }
    );
    if (resetError) {
      console.error("updateExtra (activation email) failed:", resetError);
    }
  }

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function deleteInviteCode(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  // Un code encore en attente (non utilisé) ne peut pas être supprimé, pour
  // toujours garder au moins un code disponible à distribuer. La condition
  // est appliquée ici en plus du bouton masqué côté UI, pour ne pas
  // dépendre uniquement du client.
  const { data, error } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", id)
    .eq("utilise", true)
    .select("id");

  if (error) {
    // Next.js masque le message d'une erreur *jetée* (throw) depuis une
    // Server Action en production — on renvoie donc le résultat au lieu de
    // throw, seul moyen de faire remonter la vraie cause jusqu'au client.
    console.error("deleteInviteCode failed:", error);
    return { error: `Impossible de supprimer ce code (${error.message}).` };
  }
  if (!data || data.length === 0) {
    return { error: "Seuls les codes déjà utilisés peuvent être supprimés." };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
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
