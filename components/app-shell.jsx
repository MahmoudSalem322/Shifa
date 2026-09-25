'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  { href: '/account', icon: 'manage_accounts', label: 'حسابي' },
  { href: '/my-profile', icon: 'badge', label: 'ملفي المهني', roles: ['Doctor'] },
  { href: '/doctor-appointments', icon: 'event_note', label: 'مواعيد العيادة', roles: ['Doctor'] },

  { group: 'الإدارة' },
  { href: '/admin/users', icon: 'group', label: 'الحسابات المسجلة', roles: ['Admin'] },
  { href: '/admin/healthcare', icon: 'domain_add', label: 'الجهات الصحية', roles: ['Admin'] },
  { href: '/admin/medicines', icon: 'medication', label: 'إدارة الأدوية', roles: ['Admin'] },
  { href: '/admin/drug-requests', icon: 'prescriptions', label: 'طلبات الأدوية', roles: ['Admin'] },
  { href: '/donations/review', icon: 'fact_check', label: 'إدارة التبرعات', roles: ['Admin'] },
  { href: '/admin/server-donations', icon: 'cloud', label: 'تبرعات الخادم المركزي', roles: ['Admin'] },
  { href: '/matches', icon: 'join', label: 'مطابقة التبرعات', roles: ['Admin'] },
  { href: '/admin/appointments', icon: 'event_note', label: 'كل المواعيد', roles: ['Admin'] },

  { group: 'الرعاية الطبية' },
  { href: '/health-navigator', icon: 'assistant', label: 'المساعد الصحي الذكي', roles: ['Patient'] },
  { href: '/doctors', icon: 'person_search', label: 'البحث عن طبيب', roles: ['Patient'] },
  { href: '/doctors', icon: 'person_search', label: 'دليل الأطباء', roles: ['Admin'] },
  { href: '/appointments', icon: 'calendar_month', label: 'مواعيدي والحجوزات', roles: ['Patient'] },
  { href: '/facilities', icon: 'domain', label: 'المراكز والمستشفيات', roles: ['Patient', 'Doctor', 'Admin'] },

  { group: 'إدارة المركز' },
  { href: '/facility-services', icon: 'health_and_safety', label: 'الخدمات والأقسام', roles: ['Hospital'] },
  { href: '/facility-doctors', icon: 'groups', label: 'الأطباء', roles: ['Hospital'] },
  { href: '/facility-medicine-requests', icon: 'medication', label: 'طلبات الأدوية', roles: ['Hospital'] },
  { href: '/facility-equipment-requests', icon: 'medical_services', label: 'طلبات المعدات', roles: ['Hospital'] },

  { group: 'إدارة الصيدلية' },
  { href: '/pharmacy-stock', icon: 'inventory_2', label: 'مخزون الأدوية', roles: ['Pharmacy'] },

  { group: 'الأدوية' },
  { href: '/medicines', icon: 'medication', label: 'البحث عن دواء', roles: ['Patient', 'Doctor', 'Admin'] },
  { href: '/pharmacies', icon: 'store', label: 'دليل الصيدليات', roles: ['Patient', 'Doctor', 'Admin'] },
  { href: '/drug-requests', icon: 'prescriptions', label: 'طلبات الأدوية', roles: ['Patient'] },
  { href: '/prescription-reader', icon: 'document_scanner', label: 'قارئ الوصفات الذكي', roles: ['Patient'] },

  { group: 'التبرع' },
  { href: '/donations', icon: 'volunteer_activism', label: 'تبرعاتي', roles: ['Patient', 'Donor'] },
  { href: '/donations/review', icon: 'fact_check', label: 'مراجعة التبرعات', roles: REVIEWER_ROLES }
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
    /* The admin's token is this app's own; the .NET API has nothing to end. */
    if (auth.isAuthed() && !auth.isAdmin()) {
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
  const [headerConfig, setHeaderConfig] = useState({ title: '', subtitle: '', actions: null });
  const drawerRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useOverlay(menuOpen, closeMenu, drawerRef);

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
    <ShellContext.Provider value={{ openMenu: () => setMenuOpen(true), setHeaderConfig }}>
      <NotificationProvider>
        <div className="shifa-app-shell bg-canvas-bg font-body-md text-body min-h-screen flex">
          <aside className="hidden lg:flex w-72 bg-surface-card flex-col shrink-0 sticky top-0 h-screen z-40 p-space-md">
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

          <main className="flex-1 min-w-0 w-full bg-canvas-bg min-h-screen flex flex-col">
            <header className="relative w-full bg-surface-card border-b border-border-soft overflow-hidden shrink-0">
              <div className="relative max-w-[1280px] mx-auto w-full px-space-sm sm:px-space-md lg:px-space-xl py-space-sm flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-xs min-w-0">
                  <button
                    type="button"
                    aria-label="القائمة"
                    onClick={() => setMenuOpen(true)}
                    className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-text-body hover:bg-surface-subtle shrink-0"
                  >
                    <Icon name="menu" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-headline-lg text-headline-lg text-text-heading truncate">{headerConfig.title}</h2>
                    {headerConfig.subtitle ? <p className="font-body-sm text-body-sm text-text-muted mt-1 hidden sm:block">{headerConfig.subtitle}</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-space-xs shrink-0">
                  {headerConfig.actions}
                  <span className="hidden md:inline-flex font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 rounded-full">
                    {session ? roles.toArabic(session.role) || 'مستخدم' : ''}
                  </span>
                  <button
                    type="button"
                    aria-label="حسابي"
                    onClick={() => router.push('/account')}
                    className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm hover:brightness-110 transition-all"
                  >
                    <Icon name="person" className="text-[22px]" />
                  </button>
                  <DarkModeToggle className="w-11 h-11 rounded-full" />
                  <NotificationBell />
                </div>
              </div>
            </header>
            <div className="flex-1">
              {children}
            </div>
          </main>
        </div>
      </NotificationProvider>
    </ShellContext.Provider>
  );
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* The white bar at the top of every app page. */
export function PageHeader({ title, subtitle, actions }) {
  const { setHeaderConfig } = useContext(ShellContext);

  /* App pages are client components, so the tab title is set here. Next
     writes the layout's default title after navigation, so keep ours. */
  useEffect(() => {
    if (typeof title !== 'string' || !title) return undefined;
    const wanted = title + ' | شفاء';
    const apply = () => { if (document.title !== wanted) document.title = wanted; };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);

  useIsomorphicLayoutEffect(() => {
    if (setHeaderConfig) setHeaderConfig({ title, subtitle, actions });
  }, [title, subtitle, actions, setHeaderConfig]);

  return null;
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
