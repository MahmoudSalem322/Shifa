import 'server-only';
import { HttpError } from './auth';

/* Per-user sliding window, in memory (one server process). Enough to stop
   one account from hammering the paid AI endpoints. */
export function createRateLimit({ windowMs, max, message }) {
  const recent = new Map();
  return function check(userId) {
    const now = Date.now();
    const hits = (recent.get(userId) || []).filter((at) => now - at < windowMs);
    if (hits.length >= max) throw new HttpError(429, message);
    hits.push(now);
    /* Re-insert so the map stays ordered by last use; evicting from the
       front then drops the least recently active user, not this one. */
    recent.delete(userId);
    recent.set(userId, hits);
    if (recent.size > 1000) recent.delete(recent.keys().next().value);
  };
}
