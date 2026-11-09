/* Xander Pro — 06-modulos-avanzados (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // ==========================================
    // INTEGRATED XANDER PRO 2.0 ADVANCED MODULES
    // ==========================================
    // =========================================================================
// XANDER PRO 2.0 ADVANCED MODULES & ENHANCEMENTS
// =========================================================================

// --- 1. STATE MIGRATION & HYDRATION ---
function migrateState() {
  if (!state) return;
  state.eventClosures = state.eventClosures || [];
  state.shoppingLists = state.shoppingLists || {};
  state.notifications = state.notifications || [];
  state.priceHistory = state.priceHistory || {};

  // Hydrate initial price history from existing saved quotes if empty
  if (Object.keys(state.priceHistory).length === 0 && state.savedQuotes && state.savedQuotes.length > 0) {
    state.savedQuotes.forEach(q => {
      (q.items || []).forEach(it => {
        if (!it.productId) return;
        state.priceHistory[it.productId] = state.priceHistory[it.productId] || [];
        state.priceHistory[it.productId].push({
          price: Number(it.price) || 0,
          quoteNumber: q.number,
          clientName: (state.clients.find(c => c.id === q.clientId) || {}).name || 'Cliente',
          date: q.issueDate
        });
      });
    });
  }
}

// --- 2. NOTIFICATION SYSTEM & EXPIRING QUOTES (MODULES 4 & 5) ---
function generateSystemNotifications() {
  const notifs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Cotizaciones próximas a vencer y vencidas
  (state.savedQuotes || []).forEach(q => {
    if (q.status === 'Rechazada' || q.status === 'Cancelada') return;
    const vDate = new Date(q.validUntil + 'T00:00:00');
    const diffTime = vDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const cl = (state.clients || []).find(c => c.id === q.clientId);
    const clientName = cl ? cl.name : 'Cliente';

    if (diffDays < 0) {
      notifs.push({
        id: `notif-exp-${q.id}`,
        type: 'quote_expiring',
        severity: 'critical',
        badge: '🔴 Crítico',
        title: `Cotización ${q.number} VENCIDA`,
        message: `${q.eventTitle} (${clientName}) venció el ${formatDateHuman(q.validUntil)}. Requiere seguimiento comercial urgente.`,
        quoteId: q.id,
        days: diffDays
      });
    } else if (diffDays === 0) {
      notifs.push({
        id: `notif-today-${q.id}`,
        type: 'quote_expiring',
        severity: 'critical',
        badge: '🔴 Crítico',
        title: `Cotización ${q.number} vence HOY`,
        message: `${q.eventTitle} (${clientName}) vence hoy. Contacta al cliente para confirmar el evento.`,
        quoteId: q.id,
        days: 0
      });
    } else if (diffDays === 1) {
      notifs.push({
        id: `notif-tomorrow-${q.id}`,
        type: 'quote_expiring',
        severity: 'critical',
        badge: '🔴 Crítico',
        title: `Cotización ${q.number} vence MAÑANA`,
        message: `${q.eventTitle} (${clientName}) vence mañana (${formatDateHuman(q.validUntil)}). Último día para acordar condiciones.`,
        quoteId: q.id,
        days: 1
      });
    } else if (diffDays <= 3) {
      notifs.push({
        id: `notif-3d-${q.id}`,
        type: 'quote_expiring',
        severity: 'warning',
        badge: '🟡 Advertencia',
        title: `Cotización ${q.number} vence en ${diffDays} días`,
        message: `${q.eventTitle} (${clientName}) vence el ${formatDateHuman(q.validUntil)}.`,
        quoteId: q.id,
        days: diffDays
      });
    } else if (diffDays <= 7) {
      notifs.push({
        id: `notif-7d-${q.id}`,
        type: 'quote_expiring',
        severity: 'info',
        badge: '🟢 Informativo',
        title: `Cotización ${q.number} activa`,
        message: `${q.eventTitle} (${clientName}) vence en ${diffDays} días.`,
        quoteId: q.id,
        days: diffDays
      });
    }
  });

  // 2. Eventos próximos en Agenda
  (state.savedQuotes || []).forEach(q => {
    if (q.status !== 'Aprobada') return;
    const eDate = new Date(q.eventDate + 'T00:00:00');
    const diffTime = eDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const cl = (state.clients || []).find(c => c.id === q.clientId);
    const clientName = cl ? cl.name : 'Cliente';

    if (diffDays >= 0 && diffDays <= 7) {
      const isCrit = diffDays <= 2;
      notifs.push({
        id: `notif-event-${q.id}`,
        type: 'event_upcoming',
        severity: isCrit ? 'critical' : 'warning',
        badge: isCrit ? '🔴 Crítico' : '🟡 Advertencia',
        title: diffDays === 0 ? `🎉 Evento HOY: ${q.eventTitle}` : `📅 Evento en ${diffDays}d: ${q.eventTitle}`,
        message: `${q.guestsPax} Pax en ${q.eventVenue || 'locación'} (${clientName}). Verifica insumos y personal.`,
        quoteId: q.id,
        days: diffDays
      });
    }

    // 3. Eventos finalizados sin cerrar
    if (diffDays < 0) {
      const isClosed = (state.eventClosures || []).some(cl => cl.quoteId === q.id);
      if (!isClosed) {
        notifs.push({
          id: `notif-unclosed-${q.id}`,
          type: 'unclosed_event',
          severity: 'warning',
          badge: '🟡 Advertencia',
          title: `Cierre pendiente: ${q.eventTitle}`,
          message: `Evento finalizó hace ${Math.abs(diffDays)} días. Registra costos reales, compras extras y liquida.`,
          quoteId: q.id,
          days: diffDays
        });
      }
    }

    // 4. Pagos pendientes (Aprobados con saldo por cobrar)
    const total = Number(q.total) || 0;
    const depositPct = Number(q.depositPct) || 50;
    const anticipo = Math.round(total * (depositPct / 100));
    const saldo = total - anticipo;
    if (saldo > 0 && diffDays <= 7) {
      notifs.push({
        id: `notif-payment-${q.id}`,
        type: 'pending_payment',
        severity: diffDays <= 2 ? 'critical' : 'warning',
        badge: diffDays <= 2 ? '🔴 Crítico' : '🟡 Advertencia',
        title: `Saldo por cobrar: ${formatCurrency(saldo)}`,
        message: `${q.eventTitle} (${clientName}) tiene saldo pendiente de cobro antes de la entrega.`,
        quoteId: q.id
      });
    }
  });

  // 5. Inventario Insuficiente (Stock agotado)
  (state.products || []).forEach(p => {
    if (p.active === false) return;
    if (p.trackStock && Number(p.stock) > 0 && typeof xpStockStatus === 'function' && xpStockStatus(p) === 'low') {
      notifs.push({
        id: `notif-lowstock-${p.id}`,
        type: 'low_stock',
        severity: 'warning',
        badge: '🟠 Stock bajo',
        title: `Stock bajo: ${p.name}`,
        message: `Quedan ${Number(p.stock).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${p.unit} (mínimo ${p.minStock}). Conviene reabastecer.`,
        productId: p.id
      });
    }
    if (p.trackStock && Number(p.stock) <= 0) {
      notifs.push({
        id: `notif-stock-${p.id}`,
        type: 'low_stock',
        severity: 'critical',
        badge: '🔴 Crítico',
        title: `Insumo agotado: ${p.name}`,
        message: `Existencia en 0 ${p.unit}. Reabastecer en bodega para evitar faltantes en eventos.`,
        productId: p.id
      });
    }
  });

  return notifs;
}

function updateNotificationBadgeAndList() {
  const notifs = generateSystemNotifications();
  const badge = document.getElementById('notif-badge-count');
  const headerCount = document.getElementById('notif-header-counter');
  const listEl = document.getElementById('notifications-list');

  // Filter out dismissed notifications
  const dismissed = JSON.parse(localStorage.getItem('eq_dismissed_notifs') || '[]');
  const activeNotifs = notifs.filter(n => !dismissed.includes(n.id));

  if (badge) {
    if (activeNotifs.length > 0) {
      badge.textContent = activeNotifs.length > 99 ? '99+' : activeNotifs.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  if (headerCount) {
    headerCount.textContent = `${activeNotifs.length} nuevas`;
  }

  if (listEl) {
    if (activeNotifs.length === 0) {
      listEl.innerHTML = `
        <div class="py-8 px-4 text-center text-slate-400">
          <span class="text-2xl block mb-1">🎉</span>
          <span class="font-bold">Todo al día</span>
          <p class="text-[11px] mt-0.5">No tienes alertas pendientes de vencimientos o inventario.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = activeNotifs.map(n => {
        let borderColor = 'border-slate-200';
        let bgBadge = 'bg-slate-100 text-slate-700';
        if (n.severity === 'critical') {
          borderColor = 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20';
          bgBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200';
        } else if (n.severity === 'warning') {
          borderColor = 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20';
          bgBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
        } else {
          borderColor = 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20';
          bgBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
        }

        return `
          <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-l-4 ${borderColor} flex items-start justify-between gap-2 cursor-pointer" onclick="handleNotificationClick('${n.id}', '${n.quoteId || ''}', '${n.type}')">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${bgBadge}">${n.badge}</span>
                <span class="font-bold text-slate-900 dark:text-white truncate">${n.title}</span>
              </div>
              <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">${n.message}</p>
            </div>
            <button type="button" onclick="event.stopPropagation(); dismissNotification('${n.id}')" class="text-slate-400 hover:text-slate-600 p-1" title="Descartar">✕</button>
          </div>
        `;
      }).join('');
    }
  }

  // Also update top Expiring Widget in Dashboard
  updateExpiringWidgetCounts(notifs);
}

function handleNotificationClick(notifId, quoteId, type) {
  dismissNotification(notifId);
  document.getElementById('notifications-popover')?.classList.add('hidden');

  if (type === 'unclosed_event') {
    switchView('rentabilidad');
    if (quoteId) loadEventForClosure(quoteId);
    return;
  }
  if (type === 'low_stock') {
    switchView('productos');
    return;
  }
  if (quoteId) {
    const sq = (state.savedQuotes || []).find(q => q.id === quoteId);
    if (sq) {
      loadSavedQuoteIntoActive(sq);
      switchView('cotizador');
      showToast(`Cotización ${sq.number} cargada en cotizador`);
    }
  }
}

function dismissNotification(id) {
  const dismissed = JSON.parse(localStorage.getItem('eq_dismissed_notifs') || '[]');
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem('eq_dismissed_notifs', JSON.stringify(dismissed));
  }
  updateNotificationBadgeAndList();
}

function markAllNotificationsAsRead() {
  const notifs = generateSystemNotifications();
  const allIds = notifs.map(n => n.id);
  localStorage.setItem('eq_dismissed_notifs', JSON.stringify(allIds));
  updateNotificationBadgeAndList();
  showToast('Todas las alertas marcadas como leídas');
}

function requestPWANotifications() {
  if (!('Notification' in window)) {
    showToast('Tu navegador no soporta notificaciones de sistema.');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      showToast('✅ Notificaciones de Xander Pro activadas.');
      new Notification('Xander Pro — Notificaciones Activas', {
        body: 'Te avisaremos cuando tus cotizaciones o eventos estén próximos a vencer.',
        icon: './icon-192.png'
      });
    } else {
      showToast('Permiso de notificaciones rechazado.');
    }
  });
}

// Top Widget Dashboard Counters
function updateExpiringWidgetCounts(notifs) {
  const allNotifs = notifs || generateSystemNotifications();
  const expiring = allNotifs.filter(n => n.type === 'quote_expiring');

  const todayCount = expiring.filter(n => n.days <= 0).length;
  const threeDaysCount = expiring.filter(n => n.days > 0 && n.days <= 3).length;
  const sevenDaysCount = expiring.filter(n => n.days > 3 && n.days <= 7).length;

  const elToday = document.getElementById('widget-count-today');
  const el3 = document.getElementById('widget-count-3days');
  const el7 = document.getElementById('widget-count-7days');

  if (elToday) elToday.textContent = todayCount;
  if (el3) el3.textContent = threeDaysCount;
  if (el7) el7.textContent = sevenDaysCount;
}

function filterQuotesByUrgency(urgency) {
  const container = document.getElementById('widget-expiring-list-container');
  const tbody = document.getElementById('widget-expiring-tbody');
  const title = document.getElementById('widget-expiring-title');
  if (!container || !tbody) return;

  const notifs = generateSystemNotifications().filter(n => n.type === 'quote_expiring');
  let filtered = [];
  if (urgency === 'today') {
    filtered = notifs.filter(n => n.days <= 0);
    if (title) title.textContent = `Cotizaciones Vencidas o que Vencen Hoy (${filtered.length})`;
  } else if (urgency === '3days') {
    filtered = notifs.filter(n => n.days > 0 && n.days <= 3);
    if (title) title.textContent = `Cotizaciones que Vencen en 3 Días (${filtered.length})`;
  } else if (urgency === '7days') {
    filtered = notifs.filter(n => n.days > 3 && n.days <= 7);
    if (title) title.textContent = `Cotizaciones que Vencen en 7 Días (${filtered.length})`;
  }

  container.classList.remove('hidden');

  if (filtered.length === 0) {
    tbody.innerHTML = `<div class="p-3 text-center text-slate-400">No hay cotizaciones en este rango de vencimiento.</div>`;
    return;
  }

  tbody.innerHTML = filtered.map(n => {
    const sq = (state.savedQuotes || []).find(q => q.id === n.quoteId);
    const client = state.clients.find(c => c.id === sq?.clientId);
    return `
      <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2 hover:bg-slate-800 transition">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <strong class="text-indigo-300 font-mono">${sq?.number || 'COT'}</strong>
            <span class="text-white font-bold truncate">${sq?.eventTitle || 'Evento'}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${n.severity === 'critical' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'}">${n.badge}</span>
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">
            Cliente: <span class="text-slate-200 font-semibold">${client?.name || 'Cliente'}</span> · Vence: <span class="text-amber-400 font-bold">${formatDateHuman(sq?.validUntil)}</span> · Total: <strong class="text-emerald-400">${formatCurrency(sq?.total || 0)}</strong>
          </div>
        </div>
        <button type="button" onclick="handleNotificationClick('${n.id}', '${sq?.id}', 'quote_expiring')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 shadow-xs transition">
          Abrir ➔
        </button>
      </div>
    `;
  }).join('');
}


    // --- 3. AGENDA OPERATIVA (MODULE 3: DÍA / SEMANA / MES) ---
let agendaCurrentDate = new Date();
let agendaViewMode = 'month'; // 'month' | 'week' | 'day'

function setAgendaViewMode(mode) {
  agendaViewMode = mode;
  ['month', 'week', 'day'].forEach(m => {
    const btn = document.getElementById(`btn-agenda-view-${m}`);
    if (btn) btn.className = m === mode ? 'agenda-seg agenda-seg-active' : 'agenda-seg';
  });
  renderAgenda();
}

function navigateAgenda(offset) {
  if (agendaViewMode === 'month') {
    agendaCurrentDate.setDate(1);
    agendaCurrentDate.setMonth(agendaCurrentDate.getMonth() + offset);
  } else if (agendaViewMode === 'week') {
    agendaCurrentDate.setDate(agendaCurrentDate.getDate() + (offset * 7));
  } else if (agendaViewMode === 'day') {
    agendaCurrentDate.setDate(agendaCurrentDate.getDate() + offset);
  }
  renderAgenda();
}

function navigateAgendaToday() {
  agendaCurrentDate = new Date();
  renderAgenda();
}

// Fecha local en formato AAAA-MM-DD (toISOString usa UTC y en la noche cambia de día)
function agendaYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const AGENDA_STATUS_LABEL = { Aprobada: 'Confirmada', Enviada: 'Enviada', Borrador: 'Borrador', Rechazada: 'Rechazada', Vencida: 'Vencida' };

// Reúne eventos y estadías de cabañas en una sola lista por día
function buildAgendaItems() {
  const selectedStatus = document.getElementById('agenda-filter-status')?.value || 'active';
  const selectedClient = document.getElementById('agenda-filter-client')?.value || 'all';
  const selectedType = document.getElementById('agenda-filter-type')?.value || 'all';
  const statusOk = st => selectedStatus === 'all' ? true
    : selectedStatus === 'active' ? !['Rechazada', 'Vencida'].includes(st)
    : st === selectedStatus;
  const items = [];

  if (selectedType !== 'cabin') {
    (state.savedQuotes || []).forEach(sq => {
      if (!sq.eventDate || !statusOk(sq.status)) return;
      if (selectedClient !== 'all' && sq.clientId !== selectedClient) return;
      const client = (state.clients || []).find(c => c.id === sq.clientId);
      items.push({
        kind: 'event', id: sq.id, date: sq.eventDate, status: sq.status,
        title: sq.eventTitle || 'Evento', client: client?.name || 'Cliente',
        sub: `${sq.guestsPax || 0} Pax · ${sq.eventType || 'Evento'}`,
        venue: sq.eventVenue || '', number: sq.number || '', total: sq.total || (sq.pricing?.total) || 0,
        type: sq.eventType || 'Evento', pax: sq.guestsPax || 0
      });
    });
  }

  if (selectedType !== 'event') {
    (state.cabinQuotes || []).forEach(cq => {
      if (!cq.checkInDate || !cq.checkOutDate || !statusOk(cq.status)) return;
      if (selectedClient !== 'all' && cq.clientId !== selectedClient) return;
      const cabin = (state.cabins || []).find(c => c.id === cq.cabinId);
      const client = (state.clients || []).find(c => c.id === cq.clientId);
      const guests = (Number(cq.adults) || 0) + (Number(cq.kids5to10) || 0) + (Number(cq.kids0to4) || 0);
      const dCur = new Date(cq.checkInDate + 'T00:00:00');
      const dEnd = new Date(cq.checkOutDate + 'T00:00:00');
      let night = 1;
      const nights = Math.max(1, Math.round((dEnd - dCur) / 86400000));
      while (dCur < dEnd && night <= 366) {
        items.push({
          kind: 'cabin', id: cq.id, date: agendaYmd(dCur), status: cq.status,
          title: cabin ? cabin.name : 'Cabaña', client: client?.name || 'Cliente',
          sub: `${guests} huésp. · noche ${night}/${nights}`,
          isCheckIn: night === 1, checkIn: cq.checkInDate, checkOut: cq.checkOutDate,
          number: cq.number || '', total: cq.pricing ? cq.pricing.total : (cq.total || 0),
          type: 'Hospedaje', pax: guests, nights
        });
        dCur.setDate(dCur.getDate() + 1);
        night++;
      }
    });
  }
  // Primero las entradas de hospedaje y los confirmados
  items.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'cabin' ? -1 : 1) || ((b.status === 'Aprobada') - (a.status === 'Aprobada')));
  return items;
}

function agendaChip(it, compact) {
  const confirmed = it.status === 'Aprobada';
  const open = it.kind === 'cabin' ? `openAgendaCabinQuoteDetails('${it.id}')` : `openAgendaEventDetails('${it.id}')`;
  const base = it.kind === 'cabin'
    ? (confirmed ? 'bg-teal-600 text-white border-teal-600' : 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-700')
    : (confirmed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-700');
  const icon = it.kind === 'cabin' ? (it.isCheckIn ? '⤵' : '') : '';
  const tip = `${it.kind === 'cabin' ? 'Hospedaje' : 'Evento'} · ${it.title} · ${it.client} · ${AGENDA_STATUS_LABEL[it.status] || it.status}${it.number ? ' · ' + it.number : ''}`;
  if (compact) {
    return `<button type="button" onclick="event.stopPropagation(); ${open}" title="${tip.replace(/"/g, '&quot;')}" class="w-full text-left px-1.5 py-0.5 rounded-md border text-[10px] leading-tight font-bold truncate ${base} hover:opacity-90 transition cursor-pointer">${icon ? `<span class="mr-0.5">${icon}</span>` : ''}${it.kind === 'cabin' ? '🏡 ' : ''}${it.title}${it.kind === 'cabin' ? ' · ' + it.client.split(' ')[0] : ''}</button>`;
  }
  return `<button type="button" onclick="event.stopPropagation(); ${open}" title="${tip.replace(/"/g, '&quot;')}" class="w-full text-left p-2 rounded-xl border ${base} hover:opacity-95 transition cursor-pointer space-y-0.5">
    <div class="flex items-center justify-between gap-1">
      <span class="text-[9px] font-extrabold uppercase tracking-wide opacity-80">${it.kind === 'cabin' ? (it.isCheckIn ? 'Entrada · Hospedaje' : 'Hospedaje') : it.type}</span>
      <span class="text-[9px] font-bold opacity-80">${AGENDA_STATUS_LABEL[it.status] || it.status || ''}</span>
    </div>
    <div class="text-xs font-extrabold truncate">${it.kind === 'cabin' ? '🏡 ' : ''}${it.title}</div>
    <div class="text-[10px] opacity-80 truncate">${it.client} · ${it.sub}</div>
  </button>`;
}

// Ajusta el alto del calendario al espacio visible (sin scroll de la página en escritorio)
function fitAgendaHeight() {
  const container = document.getElementById('agenda-calendar-container');
  if (!container || container.offsetParent === null) return;
  if (window.innerWidth < 1024) { container.style.height = ''; return; }
  let h = Math.max(440, Math.floor(window.innerHeight - (container.getBoundingClientRect().top + window.scrollY) - 16));
  container.style.height = h + 'px';
  // Descuenta márgenes inferiores del diseño para que la página no tenga scroll
  const over = document.documentElement.scrollHeight - window.innerHeight;
  if (over > 0 && h - over >= 440) { h -= over; container.style.height = h + 'px'; }
}
window.addEventListener('resize', () => { if (document.getElementById('view-agenda') && !document.getElementById('view-agenda').classList.contains('hidden')) { fitAgendaHeight(); renderAgenda(); } });

function renderAgenda() {
  const container = document.getElementById('agenda-calendar-container');
  const titleEl = document.getElementById('agenda-current-title');
  if (!container) return;

  // Filtro de clientes (se rellena siempre para incluir clientes nuevos)
  const clFilter = document.getElementById('agenda-filter-client');
  if (clFilter) {
    const cur = clFilter.value || 'all';
    clFilter.innerHTML = '<option value="all">Todos los clientes</option>' + (state.clients || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    clFilter.value = Array.from(clFilter.options).some(o => o.value === cur) ? cur : 'all';
  }

  const items = buildAgendaItems();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (titleEl) {
    if (agendaViewMode === 'month') {
      titleEl.textContent = `${monthNames[agendaCurrentDate.getMonth()]} ${agendaCurrentDate.getFullYear()}`;
    } else if (agendaViewMode === 'week') {
      const s = new Date(agendaCurrentDate); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      const e = new Date(s); e.setDate(e.getDate() + 6);
      titleEl.textContent = `${s.getDate()} ${monthNames[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${monthNames[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    } else {
      titleEl.textContent = `${agendaCurrentDate.getDate()} de ${monthNames[agendaCurrentDate.getMonth()]} de ${agendaCurrentDate.getFullYear()}`;
    }
  }

  // Resumen del periodo
  const counts = document.getElementById('agenda-period-counts');
  fitAgendaHeight();
  if (agendaViewMode === 'month') renderAgendaMonth(container, items);
  else if (agendaViewMode === 'week') renderAgendaWeek(container, items);
  else renderAgendaDay(container, items);
  if (counts) {
    const range = agendaViewMode === 'month'
      ? items.filter(i => i.date.slice(0, 7) === agendaYmd(agendaCurrentDate).slice(0, 7))
      : agendaViewMode === 'week'
        ? (() => { const s = new Date(agendaCurrentDate); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return agendaYmd(d); }); return items.filter(i => days.includes(i.date)); })()
        : items.filter(i => i.date === agendaYmd(agendaCurrentDate));
    const ev = new Set(range.filter(i => i.kind === 'event').map(i => i.id)).size;
    const cb = new Set(range.filter(i => i.kind === 'cabin').map(i => i.id)).size;
    counts.textContent = `${ev} evento(s) · ${cb} hospedaje(s)`;
  }
}

function renderAgendaMonth(container, items) {
  const year = agendaCurrentDate.getFullYear();
  const month = agendaCurrentDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const totalDays = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((startOffset + totalDays) / 7);
  const todayStr = agendaYmd(new Date());
  const desktop = window.innerWidth >= 1024;
  // Cuántos elementos caben por día según el alto disponible
  const cellH = desktop ? Math.max(70, (container.clientHeight - 60) / weeks) : 96;
  const maxChips = Math.max(1, Math.floor((cellH - 30) / 19));

  const byDate = {};
  items.forEach(i => { (byDate[i.date] = byDate[i.date] || []).push(i); });

  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    const dStr = agendaYmd(d);
    const inMonth = d.getMonth() === month;
    const isToday = dStr === todayStr;
    const list = byDate[dStr] || [];
    const shown = list.slice(0, list.length > maxChips ? maxChips - 1 : maxChips);
    const more = list.length - shown.length;
    cells += `
      <div onclick="selectAgendaDay('${dStr}')" class="min-h-0 overflow-hidden p-1 sm:p-1.5 rounded-xl border flex flex-col gap-0.5 cursor-pointer transition hover:border-indigo-300 ${isToday ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30' : inMonth ? 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60' : 'border-transparent bg-slate-50/60 dark:bg-slate-800/20 opacity-60'}">
        <div class="flex items-center justify-between shrink-0">
          <span class="text-[11px] font-extrabold ${isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center' : inMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}">${d.getDate()}</span>
          ${list.length ? `<span class="text-[9px] font-black text-slate-400">${list.length}</span>` : ''}
        </div>
        <div class="flex flex-col gap-0.5 min-h-0">
          ${shown.map(it => agendaChip(it, true)).join('')}
          ${more > 0 ? `<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">+${more} más</span>` : ''}
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div class="h-full flex flex-col gap-1.5">
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
        ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div>${d}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 min-h-0" style="grid-template-rows: repeat(${weeks}, ${desktop ? 'minmax(0, 1fr)' : 'minmax(96px, auto)'});">
        ${cells}
      </div>
    </div>`;
}

function renderAgendaWeek(container, items) {
  const s = new Date(agendaCurrentDate);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  const todayStr = agendaYmd(new Date());
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(s); d.setDate(d.getDate() + i);
    const dStr = agendaYmd(d);
    const list = items.filter(it => it.date === dStr);
    const isToday = dStr === todayStr;
    cols += `
      <div class="min-h-0 flex flex-col rounded-2xl border ${isToday ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60'} overflow-hidden">
        <button type="button" onclick="selectAgendaDay('${dStr}')" class="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-left cursor-pointer">
          <span><span class="block text-[10px] uppercase font-bold text-slate-400">${names[i]}</span><strong class="text-sm font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}">${d.getDate()}</strong></span>
          <span class="text-[10px] font-bold text-slate-400">${list.length || ''}</span>
        </button>
        <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          ${list.length ? list.map(it => agendaChip(it, false)).join('') : '<div class="text-[11px] text-slate-400 py-6 text-center">Libre</div>'}
        </div>
      </div>`;
  }
  container.innerHTML = `<div class="h-full grid grid-cols-1 md:grid-cols-7 gap-2">${cols}</div>`;
}

function renderAgendaDay(container, items) {
  const dStr = agendaYmd(agendaCurrentDate);
  const list = items.filter(e => e.date === dStr);
  if (!list.length) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
        <h4 class="font-bold text-slate-800 dark:text-white text-sm">No hay eventos ni hospedajes este día</h4>
        <p class="text-xs text-slate-400 max-w-sm">Usa las flechas para cambiar de día o vuelve a la vista de mes.</p>
      </div>`;
    return;
  }
  container.innerHTML = `
    <div class="h-full overflow-y-auto space-y-2.5 pr-1">
      ${list.map(it => {
        const isCabin = it.kind === 'cabin';
        const open = isCabin ? `openAgendaCabinQuoteDetails('${it.id}')` : `openAgendaEventDetails('${it.id}')`;
        return `
          <div class="rounded-2xl border ${isCabin ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20'} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isCabin ? 'bg-teal-600 text-white' : 'bg-indigo-600 text-white'}">${isCabin ? (it.isCheckIn ? 'Entrada · Hospedaje' : 'Hospedaje') : it.type}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${it.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">${AGENDA_STATUS_LABEL[it.status] || it.status || ''}</span>
                ${it.number ? `<span class="text-[11px] font-mono font-bold text-slate-500">${it.number}</span>` : ''}
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">${isCabin ? '🏡 ' : ''}${it.title}</h3>
              <div class="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-0.5">
                <span>👤 ${it.client}</span>
                <span>👥 ${it.pax} ${isCabin ? 'huésped(es)' : 'Pax'}</span>
                ${isCabin ? `<span>📅 ${it.checkIn} → ${it.checkOut} (${it.nights} noche(s))</span>` : (it.venue ? `<span>📍 ${it.venue}</span>` : '')}
              </div>
            </div>
            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
              <strong class="text-base font-black text-slate-900 dark:text-white tabular-nums">${formatCurrency(it.total)}</strong>
              <button type="button" onclick="${open}" class="min-h-[40px] px-3.5 rounded-xl ${isCabin ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs transition cursor-pointer">Ver detalles</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function selectAgendaDay(dateStr) {
  agendaCurrentDate = new Date(dateStr + 'T00:00:00');
  setAgendaViewMode('day');
}

let currentAgendaQuote = null;

function openAgendaEventDetails(quoteId) {
  if (!quoteId) return;
  const cq = (state.cabinQuotes || []).find(q => q.id === quoteId || q.number === quoteId);
  if (cq) {
    openAgendaCabinQuoteDetails(cq.id);
    return;
  }
  if (!quoteId) return;
  let sq = (state.savedQuotes || []).find(q => q.id === quoteId || q.number === quoteId);
  if (!sq && state.activeQuote && (state.activeQuote.id === quoteId || state.activeQuote.number === quoteId)) {
    sq = state.activeQuote;
  }
  if (!sq && (state.savedQuotes || []).length > 0) {
    sq = state.savedQuotes[0];
  }
  if (!sq) {
    showToast('Cotizaci\u00F3n no encontrada');
    return;
  }
  currentAgendaQuote = sq;

  const modal = document.getElementById('modal-agenda-event-details');
  if (!modal) return;

  const client = (state.clients || []).find(c => c.id === sq.clientId) || { name: 'Cliente', doc: '-', phone: '-', email: '-' };
  const eventDateObj = sq.eventDate ? new Date(sq.eventDate + 'T00:00:00') : new Date();
  const today = new Date();
  today.setHours(0,0,0,0);
  const diffDays = Math.round((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let daysText = diffDays === 0 ? '\u00A1Hoy es el evento!' : (diffDays > 0 ? `Faltan ${diffDays} d\u00EDas` : `Finaliz\u00F3 hace ${Math.abs(diffDays)} d\u00EDas`);

  // Status badge styling
  let statusBadgeClass = 'bg-slate-100 text-slate-700';
  if (sq.status === 'Aprobada') statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  else if (sq.status === 'Borrador') statusBadgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
  else if (sq.status === 'Enviada') statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
  else if (sq.status === 'Rechazada') statusBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';

  // Populate fields
  const quoteNumEl = document.getElementById('agenda-det-quote-num');
  if (quoteNumEl) quoteNumEl.textContent = sq.number || 'COT';
  
  const badgeEl = document.getElementById('agenda-det-status-badge');
  if (badgeEl) {
    badgeEl.textContent = sq.status || 'Borrador';
    badgeEl.className = `px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}`;
  }
  
  const titleEl = document.getElementById('agenda-det-title');
  if (titleEl) titleEl.textContent = sq.eventTitle || 'Evento';
  
  const dateEl = document.getElementById('agenda-det-date');
  if (dateEl) dateEl.textContent = formatDateHuman(sq.eventDate);
  
  const daysEl = document.getElementById('agenda-det-days-left');
  if (daysEl) daysEl.textContent = daysText;
  
  const paxEl = document.getElementById('agenda-det-pax');
  if (paxEl) paxEl.textContent = `${sq.guestsPax || 1} Pax`;
  
  const typeEl = document.getElementById('agenda-det-type');
  if (typeEl) typeEl.textContent = sq.eventType || 'Evento';
  
  const venueEl = document.getElementById('agenda-det-venue');
  if (venueEl) venueEl.textContent = sq.eventVenue || 'Locaci\u00F3n por definir';
  
  const totalEl = document.getElementById('agenda-det-total');
  if (totalEl) totalEl.textContent = formatCurrency(sq.total || 0);

  const anticipo = Math.round((Number(sq.total) || 0) * ((Number(sq.depositPct) || 50) / 100));
  const saldo = Math.max(0, (Number(sq.total) || 0) - anticipo);
  const balanceNote = document.getElementById('agenda-det-balance-note');
  if (balanceNote) {
    balanceNote.textContent = `Anticipo: ${formatCurrency(anticipo)} | Saldo: ${formatCurrency(saldo)}`;
  }

  // Client info
  const clientNameEl = document.getElementById('agenda-det-client-name');
  if (clientNameEl) clientNameEl.textContent = client.name || 'Cliente';
  
  const clientDocEl = document.getElementById('agenda-det-client-doc');
  if (clientDocEl) clientDocEl.textContent = `ID/NIT: ${client.doc || 'S/N'}`;
  
  const clientPhoneEl = document.getElementById('agenda-det-client-phone');
  if (clientPhoneEl) clientPhoneEl.textContent = client.phone || 'Sin tel\u00E9fono';
  
  const clientEmailEl = document.getElementById('agenda-det-client-email');
  if (clientEmailEl) clientEmailEl.textContent = client.email || 'Sin correo';

  // Action Buttons inside Modal
  const btnQuote = document.getElementById('agenda-btn-action-quote');
  if (btnQuote) {
    btnQuote.onclick = () => {
      loadSavedQuoteIntoActiveQuoteById(sq.id);
      closeAgendaEventDetailsModal();
      switchView('cotizador');
    };
  }
  const btnShop = document.getElementById('agenda-btn-action-shop');
  if (btnShop) {
    btnShop.onclick = () => {
      closeAgendaEventDetailsModal();
      openShoppingListModal(sq);
    };
  }
  const btnCdc = document.getElementById('agenda-btn-action-cdc');
  if (btnCdc) {
    btnCdc.onclick = () => {
      closeAgendaEventDetailsModal();
      openCuentaCobroModal(sq.fullCopy || sq);
    };
  }
  const btnCloseEv = document.getElementById('agenda-btn-action-close-event');
  if (btnCloseEv) {
    btnCloseEv.onclick = () => {
      closeAgendaEventDetailsModal();
      switchView('rentabilidad');
      loadEventForClosure(sq.id);
    };
  }

  modal.classList.remove('hidden');
}
window.openAgendaEventDetails = openAgendaEventDetails;
function closeAgendaEventDetailsModal() {
  document.getElementById('modal-agenda-event-details')?.classList.add('hidden');
}

// -------------------------------------------------------------
// OPERATOR / SYSTEM MANAGER MANAGEMENT
// -------------------------------------------------------------
function getOperatorName() {
  if (state.auth && state.auth.operatorName && state.auth.operatorName.trim()) {
    return state.auth.operatorName.trim();
  }
  return 'Alexander';
}

function updateOperatorNameDisplay() {
  const name = getOperatorName();
  const greetingEl = document.getElementById('dash-greeting-name');
  if (greetingEl) greetingEl.textContent = name;
  const popoverEl = document.getElementById('popover-operator-name');
  if (popoverEl) popoverEl.textContent = name;
  const headerUser = document.getElementById('header-user-name');
  if (headerUser) headerUser.textContent = name;
  const sidebarUser = document.getElementById('sidebar-user-name');
  if (sidebarUser) sidebarUser.textContent = name;
  const avatarInit = document.getElementById('user-avatar-initial');
  if (avatarInit) avatarInit.textContent = name.charAt(0).toUpperCase();
  const sidebarAvatar = document.getElementById('sidebar-user-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = name.charAt(0).toUpperCase();
  const compInput = document.getElementById('comp-operator-name');
  if (compInput) compInput.value = name;
}

function openEditOperatorModal() {
  const current = getOperatorName();
  const input = document.getElementById('input-modal-operator-name');
  if (input) input.value = current;
  document.getElementById('modal-edit-operator')?.classList.remove('hidden');
  input?.focus();
}

function closeEditOperatorModal() {
  document.getElementById('modal-edit-operator')?.classList.add('hidden');
}

function saveOperatorNameFromModal() {
  const input = document.getElementById('input-modal-operator-name');
  const newName = input ? input.value.trim() : '';
  if (!newName) {
    showToast('Por favor escribe un nombre');
    return;
  }
  state.auth = state.auth || getDefaultState().auth;
  state.auth.operatorName = newName;
  saveState();
  updateOperatorNameDisplay();
  closeEditOperatorModal();
  showToast(`\u2705 Nombre del operador guardado: ${newName}`);
}


    // --- 4. LISTA AUTOMÁTICA DE COMPRAS (MODULE 2) ---
let currentShoppingList = null;

function openShoppingListModal(quoteObj) {
  const q = quoteObj || state.activeQuote;
  if (!q) {
    showToast('No hay cotización seleccionada para generar lista de compras.');
    return;
  }

  const modal = document.getElementById('modal-shopping-list');
  const paxBadge = document.getElementById('shop-modal-pax-badge');
  const subtitle = document.getElementById('shop-modal-event-subtitle');

  if (paxBadge) paxBadge.textContent = `${q.guestsPax} Pax`;
  if (subtitle) subtitle.textContent = `${q.eventTitle} (${q.number}) · Fecha: ${formatDateHuman(q.eventDate)}`;

  // Explode ingredients and products
  const ingredientsMap = {};

  (q.items || []).forEach(it => {
    const qty = Number(it.qty) || 0;
    const baseProd = state.products.find(p => p.id === it.productId);

    if (it.isRecipe && baseProd && baseProd.type === 'compuesto' && Array.isArray(baseProd.ingredients)) {
      // Scale by pax ratio
      const basePax = Math.max(1, Number(baseProd.basePax) || 1);
      const scaleMultiplier = qty / basePax;

      baseProd.ingredients.forEach(ing => {
        const rawProd = state.products.find(p => p.id === ing.productId);
        if (!rawProd) return;
        const key = rawProd.id;
        const requiredInBaseUnits = convertUnits(Number(ing.qty) * scaleMultiplier, ing.unit, rawProd.unit);

        if (!ingredientsMap[key]) {
          ingredientsMap[key] = {
            id: rawProd.id,
            name: rawProd.name,
            unit: rawProd.unit,
            cost: Number(rawProd.cost) || 0,
            stock: Number(rawProd.stock) || 0,
            required: 0
          };
        }
        ingredientsMap[key].required += requiredInBaseUnits;
      });
    } else if (baseProd) {
      // Simple product
      const key = baseProd.id;
      if (!ingredientsMap[key]) {
        ingredientsMap[key] = {
          id: baseProd.id,
          name: baseProd.name,
          unit: baseProd.unit,
          cost: Number(baseProd.cost) || 0,
          stock: Number(baseProd.stock) || 0,
          required: 0
        };
      }
      ingredientsMap[key].required += qty;
    }
  });

  // Calculate missing and to buy
  const items = Object.values(ingredientsMap).map(ing => {
    const missing = Math.max(0, ing.required - ing.stock);
    const toBuy = Math.ceil(missing * 100) / 100;
    const estimatedCost = toBuy * ing.cost;
    return {
      ...ing,
      missing,
      toBuy,
      estimatedCost,
      isPurchased: false
    };
  });

  // Check saved purchased state
  state.shoppingLists = state.shoppingLists || {};
  const savedState = state.shoppingLists[q.id] || {};
  items.forEach(it => {
    if (savedState[it.id] !== undefined) {
      it.isPurchased = savedState[it.id];
    }
  });

  currentShoppingList = {
    quoteId: q.id,
    quoteNumber: q.number,
    eventTitle: q.eventTitle,
    items: items
  };

  renderShoppingList();
  if (modal) modal.classList.remove('hidden');
}

function renderShoppingList() {
  if (!currentShoppingList) return;
  const container = document.getElementById('shop-items-container');
  const progressLabel = document.getElementById('shop-progress-label');
  const progressBar = document.getElementById('shop-progress-bar');
  const totalCostEl = document.getElementById('shop-total-cost');
  if (!container) return;

  const items = currentShoppingList.items;
  const totalItems = items.length;
  const purchasedCount = items.filter(it => it.isPurchased).length;
  const totalEstCost = items.reduce((sum, it) => sum + (it.estimatedCost || 0), 0);

  if (progressLabel) progressLabel.textContent = `${purchasedCount} de ${totalItems} insumos (${Math.round((purchasedCount / (totalItems || 1)) * 100)}%)`;
  if (progressBar) progressBar.style.width = `${Math.round((purchasedCount / (totalItems || 1)) * 100)}%`;
  if (totalCostEl) totalCostEl.textContent = formatCurrency(totalEstCost);

  if (items.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400">Esta cotización no contiene recetas o insumos computables.</div>`;
    return;
  }

  container.innerHTML = items.map((it, idx) => {
    const isReady = it.missing <= 0;
    return `
      <div class="p-3 sm:p-3.5 rounded-2xl border ${it.isPurchased ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : (isReady ? 'border-slate-200 bg-slate-50 dark:bg-slate-800/40' : 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20')} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
        <div class="flex items-start gap-3 min-w-0 flex-1">
          <input type="checkbox" ${it.isPurchased ? 'checked' : ''} onchange="toggleShopItemPurchased(${idx})" class="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer" />
          <div class="min-w-0">
            <span class="font-extrabold text-slate-900 dark:text-white text-xs ${it.isPurchased ? 'line-through text-slate-400' : ''}">${it.name}</span>
            <div class="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span>Requerido: <strong>${it.required.toFixed(1)} ${it.unit}</strong></span>
              <span>·</span>
              <span>Stock actual: <strong class="${it.stock < it.required ? 'text-amber-600' : 'text-emerald-600'}">${it.stock.toFixed(1)} ${it.unit}</strong></span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
          <div class="text-right">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">${isReady ? 'Cubierto con Stock' : 'Faltante a Comprar'}</span>
            <strong class="text-xs font-black ${isReady ? 'text-emerald-600' : 'text-rose-600'} tabular-nums">
              ${isReady ? '✓ En Stock' : `${it.toBuy} ${it.unit}`}
            </strong>
          </div>
          <div class="text-right pl-3 border-l border-slate-200">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Costo Aprox.</span>
            <strong class="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">${formatCurrency(it.estimatedCost)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleShopItemPurchased(idx) {
  if (!currentShoppingList || !currentShoppingList.items[idx]) return;
  const it = currentShoppingList.items[idx];
  it.isPurchased = !it.isPurchased;

  state.shoppingLists = state.shoppingLists || {};
  state.shoppingLists[currentShoppingList.quoteId] = state.shoppingLists[currentShoppingList.quoteId] || {};
  state.shoppingLists[currentShoppingList.quoteId][it.id] = it.isPurchased;
  saveState();

  renderShoppingList();
}

    function downloadShoppingListPDF() {
      if (!currentShoppingList || !currentShoppingList.items) {
        showToast('No hay lista de compras para exportar');
        return;
      }

      const q = currentShoppingList;
      const items = q.items;
      const purchasedCount = items.filter(it => it.isPurchased).length;
      const totalCost = items.reduce((sum, it) => sum + (it.estimatedCost || 0), 0);

      const container = document.createElement('div');
      container.style.padding = '24px';
      container.style.fontFamily = "'Inter', Arial, sans-serif";
      container.style.color = '#0F172A';
      container.style.background = '#FFFFFF';
      container.style.maxWidth = '800px';

      container.innerHTML = `
        <div style="border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 16px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #2563EB; margin: 0;">LISTA DE COMPRAS E INSUMOS — XANDER PRO</h1>
          <p style="font-size: 13px; font-weight: 600; color: #334155; margin: 4px 0 0 0;">${q.eventTitle} (${q.quoteNumber})</p>
          <p style="font-size: 11px; color: #64748B; margin: 2px 0 0 0;">Generado: ${new Date().toLocaleDateString('es-CO')} · Estado: ${purchasedCount}/${items.length} insumos comprados</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 1px solid #CBD5E1; text-align: left;">
              <th style="padding: 8px;">Estado</th>
              <th style="padding: 8px;">Insumo</th>
              <th style="padding: 8px; text-align: center;">Requerido</th>
              <th style="padding: 8px; text-align: center;">En Bodega</th>
              <th style="padding: 8px; text-align: center;">Faltante a Comprar</th>
              <th style="padding: 8px; text-align: right;">Costo Estimado</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px;">${it.isPurchased ? '☑ Comprado' : '☐ Pendiente'}</td>
                <td style="padding: 8px; font-weight: bold;">${it.name}</td>
                <td style="padding: 8px; text-align: center;">${it.required.toFixed(1)} ${it.unit}</td>
                <td style="padding: 8px; text-align: center;">${it.stock.toFixed(1)} ${it.unit}</td>
                <td style="padding: 8px; text-align: center; font-weight: bold; color: ${it.toBuy > 0 ? '#DC2626' : '#16A34A'};">${it.toBuy > 0 ? `${it.toBuy} ${it.unit}` : 'Cubierto'}</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(it.estimatedCost)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #F1F5F9; font-weight: bold;">
              <td colspan="5" style="padding: 10px; text-align: right;">TOTAL ESTIMADO DE COMPRAS:</td>
              <td style="padding: 10px; text-align: right; font-size: 13px; color: #2563EB;">${formatCurrency(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      `;

      document.body.appendChild(container);

      if (typeof html2pdf !== 'undefined') {
        const opt = {
          margin: 10,
          filename: `lista_compras_${q.quoteNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(container).save().then(() => {
          document.body.removeChild(container);
          showToast('✅ PDF de lista de compras generado');
        }).catch(() => {
          document.body.removeChild(container);
          window.print();
        });
      } else {
        document.body.removeChild(container);
        window.print();
      }
    }

function exportShoppingListCSV() {
  if (!currentShoppingList || !currentShoppingList.items.length) {
    showToast('No hay insumos para exportar.');
    return;
  }
  const headers = ['Insumo', 'Unidad', 'Requerido Evento', 'Stock Actual', 'Faltante a Comprar', 'Costo Unitario ($)', 'Costo Total Estimado ($)', 'Comprado'];
  const rows = currentShoppingList.items.map(it => [
    it.name,
    it.unit,
    it.required.toFixed(2),
    it.stock.toFixed(2),
    it.toBuy.toFixed(2),
    Math.round(it.cost),
    Math.round(it.estimatedCost),
    it.isPurchased ? 'SI' : 'NO'
  ]);
  exportToCSV(`lista_compras_${currentShoppingList.quoteNumber}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function printShoppingList() {
  window.print();
}

// --- 5. RENTABILIDAD REAL VS ESTIMADA & CIERRE OPERACIONAL (MODULE 1 & 8) ---
let currentClosureQuote = null;
let currentClosureExtras = [];

function populateClosureQuoteSelect() {
  const sel = document.getElementById('closure-quote-select');
  if (!sel) return;
  const quotes = (state.savedQuotes || []).filter(q => q.status === 'Aprobada' || q.status === 'Enviada' || q.status === 'Borrador');
  sel.innerHTML = quotes.map(q => {
    const isClosed = (state.eventClosures || []).some(cl => cl.quoteId === q.id);
    return `<option value="${q.id}">${isClosed ? '✓ [CERRADO]' : '⏳ [ABIERTO]'} ${q.number} — ${q.eventTitle} (${q.guestsPax} Pax)</option>`;
  }).join('');

  if (quotes.length > 0) {
    loadEventForClosure(quotes[0].id);
  }
}

function loadEventForClosure(quoteId) {
  const q = (state.savedQuotes || []).find(x => x.id === quoteId) || state.activeQuote;
  if (!q) return;
  currentClosureQuote = q;

  // Check if already closed
  const existingClosure = (state.eventClosures || []).find(cl => cl.quoteId === q.id);
  if (existingClosure) {
    currentClosureExtras = JSON.parse(JSON.stringify(existingClosure.extraExpenses || []));
    document.getElementById('clos-input-went-well').value = existingClosure.wentWell || '';
    document.getElementById('clos-input-went-wrong').value = existingClosure.wentWrong || '';
    document.getElementById('clos-input-issues').value = existingClosure.issuesFound || '';
    document.getElementById('clos-input-recommendations').value = existingClosure.recommendations || '';
  } else {
    currentClosureExtras = [];
    document.getElementById('clos-input-went-well').value = '';
    document.getElementById('clos-input-went-wrong').value = '';
    document.getElementById('clos-input-issues').value = '';
    document.getElementById('clos-input-recommendations').value = '';
  }

  updateClosureCalculations();
  renderClosureHistory();
}

function updateClosureCalculations() {
  if (!currentClosureQuote) return;
  const q = currentClosureQuote;

  // 1. Quoted Estimates
  const quotedRevenue = Number(q.total) || 0;
  let estimatedCost = 0;
  (q.items || []).forEach(it => {
    const prod = state.products.find(p => p.id === it.productId);
    if (prod) {
      const uCost = calculateRecipeUnitCost(prod);
      estimatedCost += (uCost * (Number(it.qty) || 0));
    }
  });
  if (estimatedCost === 0) {
    // If no recipe breakdown, assume standard 35% cost
    estimatedCost = Math.round(quotedRevenue * 0.35);
  }
  const estimatedProfit = quotedRevenue - estimatedCost;
  const estimatedMargin = quotedRevenue > 0 ? ((estimatedProfit / quotedRevenue) * 100).toFixed(1) : '0';

  // 2. Real Actuals
  const actualRevenue = quotedRevenue; // Billed revenue
  const extrasTotal = currentClosureExtras.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const actualCost = estimatedCost + extrasTotal;
  const actualProfit = actualRevenue - actualCost;
  const actualMargin = actualRevenue > 0 ? ((actualProfit / actualRevenue) * 100).toFixed(1) : '0';

  // 3. Difference and Status
  const diffVal = actualProfit - estimatedProfit;
  const diffPct = estimatedProfit > 0 ? ((diffVal / estimatedProfit) * 100).toFixed(1) : '0';

  // Elements
  document.getElementById('clos-est-revenue').textContent = formatCurrency(quotedRevenue);
  document.getElementById('clos-est-cost').textContent = formatCurrency(estimatedCost);
  document.getElementById('clos-est-profit').textContent = formatCurrency(estimatedProfit);
  document.getElementById('clos-est-margin').textContent = `${estimatedMargin}%`;

  document.getElementById('clos-real-revenue').textContent = formatCurrency(actualRevenue);
  document.getElementById('clos-real-cost').textContent = formatCurrency(actualCost);
  document.getElementById('clos-real-profit').textContent = formatCurrency(actualProfit);
  document.getElementById('clos-real-margin').textContent = `${actualMargin}%`;

  const diffValEl = document.getElementById('clos-diff-value');
  const diffPctEl = document.getElementById('clos-diff-pct');
  const badgeEl = document.getElementById('clos-perf-badge');

  if (diffValEl) diffValEl.textContent = (diffVal >= 0 ? '+' : '') + formatCurrency(diffVal);
  if (diffPctEl) diffPctEl.textContent = (diffVal >= 0 ? '+' : '') + `${diffPct}%`;

  if (badgeEl) {
    const pctNum = Number(diffPct);
    if (pctNum >= 3) {
      badgeEl.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800';
      badgeEl.textContent = '🟢 Mejor de lo esperado';
    } else if (pctNum >= -5) {
      badgeEl.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800';
      badgeEl.textContent = '🟡 Dentro de lo esperado';
    } else {
      badgeEl.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800';
      badgeEl.textContent = '🔴 Por debajo de lo esperado';
    }
  }

  // Render extra expenses list
  const listEl = document.getElementById('clos-extra-expenses-list');
  if (listEl) {
    if (currentClosureExtras.length === 0) {
      listEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No has registrado gastos imprevistos de operación para este evento.</div>`;
    } else {
      listEl.innerHTML = currentClosureExtras.map((ex, idx) => `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">${ex.category}</span>
              <strong class="text-slate-800 dark:text-white">${ex.desc || 'Gasto'}</strong>
            </div>
            <span class="text-[11px] text-slate-400">${ex.date || ''}</span>
          </div>
          <div class="flex items-center gap-3">
            <strong class="text-rose-600 font-extrabold tabular-nums">${formatCurrency(ex.amount)}</strong>
            <button type="button" onclick="deleteClosureExpense(${idx})" class="text-rose-500 hover:text-rose-700 font-bold p-1">✕</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function openAddExpenseDrawer() {
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('modal-add-closure-expense')?.classList.remove('hidden');
}

function addExpenseToCurrentClosure() {
  const cat = document.getElementById('exp-category').value;
  const desc = document.getElementById('exp-desc').value.trim();
  const amt = Number(document.getElementById('exp-amount').value) || 0;

  if (amt <= 0) {
    showToast('Ingresa un monto válido para el gasto extra.');
    return;
  }

  currentClosureExtras.push({
    id: 'exp-' + Date.now(),
    category: cat,
    desc: desc || cat,
    amount: amt,
    date: new Date().toISOString().slice(0, 10)
  });

  document.getElementById('modal-add-closure-expense')?.classList.add('hidden');
  updateClosureCalculations();
  showToast(`Gasto de ${formatCurrency(amt)} agregado`);
}

function deleteClosureExpense(idx) {
  currentClosureExtras.splice(idx, 1);
  updateClosureCalculations();
}

function saveCurrentEventClosure() {
  if (!currentClosureQuote) return;
  const q = currentClosureQuote;

  const quotedRevenue = Number(q.total) || 0;
  let estimatedCost = 0;
  (q.items || []).forEach(it => {
    const prod = state.products.find(p => p.id === it.productId);
    if (prod) estimatedCost += (calculateRecipeUnitCost(prod) * (Number(it.qty) || 0));
  });
  if (estimatedCost === 0) estimatedCost = Math.round(quotedRevenue * 0.35);

  const extrasTotal = currentClosureExtras.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const actualCost = estimatedCost + extrasTotal;
  const actualRevenue = quotedRevenue;
  const actualProfit = actualRevenue - actualCost;
  const estimatedProfit = quotedRevenue - estimatedCost;
  const diffVal = actualProfit - estimatedProfit;
  const diffPct = estimatedProfit > 0 ? ((diffVal / estimatedProfit) * 100).toFixed(1) : '0';

  let status = 'expected';
  if (Number(diffPct) >= 3) status = 'better';
  else if (Number(diffPct) < -5) status = 'worse';

  const closureRecord = {
    id: 'clos-' + q.id,
    quoteId: q.id,
    quoteNumber: q.number,
    eventTitle: q.eventTitle,
    clientId: q.clientId,
    clientName: (state.clients.find(c => c.id === q.clientId) || {}).name || 'Cliente',
    eventDate: q.eventDate,
    guestsPax: q.guestsPax,
    quotedRevenue,
    estimatedCost,
    estimatedProfit,
    actualRevenue,
    actualCost,
    actualProfit,
    extraExpenses: [...currentClosureExtras],
    profitVarianceValue: diffVal,
    profitVariancePct: Number(diffPct),
    performanceStatus: status,
    wentWell: document.getElementById('clos-input-went-well').value.trim(),
    wentWrong: document.getElementById('clos-input-went-wrong').value.trim(),
    issuesFound: document.getElementById('clos-input-issues').value.trim(),
    recommendations: document.getElementById('clos-input-recommendations').value.trim(),
    closedAt: new Date().toISOString()
  };

  state.eventClosures = state.eventClosures || [];
  state.eventClosures = state.eventClosures.filter(c => c.quoteId !== q.id);
  state.eventClosures.unshift(closureRecord);

  // Also auto-record extra expenses into cash flow (flujo de caja) if desired!
  currentClosureExtras.forEach(ex => {
    const exists = state.finances.some(f => f.closureExpenseId === ex.id);
    if (!exists) {
      state.finances.unshift({
        id: 'fin-' + Date.now() + Math.random(),
        closureExpenseId: ex.id,
        type: 'egreso',
        date: ex.date,
        concept: `${ex.category}: ${ex.desc} (${q.eventTitle})`,
        category: ex.category,
        method: 'Efectivo / Transferencia',
        amount: Math.round(ex.amount)
      });
    }
  });

  saveState();
  renderClosureHistory();
  renderFinancesView();
  populateClosureQuoteSelect();
  showToast('✅ Cierre Operativo y Financiero guardado exitosamente');
}

function renderClosureHistory() {
  const container = document.getElementById('clos-history-container');
  const countBadge = document.getElementById('clos-history-count-badge');
  if (!container) return;

  const closures = state.eventClosures || [];
  if (countBadge) countBadge.textContent = `${closures.length} cerrados`;

  if (closures.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">Aún no hay eventos cerrados en el historial.</div>`;
    return;
  }

  container.innerHTML = closures.map(cl => {
    let badgeColor = 'bg-emerald-100 text-emerald-800';
    let badgeText = '🟢 Mejor de lo esperado';
    if (cl.performanceStatus === 'expected') {
      badgeColor = 'bg-amber-100 text-amber-800';
      badgeText = '🟡 Dentro de lo esperado';
    } else if (cl.performanceStatus === 'worse') {
      badgeColor = 'bg-rose-100 text-rose-800';
      badgeText = '🔴 Por debajo de lo esperado';
    }

    return `
      <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 text-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-indigo-600">${cl.quoteNumber}</span>
              <strong class="text-sm font-black text-slate-900 dark:text-white">${cl.eventTitle}</strong>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${badgeColor}">${badgeText}</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">
              Cliente: <strong>${cl.clientName}</strong> · Fecha: ${formatDateHuman(cl.eventDate)} · ${cl.guestsPax} Pax
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Utilidad Real Liquidada</span>
            <strong class="text-base font-black text-emerald-600 tabular-nums">${formatCurrency(cl.actualProfit)}</strong>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
          <div class="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
            <span class="text-slate-400 block">Venta Total</span>
            <strong class="text-slate-800 dark:text-white font-bold tabular-nums">${formatCurrency(cl.actualRevenue)}</strong>
          </div>
          <div class="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
            <span class="text-slate-400 block">Costo Real</span>
            <strong class="text-rose-600 font-bold tabular-nums">${formatCurrency(cl.actualCost)}</strong>
          </div>
          <div class="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
            <span class="text-slate-400 block">Gastos Extras</span>
            <strong class="text-amber-600 font-bold tabular-nums">${formatCurrency((cl.extraExpenses || []).reduce((s, e) => s + e.amount, 0))}</strong>
          </div>
          <div class="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
            <span class="text-slate-400 block">Variación vs Est.</span>
            <strong class="${cl.profitVarianceValue >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-bold tabular-nums">${(cl.profitVarianceValue >= 0 ? '+' : '') + formatCurrency(cl.profitVarianceValue)}</strong>
          </div>
        </div>

        ${cl.wentWell || cl.recommendations ? `
          <div class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1 text-[11px]">
            ${cl.wentWell ? `<div><strong class="text-emerald-700">✓ Salió bien:</strong> ${cl.wentWell}</div>` : ''}
            ${cl.wentWrong ? `<div><strong class="text-rose-700">⚠️ Desperdicio / Falla:</strong> ${cl.wentWrong}</div>` : ''}
            ${cl.recommendations ? `<div><strong class="text-indigo-700">💡 Recomendación:</strong> ${cl.recommendations}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function exportEventClosuresCSV() {
  const closures = state.eventClosures || [];
  if (closures.length === 0) {
    showToast('No hay cierres de eventos registrados para exportar.');
    return;
  }
  const headers = ['N&deg; Cotización', 'Evento', 'Cliente', 'Fecha', 'Pax', 'Venta ($)', 'Costo Estimado ($)', 'Costo Real ($)', 'Utilidad Real ($)', 'Variación ($)', 'Estado Desempeño', 'Recomendaciones'];
  const rows = closures.map(cl => [
    cl.quoteNumber,
    cl.eventTitle,
    cl.clientName,
    cl.eventDate,
    cl.guestsPax,
    cl.actualRevenue,
    cl.estimatedCost,
    cl.actualCost,
    cl.actualProfit,
    cl.profitVarianceValue,
    cl.performanceStatus,
    cl.recommendations || ''
  ]);
  exportToCSV(`cierres_eventos_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}


    // =========================================================================
// XANDER PRO 2.0 - PART 4: PROYECCIÓN FINANCIERA, HISTORIAL PRECIOS & CLIENTES INTELIGENTES
// =========================================================================

// --- MODULE 6: FLUJO DE CAJA PROYECTADO ---
let projectedCashFlowPeriod = 'monthly'; // 'weekly' | 'monthly' | 'quarterly'

function setProjectedPeriod(period) {
  projectedCashFlowPeriod = period;
  ['weekly', 'monthly', 'quarterly'].forEach(p => {
    const btn = document.getElementById(`btn-proj-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs transition';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition';
      }
    }
  });
  renderProjectedCashFlow();
}

function calculateProjectedCashFlowData() {
  const today = new Date();
  const periods = [];

  if (projectedCashFlowPeriod === 'weekly') {
    // Next 6 weeks
    for (let i = 0; i < 6; i++) {
      const start = new Date(today);
      start.setDate(today.getDate() + (i * 7) - today.getDay() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      periods.push({
        label: `Sem ${i + 1} (${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })})`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        expectedIncome: 0,
        estimatedExpense: 0,
        confirmedEventsCount: 0,
        pendingQuotesCount: 0
      });
    }
  } else if (projectedCashFlowPeriod === 'monthly') {
    // Next 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const endD = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
      periods.push({
        label: d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        startDate: d.toISOString().slice(0, 10),
        endDate: endD.toISOString().slice(0, 10),
        expectedIncome: 0,
        estimatedExpense: 0,
        confirmedEventsCount: 0,
        pendingQuotesCount: 0
      });
    }
  } else {
    // Next 4 quarters
    for (let i = 0; i < 4; i++) {
      const qIndex = Math.floor(today.getMonth() / 3) + i;
      const qYear = today.getFullYear() + Math.floor(qIndex / 4);
      const normQ = (qIndex % 4) + 1;
      const startMonth = (normQ - 1) * 3;
      const startD = new Date(qYear, startMonth, 1);
      const endD = new Date(qYear, startMonth + 3, 0);
      periods.push({
        label: `Q${normQ} ${qYear}`,
        startDate: startD.toISOString().slice(0, 10),
        endDate: endD.toISOString().slice(0, 10),
        expectedIncome: 0,
        estimatedExpense: 0,
        confirmedEventsCount: 0,
        pendingQuotesCount: 0
      });
    }
  }

  // Iterate over quotes to project cash flows
  (state.savedQuotes || []).forEach(q => {
    if (q.status === 'Rechazada' || q.status === 'Cancelada') return;
    const targetDate = q.eventDate || q.validUntil;
    if (!targetDate) return;

    periods.forEach(p => {
      if (targetDate >= p.startDate && targetDate <= p.endDate) {
        const total = Number(q.total) || 0;
        const totalCost = (q.items || []).reduce((sum, item) => sum + (Number(item.costTotal) || (Number(item.costUnit || 0) * Number(item.qty || 1))), 0);

        if (q.status === 'Aprobada') {
          p.expectedIncome += total;
          p.estimatedExpense += totalCost;
          p.confirmedEventsCount++;
        } else {
          // Weighted projection for pending quotes (e.g., 50% probability)
          p.expectedIncome += (total * 0.5);
          p.estimatedExpense += (totalCost * 0.5);
          p.pendingQuotesCount++;
        }
      }
    });
  });

  return periods;
}

let projectedChartInstance = null;

function renderProjectedCashFlow() {
  const data = calculateProjectedCashFlowData();
  const tbody = document.getElementById('projected-flow-tbody');
  const cardsContainer = document.getElementById('projected-flow-cards');
  if (!tbody && !cardsContainer) return;

  const totalProjIncome = data.reduce((a, b) => a + b.expectedIncome, 0);
  const totalProjExpense = data.reduce((a, b) => a + b.estimatedExpense, 0);
  const totalProjBalance = totalProjIncome - totalProjExpense;

  const kpiInc = document.getElementById('kpi-proj-income');
  const kpiExp = document.getElementById('kpi-proj-expense');
  const kpiBal = document.getElementById('kpi-proj-balance');

  if (kpiInc) kpiInc.textContent = formatCurrency(totalProjIncome);
  if (kpiExp) kpiExp.textContent = formatCurrency(totalProjExpense);
  if (kpiBal) {
    kpiBal.textContent = formatCurrency(totalProjBalance);
    kpiBal.className = `text-2xl font-black ${totalProjBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
  }

  // Desktop Table
  if (tbody) {
    tbody.innerHTML = data.map(p => {
      const net = p.expectedIncome - p.estimatedExpense;
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition border-b border-slate-100 dark:border-slate-700">
          <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 capitalize">${p.label}</td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              ${p.confirmedEventsCount} Conf. / ${p.pendingQuotesCount} Cotiz.
            </span>
          </td>
          <td class="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">${formatCurrency(p.expectedIncome)}</td>
          <td class="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">${formatCurrency(p.estimatedExpense)}</td>
          <td class="py-3 px-4 text-right font-black tabular-nums ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}">
            ${formatCurrency(net)}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Mobile Cards
  if (cardsContainer) {
    cardsContainer.innerHTML = data.map(p => {
      const net = p.expectedIncome - p.estimatedExpense;
      return `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-sm text-slate-900 dark:text-white capitalize">${p.label}</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              ${p.confirmedEventsCount} Conf. · ${p.pendingQuotesCount} Cotiz.
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <div>
              <span class="text-[10px] text-slate-400 block">Ingreso Esp.</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(p.expectedIncome)}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Egreso Est.</span>
              <span class="font-bold text-rose-600 dark:text-rose-400">${formatCurrency(p.estimatedExpense)}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block">Saldo Proy.</span>
              <span class="font-black ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}">${formatCurrency(net)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update Chart.js if canvas exists
  const canvas = document.getElementById('projected-flow-chart');
  if (canvas && typeof Chart !== 'undefined') {
    if (projectedChartInstance) {
      projectedChartInstance.destroy();
    }
    projectedChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Ingresos Esperados',
            data: data.map(d => d.expectedIncome),
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Egresos Estimados',
            data: data.map(d => d.estimatedExpense),
            backgroundColor: '#f43f5e',
            borderRadius: 6
          },
          {
            label: 'Saldo Neto Proyectado',
            data: data.map(d => d.expectedIncome - d.estimatedExpense),
            backgroundColor: '#6366f1',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: {
            ticks: {
              callback: function(value) {
                return '$' + (value / 1000).toFixed(0) + 'k';
              },
              font: { size: 10 }
            }
          }
        }
      }
    });
  }
}

// --- MODULE 7: HISTORIAL DE PRECIOS & SUGERENCIAS INTELIGENTES ---
function recordPriceHistory(quote) {
  if (!quote || !quote.items) return;
  state.priceHistory = state.priceHistory || {};

  const client = state.clients.find(c => c.id === quote.clientId);
  const clientName = client ? client.name : 'Cliente';

  quote.items.forEach(item => {
    if (!item.productId) return;
    state.priceHistory[item.productId] = state.priceHistory[item.productId] || [];
    
    // Avoid duplicate entries for same quote
    const existingIdx = state.priceHistory[item.productId].findIndex(h => h.quoteNumber === quote.number);
    const entry = {
      price: Number(item.price) || 0,
      cost: Number(item.costUnit) || 0,
      quoteNumber: quote.number,
      clientName: clientName,
      date: quote.issueDate || new Date().toISOString().slice(0, 10),
      eventTitle: quote.eventTitle || 'Evento'
    };

    if (existingIdx >= 0) {
      state.priceHistory[item.productId][existingIdx] = entry;
    } else {
      state.priceHistory[item.productId].unshift(entry);
    }
  });
  saveState();
}

function getProductPriceHistory(productId) {
  if (!state.priceHistory || !state.priceHistory[productId]) return null;
  const history = state.priceHistory[productId];
  if (history.length === 0) return null;

  const prices = history.map(h => Number(h.price) || 0).filter(p => p > 0);
  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const latest = history[0];

  return {
    latestPrice: latest.price,
    latestClient: latest.clientName,
    latestDate: latest.date,
    avgPrice: avg,
    minPrice: min,
    maxPrice: max,
    historyList: history.slice(0, 5)
  };
}

function showPriceSuggestionsForProduct(productId, priceInputId) {
  const container = document.getElementById('price-suggestion-container');
  if (!container) return;

  const stats = getProductPriceHistory(productId);
  if (!stats) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-2.5 rounded-xl text-xs space-y-1.5 mt-2">
      <div class="flex items-center justify-between">
        <span class="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
          💡 Historial de Precios Sugeridos
        </span>
        <span class="text-[10px] text-indigo-600 dark:text-indigo-400">Último cliente: ${stats.latestClient}</span>
      </div>
      <div class="grid grid-cols-3 gap-1.5 text-center">
        <button type="button" onclick="applySuggestedPrice('${priceInputId}', ${stats.latestPrice})" class="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:border-indigo-500 transition text-left cursor-pointer">
          <div class="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Último Aplicado</div>
          <div class="font-black text-indigo-700 dark:text-indigo-300 text-xs">${formatCurrency(stats.latestPrice)}</div>
        </button>
        <button type="button" onclick="applySuggestedPrice('${priceInputId}', ${stats.avgPrice})" class="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:border-indigo-500 transition text-left cursor-pointer">
          <div class="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Promedio Histórico</div>
          <div class="font-black text-indigo-700 dark:text-indigo-300 text-xs">${formatCurrency(stats.avgPrice)}</div>
        </button>
        <button type="button" onclick="applySuggestedPrice('${priceInputId}', ${stats.maxPrice})" class="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:border-indigo-500 transition text-left cursor-pointer">
          <div class="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Máximo Cobrado</div>
          <div class="font-black text-emerald-700 dark:text-emerald-400 text-xs">${formatCurrency(stats.maxPrice)}</div>
        </button>
      </div>
      <div class="text-[10px] text-slate-500 text-right">Rango histórico: ${formatCurrency(stats.minPrice)} – ${formatCurrency(stats.maxPrice)}</div>
    </div>
  `;
}

function applySuggestedPrice(inputId, price) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = price;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`Precio sugerido de ${formatCurrency(price)} aplicado`);
  }
}

// --- MODULE 9 & 10: ADMINISTRACIÓN DE CLIENTES INTELIGENTE ---
let clientsSortMode = 'frecuente'; // 'frecuente' | 'ventas' | 'actividad' | 'nombre'

function setClientsSortMode(mode) {
  clientsSortMode = mode;
  renderClientsGrid();
}

function getClientIntelligenceMetrics(clientId) {
  const quotes = (state.savedQuotes || []).filter(q => q.clientId === clientId);
  const totalQuotes = quotes.length;

  const approvedQuotes = quotes.filter(q => q.status === 'Aprobada');
  const totalSold = approvedQuotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  // Incomes collected for this client from finances
  const clientObj = state.clients.find(c => c.id === clientId);
  const clientName = clientObj ? (clientObj.name || '').toLowerCase() : '';
  const totalCollected = (state.finances || [])
    .filter(f => f && f.type === 'ingreso' && (f.clientId === clientId || (clientName && (f.concept || '').toLowerCase().includes(clientName))))
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  // Latest quote
  let lastQuoteDate = null;
  let lastQuoteNumber = null;
  if (quotes.length > 0) {
    const sorted = [...quotes].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
    lastQuoteDate = sorted[0].issueDate;
    lastQuoteNumber = sorted[0].number;
  }

  // Latest event
  let lastEventDate = null;
  let lastEventTitle = null;
  const events = quotes.filter(q => q.eventDate);
  if (events.length > 0) {
    const sortedEvents = [...events].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
    lastEventDate = sortedEvents[0].eventDate;
    lastEventTitle = sortedEvents[0].eventTitle;
  }

  return {
    totalQuotes,
    totalSold,
    totalCollected,
    lastQuoteDate,
    lastQuoteNumber,
    lastEventDate,
    lastEventTitle
  };
}

window.renderClientsGrid = renderClientsGrid;
function renderClientsGrid() {
  const grid = document.getElementById('clients-cards-grid');
  if (!grid) return;

  const searchTerm = (document.getElementById('client-search-input')?.value || '').toLowerCase().trim();

  let list = state.clients.map(c => {
    return {
      ...c,
      metrics: getClientIntelligenceMetrics(c.id)
    };
  });

  // Filter
  if (searchTerm) {
    list = list.filter(c => {
      return (c.name || '').toLowerCase().includes(searchTerm) ||
             (c.doc || '').toLowerCase().includes(searchTerm) ||
             (c.email || '').toLowerCase().includes(searchTerm) ||
             (c.phone || '').toLowerCase().includes(searchTerm) ||
             (c.city || '').toLowerCase().includes(searchTerm);
    });
  }

  // Sort
  if (clientsSortMode === 'frecuente') {
    list.sort((a, b) => b.metrics.totalQuotes - a.metrics.totalQuotes);
  } else if (clientsSortMode === 'ventas') {
    list.sort((a, b) => b.metrics.totalSold - a.metrics.totalSold);
  } else if (clientsSortMode === 'actividad') {
    list.sort((a, b) => (b.metrics.lastQuoteDate || '').localeCompare(a.metrics.lastQuoteDate || ''));
  } else if (clientsSortMode === 'nombre') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400">No se encontraron clientes con el criterio de búsqueda.</div>`;
    return;
  }

  grid.innerHTML = list.map(c => {
    const m = c.metrics;
    return `
      <div class="ag-tilt-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600 transition group">
        <div>
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  ${m.totalQuotes > 3 ? 'Cliente Frecuente' : 'Cliente Registrado'}
                </span>
                <span class="text-xs text-slate-400 font-mono">CC/NIT: ${c.doc || 'S/N'}</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white mt-1.5">${c.name}</h3>
            </div>
            <!-- Quick Actions Top -->
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="openEditClientModal('${c.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer" title="Editar Cliente">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button type="button" onclick="duplicateClient('${c.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition cursor-pointer" title="Duplicar Cliente">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
              <button type="button" onclick="deleteClientSafely('${c.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition cursor-pointer" title="Eliminar Cliente">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Contact Details -->
          <div class="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p class="flex items-center gap-2 truncate">
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span>${c.email || 'Sin correo'}</span>
            </p>
            <p class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              <span>${c.phone || 'Sin tel\u00E9fono'}</span>
            </p>
            <p class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>${c.city || 'Ciudad no especificada'}</span>
            </p>
          </div>

          <!-- Intelligence KPIs Grid -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/80 grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl">
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Cotizaciones</span>
              <span class="text-sm font-black text-slate-800 dark:text-slate-200">${m.totalQuotes}</span>
            </div>
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Vendido</span>
              <span class="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate block">${formatCurrency(m.totalSold)}</span>
            </div>
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Cobrado</span>
              <span class="text-xs font-black text-blue-600 dark:text-blue-400 truncate block">${formatCurrency(m.totalCollected)}</span>
            </div>
          </div>

          ${m.lastQuoteDate ? `
            <div class="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>\u00DAltima Cotiz: <strong>${m.lastQuoteNumber}</strong></span>
              <span>${formatDateHuman(m.lastQuoteDate)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Bottom Action Buttons -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <button type="button" onclick="createQuoteForClient('${c.id}')" class="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            <span>Nueva Cotizaci\u00F3n</span>
          </button>
          <button type="button" onclick="openClientHistoryModal('${c.id}')" class="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5" title="Ver Historial de Cotizaciones">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Historial</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Modal Handlers for Client
function openEditClientModal(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const modal = document.getElementById('modal-edit-client');
  if (!modal) return;

  document.getElementById('edit-cl-id').value = client.id;
  document.getElementById('edit-cl-name').value = client.name || '';
  document.getElementById('edit-cl-doc').value = client.doc || '';
  document.getElementById('edit-cl-email').value = client.email || '';
  document.getElementById('edit-cl-phone').value = client.phone || '';
  document.getElementById('edit-cl-city').value = client.city || '';

  modal.classList.remove('hidden');
}

function saveClientFromModal() {
  const clientId = document.getElementById('edit-cl-id')?.value;
  if (!clientId) return;
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const name = document.getElementById('edit-cl-name')?.value.trim();
  const doc = document.getElementById('edit-cl-doc')?.value.trim();
  const email = document.getElementById('edit-cl-email')?.value.trim();
  const phone = document.getElementById('edit-cl-phone')?.value.trim();
  const city = document.getElementById('edit-cl-city')?.value.trim();

  if (!name) {
    showToast('El nombre del cliente es obligatorio');
    return;
  }

  client.name = name;
  client.doc = doc;
  client.email = email;
  client.phone = phone;
  client.city = city;

  saveState();
  document.getElementById('modal-edit-client')?.classList.add('hidden');
  renderClientsGrid();
  populateClientSelect();
  showToast('✅ Cliente actualizado exitosamente');
}

function duplicateClient(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const newClient = {
    ...client,
    id: 'cli_' + Date.now(),
    name: `${client.name} (Copia)`,
    doc: client.doc ? `${client.doc}-1` : ''
  };

  state.clients.push(newClient);
  saveState();
  renderClientsGrid();
  populateClientSelect();
  showToast(`✅ Cliente duplicado como "${newClient.name}"`);
}

function deleteClientSafely(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const associatedQuotes = (state.savedQuotes || []).filter(q => q.clientId === clientId);
  
  if (associatedQuotes.length > 0) {
    const confirmDelete = confirm(
      `⚠️ ATENCIÓN: El cliente "${client.name}" tiene ${associatedQuotes.length} cotización(es) asociadas en el sistema.\n\n` +
      `Si lo eliminas, las cotizaciones existentes conservarán los datos históricos del cliente, pero ya no aparecerá en la lista de clientes activos.\n\n` +
      `¿Deseas proceder con la eliminación?`
    );
    if (!confirmDelete) return;
  } else {
    if (!confirm(`¿Estás seguro de que deseas eliminar al cliente "${client.name}"?`)) return;
  }

  state.clients = state.clients.filter(c => c.id !== clientId);
  saveState();
  renderClientsGrid();
  populateClientSelect();
  showToast(`Cliente "${client.name}" eliminado correctamente`);
}

function openClientHistoryModal(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const modal = document.getElementById('modal-client-history');
  if (!modal) return;

  const title = document.getElementById('modal-cl-hist-title');
  const sub = document.getElementById('modal-cl-hist-subtitle');
  if (title) title.textContent = `Historial: ${client.name}`;
  if (sub) sub.textContent = client.doc ? `Documento: ${client.doc} · Ciudad: ${client.city || 'No registrada'}` : 'Resumen comercial acumulado de este cliente';

  const quotes = (state.savedQuotes || []).filter(q => q.clientId === clientId);
  const container = document.getElementById('modal-cl-hist-list');

  const totalSold = quotes.filter(q => q.status === 'Aprobada').reduce((s, q) => s + (Number(q.total) || 0), 0);
  const lastEvent = quotes.find(q => q.eventDate);

  const kpiCount = document.getElementById('cl-hist-kpi-count');
  const kpiTotal = document.getElementById('cl-hist-kpi-total');
  const kpiLast = document.getElementById('cl-hist-kpi-last');

  if (kpiCount) kpiCount.textContent = quotes.length;
  if (kpiTotal) kpiTotal.textContent = formatCurrency(totalSold);
  if (kpiLast) kpiLast.textContent = lastEvent ? formatDateHuman(lastEvent.eventDate) : 'Ninguno';

  if (container) {
    if (quotes.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-slate-400">
          <p class="font-bold">Sin cotizaciones registradas</p>
          <p class="text-xs mt-1">Este cliente aún no tiene cotizaciones generadas.</p>
        </div>
      `;
    } else {
      container.innerHTML = quotes.map(q => {
        let statusBadge = 'bg-slate-100 text-slate-700';
        if (q.status === 'Aprobada') statusBadge = 'bg-emerald-100 text-emerald-800';
        else if (q.status === 'Borrador') statusBadge = 'bg-indigo-100 text-indigo-800';
        else if (q.status === 'Rechazada') statusBadge = 'bg-rose-100 text-rose-800';

        return `
          <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-black text-indigo-600 dark:text-indigo-400 font-mono text-sm">${q.number}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge}">${q.status}</span>
                <span class="text-xs text-slate-400">${formatDateHuman(q.issueDate)}</span>
              </div>
              <h4 class="font-bold text-slate-900 dark:text-white text-sm mt-1 truncate">${q.eventTitle}</h4>
              <div class="text-xs text-slate-500 mt-0.5">
                ${q.guestsPax} Pax · Fecha Evento: <strong>${formatDateHuman(q.eventDate)}</strong>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-black text-slate-900 dark:text-white tabular-nums">${formatCurrency(q.total || 0)}</div>
              <button type="button" onclick="loadSavedQuoteIntoActiveQuoteById('${q.id}'); document.getElementById('modal-client-history').classList.add('hidden'); switchView('cotizador');" class="mt-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer">
                Cargar ➔
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
}


function closeClientHistoryModal() {
  document.getElementById('modal-client-history')?.classList.add('hidden');
}

function closeEditClientModal() {
  document.getElementById('modal-edit-client')?.classList.add('hidden');
}

function updateClientInfoDisplay() { try { saveState(); } catch (e) {} if (typeof renderQuoteEditorAndPdf === 'function') renderQuoteEditorAndPdf(); }

function createQuoteForClient(clientId) {
  const client = (state.clients || []).find(c => c.id === clientId);
  if (!client) {
    showToast('Cliente no encontrado');
    return;
  }

  // Calculate next sequential quote number
  let maxSeq = 0;
  (state.savedQuotes || []).forEach(sq => {
    const m = (sq.number || '').match(/COT-2026-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  });
  const mActive = (state.activeQuote?.number || '').match(/COT-2026-(\d+)/i);
  if (mActive) {
    const n = parseInt(mActive[1], 10);
    if (n > maxSeq) maxSeq = n;
  }
  const nextNumber = 'COT-2026-' + String(maxSeq + 1).padStart(4, '0');
  const today = new Date().toISOString().split('T')[0];
  const validDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  state.activeQuote = {
    id: 'q-' + Date.now(),
    baseNumber: nextNumber,
    version: 1,
    number: nextNumber,
    eventType: 'Evento',
    status: 'Borrador',
    clientId: client.id,
    eventTitle: `Evento ${client.name}`,
    guestsPax: 50,
    eventDate: today,
    eventVenue: client.city || '',
    issueDate: today,
    validUntil: validDate,
    discountPct: 0,
    taxPct: 0,
    depositPct: 50,
    observations: `Servicio integral para ${client.name}.\nIncluye menaje, montaje y personal de atenci\u00F3n.\nOferta v\u00E1lida por 15 d\u00EDas calendario.`,
    items: [],
    createdAt: today,
    createdBy: getOperatorName(),
    changeReason: `Cotizaci\u00F3n inicial para ${client.name}`
  };

  saveState();
  switchView('cotizador');
  populateClientSelect();
  const select = document.getElementById('q-client-select');
  if (select) select.value = client.id;
  renderQuoteEditorAndPdf();
  setQuoteStepMode('builder');

  showToast(`Nueva cotizaci\u00F3n ${nextNumber} creada para ${client.name}`);
}
window.createQuoteForClient = createQuoteForClient;
function loadSavedQuoteIntoActiveQuoteById(quoteId) {
  const sq = (state.savedQuotes || []).find(q => q.id === quoteId);
  if (sq) {
    loadSavedQuoteIntoActive(sq);
  }
}


    function toggleNotificationsPopover() {
      const p = document.getElementById('notifications-popover');
      if (p) p.classList.toggle('hidden');
    }



    function generateShoppingListFromQuote(quoteIdOrObj) {
      let q = quoteIdOrObj;
      if (!quoteIdOrObj || quoteIdOrObj === 'active') {
        q = state.activeQuote;
      } else if (typeof quoteIdOrObj === 'string') {
        q = (state.savedQuotes || []).find(x => x.id === quoteIdOrObj) || state.activeQuote;
      }
      openShoppingListModal(q);
    }

  
