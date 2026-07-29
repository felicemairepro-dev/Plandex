import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface ShiftEmailDetails {
  date: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  poste: string;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function shiftEmailLayout({
  greeting,
  intro,
  shift,
  outro,
}: {
  greeting: string;
  intro: string;
  shift: ShiftEmailDetails;
  outro: string;
}) {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="padding: 24px 0; border-bottom: 2px solid #2d5a3d;">
        <span style="font-size: 18px; font-weight: 700; color: #2b2a25;">Plandex</span>
      </div>
      <div style="padding: 24px 0;">
        <p style="color: #2b2a25; font-size: 16px;">${greeting}</p>
        <p style="color: #2b2a25; font-size: 16px;">${intro}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #726f62; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #2b2a25; font-size: 14px; font-weight: 600; text-align: right;">${formatDate(shift.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #726f62; font-size: 14px;">Horaires</td>
            <td style="padding: 8px 0; color: #2b2a25; font-size: 14px; font-weight: 600; text-align: right;">${formatTime(shift.heure_debut)} – ${formatTime(shift.heure_fin)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #726f62; font-size: 14px;">Lieu</td>
            <td style="padding: 8px 0; color: #2b2a25; font-size: 14px; font-weight: 600; text-align: right;">${shift.lieu}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #726f62; font-size: 14px;">Poste</td>
            <td style="padding: 8px 0; color: #2b2a25; font-size: 14px; font-weight: 600; text-align: right;">${shift.poste}</td>
          </tr>
        </table>
        <p style="color: #726f62; font-size: 14px;">${outro}</p>
      </div>
    </div>
  `;
}

export async function sendShiftAssignedEmail({
  to,
  extraFirstName,
  shift,
}: {
  to: string;
  extraFirstName: string;
  shift: ShiftEmailDetails;
}) {
  if (!resend) {
    console.warn(
      "RESEND_API_KEY absent : email de créneau non envoyé (voir .env.local.example)."
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Plandex <onboarding@resend.dev>",
    to,
    subject: `Nouveau créneau — ${formatDate(shift.date)}`,
    html: shiftEmailLayout({
      greeting: `Bonjour ${extraFirstName},`,
      intro: "Un nouveau créneau vous a été assigné :",
      shift,
      outro: "Connectez-vous à votre tableau de bord pour plus de détails.",
    }),
  });

  if (error) {
    console.error("Échec de l'envoi de l'email de créneau :", error);
  }
}

export async function sendShiftReminderEmail({
  to,
  extraFirstName,
  shift,
}: {
  to: string;
  extraFirstName: string;
  shift: ShiftEmailDetails;
}) {
  if (!resend) {
    console.warn(
      "RESEND_API_KEY absent : rappel de créneau non envoyé (voir .env.local.example)."
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Plandex <onboarding@resend.dev>",
    to,
    subject: `Rappel — créneau demain (${formatTime(shift.heure_debut)})`,
    html: shiftEmailLayout({
      greeting: `Bonjour ${extraFirstName},`,
      intro: "Petit rappel : vous avez un créneau prévu demain.",
      shift,
      outro: "À demain !",
    }),
  });

  if (error) {
    console.error("Échec de l'envoi du rappel de créneau :", error);
  }
}
