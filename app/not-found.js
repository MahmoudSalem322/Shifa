import { HomeLinks, StatusPage } from '@/components/status-page';

export const metadata = { title: 'الصفحة غير موجودة' };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      icon="travel_explore"
      title="الصفحة غير موجودة"
      message="الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت. تأكد من العنوان أو ارجع إلى الصفحة الرئيسية."
    >
      <HomeLinks />
    </StatusPage>
  );
}
