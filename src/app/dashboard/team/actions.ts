"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { ActionResult } from "@/lib/types";

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function inviteExtra(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!firstName || !lastName || !email) {
    return { error: "Prénom, nom et email sont obligatoires." };
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const admin = createAdminClient();
  const origin = await getOrigin();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, phone: phone || null, role: "extra" },
    redirectTo: `${origin}/update-password`,
  });

  if (error) {
    return {
      error:
        error.code === "email_exists"
          ? "Un compte existe déjà avec cet email."
          : "Impossible d'inviter cet extra pour le moment.",
    };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
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

  if (!id || !firstName || !lastName) {
    return { error: "Prénom et nom sont obligatoires." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de mettre à jour ce profil." };
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
