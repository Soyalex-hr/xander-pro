/* Xander Pro — 05-navegacion-dashboard (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // =====================================================
    // 8. NAVIGATION & EVENT LISTENERS
    // =====================================================
    function setQuoteStepMode(mode) {
      const builderEl = document.getElementById('quote-builder-fullscreen');
      const previewEl = document.getElementById('quote-preview-fullscreen');
      const btnEdit = document.getElementById('btn-step-edit-quote');
      const btnPreview = document.getElementById('btn-step-preview-quote');
      if (!builderEl || !previewEl) return;

      const isPreview = mode === 'preview';
      builderEl.classList.toggle('hidden', isPreview);
      previewEl.classList.toggle('hidden', !isPreview);

      if (btnEdit && btnPreview) {
        btnEdit.className = !isPreview
          ? 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-sm transition flex items-center gap-1.5'
          : 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
        btnPreview.className = isPreview
          ? 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-sm transition flex items-center gap-1.5'
          : 'px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function initSidebar() {
      try {
        if (window.innerWidth >= 1024) {
          const isCollapsed = localStorage.getItem('eq_sidebar_collapsed') === 'true';
          if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
          }
        } else {
          document.body.classList.remove('sidebar-collapsed');
        }
      } catch (e) {}

      window.addEventListener('resize', () => {
        if (window.innerWidth < 1024) {
          document.body.classList.remove('sidebar-collapsed');
        }
      });
    }

    function toggleSidebarDesktop() {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      try {
        localStorage.setItem('eq_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      } catch (e) {}
    }

    function openMobileSidebar() {
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-mobile-backdrop');
      if (sidebar) sidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-mobile-backdrop');
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function handleSidebarHeaderToggle() {
      if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar && sidebar.classList.contains('-translate-x-full')) {
          openMobileSidebar();
        } else {
          closeMobileSidebar();
        }
      } else {
        toggleSidebarDesktop();
      }
    }

    const viewIconsSvg = {
      dashboard: `<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 10a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8zM10 14a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"/></svg>`,
      cotizador: `<svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      historial: `<svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>`,
      agenda: `<svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
      productos: `<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
      simulador: `<svg class="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`,
      clientes: `<svg class="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
      finanzas: `<svg class="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      rentabilidad: `<svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      empresa: `<svg class="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
      cabanas: `<svg class="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
      'cotizador-cabanas': `<svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`
      ,'dia-sol': `<svg class="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      ,servicios: `<svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`
    };

    const viewTitles = {
      dashboard: { title: 'Inicio', subtitle: 'Resumen de cotizaciones, pendientes y próximos eventos' },
      cotizador: { title: 'Cotizador y PDF', subtitle: 'Presupuesto din\u00E1mico por Pax, montaje y exportaci\u00F3n PDF' },
      historial: { title: 'Cotizaciones Guardadas', subtitle: 'Historial comercial, seguimiento y estados de eventos' },
      productos: { title: 'Productos e Insumos', subtitle: 'Cat\u00E1logo de recetas compuestas y control de inventario' },
      simulador: { title: 'Simulador de Recetas', subtitle: 'Costeo unitario por Pax, margen comercial y explosi\u00F3n de insumos' },
      clientes: { title: 'Directorio de Clientes', subtitle: 'Base de datos de contactos, empresas y eventos' },
      finanzas: { title: 'Flujo de Caja & Finanzas', subtitle: 'Registro de anticipos, ingresos, compras y balance neto' },
      agenda: { title: 'Agenda Operativa', subtitle: 'Eventos y hospedajes por fecha, estado y cliente' },
      rentabilidad: { title: 'Cierre de Eventos & Rentabilidad', subtitle: 'Auditor\u00EDa financiera real vs estimada, gastos extra y liquidaci\u00F3n' },
      empresa: { title: 'Mi Empresa & Respaldo', subtitle: 'Identidad corporativa, t\u00E9rminos comerciales y copias JSON' },
      cabanas: { title: 'Cabañas & Catálogos', subtitle: 'Hospedajes, capacidades, tarifas base, políticas de niños y tours' },
      'cotizador-cabanas': { title: 'Cotizador de Hospedaje', subtitle: 'Presupuesto de cabañas, huéspedes, planes de alimentación y servicios' },
      'dia-sol': { title: 'Cotizador Día de Sol', subtitle: 'Entradas por persona, adicionales, PDF e historial de pasadías' },
      servicios: { title: 'Servicios Adicionales', subtitle: 'Servicios turísticos, experiencias y conceptos para las cotizaciones' }
    };

    function switchView(viewName) {
      const views = ['dashboard', 'cotizador', 'historial', 'productos', 'simulador', 'clientes', 'finanzas', 'empresa', 'agenda', 'rentabilidad', 'cabanas', 'cotizador-cabanas', 'servicios', 'dia-sol'];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle('hidden', v !== viewName);
      });

      // Update Header Breadcrumb Title & SVG Icon
      const viewInfo = viewTitles[viewName] || viewTitles.dashboard;
      const hIcon = document.getElementById('header-active-view-icon');
      const hTitle = document.getElementById('header-active-view-title');
      const hSub = document.getElementById('header-active-view-sub');
      if (hIcon) hIcon.innerHTML = viewIconsSvg[viewName] || viewIconsSvg.dashboard;
      if (hTitle) hTitle.textContent = viewInfo.title;
      if (hSub) hSub.textContent = viewInfo.subtitle;

      // Update Sidebar Nav Buttons with Persistent Theme Icon Containers
      const navItemPalettes = {
        dashboard: { inactive: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400' },
        cotizador: { inactive: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400' },
        historial: { inactive: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400' },
        agenda: { inactive: 'bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400' },
        productos: { inactive: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400' },
        simulador: { inactive: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400' },
        clientes: { inactive: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/70 dark:text-cyan-400' },
        finanzas: { inactive: 'bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400' },
        rentabilidad: { inactive: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400' },
        empresa: { inactive: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        cabanas: { inactive: 'bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400' },
        'cotizador-cabanas': { inactive: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400' }
      };

      document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        const navId = btn.getAttribute('data-nav');
        const isActive = navId === viewName;
        const iconBox = btn.querySelector('.nav-icon-box');
        const palette = navItemPalettes[navId] || { inactive: 'bg-slate-100 text-slate-600' };

        // Conserva las clases originales del HTML (tamaño de letra, padding, icono)
        // y solo alterna el estado activo.
        btn.classList.toggle('ag-active', isActive);
        btn.classList.toggle('font-bold', isActive || btn.dataset.nav === 'dashboard');
        if (iconBox) iconBox.classList.toggle('text-white', isActive);
      });

      // Update Mobile Bottom Nav buttons
      document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        const navId = btn.getAttribute('data-nav');
        const isActive = navId === viewName;
        btn.className = isActive
          ? 'bottom-nav-btn flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition text-blue-600 dark:text-blue-400 font-bold scale-105 cursor-pointer'
          : 'bottom-nav-btn flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer';
      });

      closeMobileSidebar();

      if (viewName === 'dashboard') renderDashboard();
      if (viewName === 'productos') renderProductsCatalog();
      if (viewName === 'simulador') {
        populateRecipeSimulator();
        renderRecipeSimulatorResults();
      }
      if (viewName === 'historial') renderSavedQuotes();
      if (viewName === 'clientes') renderClientsGrid();
      
      if (viewName === 'empresa') {
        loadCompanyFormInputs();
        renderEventTypesPills();
        if (typeof renderCompanyUsersList === 'function') renderCompanyUsersList();
      }
      if (viewName === 'servicios') {
        renderEventTypesPills();
        if (typeof renderServiciosView === 'function') renderServiciosView();
      }
      if (viewName === 'cabanas') {
        if (typeof renderCabinsGrid === 'function') renderCabinsGrid();
        if (typeof renderChildPoliciesInputs === 'function') renderChildPoliciesInputs();
      }
            openSidebarMenuForView(viewName);

      if (viewName === 'cotizador-cabanas') {
        if (typeof setCabinQuoteStep === 'function') setCabinQuoteStep('edit');
        if (typeof populateCabinQuotePickers === 'function') populateCabinQuotePickers();
        if (typeof loadCabinQuoteIntoEditor === 'function') loadCabinQuoteIntoEditor();
      }
      if (viewName === 'agenda') renderAgenda();
      if (viewName === 'dia-sol' && typeof renderDayPassView === 'function') renderDayPassView();
      // Antigravity GSAP Staggered Entrance
      if (window.gsap && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        const activeContainer = document.getElementById(`view-${viewName}`);
        if (activeContainer) {
          const directCards = activeContainer.querySelectorAll(':scope > div, :scope > section, .ag-tilt-card');
          if (directCards.length > 0) {
            gsap.fromTo(directCards, 
              { opacity: 0, y: 14 }, 
              { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: "power2.out", clearProps: "opacity" }
            );
          }
        }
      }

      if (viewName === 'rentabilidad') {
        populateClosureQuoteSelect();
        renderClosureHistory();
      }
      if (viewName === 'finanzas') {
        renderFinancesView();
        renderProjectedCashFlow();
      }
      if (viewName === 'cotizador') {
        populateEventTypeSelect();
        populateClientSelect();
        populatePickerProducts();
        renderQuoteEditorAndPdf();
      }
    }

    function initAntigravityMotion() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return; // Respect reduced motion preferences
      }

      // 3D tilt permanently disabled for crisp text readability
      // Auth Screen 3D Spatial Tracking
      const authScreen = document.getElementById('auth-screen');
      const authCard = document.getElementById('auth-card-container');
      if (authScreen && authCard) {
        authScreen.addEventListener('mousemove', function(e) {
          if (authScreen.classList.contains('hidden') || authScreen.offsetParent === null) return;
          const rect = authCard.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const rotateX = ((e.clientY - centerY) / window.innerHeight) * -10;
          const rotateY = ((e.clientX - centerX) / window.innerWidth) * 10;

          if (window.gsap) {
            gsap.to(authCard, {
              rotateX: rotateX,
              rotateY: rotateY,
              transformPerspective: 1000,
              duration: 0.25,
              ease: "power1.out",
              overwrite: "auto"
            });
          }
        });

        authScreen.addEventListener('mouseleave', function() {
          if (window.gsap) {
            gsap.to(authCard, {
              rotateX: 0,
              rotateY: 0,
              duration: 0.5,
              ease: "power2.out",
              overwrite: "auto"
            });
          }
        });
      }
    }

    window.initAntigravityMotion = initAntigravityMotion;
    window.switchView = switchView;

    // =========================================================================
    // EXECUTIVE DASHBOARD LOGIC (MODULE 4 & 6)
    // =========================================================================
    let currentDashboardUrgency = 'all';

    function filterDashboardUrgency(urgency) {
      currentDashboardUrgency = urgency;
      ['today', '3days', '7days', 'all'].forEach(u => {
        const btn = document.getElementById(`btn-dash-urgency-${u}`);
        if (btn) {
          if (u === urgency) {
            btn.classList.add('ring-2', 'ring-blue-500', 'font-black');
          } else {
            btn.classList.remove('ring-2', 'ring-blue-500', 'font-black');
          }
        }
      
      });
      renderDashboardExpiringWidget();
    }

    function renderDashboard() {
  if (typeof updateCabinDashboardAndBadges === 'function')   updateCabinDashboardAndBadges();
  try {
    const savedMod = localStorage.getItem('xander_active_module') || 'all';
    filterSidebarModule(savedMod);
  } catch (e) {}
      // 1. Dynamic Greeting
      const hour = new Date().getHours();
      let greeting = 'Buenos días';
      if (hour >= 12 && hour < 18) {
        greeting = 'Buenas tardes';
      } else if (hour >= 18 || hour < 5) {
        greeting = 'Buenas noches';
      }
      const userName = getOperatorName();
      const greetingTitle = document.getElementById('dash-greeting-title');
      if (greetingTitle) {
        greetingTitle.innerHTML = `<span>${greeting}, <span id="dash-greeting-name">${userName}</span>.</span>
          <button type="button" onclick="openEditOperatorModal()" title="Personalizar nombre del operador" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs flex items-center gap-1 border border-slate-700/60">
            <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            <span class="hidden sm:inline font-medium">Editar</span>
          </button>`;
      }

      const dateEl = document.getElementById('dash-current-date-text');
      if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = new Date().toLocaleDateString('es-CO', options);
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      }

      // 2. Compute KPIs
      const saved = state.savedQuotes || [];
      const activeQuotes = saved.filter(q => q.status === 'Borrador' || q.status === 'Enviada');
      const activeQuotesVal = activeQuotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
      
      const approvedQuotes = saved.filter(q => q.status === 'Aprobada');
      const scheduledPax = approvedQuotes.reduce((sum, q) => sum + (Number(q.guestsPax) || 0), 0);

      // Month cash balance
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const finances = state.finances || [];
      const monthFinances = finances.filter(f => (f.date || '').startsWith(currentMonthStr));
      const monthInc = monthFinances.filter(f => f.type === 'ingreso').reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const monthExp = monthFinances.filter(f => f.type === 'egreso').reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const monthBalance = monthInc - monthExp;

      // Estimated profit (projected margin of approved/active quotes)
      const estProfit = approvedQuotes.reduce((sum, q) => {
        const cost = (q.items || []).reduce((cSum, it) => cSum + (Number(it.costTotal) || ((Number(it.costUnit) || 0) * (Number(it.qty) || 1))), 0);
        return sum + Math.max(0, (Number(q.total) || 0) - cost);
      }, 0);

      // Real liquidated profit from event closures
      const closures = state.eventClosures || [];
      const realProfit = closures.reduce((sum, c) => sum + (Number(c.realProfit) || 0), 0);

      // Notifications
      const notifs = generateSystemNotifications();
      const dismissed = JSON.parse(localStorage.getItem('eq_dismissed_notifs') || '[]');
      const activeNotifs = notifs.filter(n => !dismissed.includes(n.id));
      const criticalNotifs = activeNotifs.filter(n => n.severity === 'critical');

      // DOM update KPIs
      const kpiActive = document.getElementById('dash-kpi-active-quotes');
      const kpiActiveVal = document.getElementById('dash-kpi-active-quotes-val');
      if (kpiActive) kpiActive.textContent = activeQuotes.length;
      if (kpiActiveVal) kpiActiveVal.textContent = `Valor: ${formatCurrency(activeQuotesVal)}`;

      const kpiEvents = document.getElementById('dash-kpi-scheduled-events');
      const kpiPax = document.getElementById('dash-kpi-scheduled-pax');
      if (kpiEvents) kpiEvents.textContent = approvedQuotes.length;
      if (kpiPax) kpiPax.textContent = `${scheduledPax} Pax confirmados`;

      const kpiBal = document.getElementById('dash-kpi-month-balance');
      const kpiFlow = document.getElementById('dash-kpi-month-flow');
      if (kpiBal) kpiBal.textContent = formatCurrency(monthBalance);
      if (kpiFlow) kpiFlow.textContent = `+${formatCurrency(monthInc)} / -${formatCurrency(monthExp)}`;

      const kpiEst = document.getElementById('dash-kpi-est-profit');
      if (kpiEst) kpiEst.textContent = formatCurrency(estProfit);

      const kpiReal = document.getElementById('dash-kpi-real-profit');
      const kpiClosed = document.getElementById('dash-kpi-closed-count');
      if (kpiReal) kpiReal.textContent = formatCurrency(realProfit);
      if (kpiClosed) kpiClosed.textContent = `${closures.length} eventos liquidados`;

      const kpiAlerts = document.getElementById('dash-kpi-pending-alerts');
      const kpiCrit = document.getElementById('dash-kpi-critical-alerts');
      if (kpiAlerts) kpiAlerts.textContent = activeNotifs.length;
      if (kpiCrit) kpiCrit.textContent = `${criticalNotifs.length} críticas`;

      // 3. Render Central Module: ACCIONES PENDIENTES
      updatePendingActions(notifs);

      // 4. Render Expiring Quotes Widget in Dashboard
      renderDashboardExpiringWidget();

      // 5. Render Upcoming Events
      renderDashboardUpcomingEvents();

      // 6. Render Recent Financial Activity
      renderDashboardRecentFinances();
    }

    function updatePendingActions(notifs) {
      const container = document.getElementById('dash-pending-actions-grid');
      const totalBadge = document.getElementById('dash-actions-badge-total');
      if (!container) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Cotizaciones vencidas & próximas a vencer
      const quotes = state.savedQuotes || [];
      let quotesOverdue = 0;
      let quotesExpiringSoon = 0;
      quotes.forEach(q => {
        if (q.status === 'Rechazada' || q.status === 'Cancelada' || q.status === 'Aprobada' || q.status === 'Reemplazada') return;
        const vDate = new Date(q.validUntil + 'T00:00:00');
        const diffDays = Math.round((vDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) quotesOverdue++;
        else if (diffDays <= 7) quotesExpiringSoon++;
      });

      // 2. Eventos próximos (en 7 días)
      let upcomingEventsCount = 0;
      quotes.forEach(q => {
        if (q.status !== 'Aprobada') return;
        const eDate = new Date(q.eventDate + 'T00:00:00');
        const diffDays = Math.round((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) upcomingEventsCount++;
      });

      // 3. Eventos sin cerrar
      let unclosedEventsCount = 0;
      quotes.forEach(q => {
        if (q.status !== 'Aprobada') return;
        const eDate = new Date(q.eventDate + 'T00:00:00');
        const diffDays = Math.round((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          const isClosed = (state.eventClosures || []).some(cl => cl.quoteId === q.id);
          if (!isClosed) unclosedEventsCount++;
        }
      });

      // 4. Compras pendientes
      let pendingPurchasesCount = 0;
      quotes.filter(q => q.status === 'Aprobada').forEach(q => {
        const listState = (state.shoppingLists || {})[q.id] || {};
        (q.items || []).forEach(it => {
          const p = (state.products || []).find(prod => prod.id === it.productId);
          if (it.isRecipe && p && Array.isArray(p.ingredients)) {
            p.ingredients.forEach(ing => {
              if (!listState[ing.productId]) pendingPurchasesCount++;
            });
          }
        });
      });

      // 5. Inventario insuficiente
      let lowStockCount = 0;
      (state.products || []).forEach(p => {
        if (p.active !== false && (typeof xpStockStatus === 'function' ? ['out', 'low'].includes(xpStockStatus(p)) : (p.trackStock && Number(p.stock) <= 0))) lowStockCount++;
      });

      // 6. Pagos pendientes (Aprobadas con saldo por cobrar)
      let pendingPaymentsCount = 0;
      let pendingPaymentsAmount = 0;
      quotes.filter(q => q.status === 'Aprobada').forEach(q => {
        const total = Number(q.total) || 0;
        const depositPct = Number(q.depositPct) || 50;
        const anticipo = Math.round(total * (depositPct / 100));
        const saldo = total - anticipo;
        if (saldo > 0) {
          pendingPaymentsCount++;
          pendingPaymentsAmount += saldo;
        }
      });

      const totalActiveTasks = (quotesOverdue + quotesExpiringSoon > 0 ? 1 : 0) +
                               (upcomingEventsCount > 0 ? 1 : 0) +
                               (unclosedEventsCount > 0 ? 1 : 0) +
                               (pendingPurchasesCount > 0 ? 1 : 0) +
                               (lowStockCount > 0 ? 1 : 0) +
                               (pendingPaymentsCount > 0 ? 1 : 0);

      if (totalBadge) totalBadge.textContent = `${totalActiveTasks} categorías activas`;

      const cards = [
        {
          title: 'Cotizaciones Próximas a Vencer',
          badge: quotesOverdue > 0 ? `${quotesOverdue} vencidas` : (quotesExpiringSoon > 0 ? `${quotesExpiringSoon} por vencer` : 'Al día'),
          badgeClass: quotesOverdue > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : (quotesExpiringSoon > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'),
          icon: '⏳',
          desc: quotesOverdue > 0 ? `${quotesOverdue} cotizaciones requieren seguimiento comercial urgente.` : (quotesExpiringSoon > 0 ? `${quotesExpiringSoon} cotizaciones vencen en los próximos 7 días.` : 'Todas las propuestas comerciales al día.'),
          actionText: 'Ver Cotizaciones ➔',
          action: () => {
            const el = document.getElementById('widget-expiring-quotes-dashboard');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }
        },
        {
          title: 'Eventos Próximos (7 Días)',
          badge: upcomingEventsCount > 0 ? `${upcomingEventsCount} esta semana` : 'Sin eventos',
          badgeClass: upcomingEventsCount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          icon: '📅',
          desc: upcomingEventsCount > 0 ? `${upcomingEventsCount} celebraciones confirmadas en la agenda próxima.` : 'No hay eventos programados en los próximos 7 días.',
          actionText: 'Ver Agenda ➔',
          action: () => switchView('agenda')
        },
        {
          title: 'Eventos Sin Cerrar',
          badge: unclosedEventsCount > 0 ? `${unclosedEventsCount} pendientes` : 'Al día',
          badgeClass: unclosedEventsCount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: '🏁',
          desc: unclosedEventsCount > 0 ? `${unclosedEventsCount} eventos finalizados sin registrar costos reales ni liquidación.` : 'Todos los eventos pasados han sido auditados y cerrados.',
          actionText: 'Liquidar Rentabilidad ➔',
          action: () => switchView('rentabilidad')
        },
        {
          title: 'Compras & Insumos Pendientes',
          badge: pendingPurchasesCount > 0 ? `${pendingPurchasesCount} insumos` : 'Completo',
          badgeClass: pendingPurchasesCount > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: '🛒',
          desc: pendingPurchasesCount > 0 ? `Insumos necesarios para eventos aprobados pendientes por comprar.` : 'Insumos de eventos aprobados cubiertos o comprados.',
          actionText: 'Ver Lista de Compras ➔',
          action: () => {
            const approved = (state.savedQuotes || []).find(q => q.status === 'Aprobada');
            if (approved) openShoppingListModal(approved);
            else showToast('No hay eventos aprobados activos para lista de compras');
          }
        },
        {
          title: 'Inventario bajo o agotado',
          badge: lowStockCount > 0 ? `${lowStockCount} por reabastecer` : 'Stock OK',
          badgeClass: lowStockCount > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: '📦',
          desc: lowStockCount > 0 ? `${lowStockCount} insumo(s) agotados o por debajo del stock mínimo.` : 'Existencias de insumos en bodega con stock disponible.',
          actionText: 'Ir a Almacén ➔',
          action: () => { switchView('productos'); if (window.xpSetCatFilter) window.xpSetCatFilter('low_stock'); }
        },
        {
          title: 'Pagos y Saldos Pendientes',
          badge: pendingPaymentsCount > 0 ? `${formatCurrency(pendingPaymentsAmount)}` : 'Cobrado',
          badgeClass: pendingPaymentsCount > 0 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: '💳',
          desc: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} eventos confirmados con saldo pendiente de pago.` : 'Sin saldos pendientes en eventos confirmados.',
          actionText: 'Ver Cobros ➔',
          action: () => switchView('historial')
        }
      ];

      container.innerHTML = cards.map((c, idx) => `
        <div class="ag-tilt-card p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md shadow-antigravity hover:shadow-antigravity-hover transition-all duration-300 flex flex-col justify-between space-y-3 group hover:-translate-y-1">
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-lg p-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-xs">${c.icon}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.badgeClass}">${c.badge}</span>
            </div>
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white mt-2">${c.title}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${c.desc}</p>
          </div>
          <button type="button" onclick="dashActionHandler(${idx})" class="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
            ${c.actionText}
          </button>
        </div>
      `).join('');

      window._dashActionCallbacks = cards.map(c => c.action);
    }

    function dashActionHandler(idx) {
      if (window._dashActionCallbacks && window._dashActionCallbacks[idx]) {
        window._dashActionCallbacks[idx]();
      }
    }

    function renderDashboardExpiringWidget() {
      const tbody = document.getElementById('dash-expiring-table-tbody');
      const cardsContainer = document.getElementById('dash-expiring-mobile-cards');
      const countTodayEl = document.getElementById('dash-count-today');
      const count3dEl = document.getElementById('dash-count-3days');
      const count7dEl = document.getElementById('dash-count-7days');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const quotes = state.savedQuotes || [];
      let countToday = 0;
      let count3d = 0;
      let count7d = 0;

      const analyzed = quotes.map(q => {
        if (q.status === 'Rechazada' || q.status === 'Cancelada') return null;
        const vDate = new Date(q.validUntil + 'T00:00:00');
        const diffTime = vDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) countToday++;
        else if (diffDays <= 3) count3d++;
        else if (diffDays <= 7) count7d++;

        const cl = (state.clients || []).find(c => c.id === q.clientId);
        return {
          ...q,
          diffDays,
          clientName: cl ? cl.name : 'Cliente'
        };
      }).filter(Boolean);

      if (countTodayEl) countTodayEl.textContent = countToday;
      if (count3dEl) count3dEl.textContent = count3d;
      if (count7dEl) count7dEl.textContent = count7d;

      let filtered = analyzed;
      if (currentDashboardUrgency === 'today') {
        filtered = analyzed.filter(q => q.diffDays <= 0);
      } else if (currentDashboardUrgency === '3days') {
        filtered = analyzed.filter(q => q.diffDays > 0 && q.diffDays <= 3);
      } else if (currentDashboardUrgency === '7days') {
        filtered = analyzed.filter(q => q.diffDays > 3 && q.diffDays <= 7);
      }

      // Sort by urgency
      filtered.sort((a, b) => a.diffDays - b.diffDays);

      if (filtered.length === 0) {
        const emptyMsg = `
          <div class="py-8 text-center text-slate-400 text-xs">
            <span class="text-xl block mb-1">🎉</span>
            No hay cotizaciones pendientes en este criterio de vencimiento.
          </div>
        `;
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 text-xs">No hay cotizaciones pendientes en este rango.</td></tr>`;
        if (cardsContainer) cardsContainer.innerHTML = emptyMsg;
        return;
      }

      // Render Desktop Table
      if (tbody) {
        tbody.innerHTML = filtered.map(q => {
          let badgeHtml = '';
          if (q.diffDays < 0) {
            badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">🔴 Vencida (${Math.abs(q.diffDays)}d)</span>`;
          } else if (q.diffDays === 0) {
            badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 animate-pulse">🔴 Vence Hoy</span>`;
          } else if (q.diffDays <= 3) {
            badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">🟡 En ${q.diffDays} días</span>`;
          } else {
            badgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">🟢 En ${q.diffDays} días</span>`;
          }

          const statusColor = q.status === 'Aprobada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                             (q.status === 'Enviada' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200');

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <td class="py-3 px-3.5 font-bold font-mono text-blue-600 dark:text-blue-400">${q.number}</td>
              <td class="py-3 px-3.5">
                <div class="font-bold text-slate-900 dark:text-white">${q.eventTitle}</div>
                <div class="text-[11px] text-slate-500">${q.clientName} · ${q.guestsPax} Pax</div>
              </td>
              <td class="py-3 px-3.5 tabular-nums text-slate-700 dark:text-slate-300">${formatDateHuman(q.validUntil)}</td>
              <td class="py-3 px-3.5 text-center">${badgeHtml}</td>
              <td class="py-3 px-3.5 text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}">${q.status}</span>
              </td>
              <td class="py-3 px-3.5 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">${formatCurrency(q.total)}</td>
              <td class="py-3 px-3.5 text-right">
                <button type="button" onclick="loadSavedQuoteIntoActiveQuoteById('${q.id}'); switchView('cotizador');" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer">
                  <span>Abrir ➔</span>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      // Render Mobile Cards
      if (cardsContainer) {
        cardsContainer.innerHTML = filtered.map(q => {
          let badgeText = '';
          let badgeClass = '';
          if (q.diffDays < 0) {
            badgeText = `🔴 Vencida hace ${Math.abs(q.diffDays)} días`;
            badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';
          } else if (q.diffDays === 0) {
            badgeText = '🔴 Vence Hoy';
            badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';
          } else if (q.diffDays <= 3) {
            badgeText = `🟡 Vence en ${q.diffDays} días`;
            badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
          } else {
            badgeText = `🟢 Vence en ${q.diffDays} días`;
            badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
          }

          return `
            <div class="p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold font-mono text-xs text-blue-600 dark:text-blue-400">${q.number}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-black ${badgeClass}">${badgeText}</span>
              </div>
              <div>
                <h4 class="font-bold text-slate-900 dark:text-white text-xs">${q.eventTitle}</h4>
                <div class="text-[11px] text-slate-500 mt-0.5">${q.clientName} · ${q.guestsPax} Pax · Vence: <strong>${formatDateHuman(q.validUntil)}</strong></div>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span class="font-black text-slate-900 dark:text-white text-sm tabular-nums">${formatCurrency(q.total)}</span>
                <button type="button" onclick="loadSavedQuoteIntoActiveQuoteById('${q.id}'); switchView('cotizador');" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer">
                  <span>Gestionar Cotización</span>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    function renderDashboardUpcomingEvents() {
      const container = document.getElementById('dash-upcoming-events-list');
      if (!container) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const approved = (state.savedQuotes || []).filter(q => q.status === 'Aprobada' && q.eventDate);
      approved.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

      const upcoming = approved.filter(q => {
        const eDate = new Date(q.eventDate + 'T00:00:00');
        return eDate.getTime() >= today.getTime();
      }).slice(0, 4);

      if (upcoming.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay eventos próximos confirmados en agenda.</div>`;
        return;
      }

      container.innerHTML = upcoming.map(q => {
        const eDate = new Date(q.eventDate + 'T00:00:00');
        const diffDays = Math.round((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const cl = (state.clients || []).find(c => c.id === q.clientId);

        let countdownBadge = '';
        if (diffDays === 0) countdownBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">¡Hoy!</span>`;
        else if (diffDays === 1) countdownBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">Mañana</span>`;
        else countdownBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">En ${diffDays} días</span>`;

        return `
          <div class="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-400 transition">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center font-bold text-xs shrink-0">
                <span class="text-[9px] uppercase leading-none">${formatDateHuman(q.eventDate).split(' ')[1] || 'EV'}</span>
                <span class="text-sm leading-none mt-0.5">${formatDateHuman(q.eventDate).split(' ')[0] || ''}</span>
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-slate-900 dark:text-white text-xs truncate">${q.eventTitle}</h4>
                <div class="text-[11px] text-slate-500 truncate">${cl ? cl.name : 'Cliente'} · ${q.guestsPax} Pax · ${q.eventVenue || 'Locación'}</div>
              </div>
            </div>
            <div class="text-right shrink-0">
              ${countdownBadge}
              <div class="mt-1">
                <button type="button" onclick="openShoppingListModal('${q.id}')" class="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer" title="Ver compras del evento">
                  Compras ➔
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderDashboardRecentFinances() {
      const container = document.getElementById('dash-recent-finances-list');
      if (!container) return;

      const finances = (state.finances || []).slice(-4).reverse();
      if (finances.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay movimientos financieros registrados.</div>`;
        return;
      }

      container.innerHTML = finances.map(f => {
        const isIncome = f.type === 'ingreso';
        return `
          <div class="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-7 h-7 rounded-lg ${isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'} flex items-center justify-center text-xs font-black shrink-0">
                ${isIncome ? '+' : '-'}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-900 dark:text-white truncate">${f.concept}</p>
                <span class="text-[10px] text-slate-400">${formatDateHuman(f.date)} · ${f.category || ''}</span>
              </div>
            </div>
            <div class="text-right font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tabular-nums shrink-0">
              ${isIncome ? '+' : '-'}${formatCurrency(f.amount)}
            </div>
          </div>
        `;
      }).join('');
    }

    function setupEventListeners() {
      // Main Navigation Tabs (Sidebar & Bottom Bar)
      document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          switchView(btn.getAttribute('data-nav'));
        });
      });

      // Mobile Backdrop click
      document.getElementById('sidebar-mobile-backdrop')?.addEventListener('click', closeMobileSidebar);

      // Stepper buttons between Fullscreen Editor and Fullscreen Preview
      document.getElementById('btn-step-edit-quote')?.addEventListener('click', () => {
        setQuoteStepMode('edit');
      });
      document.getElementById('btn-step-preview-quote')?.addEventListener('click', () => {
        renderQuoteEditorAndPdf();
        setQuoteStepMode('preview');
      });
      document.getElementById('btn-bottom-open-preview')?.addEventListener('click', () => {
        renderQuoteEditorAndPdf();
        setQuoteStepMode('preview');
        showToast('Vista Previa lista. Revisa los detalles antes de generar o descargar el PDF.');
      });
      document.getElementById('btn-back-to-editor')?.addEventListener('click', () => {
        setQuoteStepMode('edit');
      });

      // Close modal buttons
      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
          const modalId = btn.getAttribute('data-close-modal');
          document.getElementById(modalId)?.classList.add('hidden');
        });
      });

      // Quote header live bindings (excluding q-event-type which has dedicated custom concept handling)
      function syncQuoteFormInputsToState() {
        const q = state.activeQuote;
        if (!q) return;
        const paxEl = document.getElementById('q-guests-pax');
        if (paxEl && paxEl.value !== '') q.guestsPax = Number(paxEl.value);
        const validEl = document.getElementById('q-valid-until');
        if (validEl && validEl.value) q.validUntil = validEl.value;
        const issueEl = document.getElementById('q-issue-date');
        if (issueEl && issueEl.value) q.issueDate = issueEl.value;
        const evDateEl = document.getElementById('q-event-date');
        if (evDateEl && evDateEl.value) q.eventDate = evDateEl.value;
        const titleEl = document.getElementById('q-event-title');
        if (titleEl && titleEl.value !== undefined) q.eventTitle = titleEl.value;
        const venueEl = document.getElementById('q-event-venue');
        if (venueEl && venueEl.value !== undefined) q.eventVenue = venueEl.value;
        const numEl = document.getElementById('q-number');
        if (numEl && numEl.value) q.number = numEl.value;
        const statusEl = document.getElementById('q-status');
        if (statusEl && statusEl.value) q.status = statusEl.value;
        const discEl = document.getElementById('q-discount-pct');
        if (discEl && discEl.value !== '') q.discountPct = Number(discEl.value);
        const discAmtEl = document.getElementById('q-discount-amount');
        if (discAmtEl && discAmtEl.value !== '') q.discountAmount = Math.max(0, Number(discAmtEl.value) || 0);
        const taxEl = document.getElementById('q-tax-pct');
        if (taxEl && taxEl.value !== '') q.taxPct = Number(taxEl.value);
        const depEl = document.getElementById('q-deposit-pct');
        if (depEl && depEl.value !== '') q.depositPct = Number(depEl.value);
        const obsEl = document.getElementById('q-observations');
        if (obsEl && obsEl.value !== undefined) q.observations = obsEl.value;
        const clientEl = document.getElementById('q-client-select');
        if (clientEl && clientEl.value) q.clientId = clientEl.value;
      }
      window.syncQuoteFormInputsToState = syncQuoteFormInputsToState;

      // Quote header live bindings with BOTH input and change listeners
      const headerMappings = [
        ['q-number', 'number'],
        ['q-status', 'status'],
        ['q-client-select', 'clientId'],
        ['q-event-title', 'eventTitle'],
        ['q-guests-pax', 'guestsPax'],
        ['q-event-date', 'eventDate'],
        ['q-event-venue', 'eventVenue'],
        ['q-issue-date', 'issueDate'],
        ['q-valid-until', 'validUntil'],
        ['q-discount-pct', 'discountPct'],
        ['q-discount-amount', 'discountAmount'],
        ['q-tax-pct', 'taxPct'],
        ['q-deposit-pct', 'depositPct'],
        ['q-observations', 'observations']
      ];

      headerMappings.forEach(([inputId, prop]) => {
        const el = document.getElementById(inputId);
        if (!el) return;
        ['input', 'change'].forEach(evt => {
          el.addEventListener(evt, () => {
            if (prop === 'guestsPax') {
              // Escalado automático: las recetas / ítems por persona que tenían la cantidad anterior siguen al nuevo número
              const prevPax = Number(state.activeQuote.guestsPax) || 0;
              const newPax = Number(el.value) || 0;
              if (newPax > 0 && prevPax > 0 && newPax !== prevPax) {
                let scaled = 0;
                (state.activeQuote.items || []).forEach(item => {
                  const perPerson = item.isRecipe || /persona|pax/i.test(String(item.unit || ''));
                  if (perPerson && Number(item.qty) === prevPax) { item.qty = newPax; scaled++; }
                });
                if (scaled) {
                  clearTimeout(window.__xpPaxToast);
                  window.__xpPaxToast = setTimeout(() => showToast(`${scaled} ítem(s) por persona ajustados a ${Number(state.activeQuote.guestsPax) || newPax} personas`), 900);
                }
              }
            }
            state.activeQuote[prop] = el.type === 'number' ? Number(el.value) : el.value;
            if (prop === 'guestsPax' && stagingMode === 'catalog') {
              const prodId = document.getElementById('picker-product-select')?.value;
              const prod = state.products.find(p => p.id === prodId);
              if (prod && prod.type === 'compuesto') {
                document.getElementById('staging-qty').value = state.activeQuote.guestsPax;
                updateStagingSubtotalPreview();
              }
            }
            saveState();
            renderQuoteEditorAndPdf();
          });
        });
      });

      // Custom Event Types & Dynamic Concepts Engine
      const detectConceptIcon = (name) => {
        const lower = name.toLowerCase();
        if (lower.includes('románt') || lower.includes('romant') || lower.includes('pareja') || lower.includes('amor')) return '🕯️';
        if (lower.includes('cena') || lower.includes('banquete') || lower.includes('gourmet') || lower.includes('degustación') || lower.includes('degustacion')) return '🍽️';
        if (lower.includes('boda') || lower.includes('matrimonio') || lower.includes('casamiento') || lower.includes('nupcial')) return '💍';
        if (lower.includes('cumple') || lower.includes('aniversario') || lower.includes('fiesta')) return '🎂';
        if (lower.includes('15') || lower.includes('quince') || lower.includes('sweet 16')) return '👑';
        if (lower.includes('picnic') || lower.includes('campo') || lower.includes('aire libre')) return '🧺';
        if (lower.includes('brunch') || lower.includes('desayuno')) return '🥐';
        if (lower.includes('coctel') || lower.includes('cocktail') || lower.includes('vino') || lower.includes('cata') || lower.includes('bar')) return '🍸';
        if (lower.includes('corporativo') || lower.includes('empresa') || lower.includes('conferencia') || lower.includes('reunión') || lower.includes('reunion')) return '💼';
        if (lower.includes('grado') || lower.includes('graduacion') || lower.includes('graduación')) return '🎓';
        if (lower.includes('bbq') || lower.includes('asado') || lower.includes('parrilla')) return '🥩';
        return '✨';
      };

      const eventTypeSelect = document.getElementById('q-event-type');
      const customEventTypeBox = document.getElementById('custom-event-type-box');
      const customEventTypeInput = document.getElementById('q-custom-event-type-input');
      const btnToggleCustomEventType = document.getElementById('btn-toggle-custom-event-type');
      const btnSaveCustomEventType = document.getElementById('btn-save-custom-event-type');
      const btnCancelCustomEventType = document.getElementById('btn-cancel-custom-event-type');

      const handleCreateCustomEventType = () => {
        const name = customEventTypeInput?.value.trim();
        if (!name) {
          showToast('Escribe el nombre del nuevo evento o concepto (ej. Cena Romántica)');
          return;
        }

        if (!state.eventTypes) state.eventTypes = getDefaultState().eventTypes;

        const existing = state.eventTypes.find(et => et.name.toLowerCase() === name.toLowerCase());
        if (!existing) {
          state.eventTypes.push({
            id: 'et-' + Date.now(),
            name,
            icon: detectConceptIcon(name),
            isDefault: false
          });
        }

        state.activeQuote.eventType = name;
        saveState();
        populateEventTypeSelect();
        if (eventTypeSelect) eventTypeSelect.value = name;
        if (customEventTypeBox) customEventTypeBox.classList.add('hidden');
        if (customEventTypeInput) customEventTypeInput.value = '';
        renderQuoteEditorAndPdf();
        renderEventTypesPills();
        showToast(`✨ Concepto "${name}" creado y asignado a la cotización`);
      };

      eventTypeSelect?.addEventListener('change', e => {
        if (e.target.value === '__custom__') {
          customEventTypeBox?.classList.remove('hidden');
          customEventTypeInput?.focus();
        } else {
          customEventTypeBox?.classList.add('hidden');
          state.activeQuote.eventType = e.target.value;
          saveState();
          renderQuoteEditorAndPdf();
        }
      });

      btnToggleCustomEventType?.addEventListener('click', () => {
        if (!customEventTypeBox) return;
        const isHidden = customEventTypeBox.classList.toggle('hidden');
        if (!isHidden) {
          customEventTypeInput?.focus();
        }
      });

      btnSaveCustomEventType?.addEventListener('click', handleCreateCustomEventType);
      customEventTypeInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCreateCustomEventType();
        }
      });

      btnCancelCustomEventType?.addEventListener('click', () => {
        customEventTypeBox?.classList.add('hidden');
        if (eventTypeSelect && eventTypeSelect.value === '__custom__') {
          eventTypeSelect.value = state.activeQuote.eventType || (state.eventTypes[0]?.name || 'Boda / Matrimonio');
        }
      });

      // Cotizador: Modify / Rename and Delete Active Concept
      const editEventTypeBox = document.getElementById('edit-event-type-box');
      const qEditEventTypeInput = document.getElementById('q-edit-event-type-input');
      const btnToggleEditConcept = document.getElementById('btn-toggle-edit-concept');
      const btnSaveEditEventType = document.getElementById('btn-save-edit-event-type');
      const btnCancelEditEventType = document.getElementById('btn-cancel-edit-event-type');
      const btnDeleteActiveConcept = document.getElementById('btn-delete-active-concept');

      btnToggleEditConcept?.addEventListener('click', () => {
        if (!editEventTypeBox) return;
        const isHidden = editEventTypeBox.classList.toggle('hidden');
        if (!isHidden) {
          customEventTypeBox?.classList.add('hidden');
          if (qEditEventTypeInput) {
            qEditEventTypeInput.value = state.activeQuote.eventType || '';
            qEditEventTypeInput.focus();
          }
        }
      });

      const handleSaveEditedConcept = () => {
        const newName = qEditEventTypeInput?.value.trim();
        if (!newName) {
          showToast('Escribe el nuevo nombre para este concepto');
          return;
        }

        const oldName = state.activeQuote.eventType;
        if (!state.eventTypes) state.eventTypes = getDefaultState().eventTypes;

        const concept = state.eventTypes.find(et => et.name.toLowerCase() === oldName.toLowerCase());
        if (concept) {
          concept.name = newName;
          concept.icon = detectConceptIcon(newName);
        } else {
          state.eventTypes.push({
            id: 'et-' + Date.now(),
            name: newName,
            icon: detectConceptIcon(newName),
            isDefault: false
          });
        }

        state.activeQuote.eventType = newName;
        saveState();
        populateEventTypeSelect();
        if (eventTypeSelect) eventTypeSelect.value = newName;
        editEventTypeBox?.classList.add('hidden');
        renderQuoteEditorAndPdf();
        renderEventTypesPills();
        showToast(`✏️ Concepto renombrado a "${newName}"`);
      };

      btnSaveEditEventType?.addEventListener('click', handleSaveEditedConcept);
      qEditEventTypeInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveEditedConcept();
        }
      });

      btnCancelEditEventType?.addEventListener('click', () => {
        editEventTypeBox?.classList.add('hidden');
      });

      btnDeleteActiveConcept?.addEventListener('click', () => {
        const currentName = state.activeQuote.eventType;
        if (!state.eventTypes || state.eventTypes.length <= 1) {
          showToast('Debe haber al menos un concepto en el sistema');
          return;
        }

        if (!confirm(`¿Deseas eliminar el concepto "${currentName}" del catálogo?`)) return;

        state.eventTypes = state.eventTypes.filter(et => et.name.toLowerCase() !== currentName.toLowerCase());
        const fallback = state.eventTypes[0]?.name || 'Evento';
        state.activeQuote.eventType = fallback;

        saveState();
        populateEventTypeSelect();
        if (eventTypeSelect) eventTypeSelect.value = fallback;
        editEventTypeBox?.classList.add('hidden');
        customEventTypeBox?.classList.add('hidden');
        renderQuoteEditorAndPdf();
        renderEventTypesPills();
        showToast(`🗑️ Concepto "${currentName}" eliminado`);
      });

      // Company Catalog Management (view-empresa)
      const inputCatalogConcept = document.getElementById('input-new-event-type-catalog');
      const btnAddCatalogConcept = document.getElementById('btn-add-event-type-catalog');
      const eventTypesPillsContainer = document.getElementById('event-types-pills-list');

      const handleAddCatalogConcept = () => {
        const name = inputCatalogConcept?.value.trim();
        if (!name) {
          showToast('Escribe un nombre de concepto para agregar al catálogo');
          return;
        }

        if (!state.eventTypes) state.eventTypes = getDefaultState().eventTypes;

        if (state.eventTypes.some(et => et.name.toLowerCase() === name.toLowerCase())) {
          showToast('Este concepto ya existe en el catálogo');
          return;
        }

        state.eventTypes.push({
          id: 'et-' + Date.now(),
          name,
          icon: detectConceptIcon(name),
          isDefault: false
        });

        saveState();
        if (inputCatalogConcept) inputCatalogConcept.value = '';
        renderEventTypesPills();
        populateEventTypeSelect();
        showToast(`✨ Concepto "${name}" añadido al catálogo general`);
      };

      btnAddCatalogConcept?.addEventListener('click', handleAddCatalogConcept);
      inputCatalogConcept?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCatalogConcept();
        }
      });

      eventTypesPillsContainer?.addEventListener('click', e => {
        const btn = e.target.closest('[data-del-event-type]');
        if (!btn) return;
        const id = btn.getAttribute('data-del-event-type');
        const item = state.eventTypes.find(et => et.id === id);
        if (!item || item.isDefault) return;

        state.eventTypes = state.eventTypes.filter(et => et.id !== id);
        saveState();
        renderEventTypesPills();
        populateEventTypeSelect();
        showToast(`Concepto "${item.name}" eliminado del catálogo`);
      });

      // Scale all recipes in active quote to match current Guest Pax
      document.getElementById('btn-sync-pax-items')?.addEventListener('click', () => {
        const pax = Math.max(1, Number(state.activeQuote.guestsPax) || 1);
        state.activeQuote.items.forEach(item => {
          if (item.isRecipe || item.unit.toLowerCase().includes('persona') || item.unit.toLowerCase().includes('pax')) {
            item.qty = pax;
          }
        });
        saveState();
        renderQuoteEditorAndPdf();
        showToast(`Todas las recetas se escalaron a ${pax} Personas (Pax)`);
      });

      // Validity date preset buttons (+7d, +15d, +30d)
      document.querySelectorAll('.validity-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const days = parseInt(btn.getAttribute('data-validity-days'), 10) || 15;
          const baseDateStr = state.activeQuote.issueDate || '2026-11-01';
          const d = new Date(baseDateStr + 'T12:00:00');
          d.setDate(d.getDate() + days);
          const iso = d.toISOString().slice(0, 10);
          state.activeQuote.validUntil = iso;
          saveState();
          renderQuoteEditorAndPdf();
          showToast(`Fecha de vencimiento ajustada a +${days} días (${formatDateHuman(iso)})`);
        });
      });

      // Toggle Catalog vs Custom Item Mode
      document.getElementById('btn-mode-catalog')?.addEventListener('click', () => {
        stagingMode = 'catalog';
        document.getElementById('catalog-picker-container')?.classList.remove('hidden');
        document.getElementById('btn-mode-catalog').className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-indigo-700 shadow-sm';
        document.getElementById('btn-mode-custom').className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900';
        loadSelectedProductIntoStaging();
      });

      document.getElementById('btn-mode-custom')?.addEventListener('click', () => {
        stagingMode = 'custom';
        document.getElementById('catalog-picker-container')?.classList.add('hidden');
        document.getElementById('btn-mode-custom').className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-indigo-700 shadow-sm';
        document.getElementById('btn-mode-catalog').className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900';
        loadSelectedProductIntoStaging();
      });

      document.getElementById('picker-filter-type')?.addEventListener('change', populatePickerProducts);
      document.getElementById('picker-product-select')?.addEventListener('change', loadSelectedProductIntoStaging);
      document.getElementById('staging-qty')?.addEventListener('input', updateStagingSubtotalPreview);
      document.getElementById('staging-price')?.addEventListener('input', updateStagingSubtotalPreview);

      // Add Staged Item (with custom/overridden price!) to Quote
      document.getElementById('btn-add-staged-item')?.addEventListener('click', () => {
        const name = document.getElementById('staging-name').value.trim();
        const qty = Math.max(0.1, Number(document.getElementById('staging-qty').value) || 1);
        const unit = document.getElementById('staging-unit').value;
        const price = Math.max(0, Number(document.getElementById('staging-price').value) || 0);
        const desc = document.getElementById('staging-desc').value.trim();
        const updateCatalog = document.getElementById('staging-update-catalog-price').checked;

        if (!name) {
          showToast('Por favor escribe el nombre del producto o receta');
          return;
        }

        const prodId = stagingMode === 'catalog' ? document.getElementById('picker-product-select')?.value : null;
        const prod = prodId ? state.products.find(p => p.id === prodId) : null;

        if (prod && updateCatalog) {
          prod.price = price;
          prod.desc = desc;
        }

        state.activeQuote.items.push({
          rowId: 'item-' + Date.now(),
          productId: prod ? prod.id : null,
          name,
          desc,
          isRecipe: prod ? prod.type === 'compuesto' : unit.includes('Persona'),
          qty,
          unit,
          price,
          ...(prod && String(prod.category || '').trim() ? { section: String(prod.category).trim() } : {})
        });

        saveState();
        if (updateCatalog) populatePickerProducts();
        renderQuoteEditorAndPdf();
        showToast(`"${name}" agregado a la cotización con precio ${formatCurrency(price)}`);
      });

      // Delegated events on Quote Items Editor Table
      const onQuoteLineEdit = e => {
        const target = e.target;
        if (!target.classList || !target.classList.contains('quote-line-input')) return;
        const idx = parseInt(target.getAttribute('data-item-idx'), 10);
        const field = target.getAttribute('data-field');
        const item = state.activeQuote.items[idx];
        if (!item) return;
        // Los campos de texto ya se guardan con "input": el "change" al salir del campo no vuelve a dibujar
        // (si no, al tocar otro campo se reconstruye la tabla y se pierde el toque)
        if (e.type === 'change' && field !== 'optional') return;
        if (field === 'optional') {
          if (e.type !== 'change') return;
          item.optional = !!target.checked;
        } else if (field === 'section') {
          const v = target.value.trim();
          if (v) item.section = v; else delete item.section;
        } else {
          item[field] = (field === 'qty' || field === 'price') ? Number(target.value) : target.value;
        }
        // El mismo ítem aparece en la tabla y en las tarjetas del celular: se sincroniza el otro campo
        document.querySelectorAll(`#quote-items-editor-wrap .quote-line-input[data-item-idx="${idx}"][data-field="${field}"]`).forEach(el => {
          if (el === target) return;
          if (field === 'optional') el.checked = !!item.optional; else el.value = target.value;
        });
        saveState();
        renderQuoteEditorAndPdf();
      };
      document.getElementById('quote-items-editor-wrap')?.addEventListener('input', onQuoteLineEdit);
      document.getElementById('quote-items-editor-wrap')?.addEventListener('change', onQuoteLineEdit);

      document.getElementById('quote-items-editor-wrap')?.addEventListener('click', e => {
        const btn = e.target.closest('.remove-quote-line-btn');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
        state.activeQuote.items.splice(idx, 1);
        saveState();
        renderQuoteEditorAndPdf();
        showToast('Ítem eliminado de la cotización');
      });

      // Clean / New Quote button
      document.getElementById('btn-new-clean-quote')?.addEventListener('click', () => {
        const nextNum = state.savedQuotes.length + 1;
        const defaultEvType = (state.eventTypes && state.eventTypes.length > 0) ? state.eventTypes[0].name : 'Boda / Matrimonio';
        state.activeQuote = {
          id: 'q-' + Date.now(),
          number: typeof xpNextEventQuoteNumber === 'function' ? xpNextEventQuoteNumber() : `COT-2026-000${nextNum}`,
          eventType: defaultEvType,
          status: 'Borrador',
          clientId: state.clients[0]?.id || '',
          eventTitle: 'Nuevo Evento Especial',
          guestsPax: 100,
          eventDate: typeof xpTodayISO === 'function' ? xpTodayISO(30) : '2026-12-20',
          eventVenue: 'Por confirmar',
          issueDate: typeof xpTodayISO === 'function' ? xpTodayISO(0) : '2026-11-01',
          validUntil: typeof xpTodayISO === 'function' ? xpTodayISO(15) : '2026-11-16',
          discountPct: 0,
          discountAmount: 0,
          taxPct: 0,
          depositPct: 50,
          observations: '• Incluye montaje previo y personal uniformado.\n• Reserva de fecha garantizada con el pago del anticipo.',
          items: []
        };
        saveState();
        populateEventTypeSelect();
        renderQuoteEditorAndPdf();
        showToast('Lista nueva cotización en blanco');
      });

      // Save Quote to History
      document.getElementById('btn-save-quote')?.addEventListener('click', () => {
        if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
        const q = state.activeQuote;

        // Version locking check: prevent direct overwriting of sent/approved/replaced quotes
        if (typeof isQuoteLocked === 'function' && isQuoteLocked(q)) {
          openCreateQuoteVersionModal(q.id);
          return;
        }

        const baseNumber = q.baseNumber || (typeof getQuoteBaseNumber === 'function' ? getQuoteBaseNumber(q.number) : q.number.replace(/\s*V\d+$/i, '').trim());
        const version = q.version || 1;
        q.baseNumber = baseNumber;
        q.version = version;
        q.number = `${baseNumber} V${version}`;
        const total = xpQuoteTotals(q).total;

        let existingIdx = q.id ? state.savedQuotes.findIndex(sq => sq.id === q.id) : -1;
        if (existingIdx < 0) existingIdx = state.savedQuotes.findIndex(sq => sq.number === q.number);
        const summaryRecord = {
          id: q.id || ('sq-' + Date.now()),
          number: q.number,
          eventType: q.eventType,
          eventTitle: q.eventTitle,
          clientId: q.clientId,
          guestsPax: q.guestsPax,
          eventDate: q.eventDate,
          validUntil: q.validUntil,
          total,
          status: q.status,
          fullCopy: JSON.parse(JSON.stringify(q))
        };

        if (existingIdx >= 0) {
          state.savedQuotes[existingIdx] = summaryRecord;
        } else {
          state.savedQuotes.unshift(summaryRecord);
        }
        saveState();
        renderSavedQuotes();
        showToast(`Cotización ${q.number} guardada en el historial`);
      });

      // Function to guarantee print always outputs crisp white paper with dark typography
      function triggerPrintWhiteMode() {
        const wasDark = document.documentElement.classList.contains('dark');
        if (wasDark) {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
        setTimeout(() => {
          window.print();
          if (wasDark) {
            setTimeout(() => {
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            }, 800);
          }
        }, 150);
      }

      // High-Precision PDF Generation Engine (100% Pure White Background, Zero Dark Leakage)
      document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
        if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
        // 1. Force refresh of current quote and PDF elements
        renderQuoteEditorAndPdf();

        const sheet = document.getElementById('pdf-document-sheet');
        if (!sheet) return;

        const cleanTitle = (state.activeQuote.eventTitle || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${state.activeQuote.number}_${cleanTitle}.pdf`;

        showToast('Generando PDF oficial en fondo blanco...');

        // 2. Temporarily switch DOM to light mode so all inherited styles & canvas render in pure crisp white
        const wasDark = document.documentElement.classList.contains('dark');
        if (wasDark) {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }

        // 3. Clone sheet into an off-screen fixed A4-width canvas container (Pixel-perfect A4 geometry)
        const clone = sheet.cloneNode(true);
        clone.id = 'pdf-render-clone';
        // Strip out mx-auto, responsive padding and responsive widths that cause horizontal offsets
        clone.className = 'bg-white space-y-6 text-slate-900 pdf-pure-white-export';
        clone.style.width = '794px';
        clone.style.minWidth = '794px';
        clone.style.maxWidth = '794px';
        clone.style.margin = '0px';
        clone.style.marginLeft = '0px';
        clone.style.marginRight = '0px';
        clone.style.marginTop = '0px';
        clone.style.marginBottom = '0px';
        // 34px left & right padding equals exactly 9.0mm symmetrical margins on A4 paper!
        clone.style.padding = '30px 34px';
        clone.style.boxSizing = 'border-box';
        clone.style.boxShadow = 'none';
        clone.style.border = 'none';
        clone.style.borderRadius = '0px';
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#0f172a';
        clone.style.colorScheme = 'light';
        clone.style.transform = 'none';

        // Ensure all overflow wrappers are visible and 100% width in clone
        clone.querySelectorAll('.overflow-x-auto, .overflow-visible, .pdf-table-wrapper').forEach(el => {
          el.style.overflow = 'visible';
          el.style.width = '100%';
          el.style.maxWidth = '100%';
          el.style.margin = '0';
          el.style.padding = '0';
        });

        // Ensure table headers and cells have explicit white/dark colors and 100% table layout
        clone.querySelectorAll('table').forEach(tbl => {
          tbl.style.width = '100%';
          tbl.style.maxWidth = '100%';
          tbl.style.tableLayout = 'auto';
          tbl.style.borderCollapse = 'collapse';
        });

        // Fix html2canvas + Tailwind preflight bug (img{display:block} breaks text baseline → text sinks/disappears)
        const h2cFixStyle = document.createElement('style');
        h2cFixStyle.id = 'h2c-baseline-fix';
        h2cFixStyle.textContent = 'img{display:inline-block !important;}';
        document.head.appendChild(h2cFixStyle);
        clone.querySelectorAll('*').forEach(el => {
          el.style.fontVariantNumeric = 'normal';
          el.style.fontFeatureSettings = 'normal';
        });

        // Off-screen sandbox in normal document flow fixed at (0,0) — pure clean canvas capture
        const sandbox = document.createElement('div');
        sandbox.id = 'pdf-render-sandbox';
        sandbox.style.cssText = 'position:fixed;left:0;top:0;width:794px;margin:0;padding:0;background:#ffffff;color:#0f172a;color-scheme:light;z-index:999998;pointer-events:none;overflow:visible;';
        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        // White loading veil so the user never sees the sandbox
        const veil = document.createElement('div');
        veil.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#ffffff;display:flex;align-items:center;justify-content:center;font:600 14px Inter,system-ui,sans-serif;color:#4f46e5;';
        veil.textContent = '📄 Generando PDF en blanco...';
        document.body.appendChild(veil);

        const prevScrollX = window.scrollX;
        const prevScrollY = window.scrollY;
        window.scrollTo(0, 0);

        const restoreThemeAndCleanup = () => {
          if (sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
          if (veil.parentNode) veil.parentNode.removeChild(veil);
          if (h2cFixStyle.parentNode) h2cFixStyle.parentNode.removeChild(h2cFixStyle);
          window.scrollTo(prevScrollX, prevScrollY);
          if (wasDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
          }
        };

        const h2c = window.html2canvas;
        const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!h2c || !JsPDF) {
          restoreThemeAndCleanup();
          showToast('Abriendo visor de impresión...');
          triggerPrintWhiteMode();
          return;
        }

        // Collect safe page-break points (bottom of rows / blocks) in CSS px relative to the clone
        const cloneTop = clone.getBoundingClientRect().top;
        const breakPoints = [];
        clone.querySelectorAll('tr, .pdf-avoid-break').forEach(el => {
          breakPoints.push(Math.round(el.getBoundingClientRect().bottom - cloneTop));
        });
        Array.from(clone.querySelectorAll(':scope > *')).forEach(el => {
          breakPoints.push(Math.round(el.getBoundingClientRect().bottom - cloneTop));
        });
        breakPoints.sort((a, b) => a - b);

        const SCALE = 2;
        setTimeout(() => {
          h2c(clone, {
            scale: SCALE,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
            scrollX: 0,
            scrollY: 0
          }).then(canvas => {
            const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            const pageWmm = 210;
            const pageHmm = 297;
            const pxPerMm = 794 / pageWmm;           // CSS px per mm
            const pageHpx = pageHmm * pxPerMm;        // ~1123 px
            const topPadNext = 30;                    // top margin (px) on pages 2+
            const totalH = canvas.height / SCALE;

            let start = 0;
            let pageIndex = 0;
            while (start < totalH - 2) {
              const pad = pageIndex === 0 ? 0 : topPadNext;
              const limit = start + pageHpx - pad - 20;
              let end;
              if (limit >= totalH) {
                end = totalH;
              } else {
                const candidates = breakPoints.filter(b => b > start + 150 && b <= limit);
                end = candidates.length ? candidates[candidates.length - 1] : limit;
              }
              const sliceH = Math.max(1, Math.round((end - start) * SCALE));
              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = canvas.width;
              pageCanvas.height = sliceH;
              const ctx = pageCanvas.getContext('2d');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
              ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, sliceH, 0, 0, canvas.width, sliceH);

              if (pageIndex > 0) pdf.addPage('a4', 'portrait');
              // Paint full page white explicitly
              pdf.setFillColor(255, 255, 255);
              pdf.rect(0, 0, pageWmm, pageHmm, 'F');
              const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
              pdf.addImage(imgData, 'JPEG', 0, pad / pxPerMm, pageWmm, (sliceH / SCALE) / pxPerMm);

              start = end;
              pageIndex++;
            }

            pdf.save(filename);
            restoreThemeAndCleanup();
            showToast(`✅ PDF descargado con éxito: ${filename}`);
          }).catch(err => {
            console.error('Error generating PDF:', err);
            restoreThemeAndCleanup();
            showToast('Abriendo visor de impresión...');
            triggerPrintWhiteMode();
          });
        }, 120);
      });

      // Print PDF directly (switches to preview mode for full document view)
      document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
        if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
        renderQuoteEditorAndPdf();
        setQuoteStepMode('preview');
        triggerPrintWhiteMode();
      });

      // Open Email Modal
      document.getElementById('btn-open-email-modal')?.addEventListener('click', () => {
        const q = state.activeQuote;
        const client = state.clients.find(c => c.id === q.clientId) || state.clients[0];
        const { total, deposit } = xpQuoteTotals(q);

        document.getElementById('em-to').value = client?.email || '';
        document.getElementById('em-subject').value = `Propuesta & Cotización ${q.number} — ${q.eventTitle} (${state.company.name})`;
        document.getElementById('em-body').value =
`Hola ${client?.name || ''},

Un gusto saludarte. Adjunto enviamos la cotización formal ${q.number} para tu evento "${q.eventTitle}" proyectado para ${q.guestsPax} Personas (Pax) el día ${formatDateHuman(q.eventDate)} en ${q.eventVenue}.

• Valor Total del Evento: ${formatCurrency(total)}
• Anticipo para Reservar Fecha (${q.depositPct}%): ${formatCurrency(deposit)}
• Fecha de Vencimiento de la Oferta: ${formatDateHuman(q.validUntil)}

Observaciones incluidas:
${q.observations}

Quedamos atentos para bloquear tu fecha en nuestra agenda.

Cordialmente,
${state.company.name}
${state.company.phone}`;

        document.getElementById('modal-email')?.classList.remove('hidden');
      });

      document.getElementById('btn-copy-email-text')?.addEventListener('click', () => {
        const body = document.getElementById('em-body');
        if (!body) return;
        body.select();
        try {
          document.execCommand('copy');
          showToast('Mensaje copiado al portapapeles (listo para WhatsApp o Correo)');
        } catch (err) {
          showToast('Selecciona y copia el texto manualmente');
        }
      });

      document.getElementById('btn-confirm-send-email')?.addEventListener('click', () => {
        const to = document.getElementById('em-to').value.trim();
        const subject = encodeURIComponent(document.getElementById('em-subject').value);
        const body = encodeURIComponent(document.getElementById('em-body').value);
        state.activeQuote.status = 'Enviada';
        // Sync status to savedQuotes
        const sendIdx = state.savedQuotes.findIndex(sq => sq.id === state.activeQuote.id || sq.number === state.activeQuote.number);
        if (sendIdx >= 0) {
          state.savedQuotes[sendIdx].status = 'Enviada';
          if (state.savedQuotes[sendIdx].fullCopy) state.savedQuotes[sendIdx].fullCopy.status = 'Enviada';
        }
        saveState();
        renderQuoteEditorAndPdf();
        document.getElementById('modal-email')?.classList.add('hidden');
        document.getElementById('btn-download-pdf')?.click();
        if (to) {
          window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank');
        }
        showToast('Estado actualizado a "Enviada" y PDF descargado para adjuntar');
      });

      // Approve Quote & Register Deposit in Cash Flow
      document.getElementById('btn-approve-and-charge')?.addEventListener('click', () => {
        const q = state.activeQuote;
        const { total, deposit } = xpQuoteTotals(q);

        q.status = 'Aprobada';
        // Sync status to savedQuotes
        const appIdx = state.savedQuotes.findIndex(sq => sq.id === q.id || sq.number === q.number);
        if (appIdx >= 0) {
          state.savedQuotes[appIdx].status = 'Aprobada';
          if (state.savedQuotes[appIdx].fullCopy) state.savedQuotes[appIdx].fullCopy.status = 'Aprobada';
        }
        state.finances.unshift({
          id: 'fin-' + Date.now(),
          type: 'ingreso',
          date: q.issueDate,
          concept: `Anticipo (${q.depositPct}%) — ${q.eventTitle} (${q.number})`,
          category: 'Anticipo Evento',
          method: 'Transferencia',
          amount: Math.round(deposit)
        });

        saveState();
        renderQuoteEditorAndPdf();
        showToast(`Evento aprobado y anticipo de ${formatCurrency(deposit)} registrado en Ingresos`);
      });

      // Saved Quotes History Actions
      document.getElementById('btn-goto-new-quote')?.addEventListener('click', () => {
        switchView('cotizador');
      });

      document.getElementById('view-historial')?.addEventListener('click', e => {
        const del = e.target.closest('.xp-delete-quote-btn');
        if (del) window.xpDeleteSavedQuote(del.getAttribute('data-delete-quote'));
      });

      document.getElementById('view-historial')?.addEventListener('click', e => {
        const btn = e.target.closest('.load-saved-quote-btn');
        if (!btn) return;
        const sqId = btn.getAttribute('data-load-quote');
        const sq = state.savedQuotes.find(x => x.id === sqId);
        if (!sq) return;
        if (sq.fullCopy) {
          state.activeQuote = JSON.parse(JSON.stringify(sq.fullCopy));
        } else {
          state.activeQuote.number = sq.number;
          state.activeQuote.eventType = sq.eventType;
          state.activeQuote.eventTitle = sq.eventTitle;
          state.activeQuote.clientId = sq.clientId;
          state.activeQuote.guestsPax = sq.guestsPax;
          state.activeQuote.eventDate = sq.eventDate;
          state.activeQuote.validUntil = sq.validUntil;
          state.activeQuote.status = sq.status;
        }
        saveState();
        switchView('cotizador');
        showToast(`Cotización ${sq.number} cargada en el editor`);
      });

      // Products View Filters & Simulator
      document.querySelectorAll('.prod-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => window.xpSetCatFilter(btn.getAttribute('data-prod-filter')));
      });
      document.getElementById('prod-category-filter')?.addEventListener('change', renderProductsCatalog);
      document.getElementById('prod-sort-select')?.addEventListener('change', e => window.xpSetCatSort(e.target.value));

      document.getElementById('prod-search-input')?.addEventListener('input', renderProductsCatalog);
      document.getElementById('btn-goto-simulador-screen')?.addEventListener('click', () => switchView('simulador'));

      // Dedicated Simulator Screen Listeners
      document.getElementById('sim-recipe-select')?.addEventListener('change', renderRecipeSimulatorResults);
      document.getElementById('sim-pax-input')?.addEventListener('input', renderRecipeSimulatorResults);
      document.getElementById('sim-margin-slider')?.addEventListener('input', renderRecipeSimulatorResults);
      document.getElementById('sim-waste-input')?.addEventListener('input', renderRecipeSimulatorResults);
      document.querySelectorAll('[data-sim-price-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.xpSimPriceMode = btn.getAttribute('data-sim-price-mode');
          renderRecipeSimulatorResults();
        });
      });

      document.querySelectorAll('.sim-quick-pax-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const paxVal = Number(btn.getAttribute('data-pax')) || 100;
          const paxInput = document.getElementById('sim-pax-input');
          if (paxInput) paxInput.value = paxVal;
          renderRecipeSimulatorResults();
        });
      });

      const handleAddSimulatedRecipeToQuote = () => {
        const sim = typeof getRecipeSimulation === 'function' ? getRecipeSimulation() : null;
        const rec = sim && sim.rec;
        if (!rec) {
          showToast('Selecciona una receta válida para agregar');
          return;
        }
        const pax = sim.pax;
        const calculatedPrice = Math.round(sim.price);
        if (!state.activeQuote.items) state.activeQuote.items = [];

        // Si la cotización no tiene personas, toma las del simulador
        const quotePax = Number(state.activeQuote.guestsPax) || 0;
        if (!quotePax) state.activeQuote.guestsPax = pax;

        // Si la receta ya está en la cotización, se actualiza en lugar de duplicarla
        const existing = state.activeQuote.items.find(it => it.productId === rec.id && it.isRecipe);
        if (existing) {
          existing.qty = pax;
          existing.price = calculatedPrice;
        } else {
          state.activeQuote.items.push({
            rowId: 'item-' + Date.now(),
            productId: rec.id,
            name: rec.name,
            desc: rec.desc,
            isRecipe: true,
            qty: pax,
            unit: rec.unit || 'Por Persona (Pax)',
            price: calculatedPrice
          });
        }

        saveState();
        renderQuoteEditorAndPdf();
        switchView('cotizador');
        const paxNote = quotePax && quotePax !== pax ? ` (la cotización sigue con ${quotePax} personas)` : '';
        showToast(`✅ "${rec.name}" ${existing ? 'actualizada' : 'agregada'}: ${pax} Pax a ${formatCurrency(calculatedPrice)}/Pax${paxNote}`);
      };

      document.getElementById('btn-sim-add-to-quote-main')?.addEventListener('click', handleAddSimulatedRecipeToQuote);
      document.getElementById('btn-sim-send-direct')?.addEventListener('click', handleAddSimulatedRecipeToQuote);

      document.getElementById('btn-sim-print-sheet')?.addEventListener('click', () => {
        document.body.classList.add('xp-print-sim');
        const done = () => { document.body.classList.remove('xp-print-sim'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
        setTimeout(done, 60000);
      });

      // Products Table and Mobile Cards Actions (+ Cotizar / Modificar / Eliminar)
      ['products-catalog-tbody', 'products-catalog-cards'].forEach(containerId => {
        document.getElementById(containerId)?.addEventListener('click', e => {
          const quoteBtn = e.target.closest('.send-prod-to-quote-btn');
          if (quoteBtn) {
            const prodId = quoteBtn.getAttribute('data-quote-prod');
            switchView('cotizador');
            document.getElementById('picker-filter-type').value = 'all';
            populatePickerProducts();
            document.getElementById('picker-product-select').value = prodId;
            loadSelectedProductIntoStaging();
            showToast('Producto cargado en el pre-configurador de cotización');
            return;
          }
          const editBtn = e.target.closest('.edit-prod-btn');
          if (editBtn) {
            const prodId = editBtn.getAttribute('data-edit-prod');
            openEditProductModal(prodId);
            return;
          }
          const delBtn = e.target.closest('.delete-prod-btn');
          if (delBtn) {
            window.xpRequestDeleteProduct(delBtn.getAttribute('data-delete-prod'));
            return;
          }
          const dupBtn = e.target.closest('.xp-dup-prod-btn');
          if (dupBtn) {
            window.xpDuplicateProduct(dupBtn.getAttribute('data-dup-prod'));
            return;
          }
          const togBtn = e.target.closest('.xp-toggle-prod-btn');
          if (togBtn) {
            window.xpToggleProductActive(togBtn.getAttribute('data-toggle-prod'));
            return;
          }
        });
      });

      // Shortcut to edit product from the Quote Builder picker
      document.getElementById('btn-picker-edit-product')?.addEventListener('click', () => {
        const sel = document.getElementById('picker-product-select');
        if (sel && sel.value) {
          openEditProductModal(sel.value);
        } else {
          showToast('Selecciona un producto o receta en la lista para modificar');
        }
      });

      // Shortcut to edit recipe from the Simulator screen
      document.getElementById('btn-sim-edit-recipe')?.addEventListener('click', () => {
        const sel = document.getElementById('sim-recipe-select');
        if (sel && sel.value) {
          openEditProductModal(sel.value);
        } else {
          showToast('Selecciona una receta en el simulador para modificar');
        }
      });

      // Simple Product Modal
      document.getElementById('btn-open-simple-product-modal')?.addEventListener('click', () => {
        document.getElementById('sp-id').value = '';
        const titleEl = document.getElementById('modal-sp-title');
        if (titleEl) titleEl.textContent = '📦 Crear Nuevo Producto Simple o Insumo';
        const btnSave = document.getElementById('btn-save-simple-product');
        if (btnSave) btnSave.textContent = 'Crear producto';

        document.getElementById('sp-name').value = '';
        document.getElementById('sp-unit').value = 'und';
        document.getElementById('sp-track-stock').value = 'true';
        document.getElementById('sp-stock').value = 0;
        document.getElementById('sp-cost').value = 20000;
        document.getElementById('sp-price').value = 45000;
        document.getElementById('sp-desc').value = '';
        ['sp-category', 'sp-min-stock', 'sp-pack-name', 'sp-pack-size', 'sp-pack-price'].forEach(fid => { const el = document.getElementById(fid); if (el) el.value = ''; });
        const spActive = document.getElementById('sp-active'); if (spActive) spActive.checked = true;
        if (typeof window.xpRefreshSimpleForm === 'function') window.xpRefreshSimpleForm();
        document.getElementById('modal-simple-product')?.classList.remove('hidden');
        document.getElementById('sp-name')?.focus();
      });

      document.getElementById('btn-save-simple-product')?.addEventListener('click', () => {
        const id = document.getElementById('sp-id')?.value;
        const name = document.getElementById('sp-name').value.trim();
        if (!name) {
          showToast('❌ Ingresa el nombre del producto o servicio');
          return;
        }
        const unit = document.getElementById('sp-unit').value;
        const trackStock = document.getElementById('sp-track-stock').value === 'true';
        const stock = Number(document.getElementById('sp-stock').value) || 0;
        const cost = Number(document.getElementById('sp-cost').value) || 0;
        const price = Number(document.getElementById('sp-price').value) || 0;
        const desc = document.getElementById('sp-desc').value.trim();
        const extra = typeof window.xpReadSimpleExtras === 'function' ? window.xpReadSimpleExtras() : {};

        if (id) {
          // Modificar existente
          const prod = state.products.find(p => p.id === id);
          if (prod) {
            prod.name = name;
            prod.unit = unit;
            prod.trackStock = trackStock;
            prod.stock = stock;
            prod.cost = cost;
            prod.price = price;
            prod.desc = desc;
            Object.assign(prod, extra);
            if (!extra.pack) delete prod.pack;
            if (extra.minStock === undefined) delete prod.minStock;
          }
          showToast(`✅ Producto "${name}" modificado exitosamente`);
        } else {
          // Crear nuevo
          state.products.unshift({
            id: 'p-' + Date.now(),
            name,
            type: 'simple',
            unit,
            trackStock,
            stock,
            cost,
            price,
            desc,
            ...extra
          });
          showToast(`✅ Producto "${name}" creado exitosamente`);
        }
        saveState();
        document.getElementById('modal-simple-product')?.classList.add('hidden');
        renderProductsCatalog();
        populatePickerProducts();
        populateRecipeSimulator();
        renderQuoteEditorAndPdf();
      });

      // Recipe Modal
      document.getElementById('btn-open-recipe-modal')?.addEventListener('click', () => {
        document.getElementById('rec-id').value = '';
        const titleEl = document.getElementById('modal-rec-title');
        if (titleEl) titleEl.textContent = '🍹 Nueva Receta / Menú Compuesto por Personas';
        const btnSave = document.getElementById('btn-save-recipe-product');
        if (btnSave) btnSave.textContent = 'Guardar receta';

        tempRecipeIngredients = [];
        document.getElementById('rec-name').value = '';
        document.getElementById('rec-base-pax').value = 1;
        document.getElementById('rec-price').value = 40000;
        document.getElementById('rec-desc').value = '';
        ['rec-glassware', 'rec-waste', 'rec-category'].forEach(fid => { const el = document.getElementById(fid); if (el) el.value = ''; });
        const recActive = document.getElementById('rec-active'); if (recActive) recActive.checked = true;

        const ingSel = document.getElementById('rec-ing-select');
        const simples = state.products.filter(p => p.type === 'simple' && p.active !== false);
        if (ingSel) {
          ingSel.innerHTML = simples.map(s => `<option value="${s.id}">${s.name} (Base: ${formatCurrency(s.cost)} / ${s.unit})</option>`).join('');
        }

        renderTempRecipeIngredients();
        document.getElementById('modal-recipe-product')?.classList.remove('hidden');
        document.getElementById('rec-name')?.focus();
      });

      document.getElementById('btn-add-ing-to-recipe')?.addEventListener('click', () => {
        const productId = document.getElementById('rec-ing-select').value;
        const qty = Math.max(0.01, Number(document.getElementById('rec-ing-qty').value) || 1);
        const unit = document.getElementById('rec-ing-unit').value;
        if (!productId) return;
        tempRecipeIngredients.push({ productId, qty, unit });
        renderTempRecipeIngredients();
      });

      document.getElementById('rec-base-pax')?.addEventListener('input', renderTempRecipeIngredients);

      document.getElementById('rec-ingredients-list')?.addEventListener('click', e => {
        const rm = e.target.closest('[data-rm-ing]');
        if (!rm) return;
        const idx = parseInt(rm.getAttribute('data-rm-ing'), 10);
        tempRecipeIngredients.splice(idx, 1);
        renderTempRecipeIngredients();
      });

      document.getElementById('btn-save-recipe-product')?.addEventListener('click', () => {
        const id = document.getElementById('rec-id')?.value;
        const name = document.getElementById('rec-name').value.trim();
        if (!name) {
          showToast('❌ Escribe el nombre de la receta o menú compuesto');
          return;
        }
        const basePax = Math.max(1, Number(document.getElementById('rec-base-pax').value) || 1);
        const price = Number(document.getElementById('rec-price').value) || 0;
        const desc = document.getElementById('rec-desc').value.trim();
        const recExtra = {
          glassware: (document.getElementById('rec-glassware')?.value || '').trim(),
          waste: (document.getElementById('rec-waste')?.value || '').trim(),
          category: (document.getElementById('rec-category')?.value || '').trim(),
          active: document.getElementById('rec-active') ? document.getElementById('rec-active').checked : true
        };

        if (id) {
          // Modificar receta existente
          const rec = state.products.find(p => p.id === id);
          if (rec) {
            rec.name = name;
            rec.basePax = basePax;
            rec.price = price;
            rec.desc = desc;
            rec.ingredients = [...tempRecipeIngredients];
            Object.assign(rec, recExtra);
            rec.cost = Math.round(calculateRecipeUnitCost(rec));
          }
          showToast(`✅ Receta "${name}" modificada exitosamente`);
        } else {
          // Crear nueva receta
          const newRec = {
            id: 'rec-' + Date.now(),
            name,
            type: 'compuesto',
            unit: 'Personas (Pax)',
            basePax,
            trackStock: false,
            stock: 0,
            cost: 0,
            price,
            desc,
            ingredients: [...tempRecipeIngredients],
            ...recExtra
          };
          newRec.cost = Math.round(calculateRecipeUnitCost(newRec));
          state.products.unshift(newRec);
          showToast(`✅ Receta compuesta "${name}" guardada en el catálogo`);
        }
        saveState();
        document.getElementById('modal-recipe-product')?.classList.add('hidden');
        renderProductsCatalog();
        populatePickerProducts();
        populateRecipeSimulator();
        renderQuoteEditorAndPdf();
      });

      // Client Modal (from CRM or Quick Button in Quote)
      const openClientModal = () => {
        document.getElementById('cl-name').value = '';
        document.getElementById('cl-doc').value = '';
        document.getElementById('cl-phone').value = '';
        document.getElementById('cl-email').value = '';
        document.getElementById('cl-city').value = 'Medellín, Antioquia';
        document.getElementById('modal-client')?.classList.remove('hidden');
      };
      // Crear cliente rápido: un solo modal para CRM, cotizador de eventos y cotizador de cabañas
      window.openQuickClientModal = (target) => {
        window.__quickClientTarget = target || 'event';
        openClientModal();
        setTimeout(() => document.getElementById('cl-name')?.focus(), 50);
      };
      document.getElementById('btn-open-client-modal')?.addEventListener('click', () => window.openQuickClientModal('event'));
      document.getElementById('btn-quick-new-client')?.addEventListener('click', () => window.openQuickClientModal('event'));

      document.getElementById('btn-save-client')?.addEventListener('click', () => {
        const name = document.getElementById('cl-name').value.trim();
        if (!name) {
          showToast('Ingresa el nombre del cliente');
          return;
        }
        const newClient = {
          id: 'cl-' + Date.now(),
          name,
          doc: document.getElementById('cl-doc').value.trim() || '—',
          phone: document.getElementById('cl-phone').value.trim() || '—',
          email: document.getElementById('cl-email').value.trim() || 'cliente@correo.com',
          city: document.getElementById('cl-city').value.trim() || 'Medellín'
        };
        state.clients.unshift(newClient);
        const quickTarget = window.__quickClientTarget || 'event';
        if (quickTarget === 'daypass' && state.activeDayPass) {
          state.activeDayPass.clientId = newClient.id;
        } else if (quickTarget === 'cabin' && state.activeCabinQuote) {
          state.activeCabinQuote.clientId = newClient.id;
        } else if (state.activeQuote) {
          state.activeQuote.clientId = newClient.id;
        }
        saveState();
        document.getElementById('modal-client')?.classList.add('hidden');
        populateClientSelect();
        renderClientsGrid();
        if (quickTarget === 'daypass') {
          if (typeof populateDayPassClients === 'function') populateDayPassClients();
          const dsSel = document.getElementById('ds-client-select');
          if (dsSel) dsSel.value = newClient.id;
          if (typeof recalcDayPass === 'function') recalcDayPass();
        } else if (quickTarget === 'cabin') {
          if (typeof populateCabinQuotePickers === 'function') populateCabinQuotePickers();
          const hosSel = document.getElementById('hos-client-select');
          if (hosSel) hosSel.value = newClient.id;
          if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
        } else {
          renderQuoteEditorAndPdf();
        }
        window.__quickClientTarget = 'event';
        showToast(`Cliente "${name}" creado y seleccionado`);
      });

      document.getElementById('clients-cards-grid')?.addEventListener('click', e => {
        const btn = e.target.closest('.quote-for-client-btn');
        if (!btn) return;
        const cid = btn.getAttribute('data-client-quote');
        state.activeQuote.clientId = cid;
        saveState();
        switchView('cotizador');
        showToast('Cliente cargado en la cotización activa');
      });

      // Finances Modal & Actions
      document.getElementById('btn-new-income')?.addEventListener('click', () => {
        document.getElementById('fin-type').value = 'ingreso';
        document.getElementById('fin-modal-title').textContent = '➕ Registrar Ingreso o Anticipo de Evento';
        document.getElementById('fin-concept').value = '';
        document.getElementById('fin-category').value = 'Anticipo Evento';
        document.getElementById('fin-amount').value = 1500000;
        document.getElementById('modal-finance')?.classList.remove('hidden');
      });

      document.getElementById('btn-new-expense')?.addEventListener('click', () => {
        document.getElementById('fin-type').value = 'egreso';
        document.getElementById('fin-modal-title').textContent = '➖ Registrar Egreso o Compra de Insumos';
        document.getElementById('fin-concept').value = '';
        document.getElementById('fin-category').value = 'Compra de Insumos';
        document.getElementById('fin-amount').value = 450000;
        document.getElementById('modal-finance')?.classList.remove('hidden');
      });

      document.getElementById('btn-save-finance')?.addEventListener('click', () => {
        const concept = document.getElementById('fin-concept').value.trim() || 'Movimiento de caja';
        const amount = Math.max(0, Number(document.getElementById('fin-amount').value) || 0);
        state.finances.unshift({
          id: 'fin-' + Date.now(),
          type: document.getElementById('fin-type').value,
          date: document.getElementById('fin-date').value || '2026-11-01',
          concept,
          category: document.getElementById('fin-category').value,
          method: document.getElementById('fin-method').value,
          amount
        });
        saveState();
        document.getElementById('modal-finance')?.classList.add('hidden');
        renderFinancesView();
        showToast('Movimiento financiero registrado en caja');
      });

      document.getElementById('finance-filter-type')?.addEventListener('change', renderFinancesView);

      document.getElementById('finance-movements-tbody')?.addEventListener('click', e => {
        const btn = e.target.closest('.del-fin-btn');
        if (!btn) return;
        const fid = btn.getAttribute('data-del-fin');
        state.finances = state.finances.filter(f => f.id !== fid);
        saveState();
        renderFinancesView();
        showToast('Movimiento eliminado');
      });

      // Company Settings Save & Logo Upload
      document.getElementById('comp-logo-upload')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          state.company.logoDataUrl = ev.target.result;
          saveState();
          renderQuoteEditorAndPdf();
          showToast('Logotipo cargado y aplicado al PDF');
        };
        reader.readAsDataURL(file);
      });

      document.getElementById('btn-save-company')?.addEventListener('click', () => {
        state.company.name = document.getElementById('comp-name').value.trim() || 'Mi Empresa de Eventos';
        state.company.nit = document.getElementById('comp-nit').value.trim();
        state.company.rnt = (document.getElementById('comp-rnt')?.value || '').trim();
        state.company.slogan = document.getElementById('comp-slogan').value.trim();
        state.company.phone = document.getElementById('comp-phone').value.trim();
        state.company.email = document.getElementById('comp-email').value.trim();
        state.company.address = document.getElementById('comp-address').value.trim();
        state.company.bankDetails = document.getElementById('comp-bank').value;
        state.company.terms = document.getElementById('comp-terms').value;
        const compOpInput = document.getElementById('comp-operator-name'); if (compOpInput && compOpInput.value.trim()) { state.auth = state.auth || getDefaultState().auth; state.auth.operatorName = compOpInput.value.trim(); updateOperatorNameDisplay(); }
        saveState();
        renderQuoteEditorAndPdf();
        showToast('Datos de Mi Empresa actualizados en todas las cotizaciones y PDF');
      });

      // Backup Export, Import & Reset Demo
      document.getElementById('btn-export-backup')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo_cotizaciones_eventos_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Archivo de respaldo JSON descargado');
      });

      // Backup Import
      document.getElementById('input-import-backup')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (!data || typeof data !== 'object') throw new Error('Formato inválido');
            state = { ...getDefaultState(), ...data };
            saveState();
            populateEventTypeSelect();
            renderEventTypesPills();
            populateClientSelect();
            populatePickerProducts();
            renderQuoteEditorAndPdf();
            renderProductsCatalog();
            renderSavedQuotes();
            renderClientsGrid();
            renderFinancesView();
            loadCompanyFormInputs();
            showToast('✅ Respaldo JSON restaurado exitosamente');
          } catch (err) {
            console.error('Error importando JSON:', err);
            showToast('❌ Error: El archivo no es un respaldo JSON válido');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });

      document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
        if (!confirm('¿Seguro que deseas restaurar los datos de demostración? Se perderán los cambios no exportados.')) return;
        state = getDefaultState();
        saveState();
        populateEventTypeSelect();
        renderEventTypesPills();
        populateClientSelect();
        populatePickerProducts();
        renderQuoteEditorAndPdf();
        renderProductsCatalog();
        renderSavedQuotes();
        renderClientsGrid();
        renderFinancesView();
        loadCompanyFormInputs();
        switchView('cotizador');
        showToast('Datos de demostración restaurados');
      });

      // ==========================================
      // SECURITY & AUTH EVENT LISTENERS
      // ==========================================
      const loginFormEl = document.getElementById('form-login');
      if (loginFormEl && !loginFormEl.dataset.bound) {
        loginFormEl.dataset.bound = 'true';
        loginFormEl.addEventListener('submit', e => {
          e.preventDefault();
          handleLoginSubmit();
        });
      }

      // User Profile Menu Dropdown
      const userProfileBtn = document.getElementById('btn-user-profile');
      const userMenuPopover = document.getElementById('user-menu-popover');
      userProfileBtn?.addEventListener('click', e => {
        e.stopPropagation();
        userMenuPopover?.classList.toggle('hidden');
      });

      document.addEventListener('click', e => {
        if (!document.getElementById('user-menu-dropdown-container')?.contains(e.target)) {
          userMenuPopover?.classList.add('hidden');
        }
      });

      // Lock Screen & Logout Actions
      document.getElementById('btn-menu-lock-screen')?.addEventListener('click', () => {
        userMenuPopover?.classList.add('hidden');
        lockScreen('Pantalla bloqueada por el usuario.');
      });

      document.getElementById('btn-menu-logout')?.addEventListener('click', () => {
        userMenuPopover?.classList.add('hidden');
        logout();
      });

      // Change Password Modal
      const openChangePwdModal = () => {
        userMenuPopover?.classList.add('hidden');
        document.getElementById('chg-curr-pwd').value = '';
        document.getElementById('chg-new-pwd').value = '';
        document.getElementById('chg-conf-pwd').value = '';
        const bar = document.getElementById('pwd-strength-bar');
        const lbl = document.getElementById('pwd-strength-label');
        if (bar) { bar.style.width = '0%'; bar.className = 'h-full bg-slate-300'; }
        if (lbl) { lbl.textContent = 'Ingresa contraseña'; lbl.className = 'font-bold text-slate-400'; }
        document.getElementById('modal-change-password')?.classList.remove('hidden');
      };

      document.getElementById('btn-menu-change-pwd')?.addEventListener('click', openChangePwdModal);
      document.getElementById('btn-open-change-pwd-modal')?.addEventListener('click', openChangePwdModal);
      document.getElementById('btn-close-modal-change-pwd')?.addEventListener('click', () => {
        document.getElementById('modal-change-password')?.classList.add('hidden');
      });
      document.getElementById('btn-cancel-modal-change-pwd')?.addEventListener('click', () => {
        document.getElementById('modal-change-password')?.classList.add('hidden');
      });

      // Live Password Strength Meter
      document.getElementById('chg-new-pwd')?.addEventListener('input', e => {
        const val = e.target.value;
        const bar = document.getElementById('pwd-strength-bar');
        const lbl = document.getElementById('pwd-strength-label');
        if (!bar || !lbl) return;

        let score = 0;
        if (val.length >= 6) score += 1;
        if (val.length >= 8) score += 1;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
        if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 1;

        if (val.length === 0) {
          bar.style.width = '0%';
          lbl.textContent = 'Ingresa contraseña';
          lbl.className = 'font-bold text-slate-400';
        } else if (score <= 1) {
          bar.style.width = '25%';
          bar.className = 'h-full bg-rose-500 transition-all duration-300';
          lbl.textContent = 'Débil (mín 6 caracteres)';
          lbl.className = 'font-bold text-rose-500';
        } else if (score === 2) {
          bar.style.width = '50%';
          bar.className = 'h-full bg-amber-500 transition-all duration-300';
          lbl.textContent = 'Media';
          lbl.className = 'font-bold text-amber-500';
        } else if (score === 3) {
          bar.style.width = '75%';
          bar.className = 'h-full bg-indigo-500 transition-all duration-300';
          lbl.textContent = 'Buena';
          lbl.className = 'font-bold text-indigo-600';
        } else {
          bar.style.width = '100%';
          bar.className = 'h-full bg-emerald-500 transition-all duration-300';
          lbl.textContent = 'Excelente (Robusta)';
          lbl.className = 'font-bold text-emerald-600';
        }
      });

      // Change Password Form Submit (Direct, no cryptographic traps)
      document.getElementById('form-change-password')?.addEventListener('submit', e => {
        e.preventDefault();
        const curr = document.getElementById('chg-curr-pwd').value;
        const newP = document.getElementById('chg-new-pwd').value;
        const conf = document.getElementById('chg-conf-pwd').value;

        const expectedPwd = state.auth?.password || 'Admin2026*';
        if (curr !== expectedPwd) {
          showToast('❌ La contraseña actual no es correcta.');
          return;
        }

        if (newP.length < 4) {
          showToast('❌ La nueva contraseña debe tener mínimo 4 caracteres.');
          return;
        }

        if (newP !== conf) {
          showToast('❌ Las nuevas contraseñas no coinciden.');
          return;
        }

        if (!state.auth) state.auth = getDefaultState().auth;
        state.auth.password = newP;
        saveState();

        document.getElementById('modal-change-password')?.classList.add('hidden');
        showToast('✅ Contraseña actualizada exitosamente.');
      });

      // Note: Theme toggles (btn-theme-toggle, btn-menu-toggle-theme, btn-sidebar-theme-toggle)
      // are cleanly handled via window.toggleTheme with debounce protection.

      // ==========================================
      // PWA INSTALLATION ENGINE & SERVICE WORKER
      // ==========================================
      // Register PWA Service Worker (active on secure origins like Vercel or localhost)
      if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        const regSW = () => {
          navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.update().catch(() => {});
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    newWorker.postMessage({ action: 'skipWaiting' });
                  }
                });
              }
            });
          }).catch(err => {
            console.log('SW registration note:', err);
          });
        };
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        if (document.readyState === 'complete') {
          regSW();
        } else {
          window.addEventListener('load', regSW);
        }
      }

      // Inactivity Auto-Lock Settings
      document.getElementById('sec-auto-lock-mins')?.addEventListener('change', e => {
        if (!state.auth) state.auth = getDefaultState().auth;
        state.auth.sessionTimeoutMins = Number(e.target.value);
        saveState();
        resetInactivityTimer();
        showToast('Tiempo de auto-bloqueo guardado.');
      });

      // Inactivity user tracking
      ['mousemove', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetInactivityTimer, { passive: true });
      });

      // Instant Search and Filters
      document.getElementById('quote-search-input')?.addEventListener('input', renderSavedQuotes);
      document.getElementById('quote-filter-status')?.addEventListener('change', renderSavedQuotes);
      document.getElementById('client-search-input')?.addEventListener('input', renderClientsGrid);

      // CSV Export Buttons
      document.getElementById('btn-export-quotes-csv')?.addEventListener('click', () => {
        const headers = ['N&deg; Cotización', 'Título Evento', 'Cliente', 'Tipo de Evento', 'Invitados (Pax)', 'Fecha Evento', 'Vencimiento', 'Total ($ COP)', 'Estado'];
        const rows = state.savedQuotes.map(sq => {
          const cl = state.clients.find(c => c.id === sq.clientId);
          return [sq.number, sq.eventTitle, cl ? cl.name : '', sq.eventType, sq.guestsPax, sq.eventDate, sq.validUntil, Math.round(sq.total), sq.status];
        });
        exportToCSV(`cotizaciones_eventos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      });

      document.getElementById('btn-export-clients-csv')?.addEventListener('click', () => {
        const headers = ['Nombre / Novios / Empresa', 'Cédula / NIT', 'Teléfono / WhatsApp', 'Correo Electrónico', 'Ciudad'];
        const rows = state.clients.map(c => [c.name, c.doc, c.phone, c.email, c.city]);
        exportToCSV(`clientes_eventos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      });

      document.getElementById('btn-export-finances-csv')?.addEventListener('click', () => {
        const headers = ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Medio de Pago', 'Monto ($ COP)'];
        const rows = state.finances.map(f => [f.date, f.type.toUpperCase(), f.concept, f.category, f.method, Math.round(f.amount)]);
        exportToCSV(`flujo_de_caja_eventos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      });

      // Keyboard Shortcuts
      window.addEventListener('keydown', e => {
        // Ctrl+S / Cmd+S: Save quote
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          document.getElementById('btn-save-quote')?.click();
        }
        // Escape: Close all modals and user menu
        if (e.key === 'Escape') {
          document.querySelectorAll('.fixed.inset-0:not(#auth-screen)').forEach(m => m.classList.add('hidden'));
          userMenuPopover?.classList.add('hidden');
          closeMobileSidebar();
        }
      });
    }

    function renderTempRecipeIngredients() {
      const listEl = document.getElementById('rec-ingredients-list');
      const costEl = document.getElementById('rec-calculated-cost-per-pax');
      const basePax = Math.max(1, Number(document.getElementById('rec-base-pax')?.value) || 1);
      if (!listEl || !costEl) return;

      if (tempRecipeIngredients.length === 0) {
        listEl.innerHTML = `<div class="text-slate-400 text-center py-3">Aún no has agregado insumos a esta receta.</div>`;
        costEl.textContent = '$0';
        return;
      }

      let sumCost = 0;
      listEl.innerHTML = tempRecipeIngredients.map((ing, idx) => {
        const baseProd = state.products.find(p => p.id === ing.productId);
        if (!baseProd) return '';
        const convQty = convertUnits(ing.qty, ing.unit, baseProd.unit);
        const lineCost = convQty * (Number(baseProd.cost) || 0);
        sumCost += lineCost;
        return `
          <div class="flex items-center justify-between py-1.5 px-2 text-xs">
            <div>
              <strong class="text-slate-800">${baseProd.name}</strong>:
              <span>${ing.qty} ${ing.unit}</span>
              <span class="text-slate-400">(${convQty.toFixed(3)} ${baseProd.unit})</span>
            </div>
            <div class="flex items-center gap-3">
              <strong class="text-indigo-700 tabular-nums">${formatCurrency(lineCost)}</strong>
              <button type="button" data-rm-ing="${idx}" class="text-rose-500 font-bold">✕</button>
            </div>
          </div>
        `;
      }).join('');

      costEl.textContent = formatCurrency(sumCost / basePax);
    }

    // Initialize Application
    window.addEventListener('DOMContentLoaded', () => {
      loadState();

      // 1. Force Pure White / Light Mode by default across all devices (PC, Mac, iPhone)
      let savedTheme = localStorage.getItem('eq_theme');
      if (!savedTheme || localStorage.getItem('eq_theme_forced_light_v1') !== 'true') {
        savedTheme = 'light';
        try {
          localStorage.setItem('eq_theme', 'light');
          localStorage.setItem('eq_theme_forced_light_v1', 'true');
        } catch (e) {}
      }
      applyTheme(savedTheme);

      // 2. Validate session immediately to prevent mobile layout stutter or visual flash
      // (protegido: un error aquí no debe impedir que se registren los botones de la app)
      try {
        checkActiveSession();
      } catch (err) {
        console.error('Error validando la sesión:', err);
        try { setAuthenticated(false); } catch (e) {}
      }

      // 3. Initialize responsive sidebar
      initSidebar();

      // 4. Setup listeners and render initial views
      setupEventListeners();
      populateEventTypeSelect();
      renderEventTypesPills();
      populateClientSelect();
      migrateState();
      updateNotificationBadgeAndList();
      populateClosureQuoteSelect();
      populatePickerProducts();
      populateRecipeSimulator();
            // ==========================================
      // CUENTA DE COBRO EVENT LISTENERS & WIRING
      // ==========================================
      document.getElementById('btn-open-cuenta-cobro')?.addEventListener('click', () => {
        openCuentaCobroModal();
      });

      document.getElementById('btn-close-modal-cdc')?.addEventListener('click', () => {
        document.getElementById('modal-cuenta-cobro')?.classList.add('hidden');
      });

      document.getElementById('btn-download-cdc-pdf')?.addEventListener('click', downloadCuentaCobroPDF);
      document.getElementById('btn-print-cdc')?.addEventListener('click', () => window.print());

      // Universal CDC View Mode Switches (Full Edit, Full Preview, or Split)
      document.getElementById('btn-cdc-mode-edit')?.addEventListener('click', () => setCDCViewMode('edit'));
      document.getElementById('btn-cdc-mode-preview')?.addEventListener('click', () => setCDCViewMode('preview'));
      document.getElementById('btn-cdc-mode-split')?.addEventListener('click', () => setCDCViewMode('split'));
      document.getElementById('btn-cdc-jump-preview')?.addEventListener('click', () => setCDCViewMode('preview'));
      document.getElementById('btn-cdc-jump-edit')?.addEventListener('click', () => setCDCViewMode('edit'));
      document.getElementById('btn-cdc-jump-edit-bottom')?.addEventListener('click', () => setCDCViewMode('edit'));
      document.getElementById('btn-cdc-bottom-close')?.addEventListener('click', () => document.getElementById('modal-cuenta-cobro')?.classList.add('hidden'));
      document.getElementById('btn-cdc-pv-dl-pdf')?.addEventListener('click', downloadCuentaCobroPDF);
      document.getElementById('btn-cdc-pv-dl-pdf-bottom')?.addEventListener('click', downloadCuentaCobroPDF);

      window.addEventListener('resize', () => {
        const previewPanel = document.getElementById('cdc-panel-preview');
        if (previewPanel && !previewPanel.classList.contains('hidden')) {
          updateCDCScale();
        }
      });
      window.addEventListener('orientationchange', () => {
        setTimeout(updateCDCScale, 150);
      });
// Amount Preset buttons
      document.getElementById('btn-cdc-preset-total')?.addEventListener('click', () => {
        const q = currentCDCQuote || state.activeQuote || {};
        const total = Math.round(xpQuoteTotals(q).total);
        const amtInput = document.getElementById('cdc-input-amount');
        if (amtInput) amtInput.value = total;
        const wordsInput = document.getElementById('cdc-input-amount-words');
        if (wordsInput) wordsInput.value = numeroALetras(total);
        highlightCDCPreset('btn-cdc-preset-total');
        updateCuentaCobroPreview();
      });

      document.getElementById('btn-cdc-preset-anticipo')?.addEventListener('click', () => {
        const q = currentCDCQuote || state.activeQuote || {};
        const total = Math.round(xpQuoteTotals(q).total);
        const anticipoVal = Math.round(total * ((Number(q.depositPct) || 50) / 100));
        const amtInput = document.getElementById('cdc-input-amount');
        if (amtInput) amtInput.value = anticipoVal;
        const wordsInput = document.getElementById('cdc-input-amount-words');
        if (wordsInput) wordsInput.value = numeroALetras(anticipoVal);
        highlightCDCPreset('btn-cdc-preset-anticipo');
        updateCuentaCobroPreview();
      });

      document.getElementById('btn-cdc-preset-saldo')?.addEventListener('click', () => {
        const q = currentCDCQuote || state.activeQuote || {};
        const total = Math.round(xpQuoteTotals(q).total);
        const anticipoVal = Math.round(total * ((Number(q.depositPct) || 50) / 100));
        const saldoVal = Math.max(0, total - anticipoVal);
        const amtInput = document.getElementById('cdc-input-amount');
        if (amtInput) amtInput.value = saldoVal;
        const wordsInput = document.getElementById('cdc-input-amount-words');
        if (wordsInput) wordsInput.value = numeroALetras(saldoVal);
        highlightCDCPreset('btn-cdc-preset-saldo');
        updateCuentaCobroPreview();
      });

      document.getElementById('btn-cdc-preset-custom')?.addEventListener('click', () => {
        highlightCDCPreset('btn-cdc-preset-custom');
        document.getElementById('cdc-input-amount')?.focus();
      });

      // Amount input handler: syncs words and live preview
      document.getElementById('cdc-input-amount')?.addEventListener('input', e => {
        const val = Number(e.target.value) || 0;
        const wordsInput = document.getElementById('cdc-input-amount-words');
        if (wordsInput) wordsInput.value = numeroALetras(val);
        highlightCDCPreset('btn-cdc-preset-custom');
        updateCuentaCobroPreview();
      });

      // Synchronize all other CDC inputs live to preview
      ['cdc-input-number', 'cdc-input-date', 'cdc-input-due-date', 'cdc-input-amount-words',
       'cdc-creditor-name', 'cdc-creditor-doc', 'cdc-creditor-phone', 'cdc-creditor-city',
       'cdc-debtor-name', 'cdc-debtor-doc', 'cdc-debtor-contact', 'cdc-debtor-city',
       'cdc-input-concept', 'cdc-input-bank', 'cdc-input-tax-clause'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateCuentaCobroPreview);
      });

      ['cdc-toggle-items', 'cdc-toggle-tax-clause'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateCuentaCobroPreview);
      });

      // Delegate click for data-cdc-quote in saved quotes table
      document.getElementById('view-historial')?.addEventListener('click', e => {
        const cdcBtn = e.target.closest('[data-cdc-quote]');
        if (cdcBtn) {
          const qId = cdcBtn.dataset.cdcQuote;
          const sq = (state.savedQuotes || []).find(x => x.id === qId);
          if (sq) {
            openCuentaCobroModal(sq.fullCopy || sq);
          }
        }
      });

      renderQuoteEditorAndPdf();
      renderSavedQuotes();
      renderProductsCatalog();
      renderClientsGrid();
      renderFinancesView();
      loadCompanyFormInputs();
      updateOperatorNameDisplay();
      initAntigravityMotion();
      switchView('dashboard');
    });
