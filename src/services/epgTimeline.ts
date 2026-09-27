export const EPG_WINDOW_HOURS = 4;
export const EPG_SLOT_MINUTES = 30;
export const EPG_PIXELS_PER_MINUTE = 4;

export function alignToEpgSlot(date: Date) {
  const aligned = new Date(date);
  aligned.setMinutes(Math.floor(aligned.getMinutes() / EPG_SLOT_MINUTES) * EPG_SLOT_MINUTES, 0, 0);
  return aligned;
}

export function shiftHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function epgProgrammeLayout(startsAt: string, endsAt: string, windowStart: Date, windowEnd: Date) {
  const start = Math.max(new Date(startsAt).getTime(), windowStart.getTime());
  const end = Math.min(new Date(endsAt).getTime(), windowEnd.getTime());
  const left = Math.max(0, (start - windowStart.getTime()) / 60_000 * EPG_PIXELS_PER_MINUTE);
  const width = Math.max(0, (end - start) / 60_000 * EPG_PIXELS_PER_MINUTE);
  return { left, width };
}

export function isProgrammeLive(startsAt: string, endsAt: string, now: number) {
  return new Date(startsAt).getTime() <= now && new Date(endsAt).getTime() > now;
}
