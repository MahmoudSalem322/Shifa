import 'server-only';
import { store } from './store';

/* Module 9 · "Send Notification". The browser feed in lib/notifications.js
   only records what happens in that browser; a match concerns other
   people (the donor, the reviewing pharmacy), so those go through this
   server-side inbox and the notification panel merges them in. */

export const COLLECTION = 'notifications';
const KEEP_PER_USER = 100;

/* entries: [{ userId, type, title, message, href }] — userIds that are
   empty are skipped (older records may not carry one). */
export async function notify(entries) {
  const list = entries.filter((entry) => entry && entry.userId);
  if (!list.length) return;
  const now = new Date().toISOString();
  try {
    await store.update(COLLECTION, (items) => {
      const added = list.map((entry) => ({
        id: store.newId('sn'),
        userId: String(entry.userId),
        type: entry.type || 'info',
        title: entry.title,
        message: entry.message || '',
        href: entry.href || '',
        createdAt: now,
        read: false
      }));
      const next = [...added, ...items];
      /* Keep each inbox bounded. */
      const counts = new Map();
      const trimmed = next.filter((item) => {
        const count = (counts.get(item.userId) || 0) + 1;
        counts.set(item.userId, count);
        return count <= KEEP_PER_USER;
      });
      return { items: trimmed, result: null };
    });
  } catch (error) {
    /* A notification failing must not undo the action that caused it. */
    console.error('[shifa] could not store notification', error);
  }
}
