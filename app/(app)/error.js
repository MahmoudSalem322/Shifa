'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/app-shell';
import { Button, Card, Icon } from '@/components/ui';

/* Catches a crash inside one app page; the sidebar and header stay. */
export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error('[shifa] page crashed', error);
  }, [error]);

  return (
    <>
      <PageHeader title="حدث خطأ" />
      <PageBody narrow>
        <Card className="items-center text-center">
          <Icon name="error" className="text-[40px] text-state-danger" />
          <h1 className="font-headline-md text-headline-md text-text-heading">تعذّر عرض هذه الصفحة</h1>
          <p className="font-body-md text-body-md text-text-muted max-w-md">
            حدث خطأ غير متوقع أثناء عرض البيانات. أعد المحاولة، وإذا تكررت المشكلة ارجع إلى لوحة التحكم.
          </p>
          <div className="flex flex-wrap justify-center gap-space-2xs">
            <Button icon="refresh" onClick={reset}>إعادة المحاولة</Button>
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg bg-surface-container-low text-text-primary hover:bg-surface-container-high">لوحة التحكم</Link>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
