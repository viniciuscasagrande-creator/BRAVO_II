/**
 * Limitless Financial App — In-Page Contextual ScrollSpy Component
 * 
 * Permite navegação interna suave e contextual dentro de telas operacionais longas
 * (Gateways e Adquirentes, Taxas e Regras Comerciais, Dossiê do Produtor, Conciliação, Tesouraria).
 * 
 * Diretrizes Arquiteturais:
 * 1. Usa IntersectionObserver de alta performance (sem travar a thread de scroll).
 * 2. Navegação 100% interna: NUNCA afeta ou polui o menu lateral principal.
 * 3. Barra adesiva (sticky) com pills horizontais autoscrolláveis no design token Limitless.
 * 4. Scroll suave com compensação de offset/scroll-margin para títulos de seções.
 * 5. Destruição segura e limpeza de observadores ao alternar de tela.
 */

/**
 * Gera a marcação HTML para a barra sticky de navegação interna do ScrollSpy
 * @param {Array<{id: string, label: string, icon?: string, badge?: string|number}>} items 
 * @param {string} activeId 
 * @param {Object} options 
 * @returns {string} HTML
 */
export function renderScrollSpyNav(items = [], activeId = '', options = {}) {
  const navId = options.navId || 'scrollspy-nav';
  const customClass = options.className || '';
  const currentActive = activeId || (items[0]?.id || '');

  return `
    <nav class="limitless-scrollspy-bar shadow-xs ${customClass}" id="${navId}" data-scrollspy-nav="${navId}" aria-label="Navegação interna da página">
      <div class="limitless-scrollspy-container">
        <div class="limitless-scrollspy-items" role="tablist">
          ${items.map(item => {
            const isActive = item.id === currentActive;
            return `
              <button type="button"
                      class="scrollspy-pill ${isActive ? 'active' : ''}"
                      data-target="${item.id}"
                      id="spy-btn-${item.id}"
                      role="tab"
                      aria-selected="${isActive ? 'true' : 'false'}"
                      onclick="window.app && window.app.scrollToSpySection('${item.id}', event)">
                ${item.icon ? `<i class="${item.icon}"></i>` : ''}
                <span>${item.label}</span>
                ${item.badge !== undefined && item.badge !== null ? `<span class="scrollspy-badge">${item.badge}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </nav>
  `;
}

/**
 * Inicializador do Observer e controle interativo de ScrollSpy
 * @param {Object} config
 * @returns {{ destroy: Function, scrollTo: Function, setActive: Function }}
 */
export function initScrollSpy({
  navSelector = '.limitless-scrollspy-bar',
  rootSelector = '#appMainContent',
  sectionSelector = '.scrollspy-section',
  offset = 70,
  rootMargin = '-12% 0px -70% 0px',
  threshold = [0, 0.1, 0.25, 0.5, 0.75, 1.0],
  onActiveChange = null
} = {}) {
  const navEl = document.querySelector(navSelector);
  if (!navEl) return null;

  const rootEl = document.querySelector(rootSelector) || null;
  const pills = Array.from(navEl.querySelectorAll('.scrollspy-pill'));
  if (pills.length === 0) return null;

  // Encontra as seções alvo correspondentes aos pills
  const targetIds = pills.map(p => p.getAttribute('data-target')).filter(Boolean);
  const sections = targetIds
    .map(id => document.getElementById(id))
    .filter(el => el !== null);

  if (sections.length === 0) return null;

  let isProgrammaticScroll = false;
  let scrollTimeout = null;
  let currentActiveId = pills.find(p => p.classList.contains('active'))?.getAttribute('data-target') || targetIds[0];

  function setActive(targetId, updateUrlHash = false) {
    if (!targetId || targetId === currentActiveId && !updateUrlHash) return;
    currentActiveId = targetId;

    pills.forEach(pill => {
      const match = pill.getAttribute('data-target') === targetId;
      pill.classList.toggle('active', match);
      pill.setAttribute('aria-selected', match ? 'true' : 'false');

      // Navegação global fixa: não há auto-scroll/carrossel horizontal.

    });

    if (typeof onActiveChange === 'function') {
      onActiveChange(targetId);
    }
  }

  function scrollToSection(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    isProgrammaticScroll = true;
    setActive(targetId);

    if (rootEl) {
      // Cálculo preciso do scroll dentro do container independente .app-main-content
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

    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isProgrammaticScroll = false;
    }, 700);
  }

  // IntersectionObserver para detectar qual seção está na zona de leitura
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (isProgrammaticScroll) return;

      // Filtra as entradas que estão visíveis ou interceptando a área de leitura
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length > 0) {
        // Ordena pela maior visibilidade / proximidade do topo
        visibleEntries.sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });
        const primary = visibleEntries[0];
        if (primary && primary.target && primary.target.id) {
          setActive(primary.target.id);
        }
      }
    }, {
      root: rootEl,
      rootMargin,
      threshold
    });

    sections.forEach(sec => observer.observe(sec));
  }

  // Fallback listener para scroll se o browser precisar de sincronização fina
  const handleScrollFallback = () => {
    if (isProgrammaticScroll || observer) return;
    const scrollPos = rootEl ? rootEl.scrollTop : window.scrollY;

    for (let i = sections.length - 1; i >= 0; i--) {
      const sec = sections[i];
      const secTop = rootEl ? (sec.offsetTop - offset - 20) : (sec.offsetTop - offset);
      if (scrollPos >= secTop) {
        setActive(sec.id);
        break;
      }
    }
  };

  if (!observer && rootEl) {
    rootEl.addEventListener('scroll', handleScrollFallback, { passive: true });
  }

  return {
    destroy: () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (rootEl) {
        rootEl.removeEventListener('scroll', handleScrollFallback);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    },
    scrollTo: scrollToSection,
    setActive
  };
}
