'use client';

import { useState } from 'react';
import { api, pick } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { formatDate, geo } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import {
  AdminBlock, DetailsModal, PAGE_SIZE, Pager, readPage, recordId, searchClass, selectClass, StatusBadge, statusOptions, useAdminAction
} from '@/components/admin-kit';
import { Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* Admin · donations recorded on the .NET API (/api/admin/donations).
   Donations made through this site live in its own store and are managed
   on /donations/review; this page covers the ones on the central server. */

function RejectModal({ donation, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const { busy, run } = useAdminAction(onDone);
  const save = async () => {
    const ok = await run('reject', () => api.admin.serverDonations.reject(recordId(donation), reason.trim()), { success: 'تم رفض التبرع.' });
    if (ok) onClose();
  };
  return (
    <Modal open={!!donation} onClose={onClose} title="رفض التبرع" eyebrow={donation ? pick(donation, 'medicineName') : ''}>
      <div className="flex flex-col gap-space-sm">
        <Field label="سبب الرفض" htmlFor="sd-reason" required>
          <textarea id="sd-reason" rows={3} maxLength={500} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button tone="danger" icon="block" busy={busy === 'reject'} disabled={reason.trim().length < 3} onClick={save}>تأكيد الرفض</Button>
      </div>
    </Modal>
  );
}

export default function AdminServerDonationsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const search = useDebounced(query);

  const state = useAsync(
    async () => readPage(await api.admin.serverDonations.list({ search: search.trim(), status, page, pageSize: PAGE_SIZE })),
    [search, status, page]
  );
  const { busy, run } = useAdminAction(state.reload);
  const items = (state.data && state.data.items) || [];
  const statuses = statusOptions(items, ['Pending', 'Approved', 'Rejected']);
  const filter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <>
      <PageHeader title="تبرعات الخادم المركزي" subtitle="التبرعات المسجلة على خادم شفاء: قبول ورفض ومتابعة" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="cloud" count={state.data ? (state.data.total ?? items.length) : undefined} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              التبرعات
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                <input className={searchClass} placeholder="ابحث باسم الدواء أو المتبرع" value={query} onChange={filter(setQuery)} aria-label="بحث" />
              </div>
              <select className={selectClass} value={status} onChange={filter(setStatus)} aria-label="الحالة">
                <option value="">كل الحالات</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <AdminBlock state={state} empty={{ when: !items.length, icon: 'volunteer_activism', title: 'لا توجد تبرعات مطابقة' }}>
              <div className="flex flex-col gap-space-xs">
                {items.map((d) => {
                  const id = recordId(d);
                  const itemStatus = pick(d, 'status') || '';
                  const pending = !itemStatus || /pending|review/i.test(itemStatus);
                  return (
                    <div key={id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline-sm text-headline-sm text-text-heading truncate" dir="auto">{pick(d, 'medicineName', 'name') || 'تبرع'}</span>
                        <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">
                          {[
                            [pick(d, 'quantityAmount', 'quantity'), pick(d, 'quantityUnit', 'unit')].filter((v) => v != null).join(' '),
                            geo.label(pick(d, 'governorate')) || pick(d, 'governorate'),
                            pick(d, 'donorName'),
                            pick(d, 'expiryDate') ? 'تنتهي ' + formatDate(pick(d, 'expiryDate')) : ''
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-2xs">
                        <StatusBadge value={itemStatus} />
                        {pending ? (
                          <>
                            <Button tone="soft" icon="check_circle" className="!py-1.5" busy={busy === 'ok' + id} busyLabel="…"
                              onClick={() => run('ok' + id, () => api.admin.serverDonations.approve(id), { confirm: 'قبول هذا التبرع؟', success: 'تم قبول التبرع.' })}>قبول</Button>
                            <Button tone="danger" icon="block" className="!py-1.5" onClick={() => setRejecting(d)}>رفض</Button>
                          </>
                        ) : null}
                        <Button tone="soft" icon="visibility" className="!py-1.5" onClick={() => setViewing(d)}>التفاصيل</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager page={page} setPage={setPage} count={items.length} total={state.data && state.data.total} />
            </AdminBlock>
          </Card>

          <DetailsModal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? pick(viewing, 'medicineName') || 'التبرع' : ''}
            recordKey={viewing ? recordId(viewing) : null} load={() => api.admin.serverDonations.get(recordId(viewing))} />
          <RejectModal key={rejecting ? recordId(rejecting) : 'none'} donation={rejecting} onClose={() => setRejecting(null)} onDone={state.reload} />
        </RoleGate>
      </PageBody>
    </>
  );
}
