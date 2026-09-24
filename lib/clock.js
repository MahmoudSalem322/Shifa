/* Wall-clock time in Gaza, independent of the machine's time zone.

   Appointment slots are "HH:MM on YYYY-MM-DD" in the clinic's local time.
   The server usually runs in UTC (Render, containers), so "now", "today"
   and an appointment's instant are all worked out in Asia/Gaza here
   rather than with the Date getters, which use the host's zone. */

export const CLINIC_TIME_ZONE = 'Asia/Gaza';

let formatter;
function clinicFormatter() {
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: CLINIC_TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  return formatter;
}

/* { year, month, day, hour, minute, second } of `instant` in Gaza. */
export function clinicParts(instant = new Date()) {
  const parts = {};
  for (const part of clinicFormatter().formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

const pad = (n) => String(n).padStart(2, '0');

/* Today's date in Gaza as YYYY-MM-DD. */
export function clinicToday(instant = new Date()) {
  const p = clinicParts(instant);
  return p.year + '-' + pad(p.month) + '-' + pad(p.day);
}

/* Minutes after midnight in Gaza. */
export function clinicMinutesNow(instant = new Date()) {
  const p = clinicParts(instant);
  return p.hour * 60 + p.minute;
}

/* The instant a Gaza wall-clock time ("2026-09-24", "10:00") happens. */
export function clinicInstant(dateKey, hhmm) {
  const [y, mo, d] = String(dateKey).split('-').map(Number);
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h || 0, m || 0);
  /* Guess UTC, see what Gaza shows at that instant, correct by the gap.
     A second pass settles guesses that straddle a DST change. */
  let guess = wanted;
  for (let i = 0; i < 2; i += 1) {
    const p = clinicParts(new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/* Whole days from Gaza's today to `dateKey` (negative when in the past). */
export function daysFromClinicToday(dateKey, instant = new Date()) {
  const [y, mo, d] = String(dateKey).split('-').map(Number);
  const [ty, tmo, td] = clinicToday(instant).split('-').map(Number);
  return Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(ty, tmo - 1, td)) / 86400000);
}
