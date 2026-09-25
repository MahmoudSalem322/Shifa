'use client';

import { useState } from 'react';
import { api, pick } from '@/lib/api';
import { useAsync, useDebounced } from '@/lib/hooks';
import { drugRequestStatus, formatDateTime } from '@/lib/vocab';
import { PageBody, PageHeader, RoleGate } from '@/components/app-shell';
import {
  AdminBlock, DetailsModal, PAGE_SIZE, Pager, readPage, recordId, searchClass, selectClass, statusOptions, useAdminAction
} from '@/components/admin-kit';
import { Badge, Button, Card, CardTitle, Field, Icon, inputClass, Modal } from '@/components/ui';

/* Admin · every patient's drug requests on the .NET API, with status
   changes (PATCH /api/admin/drug-requests/{id}/status). */

const KNOWN_STATUSES = ['Pending', 'UnderReview', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'];

function StatusModal({ request, onClose, onDone }) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const { busy, run } = useAdminAction(onDone);
  const rejecting = /reject/i.test(status);
  const save = async () => {
    const ok = await run('save', () => api.admin.drugRequests.setStatus(recordId(request), status, rejecting ? reason.trim() : null), { success: 'تم تحديث حالة الطلب.' });
    if (ok) onClose();
  };
  return (
    <Modal open={!!request} onClose={onClose} title="تغيير حالة الطلب" eyebrow={request ? '#' + recordId(request) : ''}>
      <div className="flex flex-col gap-space-sm">
        <Field label="الحالة الجديدة" htmlFor="dr-status" required>
          <select id="dr-status" className={inputClass + ' cursor-pointer'} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">اختر</option>
            {KNOWN_STATUSES.map((s) => <option key={s} value={s}>{drugRequestStatus(s).label} ({s})</option>)}
          </select>
        </Field>
        {rejecting ? (
          <Field label="سبب الرفض" htmlFor="dr-reason" required>
            <textarea id="dr-reason" rows={3} maxLength={500} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        ) : null}
        <Button icon="save" busy={busy === 'save'} disabled={!status || (rejecting && reason.trim().length < 3)} onClick={save}>حفظ</Button>
      </div>
    </Modal>
  );
}

export default function AdminDrugRequestsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [changing, setChanging] = useState(null);
  const search = useDebounced(query);

  const state = useAsync(
    async () => readPage(await api.admin.drugRequests.list({ search: search.trim(), status, page, pageSize: PAGE_SIZE })),
    [search, status, page]
  );
  const items = (state.data && state.data.items) || [];
  const statuses = statusOptions(items, KNOWN_STATUSES);
  const filter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <>
      <PageHeader title="طلبات الأدوية" subtitle="كل طلبات المرضى على خادم شفاء ومتابعة حالتها" />
      <PageBody>
        <RoleGate allow={['Admin']} message="هذه الصفحة متاحة للإدارة فقط">
          <Card>
            <CardTitle icon="prescriptions" count={state.data ? (state.data.total ?? items.length) : undefined} actions={<Button tone="soft" icon="refresh" onClick={state.reload}>تحديث</Button>}>
              الطلبات
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
              <div className="relative">
                <Icon name="search" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                <input className={searchClass} placeholder="ابحث باسم الدواء أو المريض" value={query} onChange={filter(setQuery)} aria-label="بحث" />
              </div>
              <select className={selectClass} value={status} onChange={filter(setStatus)} aria-label="الحالة">
                <option value="">كل الحالات</option>
                {statuses.map((s) => <option key={s} value={s}>{drugRequestStatus(s).label}</option>)}
              </select>
            </div>

            <AdminBlock state={state} empty={{ when: !items.length, icon: 'medication', title: 'لا توجد طلبات مطابقة' }}>
              <div className="flex flex-col gap-space-xs">
                {items.map((r) => {
                  const id = recordId(r);
                  const st = drugRequestStatus(pick(r, 'status'));
                  return (
                    <div key={id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-subtle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline-sm text-headline-sm text-text-heading truncate" dir="auto">{pick(r, 'medicineName', 'medicine', 'name') || 'دواء'}</span>
                        <span className="font-body-sm text-body-sm text-text-muted truncate" dir="auto">
                          <span dir="ltr">#{id}</span>
                          {[pick(r, 'patientName', 'userName', 'fullName', 'requesterName'), pick(r, 'quantity') != null ? 'الكمية ' + pick(r, 'quantity') : '',
                            pick(r, 'createdAt', 'requestDate') ? formatDateTime(pick(r, 'createdAt', 'requestDate')) : ''].filter(Boolean).map((part) => ' · ' + part).join('')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-2xs">
                        <Badge className={st.cls} icon={st.icon}>{st.label}</Badge>
                        <Button tone="soft" icon="visibility" className="!py-1.5" onClick={() => setViewing(r)}>التفاصيل</Button>
                        <Button tone="soft" icon="published_with_changes" className="!py-1.5" onClick={() => setChanging(r)}>تغيير الحالة</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager page={page} setPage={setPage} count={items.length} total={state.data && state.data.total} />
            </AdminBlock>
          </Card>

          <DetailsModal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? 'طلب #' + recordId(viewing) : ''}
            recordKey={viewing ? recordId(viewing) : null} load={() => api.admin.drugRequests.get(recordId(viewing))} />
          <StatusModal key={changing ? recordId(changing) : 'none'} request={changing} onClose={() => setChanging(null)} onDone={state.reload} />
        </RoleGate>
      </PageBody>
    </>
  );
}
