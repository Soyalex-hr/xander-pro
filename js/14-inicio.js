/* Xander Pro — 14-inicio: pantalla de Inicio (estilo A)
 *
 * Reúne las tres líneas de negocio (eventos, cabañas, día de sol) en:
 * 4 indicadores del periodo, una tarjeta por negocio, "Para hacer hoy",
 * "Próximos 7 días" y "Últimas cotizaciones". Solo lee datos; no los cambia.
 * Los bloques anteriores del dashboard siguen en la página (ocultos) para que
 * sus funciones no fallen.
 */
(function () {
  let period = 'month';
  try { period = localStorage.getItem('xp_home_period') || 'month'; } catch { /* */ }

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const dayDiff = (a, b) => Math.round((a - b) / 86400000);
  const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  const WD = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const shortDate = d => d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '';
  const ico = (path, cls = 'w-4 h-4') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const I = {
    event: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    cabin: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>'
  };
  const KIND = {
    evento: { label: 'Evento', icon: I.event, view: 'cotizador', name: 'Eventos y catering' },
    cabana: { label: 'Cabaña', icon: I.cabin, view: 'cotizador-cabanas', name: 'Cabañas' },
    diasol: { label: 'Día de sol', icon: I.sun, view: 'dia-sol', name: 'Día de sol' }
  };
  const STATUS = {
    Aprobada: 'color:#0E6B53;background:#E7F2EE',
    Enviada: 'color:#92400E;background:#FEF3C7',
    Borrador: 'color:#334155;background:#F1F5F9',
    Rechazada: 'color:#9F1239;background:#FFE4E6',
    Vencida: 'color:#475569;background:#E2E8F0'
  };
  const badge = s => `<span class="xp-badge" style="${STATUS[s] || STATUS.Borrador}">${esc(s || 'Borrador')}</span>`;

  function clientName(id) { return ((state.clients || []).find(c => c.id === id) || {}).name || 'Cliente'; }

  function allQuotes() {
    const out = [];
    (state.savedQuotes || []).forEach(q => {
      const fc = q.fullCopy || {};
      out.push({ kind: 'evento', id: q.id, number: q.number, client: clientName(q.clientId), title: q.eventTitle || fc.eventTitle || '', date: parse(q.eventDate), issued: parse(fc.issueDate || fc.createdAt || q.eventDate), valid: parse(q.validUntil), total: Number(q.total) || 0, status: q.status || 'Borrador', people: Number(q.guestsPax) || 0 });
    });
    (state.cabinQuotes || []).forEach(q => {
      const cab = (state.cabins || []).find(c => c.id === q.cabinId) || {};
      const nights = q.pricing?.nights || Math.max(0, dayDiff(parse(q.checkOutDate) || 0, parse(q.checkInDate) || 0));
      out.push({ kind: 'cabana', id: q.id, number: q.number, client: clientName(q.clientId), title: cab.name || 'Cabaña', date: parse(q.checkInDate), issued: parse(q.createdAt || q.checkInDate), valid: parse(q.expirationDate), total: Number(q.pricing?.total) || 0, status: q.status || 'Borrador', people: Number(q.pricing?.totalGuests) || ((Number(q.adults) || 0) + (Number(q.kids5to10) || 0) + (Number(q.kids0to4) || 0)), nights });
    });
    (state.dayPassQuotes || []).forEach(q => {
      out.push({ kind: 'diasol', id: q.id, number: q.number, client: clientName(q.clientId), title: 'Día de sol', date: parse(q.date), issued: parse(q.createdAt || q.date), valid: parse(q.expirationDate), total: Number(q.pricing?.total) || 0, status: q.status || 'Borrador', people: Number(q.pricing?.people) || 0 });
    });
    return out;
  }

  function range(p, offset = 0) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    if (p === 'week') { const end = new Date(t); end.setDate(end.getDate() + 1 - 7 * offset); const start = new Date(end); start.setDate(start.getDate() - 7); return [start, end]; }
    if (p === 'year') { const y = t.getFullYear() - offset; return [new Date(y, 0, 1), new Date(y + 1, 0, 1)]; }
    const m = new Date(t.getFullYear(), t.getMonth() - offset, 1);
    return [m, new Date(m.getFullYear(), m.getMonth() + 1, 1)];
  }
  const inRange = (d, [a, b]) => d && d >= a && d < b;
  const periodLabel = () => period === 'week' ? 'en los últimos 7 días' : period === 'year' ? `en ${new Date().getFullYear()}` : `en ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][new Date().getMonth()]}`;
  const prevLabel = () => period === 'week' ? 'la semana anterior' : period === 'year' ? 'el año anterior' : 'el mes anterior';

  function openQuote(kind, id) {
    if (kind === 'evento' && typeof loadSavedQuoteIntoActiveQuoteById === 'function') { loadSavedQuoteIntoActiveQuoteById(id); switchView('cotizador'); return; }
    if (kind === 'cabana' && typeof openCabinQuoteFromHistory === 'function') { switchView('cotizador-cabanas'); openCabinQuoteFromHistory(id, 'edit'); return; }
    if (kind === 'diasol' && typeof openDayPassFromHistory === 'function') { switchView('dia-sol'); openDayPassFromHistory(id, 'edit'); return; }
    switchView(KIND[kind]?.view || 'dashboard');
  }
  window.xpOpenQuote = openQuote;

  function newQuote(kind) {
    toggleNewMenu(false);
    if (kind === 'cabana') { switchView('cotizador-cabanas'); if (typeof startNewCabinQuote === 'function') startNewCabinQuote(); return; }
    if (kind === 'diasol') { switchView('dia-sol'); if (typeof startNewDayPassQuote === 'function') startNewDayPassQuote(); return; }
    switchView('cotizador');
  }
  window.xpNewQuote = newQuote;
  function toggleNewMenu(force) {
    const m = document.getElementById('xp-new-menu');
    if (!m) return;
    const open = force === undefined ? m.classList.contains('hidden') : force;
    m.classList.toggle('hidden', !open);
    document.getElementById('xp-new-btn')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  window.xpToggleNewMenu = toggleNewMenu;
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('#xp-new-wrap')) toggleNewMenu(false); });

  window.xpSetHomePeriod = p => { period = p; try { localStorage.setItem('xp_home_period', p); } catch { /* */ } renderXpHome(); };

  function renderXpHome() {
    const box = document.getElementById('xp-home');
    if (!box || typeof state === 'undefined') return;
    const q = allQuotes();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cur = range(period), prev = range(period, 1);
    const inCur = q.filter(x => inRange(x.issued, cur));
    const inPrev = q.filter(x => inRange(x.issued, prev));
    const sum = a => a.reduce((s, x) => s + x.total, 0);
    const quoted = sum(inCur), quotedPrev = sum(inPrev);
    const approved = inCur.filter(x => x.status === 'Aprobada');
    const decided = inCur.filter(x => x.status !== 'Borrador');
    const rate = decided.length ? Math.round(approved.length * 100 / decided.length) : 0;
    const open = q.filter(x => ['Borrador', 'Enviada'].includes(x.status));
    const expiring = open.filter(x => x.valid && dayDiff(x.valid, today) >= 0 && dayDiff(x.valid, today) <= 7).sort((a, b) => a.valid - b.valid);
    let trend = '';
    if (quotedPrev > 0) {
      const pct = Math.round((quoted - quotedPrev) * 100 / quotedPrev);
      trend = `<span class="xp-kpi-foot" style="color:${pct >= 0 ? '#0E6B53' : '#B91C1C'};font-weight:600">${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)} % frente a ${prevLabel()}</span>`;
    } else trend = `<span class="xp-kpi-foot">${inCur.length} cotizacion(es) ${periodLabel()}</span>`;

    const hour = new Date().getHours();
    const greet = hour >= 18 || hour < 5 ? 'Buenas noches' : hour >= 12 ? 'Buenas tardes' : 'Buenos días';
    const name = typeof getOperatorName === 'function' ? getOperatorName() : '';
    const dateStr = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Por negocio
    const bizCards = Object.keys(KIND).map(k => {
      const list = inCur.filter(x => x.kind === k);
      const n = s => list.filter(x => x.status === s).length;
      const a = n('Aprobada'), e = n('Enviada'), d = n('Borrador'), o = list.length - a - e - d;
      const extra = k === 'cabana' ? ` · ${list.filter(x => x.status === 'Aprobada').reduce((s, x) => s + (x.nights || 0), 0)} noches aprobadas` : k === 'diasol' ? ` · ${list.reduce((s, x) => s + x.people, 0)} personas` : '';
      return `
        <button type="button" class="xp-card xp-biz" onclick="switchView('${KIND[k].view}')">
          <span class="xp-biz-head"><span class="xp-tile">${ico(KIND[k].icon)}</span><strong>${KIND[k].name}</strong></span>
          <span class="xp-biz-row"><span class="xp-biz-total">${money(sum(list))}</span><span class="xp-muted">${list.length} cotizacion(es)${extra}</span></span>
          <span class="xp-bar">${list.length ? `<i style="flex:${a};background:#0E6B53"></i><i style="flex:${e};background:#94A3B8"></i><i style="flex:${d + o};background:#E2E8F0"></i>` : '<i style="flex:1;background:#E2E8F0"></i>'}</span>
          <span class="xp-legend"><span><i style="background:#0E6B53"></i>${a} aprobada(s)</span><span><i style="background:#94A3B8"></i>${e} enviada(s)</span><span><i style="background:#CBD5E1"></i>${d + o} otra(s)</span></span>
        </button>`;
    }).join('');

    // Para hacer hoy
    const todo = [];
    expiring.forEach(x => {
      const dd = dayDiff(x.valid, today);
      todo.push({ dot: dd <= 1 ? '#C2410C' : '#B45309', title: `${x.number} ${dd === 0 ? 'vence hoy' : dd === 1 ? 'vence mañana' : `vence en ${dd} días`}`, sub: `${x.client} · ${money(x.total)}`, action: 'Hacer seguimiento', go: `xpOpenQuote('${x.kind}','${x.id}')` });
    });
    const closures = state.eventClosures || [];
    (state.savedQuotes || []).filter(s => s.status === 'Aprobada' && parse(s.eventDate) && parse(s.eventDate) < today && !closures.some(c => c.quoteId === s.id || c.quoteNumber === s.number)).slice(0, 3).forEach(s => {
      todo.push({ dot: '#94A3B8', title: `Liquidar ${s.eventTitle || s.number}`, sub: `Evento del ${shortDate(parse(s.eventDate))} · registrar costos reales`, action: 'Liquidar', go: `switchView('rentabilidad')` });
    });
    q.filter(x => x.status === 'Borrador' && x.issued && dayDiff(today, x.issued) >= 3).slice(0, 3).forEach(x => {
      todo.push({ dot: '#94A3B8', title: `${x.number} sigue en borrador`, sub: `${x.client} · creada hace ${dayDiff(today, x.issued)} días`, action: 'Terminar', go: `xpOpenQuote('${x.kind}','${x.id}')` });
    });
    const todoHtml = todo.length ? todo.slice(0, 6).map(t => `
      <div class="xp-row">
        <span class="xp-dot" style="background:${t.dot}"></span>
        <span class="xp-row-main"><strong>${esc(t.title)}</strong><span>${esc(t.sub)}</span></span>
        <button type="button" class="xp-link" onclick="${t.go}">${t.action}</button>
      </div>`).join('') : `<div class="xp-empty">${ico(I.check, 'w-5 h-5')}<span>Todo al día. No hay cotizaciones por vencer ni eventos por liquidar.</span></div>`;

    // Próximos 7 días
    const soon = q.filter(x => x.date && ['Aprobada', 'Enviada'].includes(x.status) && dayDiff(x.date, today) >= 0 && dayDiff(x.date, today) <= 7).sort((a, b) => a.date - b.date);
    const soonHtml = soon.length ? soon.slice(0, 6).map(x => `
      <button type="button" class="xp-row xp-row-btn" onclick="xpOpenQuote('${x.kind}','${x.id}')">
        <span class="xp-date"><span>${WD[x.date.getDay()]}</span><strong>${x.date.getDate()}</strong></span>
        <span class="xp-row-main"><strong>${x.kind === 'cabana' ? 'Llegada · ' : x.kind === 'diasol' ? 'Día de sol · ' : ''}${esc(x.kind === 'evento' ? (x.title || x.client) : x.kind === 'cabana' ? x.title : x.client)}</strong><span>${x.kind === 'cabana' ? `${x.nights || 0} noche(s) · ` : ''}${x.people} persona(s) · ${esc(x.client)}</span></span>
        ${badge(x.status)}
      </button>`).join('') : `<div class="xp-empty"><span>No hay eventos, llegadas ni días de sol en los próximos 7 días.</span></div>`;

    // Últimas cotizaciones
    const recent = q.slice().sort((a, b) => (b.issued || 0) - (a.issued || 0) || String(b.number).localeCompare(String(a.number))).slice(0, 8);
    const rows = recent.length ? recent.map(x => `
      <tr onclick="xpOpenQuote('${x.kind}','${x.id}')" tabindex="0" onkeydown="if(event.key==='Enter')xpOpenQuote('${x.kind}','${x.id}')">
        <td class="xp-strong">${esc(x.number)}</td>
        <td>${esc(x.client)}</td>
        <td class="xp-muted"><span class="xp-kind">${ico(KIND[x.kind].icon, 'w-3.5 h-3.5')}${KIND[x.kind].label}</span></td>
        <td class="xp-muted">${x.date ? shortDate(x.date) : '—'}</td>
        <td class="xp-num">${money(x.total)}</td>
        <td>${badge(x.status)}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="xp-empty-cell">Aún no hay cotizaciones. Crea la primera con «Nueva cotización».</td></tr>`;

    box.innerHTML = `
      <div class="xp-home-head">
        <div>
          <p class="xp-muted" style="margin:0 0 4px">${esc(dateStr.charAt(0).toUpperCase() + dateStr.slice(1))}</p>
          <h1 class="xp-h1">${greet}, ${esc(name)} <button type="button" class="xp-icon-btn" onclick="openEditOperatorModal && openEditOperatorModal()" aria-label="Cambiar el nombre del saludo" title="Cambiar nombre">${ico(I.pencil, 'w-3.5 h-3.5')}</button></h1>
        </div>
        <div class="xp-home-actions">
          <div class="xp-seg" role="group" aria-label="Periodo">
            <button type="button" class="${period === 'week' ? 'on' : ''}" onclick="xpSetHomePeriod('week')">Semana</button>
            <button type="button" class="${period === 'month' ? 'on' : ''}" onclick="xpSetHomePeriod('month')">Este mes</button>
            <button type="button" class="${period === 'year' ? 'on' : ''}" onclick="xpSetHomePeriod('year')">Año</button>
          </div>
          <div id="xp-new-wrap" class="xp-new-wrap">
            <button type="button" id="xp-new-btn" class="xp-btn-primary" onclick="xpToggleNewMenu()" aria-haspopup="true" aria-expanded="false">${ico(I.plus)}Nueva cotización${ico(I.chev, 'w-3.5 h-3.5')}</button>
            <div id="xp-new-menu" class="xp-menu hidden" role="menu">
              <button type="button" role="menuitem" onclick="xpNewQuote('evento')">${ico(I.event)}<span><strong>Evento</strong><small>Bodas, corporativos, catering</small></span></button>
              <button type="button" role="menuitem" onclick="xpNewQuote('cabana')">${ico(I.cabin)}<span><strong>Cabaña</strong><small>Hospedaje por noches</small></span></button>
              <button type="button" role="menuitem" onclick="xpNewQuote('diasol')">${ico(I.sun)}<span><strong>Día de sol</strong><small>Entrada por persona y adicionales</small></span></button>
            </div>
          </div>
        </div>
      </div>

      <section class="xp-grid-4" aria-label="Indicadores">
        <div class="xp-card xp-kpi"><span class="xp-kpi-label">Cotizado ${periodLabel()}</span><strong class="xp-kpi-value">${money(quoted)}</strong>${trend}</div>
        <div class="xp-card xp-kpi"><span class="xp-kpi-label">Aprobado</span><strong class="xp-kpi-value">${money(sum(approved))}</strong><span class="xp-kpi-foot">${approved.length} de ${inCur.length} cotizacion(es)</span></div>
        <div class="xp-card xp-kpi"><span class="xp-kpi-label">Tasa de cierre</span><strong class="xp-kpi-value">${rate} %</strong><span class="xp-bar" style="height:6px"><i style="flex:${rate};background:#0E6B53"></i><i style="flex:${100 - rate};background:#E2E8F0"></i></span></div>
        <div class="xp-card xp-kpi"><span class="xp-kpi-label">Vencen en 7 días</span><strong class="xp-kpi-value" style="color:${expiring.length ? '#B45309' : 'inherit'}">${expiring.length}</strong><span class="xp-kpi-foot">${money(sum(expiring))} por confirmar</span></div>
      </section>

      <section class="xp-section" aria-labelledby="xp-biz-t">
        <h2 id="xp-biz-t" class="xp-h2">Por línea de negocio</h2>
        <div class="xp-grid-3">${bizCards}</div>
      </section>

      <div class="xp-grid-2">
        <section class="xp-card xp-list" aria-labelledby="xp-todo-t">
          <div class="xp-list-head"><h2 id="xp-todo-t" class="xp-h2">Para hacer hoy</h2><span class="xp-muted">${todo.length} pendiente(s)</span></div>
          ${todoHtml}
        </section>
        <section class="xp-card xp-list" aria-labelledby="xp-soon-t">
          <div class="xp-list-head"><h2 id="xp-soon-t" class="xp-h2">Próximos 7 días</h2><button type="button" class="xp-link" onclick="switchView('agenda')">Ver agenda</button></div>
          ${soonHtml}
        </section>
      </div>

      <section class="xp-card xp-table-card" aria-labelledby="xp-recent-t">
        <div class="xp-list-head" style="padding:16px 20px 12px"><h2 id="xp-recent-t" class="xp-h2">Últimas cotizaciones</h2><button type="button" class="xp-link" onclick="switchView('historial')">Ver historial de eventos</button></div>
        <div class="xp-table-scroll">
          <table class="xp-table">
            <thead><tr><th>Número</th><th>Cliente</th><th>Tipo</th><th>Fecha</th><th class="xp-num">Total</th><th>Estado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }
  window.renderXpHome = renderXpHome;

  // Se dibuja cada vez que el dashboard se actualiza
  const prev = window.renderDashboard;
  if (typeof prev === 'function') {
    window.renderDashboard = function (...args) {
      let r;
      try { r = prev.apply(this, args); } catch (e) { console.warn('Dashboard anterior:', e); }
      try { renderXpHome(); } catch (e) { console.error('Inicio:', e); }
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { renderXpHome(); } catch { /* */ } }, 0));
})();
