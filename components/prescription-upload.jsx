'use client';

import { useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTR, checkFile, formatBytes, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from '@/lib/files';
import { Icon } from './ui';

/* Module 5 · Feature 2 — prescription upload component.
   Image or PDF, type and size checked before anything leaves the browser,
   with a preview and a clear error. The parent receives the File; the
   actual upload happens with the drug request (multipart) so the .NET API
   stores it and returns the reference. */
export function PrescriptionUpload({ file, onChange, allowPdf = true, label = 'صورة الوصفة الطبية', optional = true, error: externalError }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (candidate) => {
    const problem = checkFile(candidate, { allowPdf });
    setError(problem);
    if (problem) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(candidate);
  };

  const clear = () => {
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  const shownError = error || externalError;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-label-md text-label-md text-text-heading">
        {label} {optional ? <span className="text-text-muted font-body-sm">(اختياري)</span> : <span className="text-state-danger">*</span>}
      </span>

      {file ? (
        <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-state-success-subtle border border-state-success/20">
          {preview ? (
            <img src={preview} alt="معاينة الوصفة" className="w-16 h-16 rounded-lg object-cover shadow-sm" />
          ) : (
            <span className="w-16 h-16 rounded-lg bg-surface-card text-state-danger flex items-center justify-center shrink-0">
              <Icon name="picture_as_pdf" className="text-[34px]" />
            </span>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-lg text-label-lg text-text-body truncate" dir="auto">{file.name}</span>
            <span className="font-body-sm text-body-sm text-state-success flex items-center gap-1">
              <Icon name="check_circle" className="text-[16px]" />
              جاهز للرفع · {formatBytes(file.size)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            className="px-space-sm py-1.5 rounded-lg bg-surface-card text-text-primary font-label-md text-label-md hover:bg-surface-container-high"
          >
            تغيير
          </button>
          <button type="button" onClick={clear} aria-label="إزالة الملف" className="w-9 h-9 rounded-lg text-state-danger hover:bg-state-danger-subtle flex items-center justify-center">
            <Icon name="delete" className="text-[20px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files && event.dataTransfer.files[0];
            if (dropped) accept(dropped);
          }}
          className={
            'flex flex-col items-center justify-center gap-1 p-space-md rounded-xl border-2 border-dashed transition-colors text-center ' +
            (dragging ? 'border-primary-container bg-primary-fixed/30' : shownError ? 'border-state-danger/50 bg-state-danger-subtle' : 'border-border-soft bg-surface-subtle hover:border-primary-container/50')
          }
        >
          <Icon name="upload_file" className="text-[34px] text-text-primary" />
          <span className="font-label-lg text-label-lg text-text-body">اسحب الملف هنا أو اضغط للاختيار</span>
          <span className="font-body-sm text-body-sm text-text-muted">
            {allowPdf
              ? `صورة (JPG / PNG / WEBP) حتى ${formatBytes(MAX_IMAGE_BYTES)} أو ملف PDF حتى ${formatBytes(MAX_PDF_BYTES)}`
              : `صورة (JPG / PNG / WEBP) حتى ${formatBytes(MAX_IMAGE_BYTES)}`}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={allowPdf ? ACCEPT_ATTR : ACCEPT_ATTR.replace(',application/pdf', '')}
        onChange={(event) => {
          const picked = event.target.files && event.target.files[0];
          if (picked) accept(picked);
        }}
      />

      {shownError ? (
        <span className="font-label-sm text-label-sm text-state-danger flex items-center gap-1" role="alert">
          <Icon name="error" className="text-[16px]" /> {shownError}
        </span>
      ) : null}
    </div>
  );
}
