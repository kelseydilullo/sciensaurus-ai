import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { DebugTools } from '@/components/debug-tools';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sciensaurus',
  description: 'Democratizing scientific knowledge for everyone',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/apple-touch-icon.svg',
    icon: [
      {
        url: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        url: '/icons/icon-192x192.svg',
        type: 'image/svg+xml',
        sizes: '192x192',
      },
      {
        url: '/icons/icon-512x512.svg',
        type: 'image/svg+xml',
        sizes: '512x512',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            {/* <DebugTools /> */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

