import React from 'react';
import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '../context/session-context';
import { BravoShell } from '../components/bravo-shell';
import '../components/bravo-p06.css';
import '../components/bravo-p10.css';
import '../components/bravo-responsive.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0b1120',
};

export const metadata: Metadata = {
  title: 'BRAVO_II — ERP Central Modular da DiskIngressos (Mobile First)',
  description: 'Núcleo operacional integrado e responsivo (Mobile, Tablet e Desktop): Comercial, Eventos, Vendas, Ingressos, SAC, Financeiro, Contabilidade, RH e Governança.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <SessionProvider>
          <BravoShell>{children}</BravoShell>
        </SessionProvider>
      </body>
    </html>
  );
}
