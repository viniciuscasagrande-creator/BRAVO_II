'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBravoSession } from '../context/session-context';
import { CANONICAL_ROLES, type RoleCode } from '@bravo-ii/contracts';

export function BravoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { actor, navigationItems, switchLocalPreviewRole } = useBravoSession();
  const activeRoleCode = actor.roles[0] ?? 'FINANCEIRO_DISK';
  const roleInfo = CANONICAL_ROLES[activeRoleCode];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Menu Lateral Dinâmico Filtrado por Perfil RBAC */}
      <aside
        aria-label="Navegação Principal BRAVO_II"
        style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
        }}
      >
        <div style={{ padding: '0 10px 18px 10px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.03em', color: '#ffffff' }}>
            BRAVO_II
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            ERP Central Modular — DiskIngressos
          </div>
        </div>

        <div style={{ padding: '14px 10px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
            Sessão Única Ativa (RBAC + Escopo)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginTop: '4px' }}>
            {actor.fullName}
          </div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '2px' }}>{roleInfo?.namePtBr}</div>

          <label
            htmlFor="profile-switcher"
            style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginTop: '10px', marginBottom: '4px' }}
          >
            Alternar Perfil de Inspeção (Preview):
          </label>
          <select
            id="profile-switcher"
            value={activeRoleCode}
            onChange={(e) => switchLocalPreviewRole(e.target.value as RoleCode)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              fontSize: '12px',
            }}
          >
            <option value="COMERCIAL_DISK">Comercial Disk (Interno)</option>
            <option value="OPERACAO_EVENTOS">Operação de Eventos (Interno)</option>
            <option value="FINANCEIRO_DISK">Financeiro Disk — 104 Opções (Interno)</option>
            <option value="RH_DP_DISK">RH &amp; DP Disk — 45 Opções (Interno)</option>
            <option value="SAC_ATENDIMENTO">SAC / Atendimento (Interno)</option>
            <option value="PRODUTOR_PDT">Produtor (Portal PDT Restrito)</option>
          </select>

          <div style={{ marginTop: '10px' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                fontSize: '12px',
                color: '#93c5fd',
                textDecoration: 'none',
              }}
            >
              Autenticar via API (/login) →
            </Link>
          </div>
        </div>

        <nav style={{ marginTop: '14px', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              padding: '0 10px 8px 10px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
            }}
          >
            Módulos Autorizados ({navigationItems.length})
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    style={{
                      display: 'block',
                      padding: '9px 10px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                    }}
                  >
                    <div>{item.labelPtBr}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: isActive ? '#dbeafe' : '#64748b',
                        marginTop: '2px',
                      }}
                    >
                      {item.moduleCode} · {item.packagePhase}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Área Principal de Operação */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#334155' }}>
            <strong>Escopo de Segurança:</strong>{' '}
            {activeRoleCode === 'PRODUTOR_PDT'
              ? `Restrito a ${actor.producerScopeIds.length} produtor(es) e ${actor.eventScopeIds.length} evento(s) vinculado(s) — Taxa Disk interna oculta`
              : activeRoleCode === 'SAC_ATENDIMENTO'
                ? 'Operação SAC Interna — Sem acesso à Taxa Disk contratual e sem alçada de aprovação de estorno'
                : 'Visão Interna Autorizada Financeiro Disk — Taxa Disk por evento e aprovação financeira habilitadas'}
          </div>
          <div
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontWeight: 600,
            }}
          >
            Gateways Bancários Reais: Bloqueados (Ambiente Seguro)
          </div>
        </div>

        <main style={{ padding: '28px', maxWidth: '1240px', width: '100%' }}>{children}</main>
      </div>
    </div>
  );
}
