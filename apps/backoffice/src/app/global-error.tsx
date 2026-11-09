'use client';

import React, { useEffect } from 'react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = String(error?.message || error?.name || '');
    const isStaleDeploymentError =
      /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Minified React error #418|removeChild/i.test(
        msg
      );
    if (isStaleDeploymentError && typeof window !== 'undefined') {
      try {
        const key = `bravo_global_reload_${window.location.pathname}`;
        const lastReload = Number(sessionStorage.getItem(key) || '0');
        if (Date.now() - lastReload > 10000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        // Ignore sessionStorage restrictions
      }
    }
  }, [error]);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: '28px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            BRAVO_II · Recuperação Automática de Interface
          </div>
          <h1 style={{ marginTop: '14px', fontSize: '22px', fontWeight: 800 }}>
            Nova versão publicada ou sessão reiniciada
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
            Uma atualização da plataforma BRAVO_II foi implantada. Clique abaixo para sincronizar os
            arquivos mais recentes no navegador.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sincronizar e Recarregar Agora
            </button>
            <a
              href="/login"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Ir para Login
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
