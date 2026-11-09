/* Xander Pro — 18-eventos-ux: cotizador de eventos.
 * - Barra fija con total, anticipo, margen (solo interno) y acciones: Guardar, Vista previa, Correo, WhatsApp.
 * - Plantillas de cotización (state.quoteTemplates, se sincroniza) y duplicar cotizaciones del historial.
 * - Atajo a los términos y condiciones en Mi Empresa.
 * Aditivo: no cambia datos existentes.
 */
(function () {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'));
  const today = (d = 0) => (typeof xpTodayISO === 'function' ? xpTodayISO(d) : new Date().toISOString().slice(0, 10));

  function refresh() {
    try { saveState(); } catch (e) { /* */ }
    try { if (typeof populateEventTypeSelect === 'function') populateEventTypeSelect(); } catch (e) { /* */ }
    try { renderQuoteEditorAndPdf(); } catch (e) { console.warn(e); }
    try { renderSavedQuotes(); } catch (e) { /* */ }
  }

  // ---------- Barra fija ----------
  window.xpEvSave = function () { $('btn-save-quote')?.click(); };
  window.xpEvPreview = function () { $('btn-step-preview-quote')?.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  window.xpGoEditTerms = function () {
    if (typeof switchView === 'function') switchView('empresa');
    setTimeout(() => { const t = $('comp-terms'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.focus(); } }, 350);
  };

  window.xpEvWhatsApp = function () {
    if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
    const q = state.activeQuote;
    if (!q) return;
    const T = xpQuoteTotals(q);
    const cl = (state.clients || []).find(c => c.id === q.clientId) || {};
    const comp = state.company || {};
    const lines = (q.items || []).filter(it => !it.optional).map(it => `- ${it.name}: ${it.qty} ${it.unit || ''} x ${money(it.price)}`);
    const opts = (q.items || []).filter(it => it.optional).map(it => `- ${it.name}: ${money((Number(it.qty) || 0) * (Number(it.price) || 0))}`);
    const date = q.eventDate && typeof formatDateHuman === 'function' ? formatDateHuman(q.eventDate) : 'por definir';
    const msg = [
      `Hola ${cl.name || ''}! Te comparto la cotización ${q.number} de ${comp.name || ''}.`,
      '',
      `Evento: ${q.eventTitle || q.eventType || ''}`,
      `Fecha: ${date}${q.eventVenue ? ' · ' + q.eventVenue : ''}`,
      `Personas: ${q.guestsPax || 0}`,
      '',
      ...lines,
      ...(opts.length ? ['', 'Opcionales (no incluidos):', ...opts] : []),
      '',
      ...(T.discount > 0 ? [`Descuento: -${money(T.discount)}`] : []),
      `TOTAL: ${money(T.total)}`,
      `Anticipo para reservar (${Number(q.depositPct) || 0}%): ${money(T.deposit)}`,
      q.validUntil && typeof formatDateHuman === 'function' ? `Válida hasta: ${formatDateHuman(q.validUntil)}` : '',
      '',
      'Quedo atenta a tus comentarios.'
    ].filter(l => l !== null && l !== undefined).join('\n');
    const phone = String(cl.phone || '').replace(/\D/g, '');
    const to = phone ? (phone.length === 10 ? '57' + phone : phone) : '';
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ---------- Plantillas ----------
  function templates() { if (!Array.isArray(state.quoteTemplates)) state.quoteTemplates = []; return state.quoteTemplates; }

  function ensureModal() {
    let m = $('modal-xp-templates');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-xp-templates';
    m.className = 'hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'xp-tpl-title');
    m.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 id="xp-tpl-title" class="text-base font-bold text-slate-900 dark:text-white">Plantillas de cotización</h3>
            <p class="text-xs text-slate-500">Guarda paquetes que repites (por ejemplo "Boda 100 pax") y úsalos para empezar una cotización nueva.</p>
          </div>
          <button type="button" data-xp-tpl="close" class="min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 text-lg font-bold" aria-label="Cerrar">✕</button>
        </div>
        <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <label for="xp-tpl-name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Guardar la cotización actual como plantilla</label>
          <div class="flex gap-2">
            <input id="xp-tpl-name" type="text" placeholder="Ej. Boda clásica 100 pax" class="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-xs min-h-[44px]" />
            <button type="button" data-xp-tpl="save" class="min-h-[44px] px-4 rounded-xl xp-cat-btn-primary text-xs font-bold">Guardar</button>
          </div>
          <p class="text-[11px] text-slate-500">Se guardan los ítems, secciones, opcionales, personas, descuentos, anticipo y observaciones. No se guarda el cliente ni las fechas.</p>
        </div>
        <div id="xp-tpl-list" class="space-y-2 max-h-[50vh] overflow-y-auto"></div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if (e.target === m) { m.classList.add('hidden'); return; }
      const b = e.target.closest('[data-xp-tpl]');
      if (!b) return;
      const act = b.getAttribute('data-xp-tpl');
      const id = b.getAttribute('data-id');
      if (act === 'close') m.classList.add('hidden');
      if (act === 'save') saveTemplate();
      if (act === 'use') { useTemplate(id); m.classList.add('hidden'); }
      if (act === 'del') deleteTemplate(id);
    });
    $('xp-tpl-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveTemplate(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.classList.contains('hidden')) m.classList.add('hidden'); });
    return m;
  }

  function renderTemplates() {
    const box = $('xp-tpl-list');
    if (!box) return;
    const list = templates();
    if (!list.length) { box.innerHTML = '<div class="text-center text-xs text-slate-400 py-6">Aún no tienes plantillas.</div>'; return; }
    box.innerHTML = list.map(t => {
      const T = xpQuoteTotals(t);
      return `
      <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <div class="min-w-0">
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate">${esc(t.name)}</div>
          <div class="text-[11px] text-slate-500">${esc(t.eventType || 'Evento')} · ${Number(t.guestsPax) || 0} pax · ${(t.items || []).length} ítems · ${money(T.total)}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" data-xp-tpl="use" data-id="${esc(t.id)}" class="min-h-[40px] px-3 rounded-xl xp-cat-btn-primary text-xs font-bold">Usar</button>
          <button type="button" data-xp-tpl="del" data-id="${esc(t.id)}" class="min-h-[40px] min-w-[40px] rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-bold" aria-label="Eliminar plantilla">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  window.xpOpenQuoteTemplates = function () {
    const m = ensureModal();
    const q = state.activeQuote || {};
    const nameIn = $('xp-tpl-name');
    if (nameIn && !nameIn.value) nameIn.value = `${q.eventType || 'Evento'} ${Number(q.guestsPax) || ''} pax`.trim();
    renderTemplates();
    m.classList.remove('hidden');
  };

  function saveTemplate() {
    if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
    const q = state.activeQuote;
    const name = ($('xp-tpl-name')?.value || '').trim();
    if (!name) { showToast('Escribe un nombre para la plantilla'); return; }
    if (!q || !(q.items || []).length) { showToast('La cotización actual no tiene ítems para guardar'); return; }
    const list = templates();
    const existing = list.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing && !confirm(`Ya existe la plantilla "${existing.name}". ¿Reemplazarla?`)) return;
    const tpl = {
      id: existing ? existing.id : 'tpl-' + Date.now(),
      name,
      eventType: q.eventType || '',
      guestsPax: Number(q.guestsPax) || 0,
      discountPct: Number(q.discountPct) || 0,
      discountAmount: Number(q.discountAmount) || 0,
      taxPct: Number(q.taxPct) || 0,
      depositPct: Number(q.depositPct) || 0,
      observations: q.observations || '',
      items: JSON.parse(JSON.stringify(q.items || [])),
      updatedAt: new Date().toISOString()
    };
    if (existing) Object.assign(existing, tpl); else list.unshift(tpl);
    try { saveState(); } catch (e) { /* */ }
    renderTemplates();
    showToast(`📁 Plantilla "${name}" guardada`);
  }

  function newQuoteFrom(base, extra) {
    const prev = state.activeQuote || {};
    const number = typeof xpNextEventQuoteNumber === 'function' ? xpNextEventQuoteNumber() : (prev.number || 'COT');
    state.activeQuote = Object.assign({
      id: 'q-' + Date.now(),
      number,
      baseNumber: number,
      version: 1,
      status: 'Borrador',
      eventType: base.eventType || prev.eventType || '',
      clientId: '',
      eventTitle: '',
      guestsPax: Number(base.guestsPax) || 0,
      eventDate: '',
      eventVenue: '',
      issueDate: today(0),
      validUntil: today(15),
      discountPct: Number(base.discountPct) || 0,
      discountAmount: Number(base.discountAmount) || 0,
      taxPct: Number(base.taxPct) || 0,
      depositPct: base.depositPct !== undefined ? Number(base.depositPct) || 0 : 50,
      observations: base.observations || '',
      items: (base.items || []).map((it, i) => Object.assign(JSON.parse(JSON.stringify(it)), { rowId: 'item-' + (Date.now() + i) })),
      createdAt: new Date().toISOString()
    }, extra || {});
    refresh();
    if (typeof switchView === 'function') switchView('cotizador');
    try { $('btn-step-edit-quote')?.click(); } catch (e) { /* */ }
  }

  function useTemplate(id) {
    const t = templates().find(x => x.id === id);
    if (!t) return;
    const hasWork = (state.activeQuote?.items || []).length && !(state.savedQuotes || []).some(s => s.id === state.activeQuote.id);
    if (hasWork && !confirm('La cotización que tienes abierta no está guardada. ¿Empezar una nueva con esta plantilla de todas formas?')) return;
    newQuoteFrom(t, { eventTitle: t.name });
    showToast(`Nueva cotización ${state.activeQuote.number} creada desde "${t.name}". Elige el cliente y la fecha.`);
  }

  function deleteTemplate(id) {
    const t = templates().find(x => x.id === id);
    if (!t || !confirm(`¿Eliminar la plantilla "${t.name}"?`)) return;
    state.quoteTemplates = templates().filter(x => x.id !== id);
    try { saveState(); } catch (e) { /* */ }
    renderTemplates();
    showToast('Plantilla eliminada');
  }

  // ---------- Duplicar desde el historial ----------
  window.xpDuplicateSavedQuote = function (id) {
    const sq = (state.savedQuotes || []).find(x => x && x.id === id);
    if (!sq) return;
    const src = sq.fullCopy || sq;
    const hasWork = (state.activeQuote?.items || []).length && !(state.savedQuotes || []).some(s => s.id === state.activeQuote.id);
    if (hasWork && !confirm('La cotización que tienes abierta no está guardada. ¿Abrir la copia de todas formas?')) return;
    newQuoteFrom(src, {
      eventType: src.eventType || '',
      eventTitle: (src.eventTitle || '') + ' (copia)',
      eventVenue: src.eventVenue || '',
      clientId: src.clientId || ''
    });
    showToast((src.items || []).length
      ? `📋 Copia creada como ${state.activeQuote.number}. Cambia el cliente y la fecha si es otro evento.`
      : `📋 Copia creada como ${state.activeQuote.number}, pero la cotización original no tenía ítems guardados.`);
  };
})();
