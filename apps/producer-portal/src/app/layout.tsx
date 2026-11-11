import React from 'react';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#111827',
};

export const metadata: Metadata = {
  title: 'Portal do Produtor | BRAVO_II',
  description: 'Gestão mobile-first dos seus eventos na DiskIngressos',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
