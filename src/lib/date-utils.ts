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
