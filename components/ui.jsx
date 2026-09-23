'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, defaultMessage } from '@/lib/api';

export function Icon({ name, className = '', filled = false, ...rest }) {
  return (
    <span aria-hidden="true" className={'material-symbols-outlined ' + (filled ? 'is-filled ' : '') + className} {...rest}>
      {name}
    </span>
  );
}

/* ---- list states (port of Shifa.ui.skeleton / empty / error / authWall) */

export function Skeleton({ count = 3 }) {
  return (
    <div className="shifa-skeleton" role="status" aria-live="polite">
      <span className="shifa-visually-hidden">جارٍ تحميل البيانات…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="shifa-skeleton-card" aria-hidden="true">
          <div className="shifa-skeleton-line shifa-skeleton-line--wide" />
          <div className="shifa-skeleton-line" />
          <div className="shifa-skeleton-line shifa-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'search_off', title = 'لا توجد نتائج مطابقة', hint, action }) {
  return (
    <div className="shifa-state shifa-state--empty" role="status">
      <Icon name={icon} className="text-[36px] text-text-muted" />
      <p className="shifa-state__title">{title}</p>
      {hint ? <p className="shifa-state__hint">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="shifa-state shifa-state--error" role="alert">
      <Icon name="error" className="text-[36px] text-state-danger" />
      <p className="shifa-state__title">{error ? error.message : defaultMessage(0)}</p>
      {onRetry ? (
        <button type="button" className="shifa-state__action" onClick={onRetry}>إعادة المحاولة</button>
      ) : null}
    </div>
  );
}

export function AuthWall({ message = 'سجّل الدخول لعرض هذا المحتوى' }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="shifa-state shifa-state--auth" role="status">
      <Icon name="lock" className="text-[36px] text-state-info" />
      <p className="shifa-state__title">{message}</p>
      <p className="shifa-state__hint">هذه البيانات متاحة للمستخدمين المسجّلين فقط.</p>
      <button
        type="button"
        className="shifa-state__action"
        onClick={() => { auth.rememberReturnTo(pathname); router.push('/login'); }}
      >
        تسجيل الدخول
      </button>
    </div>
  );
}

/* Renders whichever state an API failure calls for. */
export function Failure({ error, onRetry }) {
  if (error && error.status === 401) return <AuthWall />;
  return <ErrorState error={error} onRetry={onRetry} />;
}

/* Loading → failure → empty → children, the shape every list page has. */
export function AsyncBlock({ state, empty, skeleton = 3, children }) {
  if (state.loading && !state.data) return <Skeleton count={skeleton} />;
  if (state.error) return <Failure error={state.error} onRetry={state.reload} />;
  if (empty && empty.when) return <EmptyState {...empty} />;
  return children;
}

/* ---- small building blocks ----------------------------------------- */

export function Spinner() {
  return <span className="shifa-spinner" aria-hidden="true" />;
}

const BUTTON_TONES = {
  primary: 'bg-primary-container text-on-primary hover:bg-text-heading shadow-sm',
  soft: 'bg-surface-container-low text-text-primary hover:bg-surface-container-high',
  danger: 'bg-state-danger-subtle text-state-danger hover:bg-error-container',
  success: 'bg-state-success text-on-primary hover:brightness-110 shadow-sm',
  ghost: 'bg-surface-container-high text-text-muted hover:text-text-body'
};

export function Button({ tone = 'primary', busy = false, busyLabel = 'جارٍ المعالجة…', icon, className = '', children, disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className={
        'inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg transition-colors disabled:opacity-60 ' +
        BUTTON_TONES[tone] + ' ' + className
      }
      {...rest}
    >
      {busy ? <><Spinner />{busyLabel}</> : <>{icon ? <Icon name={icon} className="text-[20px]" /> : null}{children}</>}
    </button>
  );
}

export function ButtonLink({ tone = 'primary', icon, className = '', children, ...rest }) {
  return (
    <Link
      className={
        'inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg transition-colors ' +
        BUTTON_TONES[tone] + ' ' + className
      }
      {...rest}
    >
      {icon ? <Icon name={icon} className="text-[20px]" /> : null}
      {children}
    </Link>
  );
}

export function Badge({ className = '', icon, children }) {
  return (
    <span className={'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm whitespace-nowrap ' + className}>
      {icon ? <Icon name={icon} className="text-[14px]" /> : null}
      {children}
    </span>
  );
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={'bg-surface-card rounded-2xl p-space-md lg:p-space-lg shadow-sm flex flex-col gap-space-md ' + className} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, count, actions }) {
  return (
    <div className="flex items-center justify-between gap-space-sm flex-wrap">
      <h2 className="font-headline-lg text-headline-lg text-text-heading flex items-center gap-space-2xs">
        {icon ? <Icon name={icon} className="text-primary" /> : null}
        <span>{children}</span>
        {count !== undefined ? (
          <span className="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm px-2.5 py-0.5 rounded-full">{count}</span>
        ) : null}
      </h2>
      {actions ? <div className="flex items-center gap-space-2xs flex-wrap">{actions}</div> : null}
    </div>
  );
}

export const inputClass =
  'w-full bg-surface-container-lowest text-text-body font-body-md text-body-md py-2.5 px-space-sm rounded-lg shadow-sm focus:outline-none focus:border-border-focus transition-colors';

/* Label + control + inline error, matching the dashboard form rows. */
export function Field({ label, htmlFor, required, error, hint, className = '', children }) {
  return (
    <div className={'flex flex-col gap-1.5 ' + className}>
      {label ? (
        <label className="font-label-md text-label-md text-text-heading" htmlFor={htmlFor}>
          {label} {required ? <span className="text-state-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="font-label-sm text-label-sm text-state-danger" role="alert">{error}</span>
      ) : hint ? (
        <span className="font-label-sm text-label-sm text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export function Modal({ open, onClose, title, eyebrow, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-sm bg-inverse-surface/50 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={'bg-surface-card rounded-2xl shadow-2xl w-full p-space-md lg:p-space-lg relative max-h-[90vh] overflow-y-auto ' + (wide ? 'max-w-2xl' : 'max-w-lg')}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="إغلاق"
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-surface-container-high text-text-muted hover:text-text-body flex items-center justify-center transition-colors"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
        <div className="mb-space-md">
          {eyebrow ? <div className="text-primary font-label-sm text-label-sm mb-1">{eyebrow}</div> : null}
          <h3 className="font-headline-lg text-headline-lg text-text-heading">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Label/value pair used on every details page. */
export function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-space-xs p-space-sm rounded-xl bg-surface-subtle">
      {icon ? <Icon name={icon} className="text-text-primary text-[22px] mt-0.5" /> : null}
      <div className="flex flex-col min-w-0">
        <span className="font-label-sm text-label-sm text-text-muted">{label}</span>
        <span className="font-label-lg text-label-lg text-text-body break-words">{children || '—'}</span>
      </div>
    </div>
  );
}

export function EmergencyBanner() {
  return (
    <div className="bg-surface-card rounded-2xl p-space-md lg:p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md">
        <div className="w-14 h-14 rounded-2xl bg-error-container text-state-danger flex items-center justify-center shrink-0">
          <Icon name="emergency_home" className="text-[32px]" />
        </div>
        <div>
          <h4 className="font-headline-md text-headline-md text-text-heading mb-1">هل الحالة طارئة أو حرجة؟</h4>
          <p className="font-body-md text-body-md text-text-muted">
            إذا كانت هناك أعراض تتطلب تدخلاً عاجلاً، توجه مباشرة لأقرب قسم طوارئ أو اتصل بالإسعاف.
          </p>
        </div>
      </div>
      <a className="flex items-center justify-center gap-2 bg-state-danger text-on-error px-space-md py-3 rounded-xl font-label-lg text-label-lg shadow hover:opacity-95 transition-all shrink-0" href="tel:101">
        <Icon name="call" />
        <span>طوارئ الهلال الأحمر 101</span>
      </a>
    </div>
  );
}
