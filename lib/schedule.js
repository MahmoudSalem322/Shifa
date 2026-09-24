/* Turns a doctor's free-text schedule into bookable slots.

   The API models availability as two strings on the doctor record —
   workDays ("الأحد، الإثنين، الثلاثاء" or "من الأحد إلى الخميس") and
   workHours ("09:00 - 14:00", sometimes with ص/م) — plus
   consultationDurationMinutes. Everything here is pure so the slots
   route handler and the booking page agree on the same answer. */

import { clinicMinutesNow, clinicToday } from './clock';

const DAY_KEYS = [
  ['الأحد', 'احد', 'sunday', 'sun'],
  ['الإثنين', 'الاثنين', 'اثنين', 'monday', 'mon'],
  ['الثلاثاء', 'ثلاثاء', 'tuesday', 'tue'],
  ['الأربعاء', 'الاربعاء', 'اربعاء', 'أربعاء', 'wednesday', 'wed'],
  ['الخميس', 'خميس', 'thursday', 'thu'],
  ['الجمعة', 'جمعة', 'friday', 'fri'],
  ['السبت', 'سبت', 'saturday', 'sat']
];

function dayIndexesIn(text) {
  const lower = String(text || '').toLowerCase();
  const found = [];
  DAY_KEYS.forEach((names, index) => {
    let position = -1;
    for (const name of names) {
      const at = lower.indexOf(name.toLowerCase());
      if (at !== -1 && (position === -1 || at < position)) position = at;
    }
    if (position !== -1) found.push({ index, position });
  });
  return found.sort((a, b) => a.position - b.position).map((entry) => entry.index);
}

/* Returns the set of weekday indexes (0 = Sunday) the doctor works, or
   null when the text says nothing usable. */
export function parseWorkDays(workDays) {
  const text = String(workDays || '').trim();
  if (!text) return null;
  if (/يومي|كل الأيام|طوال الأسبوع|daily|every ?day|24\/7/i.test(text)) return new Set([0, 1, 2, 3, 4, 5, 6]);

  const days = dayIndexesIn(text);
  if (!days.length) return null;

  /* "من الأحد إلى الخميس" / "Sunday - Thursday" is a range, not a list. */
  const isRange = days.length === 2 && /(إلى|الى|حتى|to|–|-)/i.test(text) && !/[،,]/.test(text);
  if (isRange) {
    const set = new Set();
    for (let d = days[0]; ; d = (d + 1) % 7) {
      set.add(d);
      if (d === days[1]) break;
    }
    return set;
  }
  return new Set(days);
}

function toMinutes(hours, minutes, meridiem) {
  let h = Number(hours);
  const m = Number(minutes || 0);
  if (meridiem) {
    const pm = /م|ظهر|pm/i.test(meridiem);
    const am = /ص|am/i.test(meridiem);
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
  }
  return h * 60 + m;
}

/* Returns [{ start, end }] in minutes after midnight. Accepts several
   windows ("09:00 - 13:00، 17:00 - 20:00"). */
export function parseWorkHours(workHours) {
  const text = String(workHours || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[ً-ْ]/g, '');
  if (/24\s*\/\s*7|24 ساعة|على مدار الساعة/.test(text)) return [{ start: 8 * 60, end: 20 * 60 }];

  /* The meridiem is short (ص / م / am / pm) or spelled out ("8 صباحاً -
     4 مساءً"; the tanween was stripped above). Longest forms first. */
  const pattern = /(\d{1,2})(?::(\d{2}))?\s*(صباحا|صباح|مساء|مسا|ظهرا|ظهر|ص|م|am|pm)?\s*(?:-|–|—|إلى|الى|حتى|to)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|صباح|مساء|مسا|ظهرا|ظهر|ص|م|am|pm)?/gi;
  const windows = [];
  let match;
  while ((match = pattern.exec(text))) {
    if (Number(match[1]) > 24 || Number(match[4]) > 24 || Number(match[2] || 0) > 59 || Number(match[5] || 0) > 59) continue;
    const start = toMinutes(match[1], match[2], match[3]);
    let end = toMinutes(match[4], match[5], match[6]);
    /* "09:00 - 02:00" with no meridiem almost always means 2 pm. */
    if (end <= start && !match[6] && Number(match[4]) < 12) end += 12 * 60;
    if (end > start && end <= 24 * 60) windows.push({ start, end });
  }
  return windows;
}

export function minutesToHHMM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export const DEFAULT_SLOT_MINUTES = 20;

/* All slots for one date. `booked` is a Set of "HH:MM" already taken;
   `now` lets same-day slots in the past be disabled. "Same day" and
   "past" follow Gaza's clock, whatever the host's time zone. */
export function buildSlots({ date, workDays, workHours, durationMinutes, booked, now }) {
  const days = parseWorkDays(workDays);
  const windows = parseWorkHours(workHours);
  const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : DEFAULT_SLOT_MINUTES;

  const weekday = date.getDay();
  const worksThatDay = days ? days.has(weekday) : true;

  const reference = now || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  const sameDay = dayKey === clinicToday(reference);
  const nowMinutes = clinicMinutesNow(reference);

  const slots = [];
  if (worksThatDay) {
    for (const window of windows) {
      for (let t = window.start; t + duration <= window.end; t += duration) {
        const time = minutesToHHMM(t);
        let reason = '';
        if (booked && booked.has(time)) reason = 'booked';
        else if (sameDay && t <= nowMinutes) reason = 'past';
        slots.push({ time, end: minutesToHHMM(t + duration), available: !reason, reason });
      }
    }
  }

  return {
    worksThatDay,
    knownDays: !!days,
    knownHours: windows.length > 0,
    workDays: days ? Array.from(days).sort() : null,
    durationMinutes: duration,
    slots
  };
}
