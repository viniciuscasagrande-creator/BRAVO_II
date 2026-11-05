import React from 'react';
import type { Metadata } from 'next';
import { SessionProvider } from '../context/session-context';
import { BravoShell } from '../components/bravo-shell';
import '../components/bravo-p06.css';

export const metadata: Metadata = {
  title: 'BRAVO_II — ERP Central Modular da DiskIngressos',
  description: 'Núcleo operacional integrado: Comercial, Eventos, Vendas, Ingressos, SAC, Financeiro e Governança.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>
        <SessionProvider>
          <BravoShell>{children}</BravoShell>
        </SessionProvider>
      </body>
    </html>
  );
}
