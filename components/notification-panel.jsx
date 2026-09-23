'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth } from '@/lib/api';
import { notifications, TONES } from '@/lib/notifications';
import { formatDateTime } from '@/lib/vocab';
import { Icon } from './ui';

const PanelContext = createContext({ open: () => {}, unread: 0 });

/* Slide-over notification centre. Same markup and CSS ids as the legacy
   component in script.js, driven by React state instead of innerHTML. */
export function NotificationProvider({ children }) {
  const [isOpen, setOpen] = useState(false);
  const router = useRouter();
  const [local, setLocal] = useState([]);
  /* Server inbox: events other people caused (a match on your donation,
     a review decision), which this browser could not have recorded. */
  const [inbox, setInbox] = useState([]);

  useEffect(() => {
    const sync = () => setLocal(notifications.list());
    sync();
    return notifications.subscribe(sync);
  }, []);

  const refreshInbox = useCallback(() => {
    if (!auth.isAuthed()) { setInbox([]); return; }
    api.inbox.list()
      .then((response) => setInbox((response.items || []).map((item) => ({ ...item, server: true }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshInbox();
    const timer = setInterval(refreshInbox, 60000);
    const off = auth.subscribe(refreshInbox);
    return () => { clearInterval(timer); off(); };
  }, [refreshInbox]);

  useEffect(() => { if (isOpen) refreshInbox(); }, [isOpen, refreshInbox]);

  const items = useMemo(
    () => [...inbox, ...local].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [inbox, local]
  );

  const markRead = (item) => {
    if (item.server) {
      setInbox((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      if (!item.read) api.inbox.markRead([item.id]).catch(() => {});
      if (item.href) { setOpen(false); router.push(item.href); }
    } else {
      notifications.markRead(item.id);
    }
  };

  const markAllRead = () => {
    notifications.markAllRead();
    if (inbox.some((n) => !n.read)) {
      setInbox((list) => list.map((n) => ({ ...n, read: true })));
      api.inbox.markAllRead().catch(() => {});
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('shifa-notifications-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('shifa-notifications-open');
    };
  }, [isOpen]);

  const open = useCallback(() => setOpen(true), []);
  const unread = items.filter((item) => !item.read).length;

  return (
    <PanelContext.Provider value={{ open, unread }}>
      {children}
      <div id="shifa-notification-overlay" className={isOpen ? 'is-open' : ''} onClick={() => setOpen(false)} />
      <div
        id="shifa-notification-panel"
        className={isOpen ? 'is-open' : ''}
        role="dialog"
        aria-modal="true"
        aria-label="مركز الإشعارات"
        aria-hidden={!isOpen}
      >
        <div className="shifa-notification-head">
          <div>
            <span className="material-symbols-outlined">notifications_active</span>
            <div>
              <h2>الإشعارات</h2>
              <p>تأكيدات المواعيد وتحديثات طلبات الأدوية والتبرعات والمطابقات</p>
            </div>
          </div>
          <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="shifa-notification-list">
          <section className="shifa-notification-section">
            <div className="shifa-section-heading">
              <h3>آخر التحديثات</h3>
              {items.length ? (
                <button type="button" onClick={markAllRead}>تحديد الكل كمقروء</button>
              ) : null}
            </div>
            {items.length ? items.map((item) => {
              const meta = TONES[item.type] || { icon: 'notifications', tone: 'info' };
              return (
                <button
                  key={item.id}
                  type="button"
                  className={'shifa-notification-item ' + (item.read ? 'is-read' : 'is-unread')}
                  onClick={() => markRead(item)}
                >
                  <span className={'shifa-notification-icon ' + meta.tone}>
                    <span className="material-symbols-outlined">{meta.icon}</span>
                  </span>
                  <span className="shifa-notification-copy">
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </span>
                  {item.read ? null : <span className="shifa-unread-dot" aria-label="غير مقروء" />}
                </button>
              );
            }) : (
              <div className="shifa-empty-state">
                <span className="material-symbols-outlined">notifications_off</span>
                <p>لا توجد إشعارات حالياً</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </PanelContext.Provider>
  );
}

export function NotificationBell({ className = '' }) {
  const { open, unread } = useContext(PanelContext);
  return (
    <button
      type="button"
      aria-label="الإشعارات"
      onClick={open}
      className={'shifa-notification-trigger w-11 h-11 rounded-full flex items-center justify-center text-text-body hover:bg-surface-subtle transition-colors ' + className}
    >
      <Icon name="notifications" className="text-[22px]" />
      {unread > 0 ? <span className="shifa-notification-badge">{unread > 99 ? '99+' : unread}</span> : null}
    </button>
  );
}
