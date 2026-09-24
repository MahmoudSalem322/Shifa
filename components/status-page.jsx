import Link from 'next/link';

/* Full-page message used by not-found and the error boundaries. Plain
   markup (no hooks) so it also renders where the app shell is missing. */
export function StatusPage({ code, icon, title, message, children }) {
  return (
    <div className="shifa-app-shell bg-canvas-bg min-h-screen flex items-center justify-center p-space-md font-body-md text-text-body">
      <div className="bg-surface-card rounded-2xl shadow-sm p-space-lg max-w-md w-full flex flex-col items-center text-center gap-space-sm">
        <span className="w-16 h-16 rounded-2xl bg-primary/10 text-text-primary flex items-center justify-center">
          <span aria-hidden="true" className="material-symbols-outlined text-[36px]">{icon}</span>
        </span>
        {code ? <span className="font-display-hero text-display-hero text-text-heading">{code}</span> : null}
        <h1 className="font-headline-lg text-headline-lg text-text-heading">{title}</h1>
        {message ? <p className="font-body-md text-body-md text-text-muted">{message}</p> : null}
        <div className="flex flex-wrap items-center justify-center gap-space-2xs mt-space-2xs">
          {children}
        </div>
      </div>
    </div>
  );
}

export const statusButton =
  'inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg transition-colors ';
export const statusPrimary = statusButton + 'bg-primary-container text-on-primary hover:bg-primary-hover shadow-sm';
export const statusSoft = statusButton + 'bg-surface-container-low text-text-primary hover:bg-surface-container-high';

export function HomeLinks() {
  return (
    <>
      <Link href="/dashboard" className={statusPrimary}>لوحة التحكم</Link>
      <Link href="/" className={statusSoft}>الصفحة الرئيسية</Link>
    </>
  );
}
