import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface ScrollSpyItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

export interface ScrollSpyProps {
  items: ScrollSpyItem[];
  activeId?: string;
  rootSelector?: string;
  offset?: number;
  rootMargin?: string;
  className?: string;
  onActiveChange?: (id: string) => void;
  onItemClick?: (id: string) => void;
}

/**
 * Limitless React ScrollSpy Component
 * 
 * Fornece navegação contextual intra-página em telas operacionais extensas.
 * Utiliza IntersectionObserver para acompanhar a seção ativa com alta performance,
 * permitindo rolagem suave e sem interferir na barra lateral principal.
 */
export const ScrollSpy: React.FC<ScrollSpyProps> = ({
  items,
  activeId: initialActiveId,
  rootSelector = '#appMainContent',
  offset = 70,
  rootMargin = '-12% 0px -70% 0px',
  className = '',
  onActiveChange,
  onItemClick
}) => {
  const [activeId, setActiveId] = useState<string>(
    initialActiveId || (items.length > 0 ? items[0].id : '')
  );
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleItemClick = useCallback((id: string) => {
    isProgrammaticScrollRef.current = true;
    setActiveId(id);

    if (onItemClick) {
      onItemClick(id);
    }
    if (onActiveChange) {
      onActiveChange(id);
    }

    const targetEl = document.getElementById(id);
    if (targetEl) {
      const rootEl = rootSelector ? (document.querySelector(rootSelector) as HTMLElement | null) : null;
      if (rootEl) {
        const rootRect = rootEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const relativeTop = targetRect.top - rootRect.top + rootEl.scrollTop - offset;

        rootEl.scrollTo({
          top: Math.max(0, relativeTop),
          behavior: 'smooth'
        });
      } else {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 700);
  }, [offset, onItemClick, onActiveChange, rootSelector]);

  useEffect(() => {
    if (!items || items.length === 0) return;

    const rootEl = rootSelector ? (document.querySelector(rootSelector) as HTMLElement | null) : null;
    const elements = items
      .map(item => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    let observer: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        if (isProgrammaticScrollRef.current) return;

        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const topEntry = visibleEntries[0];
          if (topEntry && topEntry.target && topEntry.target.id) {
            const newActiveId = topEntry.target.id;
            setActiveId(newActiveId);
            if (onActiveChange) {
              onActiveChange(newActiveId);
            }
          }
        }
      }, {
        root: rootEl,
        rootMargin,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
      });

      elements.forEach(el => observer?.observe(el));
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [items, rootMargin, rootSelector, onActiveChange]);

  return (
    <nav
      className={`limitless-scrollspy-bar shadow-xs ${className}`}
      data-scrollspy-nav="react-scrollspy"
      aria-label="Navegação interna da página"
    >
      <div className="limitless-scrollspy-container">
        <div className="limitless-scrollspy-items" ref={containerRef} role="tablist">
          {items.map(item => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                className={`scrollspy-pill ${isActive ? 'active' : ''}`}
                data-target={item.id}
                id={`spy-btn-${item.id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleItemClick(item.id)}
              >
                {item.icon && <i className={`${item.icon} me-1`} />}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span className="scrollspy-badge ms-1">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ScrollSpy;
