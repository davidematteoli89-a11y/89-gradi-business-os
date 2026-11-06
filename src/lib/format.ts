import type { ISODate } from "@/lib/domain/types";

const tz = "UTC"; // le date ISO sono già nel giorno locale: evitiamo slittamenti di fuso

const fmt = {
  short: new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: tz }),
  long: new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: tz }),
  full: new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: tz }),
  weekday: new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: tz }),
  day: new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: tz }),
  month: new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: tz }),
  monthShort: new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: tz }),
};

const asDate = (iso: ISODate) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

export function formatDate(iso: ISODate, style: keyof typeof fmt = "short") {
  return fmt[style].format(asDate(iso)).replace(".", "");
}

/** "5 nov", oppure "5 nov 2025" se l'anno è diverso da quello di riferimento */
export function formatDateSmart(iso: ISODate, today: ISODate) {
  return iso.slice(0, 4) === today.slice(0, 4) ? formatDate(iso) : `${formatDate(iso)} ${iso.slice(0, 4)}`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeDay(days: number) {
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  if (days === -1) return "ieri";
  if (days > 1 && days < 7) return `tra ${days} giorni`;
  if (days > 0) return `tra ${days} giorni`;
  return `${-days} giorni fa`;
}

export function relativeTime(isoDateTime: string, now: Date = new Date()) {
  const diff = (now.getTime() - new Date(isoDateTime).getTime()) / 60000;
  if (diff < 1) return "adesso";
  if (diff < 60) return `${Math.round(diff)} min fa`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)} h fa`;
  const days = Math.round(diff / 1440);
  return days === 1 ? "ieri" : `${days} giorni fa`;
}

export function monthLabel(yyyyMm: string, short = false) {
  return (short ? fmt.monthShort : fmt.month).format(asDate(`${yyyyMm}-01`)).replace(".", "");
}

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
