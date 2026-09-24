'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, auth, onUnauthorized } from '@/lib/api';
import { useSession } from '@/lib/hooks';
import { REVIEWER_ROLES, roles } from '@/lib/vocab';
import { NotificationBell, NotificationProvider } from './notification-panel';
import { Icon, Spinner, useOverlay } from './ui';
import { DarkModeToggle } from './dark-mode';

/* Sidebar entries. `roles` limits an entry to those account types. */
const NAV = [
  { group: 'الرئيسية' },
  { href: '/dashboard', icon: 'dashboard', label: 'لوحة التحكم' },
  { href: '/my-profile', icon: 'badge', label: 'ملفي المهني', roles: ['Doctor'] },

  { group: 'الرعاية الطبية' },
  { href: '/health-navigator', icon: 'assistant', label: 'المساعد الصحي الذكي' },
  { href: '/doctors', icon: 'person_search', label: 'البحث عن طبيب' },
  { href: '/appointments', icon: 'calendar_month', label: 'مواعيدي والحجوزات', roles: ['Patient', 'Donor'] },
  { href: '/facilities', icon: 'domain', label: 'المراكز والمستشفيات' },

  { group: 'الأدوية' },
  { href: '/medicines', icon: 'medication', label: 'البحث عن دواء' },
  { href: '/pharmacies', icon: 'store', label: 'دليل الصيدليات' },
  { href: '/drug-requests', icon: 'prescriptions', label: 'طلبات الأدوية', roles: ['Patient', 'Donor'] },
  { href: '/prescription-reader', icon: 'document_scanner', label: 'قارئ الوصفات الذكي', roles: ['Patient', 'Donor'] },

  { group: 'التبرع' },
  { href: '/donations', icon: 'volunteer_activism', label: 'تبرعاتي بالأدوية', roles: ['Patient', 'Donor'] },
  { href: '/donations/review', icon: 'fact_check', label: 'مراجعة التبرعات', roles: REVIEWER_ROLES },
  { href: '/matches', icon: 'join', label: 'مطابقة التبرعات', roles: ['Patient', 'Donor', ...REVIEWER_ROLES] }
];

function isActive(pathname, href) {
  if (href === '/donations') return pathname === '/donations' || pathname === '/donations/new' || /^\/donations\/(?!review)[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(href + '/');
}

const ShellContext = createContext({ openMenu: () => {} });

function Sidebar({ role, onNavigate, onLogout }) {
  const pathname = usePathname();
  const visible = NAV.filter((item) => !item.roles || item.roles.includes(role));
  /* Drop group headings that ended up with nothing under them. */
  const entries = visible.filter((item, index) => !item.group || (visible[index + 1] && !visible[index + 1].group));

  return (
    <div className="flex flex-col h-full justify-between gap-space-md">
      <div className="flex flex-col gap-space-lg min-h-0">
        <Link href="/" className="flex items-center gap-space-xs px-2" onClick={onNavigate}>
          <img src="/image/logo.png" alt="شفاء" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg text-text-heading leading-tight tracking-tight">شِفَاء</span>
            <span className="font-label-sm text-label-sm text-text-muted">منظومة الرعاية الصحية</span>
          </div>
        </Link>
        <nav className="flex flex-col gap-1 overflow-y-auto -mx-1 px-1" aria-label="التنقل الرئيسي">
          {entries.map((item) => item.group ? (
            <span key={item.group} className="font-label-sm text-label-sm text-text-muted px-3.5 pt-space-xs first:pt-0">{item.group}</span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={
                'flex items-center gap-space-xs px-3.5 py-2.5 rounded-xl font-label-lg text-label-lg transition-all ' +
                (isActive(pathname, item.href)
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-text-body hover:text-text-primary hover:bg-surface-subtle')
              }
            >
              <Icon name={item.icon} className={'text-[22px] ' + (isActive(pathname, item.href) ? '' : 'text-text-muted')} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="pt-space-sm border-t border-border-soft flex flex-col gap-space-xs">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 text-state-danger hover:bg-state-danger-subtle rounded-lg font-label-md text-label-md transition-colors w-full"
        >
          <Icon name="logout" className="text-[20px]" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}

/* Tells the server first, but clears the local session either way — a
   failed logout call must not leave the visitor stuck signed in. */
export function useLogout() {
  const router = useRouter();
  return async () => {
    if (auth.isAuthed()) {
      try { await api.auth.logout(); } catch { /* clear locally regardless */ }
    }
    auth.clear();
    router.replace('/login');
  };
}

export function AppShell({ children }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useOverlay(menuOpen, closeMenu, drawerRef);

  /* Every endpoint on the API needs a token, including browse and search,
     so the whole app sits behind login. */
  useEffect(() => {
    if (session === null) {
      auth.rememberReturnTo(pathname + window.location.search);
      router.replace('/login');
    }
  }, [session, pathname, router]);

  useEffect(() => {
    onUnauthorized(() => {
      auth.rememberReturnTo(window.location.pathname + window.location.search);
      router.replace('/login');
    });
    return () => onUnauthorized(null);
  }, [router]);

  if (!session) {
    return (
      <div className="shifa-app-shell bg-canvas-bg min-h-screen flex items-center justify-center gap-2 text-text-muted font-body-md">
        <Spinner /> جارٍ التحقق من الجلسة…
      </div>
    );
  }

  return (
    <ShellContext.Provider value={{ openMenu: () => setMenuOpen(true) }}>
      <NotificationProvider>
        <div className="shifa-app-shell bg-canvas-bg font-body-md text-body min-h-screen flex">
          <aside className="hidden lg:flex w-72 bg-surface-card border-l border-border-soft flex-col shrink-0 sticky top-0 h-screen z-40 p-space-md shadow-[-2px_0_12px_rgba(0,0,0,0.03)]">
            <Sidebar role={session.role} onLogout={logout} />
          </aside>

          {menuOpen ? (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-inverse-surface/40" onClick={closeMenu} />
              <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="القائمة" className="outline-none absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-surface-card p-space-md shadow-2xl overflow-y-auto">
                <Sidebar role={session.role} onNavigate={closeMenu} onLogout={logout} />
              </aside>
            </div>
          ) : null}

          <main className="flex-1 min-w-0 w-full bg-canvas-bg min-h-screen">{children}</main>
        </div>
      </NotificationProvider>
    </ShellContext.Provider>
  );
}

/* The white bar at the top of every app page. */
export function PageHeader({ title, subtitle, actions }) {
  const { openMenu } = useContext(ShellContext);
  const session = useSession();
  const router = useRouter();
  const profileHref = session && session.role === 'Doctor' ? '/my-profile' : '/dashboard';

  /* App pages are client components, so the tab title is set here. */
  useEffect(() => {
    if (typeof title === 'string' && title) document.title = title + ' | شفاء';
  }, [title]);

  return (
    <header className="relative w-full bg-surface-container-lowest border-b border-border-soft overflow-hidden">
      <div className="absolute -top-16 -left-10 w-56 h-56 bg-pink-100/60 dark:bg-teal-900/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 right-16 w-64 h-64 bg-pink-50 dark:bg-teal-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl py-space-sm flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs min-w-0">
          <button
            type="button"
            aria-label="القائمة"
            onClick={openMenu}
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-text-body hover:bg-surface-subtle shrink-0"
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <h2 className="font-headline-lg text-headline-lg text-text-heading truncate">{title}</h2>
            {subtitle ? <p className="font-body-sm text-body-sm text-text-muted mt-1 hidden sm:block">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          {actions}
          <span className="hidden md:inline-flex font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full">
            {session ? roles.toArabic(session.role) || 'مستخدم' : ''}
          </span>
          <button
            type="button"
            aria-label="الملف الشخصي"
            onClick={() => router.push(profileHref)}
            className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm hover:brightness-110 transition-all"
          >
            <Icon name="person" className="text-[22px]" />
          </button>
          <DarkModeToggle className="w-11 h-11 rounded-full" />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

/* Standard content column under the header. */
export function PageBody({ narrow = false, className = '', children }) {
  return (
    <div className={(narrow ? 'max-w-4xl' : 'max-w-[1280px]') + ' mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl py-space-lg pb-space-3xl flex flex-col gap-space-lg ' + className}>
      {children}
    </div>
  );
}

/* Shows children only to the listed roles; everyone else gets a note. */
export function RoleGate({ allow, children, message }) {
  const session = useSession();
  if (!session) return null;
  if (allow.includes(session.role)) return children;
  return (
    <div className="shifa-state shifa-state--auth" role="status">
      <Icon name="shield_person" className="text-[36px] text-state-info" />
      <p className="shifa-state__title">{message || 'هذه الصفحة غير متاحة لنوع حسابك'}</p>
      <p className="shifa-state__hint">
        متاحة لحسابات: {allow.map((role) => roles.toArabic(role)).join('، ')}. حسابك الحالي: {roles.toArabic(session.role) || 'غير محدد'}.
      </p>
      <Link href="/dashboard" className="shifa-state__action">العودة للوحة التحكم</Link>
    </div>
  );
}
