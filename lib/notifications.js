/* Local notification feed (port of the legacy ShifaNotifications store).
   Nothing on the server pushes notifications yet, so booking, request and
   donation events are recorded here as they happen in this browser. */

import { auth } from './api';

const PREFIX = 'shifa_notifications_v1';

/* One feed per account, so switching users in the same browser does not
   show someone else's appointments and requests. */
function key() {
  const user = auth.getUser();
  const who = user && (user.email || user.id);
  return who ? PREFIX + ':' + who : PREFIX;
}
const listeners = new Set();

function read() {
  try {
    const raw = window.localStorage.getItem(key());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(items) {
  try { window.localStorage.setItem(key(), JSON.stringify(items.slice(0, 100))); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export const TONES = {
  confirmation: { icon: 'event_available', tone: 'success' },
  reminder: { icon: 'alarm', tone: 'warning' },
  cancellation: { icon: 'event_busy', tone: 'danger' },
  drug_submitted: { icon: 'medication', tone: 'success' },
  drug_cancelled: { icon: 'block', tone: 'danger' },
  prescription: { icon: 'document_scanner', tone: 'info' },
  donation_submitted: { icon: 'volunteer_activism', tone: 'success' },
  donation_approved: { icon: 'verified', tone: 'success' },
  donation_rejected: { icon: 'block', tone: 'danger' },
  match_created: { icon: 'join', tone: 'info' },
  match_delivered: { icon: 'task_alt', tone: 'success' },
  match_cancelled: { icon: 'link_off', tone: 'danger' }
};

export const notifications = {
  list: read,

  add({ type = 'info', title, message = '', ref = null, dedupe = false }) {
    const items = read();
    if (dedupe && ref && items.some((item) => item.ref === ref && item.type === type)) return null;
    const item = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type,
      title: title || 'إشعار جديد',
      message,
      ref,
      createdAt: new Date().toISOString(),
      read: false
    };
    write([item, ...items]);
    return item;
  },

  markRead(id) {
    write(read().map((item) => (item.id === id ? { ...item, read: true } : item)));
  },

  markAllRead() {
    write(read().map((item) => ({ ...item, read: true })));
  },

  unreadCount() {
    return read().filter((item) => !item.read).length;
  },

  subscribe(fn) {
    listeners.add(fn);
    const offSession = auth.subscribe(fn);
    const onStorage = (event) => { if (event.key === key()) fn(); };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(fn);
      offSession();
      window.removeEventListener('storage', onStorage);
    };
  }
};
