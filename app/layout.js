import './legacy.css';
import './globals.css';
import { ToastProvider } from '@/components/toast';
import { DarkModeProvider } from '@/components/dark-mode';

export const metadata = {
  title: {
    default: 'شفاء | منصة الرعاية الصحية',
    template: '%s | شفاء'
  },
  description: 'منصة صحية تجمع الأطباء والمراكز الصحية والصيدليات والأدوية والتبرعات في مكان واحد.',
  icons: { icon: '/image/logo.png' }
};

export const viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1a1e' }
  ]
};

/* Inline script that runs before first paint to apply the saved theme
   (or system preference) to <html>, preventing a flash of wrong theme. */
const themeScript = `(function(){try{var t=localStorage.getItem('shifa-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch{}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
        <DarkModeProvider>
          <ToastProvider>{children}</ToastProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
