import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Les dates de publication sont stockées en heure locale « murale » ("2026-11-03T18:30"),
 * sans fuseau : une publication prévue à 18h30 reste à 18h30, quel que soit le poste utilisé.
 */
export const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function parseLocal(value: string): Date {
  return parse(value, LOCAL_FORMAT, new Date());
}

export function toLocal(date: Date): string {
  return format(date, LOCAL_FORMAT);
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function postDayKey(scheduledAt: string | null): string | null {
  return scheduledAt ? scheduledAt.slice(0, 10) : null;
}

export function timeOf(scheduledAt: string): string {
  return scheduledAt.slice(11, 16);
}

/** Remplace la date d'une date-heure locale en conservant l'heure. */
export function withDay(scheduledAt: string | null, day: string, fallbackTime = "12:00"): string {
  return `${day}T${scheduledAt ? timeOf(scheduledAt) : fallbackTime}`;
}

export function fmt(date: Date, pattern: string): string {
  return format(date, pattern, { locale: fr });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lundi de la semaine contenant la date (AAAA-MM-JJ). */
export function mondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return format(d, "yyyy-MM-dd");
}

function dayLabel(d: Date): string {
  return d.getDate() === 1 ? "1er" : String(d.getDate());
}

/** « Semaine du 26 octobre au 1er novembre » / « Semaine du 2 au 8 novembre ». */
export function weekListName(monday: string): string {
  const start = parse(monday, "yyyy-MM-dd", new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = sameMonth ? dayLabel(start) : `${dayLabel(start)} ${format(start, "MMMM", { locale: fr })}`;
  return `Semaine du ${startLabel} au ${dayLabel(end)} ${format(end, "MMMM", { locale: fr })}`;
}

export function addDaysKey(day: string, n: number): string {
  const d = parse(day, "yyyy-MM-dd", new Date());
  d.setDate(d.getDate() + n);
  return format(d, "yyyy-MM-dd");
}
