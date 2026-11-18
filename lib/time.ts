import { DateTime } from "luxon";

export const ZONE = "Asia/Karachi";

export const fromPKTInput = (s: string) => {
  return DateTime.fromISO(s, { zone: ZONE }).toUTC().toJSDate();
};

export const toPKTInput = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat("yyyy-LL-dd'T'HH:mm");
};

export const fmtPKT = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat("ccc, dd LLL yyyy, h:mm a") + " PKT";
};

export const fmtPKTShort = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat("dd LLL yyyy, h:mm a") + " PKT";
};

export const fmtPKTDateOnly = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat("dd LLL yyyy");
};

export const fmtPKTTimeOnly = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return DateTime.fromJSDate(date).setZone(ZONE).toFormat("h:mm a") + " PKT";
};

export const schedule = (
  e: { startAt: Date | string; endAt: Date | string },
  now = new Date()
): "UPCOMING" | "ONGOING" | "COMPLETED" => {
  const start = typeof e.startAt === "string" ? new Date(e.startAt) : e.startAt;
  const end = typeof e.endAt === "string" ? new Date(e.endAt) : e.endAt;
  if (now < start) return "UPCOMING";
  if (now <= end) return "ONGOING";
  return "COMPLETED";
};

