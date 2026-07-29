// Fonction planifiée Netlify (remplace Vercel Cron) : appelle chaque jour
// la route Next.js /api/cron/reminders, qui envoie le rappel de créneau
// du lendemain. Toute la logique reste dans la route Next.js — cette
// fonction ne fait que la déclencher au bon horaire.

const handler = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error(
      "scheduled-reminders: URL ou CRON_SECRET manquant dans les variables d'environnement Netlify."
    );
    return;
  }

  const response = await fetch(`${siteUrl}/api/cron/reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  console.log("scheduled-reminders:", response.status, body);
};

export default handler;

export const config = {
  // Tous les jours à 17h00 UTC (~18h à Paris en hiver, ajustez si besoin).
  schedule: "0 17 * * *",
};
