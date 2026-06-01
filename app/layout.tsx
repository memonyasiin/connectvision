import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BuildProvider, DEFAULT_CONFIG } from '@/contexts/BuildContext';
import './globals.css';

// Side-effect import — registers every shipped theme's variants into the
// dispatcher's BLOCK_REGISTRY exactly once per Node process / hydration.
import '@/themes/_loadAll';

export const metadata: Metadata = {
  title: 'ConnectVision — Business OS for SMBs',
  description: 'AI-powered website builder + unified SaaS gateway for small businesses.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // SSR-stamp the initial primary color on <html> so the first paint matches
  // DEFAULT_CONFIG before the client-side useEffect kicks in. This prevents
  // a flash of the CSS fallback colour on cold load.
  return (
    <html
      lang="en"
      style={{ ['--primary-color' as string]: DEFAULT_CONFIG.primaryColor }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <BuildProvider>{children}</BuildProvider>
      </body>
    </html>
  );
}
