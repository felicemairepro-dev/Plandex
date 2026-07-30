export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  // Semaine démarrant le lundi (day 0 = dimanche)
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function isSameDay(a: Date, b: Date) {
  return toISODate(a) === toISODate(b);
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

const APP_TIMEZONE = "Europe/Paris";

// Convertit une date + heure "murale" (ex: 11:45 vu par un utilisateur en
// France) en horodatage UTC exact. Nécessaire pour toute écriture serveur
// dans une colonne timestamptz : le serveur (Netlify/Node) peut tourner
// dans un fuseau différent (souvent UTC), donc `new Date(\`${date}T${time}\`)`
// interpréterait à tort l'heure saisie comme étant déjà dans le fuseau du
// serveur, décalant le résultat de plusieurs heures.
export function parisWallTimeToISOString(dateStr: string, timeStr: string) {
  const asIfUTC = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(asIfUTC);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  // "24" apparaît parfois à la place de "00" avec hour12: false selon l'environnement.
  const hour = map.hour === "24" ? "00" : map.hour;

  const parisInstantReadAsUTC = new Date(
    `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}.000Z`
  );
  const offsetMs = asIfUTC.getTime() - parisInstantReadAsUTC.getTime();
  return new Date(asIfUTC.getTime() + offsetMs).toISOString();
}

// Liste des dates (ISO, incluses) entre deux dates, plafonnée à `maxDays`
// pour éviter la création accidentelle de centaines de créneaux.
export function getDateRange(
  startISO: string,
  endISO: string,
  maxDays = 31
): string[] {
  if (!startISO || !endISO) return [];
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return [];
  }
  const dates: string[] = [];
  let cursor = start;
  let i = 0;
  while (cursor <= end && i < maxDays) {
    dates.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
    i++;
  }
  return dates;
}
