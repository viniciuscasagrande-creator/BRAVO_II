'use client';

import React, { useEffect } from 'react';

export default function AppErrorBoundary({
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
        const key = `bravo_reload_${window.location.pathname}`;
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
    <div className="p06-card" style={{ maxWidth: '680px', margin: '32px auto' }}>
      <span className="p06-badge warn">Sincronização de Interface</span>
      <h2 style={{ marginTop: '12px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
        Atualização de sessão ou versão detectada
      </h2>
      <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
        O navegador detectou uma atualização nos pacotes da plataforma ou uma interrupção temporária ao
        renderizar esta tela.
      </p>
      {error?.message && (
        <pre
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
            color: '#334155',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </pre>
      )}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tentar Novamente
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recarregar Página Atual
        </button>
        <a
          href="/login"
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
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
  );
}
