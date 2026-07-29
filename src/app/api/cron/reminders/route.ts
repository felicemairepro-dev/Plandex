import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendShiftReminderEmail } from "@/lib/email";
import { addDays, toISODate } from "@/lib/date-utils";

interface ShiftForReminder {
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  poste: string;
  extra: { id: string; full_name: string | null; email: string | null } | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = toISODate(addDays(new Date(), 1));
  const supabase = createAdminClient();

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select(
      "id, date, heure_debut, heure_fin, lieu, poste, extra:profiles!shifts_extra_id_fkey(id, full_name, email)"
    )
    .eq("date", tomorrow)
    .eq("statut", "confirme")
    .returns<ShiftForReminder[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const shift of shifts ?? []) {
    if (!shift.extra?.email) continue;
    await sendShiftReminderEmail({
      to: shift.extra.email,
      extraFirstName: shift.extra.full_name?.split(" ")[0] || "",
      shift,
    });
    sent += 1;
  }

  return NextResponse.json({ date: tomorrow, shifts: shifts?.length ?? 0, sent });
}
