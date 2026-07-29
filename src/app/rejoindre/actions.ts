"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function checkInviteCode(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();

  if (!code) {
    return { error: "Merci de saisir un code d'invitation." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_invite_code", {
    p_code: code,
  });

  if (error || !data) {
    return { error: "Ce code est invalide ou a déjà été utilisé." };
  }

  return { success: true };
}

export interface SignUpResult extends ActionResult {
  needsConfirmation?: boolean;
}

export async function signUpExtra(
  _prevState: SignUpResult,
  formData: FormData
): Promise<SignUpResult> {
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!code || !firstName || !lastName || !email || !password) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();

  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_invite_code",
    { p_code: code }
  );

  if (claimError || !claimed) {
    return { error: "Ce code est invalide ou a déjà été utilisé." };
  }

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Le rôle est toujours forcé à "extra" ici, quel que soit le code
      // utilisé — aucun compte admin ne peut être créé via ce formulaire.
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone || null,
        role: "extra",
      },
    },
  });

  if (signUpError || !data.user) {
    await supabase.rpc("release_invite_code", { p_code: code });
    return {
      error:
        signUpError?.code === "user_already_exists"
          ? "Un compte existe déjà avec cet email."
          : "Impossible de créer le compte pour le moment.",
    };
  }

  return { success: true, needsConfirmation: !data.session };
}
