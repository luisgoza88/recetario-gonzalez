/** Calendar dates in the household's Colombian time zone, independent of server UTC. */
export function householdDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Legacy cycle: 12 cooking days starting Jan 6, 2026; Sunday has no entry. */
export function menuCycleDay(date = new Date()): number {
  const day = new Date(`${householdDate(date)}T12:00:00Z`);
  const start = new Date("2026-01-06T12:00:00Z");
  if (day.getUTCDay() === 0) return -1;
  if (day < start) return -2;
  const elapsed = Math.round((day.getTime() - start.getTime()) / 86400000);
  const fullWeeks = Math.floor(elapsed / 7);
  let cookingDays = fullWeeks * 6;
  for (let i = fullWeeks * 7; i < elapsed; i++) {
    if ((start.getUTCDay() + i) % 7 !== 0) cookingDays++;
  }
  return cookingDays % 12;
}
