import { Spinner } from '@/components/ui';

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-space-3xl text-text-muted font-body-md" role="status">
      <Spinner /> جارٍ التحميل…
    </div>
  );
}
