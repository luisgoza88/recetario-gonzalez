const DEFAULT_LOCALE = "es-CO";

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(DEFAULT_LOCALE, options);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(DEFAULT_LOCALE);
}

export function formatShortDate(date: Date | string): string {
  return formatDate(date, { weekday: "short", day: "numeric", month: "short" });
}

export function formatLongDate(date: Date | string): string {
  return formatDate(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
