import './legacy.css';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata = {
  title: {
    default: 'شفاء | منصة الرعاية الصحية',
    template: '%s | شفاء'
  },
  description: 'منصة صحية تجمع الأطباء والمراكز الصحية والصيدليات والأدوية والتبرعات في مكان واحد.',
  icons: { icon: '/image/logo.png' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;600;700;800&display=swap"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
