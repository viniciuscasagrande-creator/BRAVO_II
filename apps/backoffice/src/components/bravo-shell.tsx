'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBravoSession } from '../context/session-context';
import { CANONICAL_NAVIGATION_MENU, CANONICAL_ROLES } from '@bravo-ii/contracts';

const MODULE_ICONS: Record<string, string> = {
  home: '◈',
  comercial: 'Brief',
  eventos: 'Evt',
  'pedidos-vendas': 'PDV',
  ingressos: 'QR',
  sac: 'SAC',
  cupons: 'Cup',
  financeiro: 'Fin',
  rh: 'RH',
  estornos: 'Est',
  marketing: 'Mkt',
  remarketing: 'Rmk',
  'portal-produtor': 'PDT',
  relatorios: 'Rel',
  cadastros: 'Cad',
  administracao: 'Adm',
};

export function BravoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const {
    actor,
    navigationItems,
    isAuthenticated,
    isLoadingSession,
    logoutFromServer,
  } = useBravoSession();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const activeRoleCode = actor.roles[0] ?? 'FINANCEIRO_DISK';
  const roleInfo = CANONICAL_ROLES[activeRoleCode];

  // Auto-expand active module group when pathname changes
  useEffect(() => {
    const matched = CANONICAL_NAVIGATION_MENU.find(
      (item) =>
        item.href !== '/' &&
        (pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.subItems ?? []).some((sub) => sub.href.split('?')[0] === pathname))
    );
    if (matched) {
      setExpandedGroups((prev) => ({ ...prev, [matched.id]: true }));
    }
  }, [pathname]);

  const filteredNavItems = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return navigationItems;
    return navigationItems.filter((item) => {
      const matchParent =
        item.labelPtBr.toLowerCase().includes(q) || item.moduleCode.toLowerCase().includes(q);
      const matchSub = (item.subItems ?? []).some((s) => s.labelPtBr.toLowerCase().includes(q));
      return matchParent || matchSub;
    });
  }, [navigationItems, moduleSearch]);

  const activeBreadcrumbs = useMemo(() => {
    if (pathname === '/') {
      return [{ label: 'Visão Geral Executiva', href: '/' }];
    }
    if (pathname === '/login') {
      return [
        { label: 'Visão Geral', href: '/' },
        { label: 'Acesso Corporativo', href: '/login' },
      ];
    }
    const parent = CANONICAL_NAVIGATION_MENU.find(
      (item) =>
        item.href !== '/' &&
        (pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.subItems ?? []).some((sub) => sub.href.split('?')[0] === pathname))
    );
    if (!parent) {
      return [
        { label: 'Visão Geral', href: '/' },
        { label: pathname.replace(/^\//, '').replace(/\//g, ' · '), href: pathname },
      ];
    }
    const sub = (parent.subItems ?? []).find((s) => s.href.split('?')[0] === pathname && s.href !== parent.href);
    const crumbs = [
      { label: 'Visão Geral', href: '/' },
      { label: parent.labelPtBr, href: parent.href },
    ];
    if (sub) {
      crumbs.push({ label: sub.labelPtBr, href: sub.href });
    }
    return crumbs;
  }, [pathname]);

  // Route guard: check if current path belongs to a canonical module not allowed for the active actor
  const routeRestrictedModule = useMemo(() => {
    if (pathname === '/' || pathname === '/login') return null;
    const matchedCanonical = CANONICAL_NAVIGATION_MENU.find(
      (item) =>
        item.href !== '/' &&
        (pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.subItems ?? []).some((sub) => sub.href.split('?')[0] === pathname))
    );
    if (!matchedCanonical) return null;
    const isAllowed = navigationItems.some((allowed) => allowed.id === matchedCanonical.id);
    return isAllowed ? null : matchedCanonical;
  }, [pathname, navigationItems]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`bravo-app-shell${isCollapsed ? ' is-collapsed' : ''}`}>
      {/* Sidebar Corporativa BankOS */}
      <aside className="bravo-sidebar" aria-label="Navegação Principal BRAVO_II">
        <div className="bravo-sidebar-brand">
          <div className="bravo-brand-mark" aria-hidden="true">
            B2
          </div>
          {!isCollapsed && (
            <div className="bravo-brand-copy">
              <div className="bravo-brand-title">BRAVO_II</div>
              <div className="bravo-brand-subtitle">ERP Corporativo · DiskIngressos</div>
            </div>
          )}
          <button
            type="button"
            className="bravo-collapse-btn"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isCollapsed ? '»' : '«'}
          </button>
        </div>

        {!isCollapsed && (
          <div className="bravo-sidebar-search">
            <input
              type="search"
              placeholder="Filtrar módulo ou submenu..."
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              aria-label="Filtrar módulos do menu"
            />
          </div>
        )}

        <nav className="bravo-sidebar-nav">
          {!isCollapsed && (
            <div className="bravo-sidebar-section-label">
              Departamentos Habilitados ({filteredNavItems.length})
            </div>
          )}
          <ul className="bravo-nav-list">
            {filteredNavItems.map((item) => {
              const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
              const isItemActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`) ||
                    (item.subItems ?? []).some((s) => s.href.split('?')[0] === pathname);
              const isExpanded =
                Boolean(moduleSearch.trim()) || Boolean(expandedGroups[item.id]) || isItemActive;
              const badgeText = MODULE_ICONS[item.id] ?? item.labelPtBr.slice(0, 3);

              return (
                <li key={item.id} className="bravo-nav-group">
                  <div className={`bravo-nav-row${isItemActive ? ' is-active' : ''}`}>
                    <Link
                      href={item.href}
                      className="bravo-nav-link"
                      title={`${item.labelPtBr} — ${item.moduleCode}`}
                    >
                      <span className="bravo-nav-icon" aria-hidden="true">
                        {badgeText}
                      </span>
                      {!isCollapsed && (
                        <span className="bravo-nav-text">
                          <span className="bravo-nav-title">{item.labelPtBr}</span>
                          <span className="bravo-nav-caption">{item.moduleCode}</span>
                        </span>
                      )}
                    </Link>
                    {!isCollapsed && hasSubItems && (
                      <button
                        type="button"
                        className="bravo-nav-expand"
                        onClick={() => toggleGroup(item.id)}
                        aria-expanded={isExpanded}
                        aria-label={`Alternar submenus de ${item.labelPtBr}`}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>
                    )}
                  </div>

                  {!isCollapsed && hasSubItems && isExpanded && (
                    <ul className="bravo-nav-sublist">
                      {(item.subItems ?? []).map((sub) => {
                        const cleanSubPath = sub.href.split('?')[0];
                        const isSubActive = pathname === cleanSubPath;
                        return (
                          <li key={sub.id}>
                            <Link
                              href={sub.href}
                              className={`bravo-nav-sublink${isSubActive ? ' is-active' : ''}`}
                            >
                              <span className="bravo-nav-subdot" aria-hidden="true" />
                              <span>{sub.labelPtBr}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="bravo-sidebar-footer">
          {!isCollapsed ? (
            <div className="bravo-session-card">
              <div className="bravo-session-status-row">
                <span
                  className={`bravo-status-dot ${isAuthenticated ? 'is-online' : 'is-preview'}`}
                  aria-hidden="true"
                />
                <span className="bravo-session-status-text">
                  {isLoadingSession
                    ? 'Verificando sessão...'
                    : isAuthenticated
                      ? 'Sessão Autenticada'
                      : 'Sessão Não Autenticada'}
                </span>
              </div>
              <div className="bravo-session-user">
                {isAuthenticated ? actor.fullName : 'Operador Desconectado'}
              </div>
              <div className="bravo-session-role">
                {isAuthenticated
                  ? roleInfo?.namePtBr ?? activeRoleCode
                  : 'Autentique-se para operar módulos restritos'}
              </div>
              <div className="bravo-session-actions">
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="bravo-sidebar-btn is-secondary"
                    onClick={() => {
                      void logoutFromServer().then(() => router.push('/login'));
                    }}
                  >
                    Encerrar Sessão
                  </button>
                ) : (
                  <Link href="/login" className="bravo-sidebar-btn is-primary">
                    Entrar na Plataforma →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="bravo-collapsed-auth"
              title={isAuthenticated ? `${actor.fullName} (${roleInfo?.namePtBr})` : 'Entrar'}
            >
              {isAuthenticated ? 'ON' : 'IN'}
            </Link>
          )}
        </div>
      </aside>

      {/* Área Principal BankOS */}
      <div className="bravo-main-column">
        <header className="bravo-topbar">
          <div className="bravo-breadcrumbs" aria-label="Localização na plataforma">
            {activeBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.href}-${idx}`}>
                {idx > 0 && <span className="bravo-breadcrumb-sep">/</span>}
                <Link
                  href={crumb.href}
                  className={`bravo-breadcrumb-item${
                    idx === activeBreadcrumbs.length - 1 ? ' is-current' : ''
                  }`}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </div>

          <div className="bravo-topbar-right">
            <span className="bravo-env-pill" title="Operações financeiras externas e captura bancária real estão bloqueadas neste ambiente">
              Ambiente Controlado · Liquidação Externa Protegida
            </span>

            {isAuthenticated ? (
              <div className="bravo-user-pill">
                <span className="bravo-user-avatar">
                  {actor.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <span className="bravo-user-meta">
                  <strong>{actor.fullName}</strong>
                  <small>{roleInfo?.namePtBr ?? activeRoleCode}</small>
                </span>
                <button
                  type="button"
                  className="bravo-topbar-logout"
                  onClick={() => {
                    void logoutFromServer().then(() => router.push('/login'));
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link href="/login" className="bravo-topbar-login-btn">
                Acessar Conta
              </Link>
            )}
          </div>
        </header>

        <main className="bravo-workspace">
          {routeRestrictedModule ? (
            <div className="p06-card" style={{ maxWidth: '680px', margin: '32px auto' }}>
              <span className="p06-badge warn">Permissão de Departamento Necessária</span>
              <h2 style={{ marginTop: '12px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                Módulo restrito ao departamento {routeRestrictedModule.labelPtBr}
              </h2>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
                Sua credencial atual ({roleInfo?.namePtBr ?? activeRoleCode}) possui escopo segregado e não
                inclui acesso operacional a <strong>{routeRestrictedModule.labelPtBr}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Link
                  href="/"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Voltar à Visão Geral Executiva
                </Link>
                <Link
                  href="/login"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Autenticar com Outro Operador
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
