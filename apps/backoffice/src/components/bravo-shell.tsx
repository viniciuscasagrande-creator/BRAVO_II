'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBravoSession } from '../context/session-context';
import { CANONICAL_NAVIGATION_MENU, CANONICAL_ROLES } from '@bravo-ii/contracts';

function renderModuleIcon(id: string): React.ReactNode {
  const props = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'home':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'comercial':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      );
    case 'eventos':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'pedidos-vendas':
      return (
        <svg {...props}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'ingressos':
      return (
        <svg {...props}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      );
    case 'sac':
    case 'estornos':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'cupons':
    case 'marketing':
    case 'remarketing':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'financeiro':
      return (
        <svg {...props}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'rh':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'portal-produtor':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'relatorios':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const activeRoleCode = actor.roles[0] ?? 'FINANCEIRO_DISK';
  const roleInfo = CANONICAL_ROLES[activeRoleCode];
  const actorInitials = (actor.fullName || 'OP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const shellNotifications = useMemo(
    () => [
      {
        id: 'notif-fin-conciliacao',
        category: 'Contabilidade & Gateway',
        title: 'Conciliação de extrato gateway disponível',
        detail: 'Verifique divergências de taxa e liquidações no módulo Contabilidade.',
        href: '/financeiro/operacoes',
        tone: 'warn' as const,
      },
      {
        id: 'notif-produtores-repasse',
        category: 'Produtores & Repasses',
        title: 'Alçadas de repasse e antecipação monitoradas',
        detail: 'Saldos de eventos, retenções e assinaturas disponíveis em Comercial e Financeiro.',
        href: '/comercial',
        tone: 'info' as const,
      },
      {
        id: 'notif-sac-estornos',
        category: 'SAC & Estornos',
        title: 'Fila segregada SAC → Financeiro ativa',
        detail: 'Solicitações de estorno aguardando dupla checagem financeira.',
        href: '/estornos',
        tone: 'ok' as const,
      },
      {
        id: 'notif-rh-folha',
        category: 'RH & Folha',
        title: 'Lotes de pagamento e ponto eletrônico',
        detail: 'Acompanhe colaboradores, diárias operacionais e aprovação de lotes.',
        href: '/rh',
        tone: 'info' as const,
      },
    ],
    []
  );

  // Auto-expand active module group & close mobile drawer when pathname changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
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

  // Close mobile drawer on Escape key and lock body scroll when drawer is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isMobileDrawerOpen ? 'hidden' : '';
    }
    if (!isMobileDrawerOpen && !isNotifOpen && !isUserMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsNotifOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isMobileDrawerOpen, isNotifOpen, isUserMenuOpen]);

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

  // O portal possui navegação própria; a API continua responsável pela autorização.
  if (pathname === '/produtores-pdt') return <>{children}</>;

  const isHomeActive = pathname === '/';
  const isFinanceActive = pathname.startsWith('/financeiro') || pathname.startsWith('/estornos');
  const isEventsActive = pathname.startsWith('/eventos') || pathname.startsWith('/ingressos');
  const isProducersActive = pathname.startsWith('/comercial');
  const showFullSidebar = !isCollapsed || isMobileDrawerOpen;

  return (
    <div
      className={`bravo-app-shell${isCollapsed && !isMobileDrawerOpen ? ' is-collapsed' : ''}${
        isMobileDrawerOpen ? ' is-mobile-open is-mobile-drawer-open' : ''
      }`}
    >
      {/* Backdrop Unificado do Drawer Mobile */}
      <button
        type="button"
        className={`bravo-mobile-backdrop bravo-drawer-backdrop${
          isMobileDrawerOpen ? ' is-open' : ''
        }`}
        aria-label="Fechar menu de navegação"
        tabIndex={isMobileDrawerOpen ? 0 : -1}
        onClick={() => setIsMobileDrawerOpen(false)}
      />

      {/* Sidebar Corporativa BankOS (Desktop Recolhível + Drawer Mobile) */}
      <aside
        className={`bravo-sidebar${isMobileDrawerOpen ? ' is-mobile-open' : ''}`}
        id="bravo-primary-navigation"
        aria-label="Navegação Principal BRAVO_II"
      >
        <div className="bravo-sidebar-brand">
          <div className="bravo-brand-mark" aria-hidden="true">
            B2
          </div>
          {showFullSidebar && (
            <div className="bravo-brand-copy">
              <div className="bravo-brand-title">BRAVO_II</div>
              <div className="bravo-brand-subtitle">ERP Mobile First · DiskIngressos</div>
            </div>
          )}
          <button
            type="button"
            className="bravo-mobile-close bravo-drawer-close-btn"
            onClick={() => setIsMobileDrawerOpen(false)}
            title="Fechar menu mobile"
            aria-label="Fechar menu"
          >
            ✕
          </button>
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

        {showFullSidebar && (
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
          {showFullSidebar && (
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
              const badgeIcon = renderModuleIcon(item.id);

              return (
                <li key={item.id} className="bravo-nav-group">
                  <div className={`bravo-nav-row${isItemActive ? ' is-active' : ''}`}>
                    <Link
                      href={item.href}
                      className="bravo-nav-link"
                      title={`${item.labelPtBr} — ${item.moduleCode}`}
                    >
                      <span className="bravo-nav-icon" aria-hidden="true">
                        {badgeIcon}
                      </span>
                      {showFullSidebar && (
                        <span className="bravo-nav-text">
                          <span className="bravo-nav-title">{item.labelPtBr}</span>
                          <span className="bravo-nav-caption">{item.moduleCode}</span>
                        </span>
                      )}
                    </Link>
                    {showFullSidebar && hasSubItems && (
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

                  {showFullSidebar && hasSubItems && isExpanded && (
                    <ul className="bravo-nav-sublist">
                      {(item.subItems ?? []).map((sub) => {
                        const cleanSubPath = sub.href.split('?')[0];
                        const finGroupPrefix = cleanSubPath.startsWith('/financeiro/operacoes/')
                          ? cleanSubPath.split('/').slice(0, 4).join('/') + '/'
                          : null;
                        const isSubActive =
                          pathname === cleanSubPath ||
                          Boolean(finGroupPrefix && pathname.startsWith(finGroupPrefix));
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
          {showFullSidebar ? (
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
        {(isNotifOpen || isUserMenuOpen) && (
          <button
            type="button"
            className="bravo-popover-backdrop"
            aria-label="Fechar painel flutuante"
            onClick={() => {
              setIsNotifOpen(false);
              setIsUserMenuOpen(false);
            }}
          />
        )}

        <header className="bravo-topbar">
          <div className="bravo-topbar-left">
            <button
              type="button"
              className="bravo-mobile-menu-toggle bravo-mobile-menu-btn"
              onClick={() => {
                setIsCollapsed(false);
                setIsNotifOpen(false);
                setIsUserMenuOpen(false);
                setIsMobileDrawerOpen((prev) => !prev);
              }}
              aria-controls="bravo-primary-navigation"
              aria-label={isMobileDrawerOpen ? 'Fechar navegação' : 'Abrir navegação'}
              aria-expanded={isMobileDrawerOpen}
            >
              <svg
                className="bravo-topbar-icon-svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span className="bravo-mobile-menu-label">Menu</span>
            </button>

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
          </div>

          <div className="bravo-topbar-right">
            <span
              className="bravo-env-pill"
              title="Operações financeiras externas e captura bancária real estão bloqueadas neste ambiente"
            >
              Ambiente Controlado · Mobile First
            </span>

            {/* Central de Notificações Operacionais (Ícone Padronizado Fixo) */}
            <div className="bravo-notif-wrap">
              <button
                type="button"
                className={`bravo-notif-btn${isNotifOpen ? ' is-active' : ''}`}
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsNotifOpen((prev) => !prev);
                }}
                title="Notificações e alertas operacionais"
                aria-label="Central de notificações e alertas operacionais"
                aria-expanded={isNotifOpen}
              >
                <svg
                  className="bravo-topbar-icon-svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="bravo-notif-badge">{shellNotifications.length}</span>
              </button>

              {isNotifOpen && (
                <div className="bravo-notif-popover" role="dialog" aria-label="Alertas operacionais">
                  <div className="bravo-notif-header">
                    <strong>Alertas & Notificações</strong>
                    <button
                      type="button"
                      className="bravo-notif-close"
                      onClick={() => setIsNotifOpen(false)}
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="bravo-notif-list">
                    {shellNotifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="bravo-notif-item"
                        onClick={() => setIsNotifOpen(false)}
                      >
                        <span className={`bravo-notif-dot is-${item.tone}`} />
                        <div className="bravo-notif-body">
                          <span className="bravo-notif-cat">{item.category}</span>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Central de Conta / Operador (Ícone Padronizado Fixo no Mobile + Pill no Desktop) */}
            <div className="bravo-user-wrap">
              <button
                type="button"
                className={`bravo-user-btn${isUserMenuOpen ? ' is-active' : ''}`}
                onClick={() => {
                  setIsNotifOpen(false);
                  setIsUserMenuOpen((prev) => !prev);
                }}
                title={
                  isAuthenticated
                    ? `${actor.fullName} (${roleInfo?.namePtBr ?? activeRoleCode})`
                    : 'Conta e sessão do operador'
                }
                aria-label="Menu de usuário e sessão operacional"
                aria-expanded={isUserMenuOpen}
              >
                <svg
                  className="bravo-topbar-icon-svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                  className={`bravo-user-status-badge ${isAuthenticated ? 'is-online' : 'is-preview'}`}
                  aria-hidden="true"
                />
              </button>

              {isAuthenticated ? (
                <div className="bravo-user-pill">
                  <span className="bravo-user-avatar">{actorInitials}</span>
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

              {isUserMenuOpen && (
                <div className="bravo-user-popover" role="dialog" aria-label="Sessão do operador">
                  <div className="bravo-notif-header">
                    <strong>Conta & Sessão Operacional</strong>
                    <button
                      type="button"
                      className="bravo-notif-close"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="bravo-user-popover-body">
                    <div className="bravo-user-popover-profile">
                      <span className="bravo-user-avatar is-large">
                        {isAuthenticated ? actorInitials : 'B2'}
                      </span>
                      <div className="bravo-user-popover-info">
                        <div className="bravo-session-status-row">
                          <span
                            className={`bravo-status-dot ${isAuthenticated ? 'is-online' : 'is-preview'}`}
                            aria-hidden="true"
                          />
                          <span className="bravo-user-popover-status">
                            {isLoadingSession
                              ? 'Verificando sessão...'
                              : isAuthenticated
                                ? 'Sessão Autenticada'
                                : 'Sessão Não Autenticada'}
                          </span>
                        </div>
                        <strong>{isAuthenticated ? actor.fullName : 'Operador Desconectado'}</strong>
                        <small>
                          {isAuthenticated
                            ? roleInfo?.namePtBr ?? activeRoleCode
                            : 'Autentique-se para operar módulos restritos'}
                        </small>
                      </div>
                    </div>

                    <div className="bravo-user-popover-actions">
                      {isAuthenticated ? (
                        <>
                          <Link
                            href="/login"
                            className="bravo-user-popover-btn is-secondary"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Trocar Perfil / Operador
                          </Link>
                          <button
                            type="button"
                            className="bravo-user-popover-btn is-danger"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              void logoutFromServer().then(() => router.push('/login'));
                            }}
                          >
                            Encerrar Sessão
                          </button>
                        </>
                      ) : (
                        <Link
                          href="/login"
                          className="bravo-user-popover-btn is-primary"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Acessar Conta Corporativa →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
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

        {/* Barra de Navegação Inferior Mobile First */}
        <nav className="bravo-mobile-bottom-nav" aria-label="Navegação rápida mobile">
          <Link
            href="/"
            className={`bravo-bottom-nav-item${isHomeActive ? ' is-active' : ''}`}
          >
            {renderModuleIcon('home')}
            <span>Dashboard</span>
          </Link>
          <Link
            href="/financeiro/operacoes"
            className={`bravo-bottom-nav-item${isFinanceActive ? ' is-active' : ''}`}
          >
            {renderModuleIcon('financeiro')}
            <span>Financeiro</span>
          </Link>
          <Link
            href="/eventos"
            className={`bravo-bottom-nav-item${isEventsActive ? ' is-active' : ''}`}
          >
            {renderModuleIcon('eventos')}
            <span>Eventos</span>
          </Link>
          <Link
            href="/comercial"
            className={`bravo-bottom-nav-item${isProducersActive ? ' is-active' : ''}`}
          >
            {renderModuleIcon('comercial')}
            <span>Produtores</span>
          </Link>
          <button
            type="button"
            className={`bravo-bottom-nav-item${isMobileDrawerOpen ? ' is-active' : ''}`}
            onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
            aria-expanded={isMobileDrawerOpen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>Módulos</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
