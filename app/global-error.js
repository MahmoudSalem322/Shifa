'use client';

/* Last resort when the root layout itself fails: it replaces <html>, so
   it carries its own minimal styles. */
export default function GlobalError({ reset }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'Cairo, Tajawal, sans-serif', background: '#f0f7ff', color: '#1e293b' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h1 style={{ color: '#115e59', fontSize: 22, margin: '0 0 12px' }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: '#64748b', margin: '0 0 20px', lineHeight: 1.7 }}>تعذّر تحميل منصة شفاء. أعد المحاولة بعد قليل.</p>
            <button type="button" onClick={reset} style={{ background: '#0f766e', color: '#fff', border: 0, borderRadius: 10, padding: '10px 22px', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
