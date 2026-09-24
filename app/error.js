'use client';

import { useEffect } from 'react';
import { HomeLinks, StatusPage, statusPrimary } from '@/components/status-page';

/* Catches a crash in any page outside the app shell (landing, login). */
export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error('[shifa] page crashed', error);
  }, [error]);

  return (
    <StatusPage
      icon="error"
      title="حدث خطأ غير متوقع"
      message="تعذّر عرض هذه الصفحة. أعد المحاولة، وإذا تكررت المشكلة ارجع إلى الصفحة الرئيسية."
    >
      <button type="button" onClick={reset} className={statusPrimary}>إعادة المحاولة</button>
      <HomeLinks />
    </StatusPage>
  );
}
