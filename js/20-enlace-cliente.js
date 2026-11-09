/* Xander Pro — 20-enlace-cliente: link para que el cliente vea y acepte la cotización
 *
 * - "Link para el cliente" guarda una copia fija del documento (igual al PDF) en el servidor
 *   y entrega un link corto (/c/xxxx). El cliente lo abre en el celular, puede imprimirlo
 *   y tocar "Aceptar cotización".
 * - La app revisa cada pocos minutos los links de la empresa: cuántas veces se abrió cada uno
 *   y si el cliente aceptó. Al aceptar, la cotización pasa sola a "Aprobada" y llega un aviso.
 * - Requiere la nube (usuario de la empresa). En modo local se avisa que no está disponible.
 */
(function () {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0));
  const LS = 'xp_share_cache';
  const COLL = { evento: 'savedQuotes', cabana: 'cabinQuotes', diasol: 'dayPassQuotes', combinada: 'comboQuotes' };
  const cloudOn = () => !!(window.XPCloud && window.XPCloud.cloud && window.XPCloud.cloud.active());
  const canWrite = () => !!(window.XPCloud && window.XPCloud.cloud && window.XPCloud.cloud.canWrite());
  const toast = m => { if (typeof showToast === 'function') showToast(m); };

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch { cache = {}; }
  const urlOf = token => location.origin + '/c/' + token;
  window.xpShareIndex = () => cache;

  async function api(method, url, body) {
    if (window.XPCloud && typeof window.XPCloud.api === 'function') return window.XPCloud.api(method, url, body, 45000);
    const r = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }

  // ---------------------------------------------------------------------------
  // Copia fija del documento: HTML de la hoja + solo los estilos que usa
  // ---------------------------------------------------------------------------
  function selectorUsed(sel, root) {
    const parts = sel.split(',');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (/\.dark\b/.test(part)) continue;
      if (part === '*' || /^(\*|::?before|::?after|::backdrop|:root|html|body|:host)\b/.test(part) && !/[.#\[]/.test(part.replace(/^[^ ]+/, ''))) return true;
      let test = part;
      for (let i = 0; i < 2; i++) {
        try { if (root.matches(test) || root.querySelector(test)) return true; break; }
        catch { test = test.replace(/::?[a-zA-Z-]+(\((?:[^()]|\([^()]*\))*\))?/g, '').trim(); if (!test) return false; }
      }
    }
    return false;
  }
  function collectRules(rules, root) {
    let out = '';
    for (const r of rules) {
      try {
        if (r.type === 1) { if (selectorUsed(r.selectorText || '', root)) out += r.cssText + '\n'; }
        else if (r.type === 4) { const inner = collectRules(r.cssRules, root); if (inner) out += `@media ${r.conditionText || r.media.mediaText}{${inner}}\n`; }
        else if (r.type === 12) { const inner = collectRules(r.cssRules, root); if (inner) out += `@supports ${r.conditionText}{${inner}}\n`; }
        else if (r.cssRules && r.constructor && r.constructor.name === 'CSSLayerBlockRule') { const inner = collectRules(r.cssRules, root); if (inner) out += `@layer ${r.name}{${inner}}\n`; }
        else if (r.type === 5 || r.type === 7 || (r.constructor && /CSSPropertyRule|CSSLayerStatementRule/.test(r.constructor.name))) out += r.cssText + '\n';
      } catch { /* regla no legible */ }
    }
    return out;
  }
  function collectCss(root) {
    let css = '';
    for (const sh of Array.from(document.styleSheets)) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      if (!rules) continue;
      css += collectRules(rules, root);
    }
    return css;
  }
  function snapshotHtml(sheet) {
    const clone = sheet.cloneNode(true);
    clone.querySelectorAll('.no-print, [data-html2canvas-ignore], button, input, select, textarea').forEach(el => {
      if (el.matches('input, select, textarea')) { const sp = document.createElement('span'); sp.textContent = el.value || ''; el.replaceWith(sp); }
      else el.remove();
    });
    clone.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || '';
      const m = /\/api\/media\?url=([^&]+)/.exec(src);
      if (m) { try { src = decodeURIComponent(m[1]); } catch { /* */ } }
      if (/^blob:/.test(src)) { img.remove(); return; }
      if (src && !/^(https?:|data:)/.test(src)) { try { src = new URL(src, location.href).href; } catch { /* */ } }
      img.setAttribute('src', src);
      img.removeAttribute('srcset');
    });
    clone.querySelectorAll('[style*="/api/media?url="]').forEach(el => {
      el.setAttribute('style', el.getAttribute('style').replace(/\/api\/media\?url=([^'")&\s]+)/g, (m, u) => { try { return decodeURIComponent(u); } catch { return m; } }));
    });
    clone.classList.remove('hidden');
    clone.style.display = '';
    return clone.outerHTML;
  }

  // Prepara la hoja de cada tipo y devuelve los datos de la cotización guardada
  function prepare(kind) {
    if (kind === 'evento') {
      const q = state.activeQuote;
      if (!q) return { error: 'No hay una cotización abierta' };
      if (typeof syncQuoteFormInputsToState === 'function') syncQuoteFormInputsToState();
      let saved = (state.savedQuotes || []).find(s => s.id === q.id);
      if (!saved) {
        document.getElementById('btn-save-quote')?.click();
        saved = (state.savedQuotes || []).find(s => s.id === q.id || s.number === q.number);
        if (!saved) return { error: 'Guarda la cotización antes de compartirla' };
      }
      if (typeof renderQuoteEditorAndPdf === 'function') renderQuoteEditorAndPdf();
      const T = xpQuoteTotals(q);
      const cl = (state.clients || []).find(c => c.id === q.clientId) || {};
      return { sheet: document.getElementById('pdf-document-sheet'), id: saved.id, number: saved.number, total: T.total, client: cl, width: 896,
        meta: { validUntil: q.validUntil, deposit: T.deposit, depositPct: Number(q.depositPct) || 0, title: q.eventTitle || '' } };
    }
    if (kind === 'cabana') {
      const q = state.activeCabinQuote;
      if (!q) return { error: 'No hay una cotización abierta' };
      if (typeof saveCurrentCabinQuote === 'function' && !(state.cabinQuotes || []).some(x => x.id === q.id)) saveCurrentCabinQuote();
      const saved = (state.cabinQuotes || []).find(x => x.id === q.id);
      if (!saved) return { error: 'Guarda la cotización antes de compartirla' };
      if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
      const p = q.pricing || {};
      const cl = (state.clients || []).find(c => c.id === q.clientId) || {};
      return { sheet: document.getElementById('pdf-cabin-document-sheet'), id: q.id, number: q.number, total: p.total, client: cl, width: 860,
        meta: { validUntil: q.expirationDate, deposit: p.requiresDeposit === false ? 0 : p.deposit, depositPct: p.requiresDeposit === false ? 0 : p.depositPct, title: 'Hospedaje' } };
    }
    if (kind === 'diasol') {
      const q = state.activeDayPass;
      if (!q) return { error: 'No hay una cotización abierta' };
      if (typeof recalcDayPass === 'function') recalcDayPass();
      if (!(state.dayPassQuotes || []).some(x => x.id === q.id) && typeof saveDayPassQuote === 'function') saveDayPassQuote();
      if (!(state.dayPassQuotes || []).some(x => x.id === q.id)) return { error: 'Guarda la cotización antes de compartirla' };
      if (typeof renderDayPassPdf === 'function') renderDayPassPdf();
      const p = q.pricing || {};
      const cl = (state.clients || []).find(c => c.id === q.clientId) || {};
      return { sheet: document.getElementById('pdf-daypass-sheet'), id: q.id, number: q.number, total: p.total, client: cl, width: 860,
        meta: { validUntil: q.expirationDate, deposit: p.requiresDeposit ? p.deposit : 0, depositPct: p.requiresDeposit ? p.depositPct : 0, title: 'Día de sol' } };
    }
    if (kind === 'combinada' && typeof window.xpComboPrepare === 'function') return window.xpComboPrepare();
    return { error: 'Tipo de cotización no válido' };
  }

  async function createLink(kind) {
    if (!cloudOn()) { toast('El link para el cliente necesita la nube: entra con tu usuario de la empresa'); return null; }
    if (!canWrite()) { toast('Tu usuario es de solo consulta'); return null; }
    const d = prepare(kind);
    if (d.error) { toast(d.error); return null; }
    if (!d.sheet || !d.sheet.innerHTML.trim()) { toast('No se pudo preparar el documento'); return null; }
    const html = snapshotHtml(d.sheet);
    const css = collectCss(d.sheet);
    const r = await api('POST', '/api/share', {
      kind, quoteId: String(d.id), number: d.number, clientName: d.client.name || '', total: Math.round(Number(d.total) || 0),
      html, css, meta: Object.assign({ sheetWidth: d.width, phone: (state.company || {}).phone || '', email: (state.company || {}).email || '' }, d.meta)
    });
    if (r.status !== 200 || !r.data?.ok) { toast('No se pudo crear el link: ' + (r.data?.error || 'revisa la conexión')); return null; }
    const key = kind + ':' + d.id;
    cache[key] = Object.assign({}, cache[key] || {}, { token: r.data.token, url: urlOf(r.data.token), kind, quoteId: String(d.id), number: d.number, updatedAt: new Date().toISOString() });
    try { localStorage.setItem(LS, JSON.stringify(cache)); } catch { /* */ }
    // Compartir el link cuenta como "Enviada"
    const rec = window.xpQuoteRecord ? window.xpQuoteRecord(kind, d.id) : null;
    if (rec && (!rec.status || rec.status === 'Borrador')) {
      rec.status = 'Enviada'; rec.sentAt = rec.sentAt || new Date().toISOString().slice(0, 10);
      if (rec.fullCopy) rec.fullCopy.status = 'Enviada';
      if (kind === 'evento' && state.activeQuote && state.activeQuote.id === rec.id) state.activeQuote.status = 'Enviada';
      if (kind === 'cabana' && state.activeCabinQuote && state.activeCabinQuote.id === rec.id) state.activeCabinQuote.status = 'Enviada';
      if (kind === 'diasol' && state.activeDayPass && state.activeDayPass.id === rec.id) state.activeDayPass.status = 'Enviada';
      if (typeof saveState === 'function') saveState();
    }
    return { url: urlOf(r.data.token), token: r.data.token, d, acceptedAt: r.data.acceptedAt };
  }

  // ---------------------------------------------------------------------------
  // Ventana del link
  // ---------------------------------------------------------------------------
  function ensureModal() {
    let m = document.getElementById('modal-xp-share');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-xp-share';
    m.className = 'hidden fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    m.innerHTML = `<div class="xp-share-card" role="dialog" aria-modal="true" aria-labelledby="xp-share-t">
      <div class="xp-share-head"><div><h3 id="xp-share-t">Link para el cliente</h3><p id="xp-share-sub"></p></div><button type="button" class="xp-pm-x" aria-label="Cerrar" onclick="document.getElementById('modal-xp-share').classList.add('hidden')">✕</button></div>
      <div id="xp-share-body"></div>
    </div>`;
    document.body.appendChild(m);
    return m;
  }

  window.xpOpenShare = async function (kind) {
    const m = ensureModal();
    const body = m.querySelector('#xp-share-body');
    m.querySelector('#xp-share-sub').textContent = 'El cliente abre el link, ve la cotización y puede aceptarla desde el celular.';
    body.innerHTML = `<div class="xp-share-loading">Preparando el link…</div>`;
    m.classList.remove('hidden');
    const res = await createLink(kind);
    if (!res) { m.classList.add('hidden'); return; }
    const { url, d, acceptedAt } = res;
    const first = String(d.client.name || '').split(/[\s&,]+/)[0] || '';
    const comp = (state.company || {}).name || '';
    const msg = `Hola${first ? ' ' + first : ''}, te comparto la cotización ${String(d.number || '').replace(/\s+V\d+$/i, '')} de ${comp || 'nuestra empresa'} por ${money(d.total)}.\n\nPuedes verla, descargarla y aceptarla aquí:\n${url}\n\nCualquier duda me escribes.`;
    const phone = String(d.client.phone || '').replace(/\D/g, '');
    const to = phone ? (phone.length === 10 ? '57' + phone : phone) : '';
    const st = cache[kind + ':' + d.id] || {};
    body.innerHTML = `
      ${acceptedAt ? `<div class="xp-share-ok">✓ El cliente ya aceptó esta cotización. Si cambiaste algo, avísale: el link muestra la versión nueva.</div>` : ''}
      <label class="xp-share-l" for="xp-share-url">Link</label>
      <div class="xp-share-row"><input id="xp-share-url" readonly value="${esc(url)}" onclick="this.select()" /><button type="button" class="xp-pm-btn" id="xp-share-copy">Copiar</button></div>
      <p class="xp-share-stat">${st.viewCount ? `Abierto ${st.viewCount} ${st.viewCount === 1 ? 'vez' : 'veces'}` : 'Aún no lo ha abierto'}${st.acceptedAt ? ' · aceptada por ' + esc(st.acceptedName || 'el cliente') : ''}. Si vuelves a compartir, el link se conserva y muestra la versión actual.</p>
      <div class="xp-share-actions">
        <a class="xp-pm-btn xp-pm-primary" target="_blank" rel="noopener" href="https://wa.me/${to}?text=${encodeURIComponent(msg)}">Enviar por WhatsApp</a>
        <a class="xp-pm-btn" target="_blank" rel="noopener" href="${esc(url)}">Ver como cliente</a>
      </div>
      <button type="button" class="xp-share-revoke" id="xp-share-revoke">Desactivar este link</button>`;
    body.querySelector('#xp-share-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(url); toast('Link copiado'); }
      catch { const i = body.querySelector('#xp-share-url'); i.select(); document.execCommand && document.execCommand('copy'); toast('Link copiado'); }
    };
    body.querySelector('#xp-share-revoke').onclick = async () => {
      if (!confirm('¿Desactivar el link? El cliente ya no podrá abrirlo. Puedes crear uno nuevo cuando quieras.')) return;
      const r = await api('POST', `/api/share?t=${encodeURIComponent(res.token)}&action=revoke`, {});
      if (r.status === 200) { delete cache[kind + ':' + d.id]; try { localStorage.setItem(LS, JSON.stringify(cache)); } catch { /* */ } toast('Link desactivado'); m.classList.add('hidden'); }
      else toast('No se pudo desactivar: ' + (r.data?.error || 'revisa la conexión'));
    };
    refresh(true);
  };

  // ---------------------------------------------------------------------------
  // Estado de los links y aceptaciones
  // ---------------------------------------------------------------------------
  let lastRefresh = 0, refreshing = false, again = false;
  async function refresh(force) {
    if (!cloudOn()) return;
    if (refreshing) { if (force) again = true; return; }
    if (!force && Date.now() - lastRefresh < 60000) return;
    refreshing = true; lastRefresh = Date.now();
    try {
      const r = await api('GET', '/api/share?list=1');
      if (r.status !== 200 || !r.data?.ok) return;
      const next = {};
      (r.data.shares || []).forEach(s => {
        if (s.revoked) return;
        next[s.kind + ':' + s.quoteId] = { token: s.token, url: urlOf(s.token), kind: s.kind, quoteId: s.quoteId, number: s.number, viewCount: s.viewCount, viewedAt: s.viewedAt, acceptedAt: s.acceptedAt, acceptedName: s.acceptedName, acceptedNote: s.acceptedNote, updatedAt: s.updatedAt };
      });
      cache = next;
      try { localStorage.setItem(LS, JSON.stringify(cache)); } catch { /* */ }
      applyAcceptances();
    } catch { /* sin conexión */ }
    finally { refreshing = false; if (again) { again = false; setTimeout(() => refresh(true), 50); } }
  }
  window.xpRefreshShares = refresh;

  function applyAcceptances() {
    if (!canWrite()) return;
    let changed = 0;
    const news = [];
    Object.values(cache).forEach(s => {
      if (!s.acceptedAt) return;
      const coll = COLL[s.kind];
      const rec = (state[coll] || []).find(x => x && String(x.id) === String(s.quoteId));
      if (!rec || (rec.acceptedOnline && rec.acceptedOnline.at === s.acceptedAt)) return;
      rec.acceptedOnline = { at: s.acceptedAt, name: s.acceptedName || '', note: s.acceptedNote || '' };
      if (rec.status !== 'Aprobada') {
        rec.status = 'Aprobada';
        if (rec.fullCopy) rec.fullCopy.status = 'Aprobada';
        if (s.kind === 'evento' && state.activeQuote && state.activeQuote.id === rec.id) state.activeQuote.status = 'Aprobada';
        if (s.kind === 'cabana' && state.activeCabinQuote && state.activeCabinQuote.id === rec.id) state.activeCabinQuote.status = 'Aprobada';
        if (s.kind === 'diasol' && state.activeDayPass && state.activeDayPass.id === rec.id) state.activeDayPass.status = 'Aprobada';
      }
      changed++;
      news.push(`${s.acceptedName || 'El cliente'} aceptó ${String(rec.number || s.number || '').replace(/\s+V\d+$/i, '')}`);
    });
    if (changed) {
      if (typeof saveState === 'function') saveState();
      toast('🎉 ' + news.join(' · '));
      ['renderXpHome', 'renderSavedQuotes', 'renderDayPassHistory', 'updateNotificationBadgeAndList', 'updateCabinDashboardAndBadges'].forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch { /* */ } });
    }
  }

  // Avisos en la campana: aceptadas en línea en los últimos 7 días
  const prevGen = window.generateSystemNotifications;
  if (typeof prevGen === 'function') {
    window.generateSystemNotifications = function () {
      const list = prevGen.apply(this, arguments) || [];
      const since = Date.now() - 7 * 86400000;
      Object.keys(COLL).forEach(kind => (state[COLL[kind]] || []).forEach(r => {
        const a = r && r.acceptedOnline;
        if (!a || new Date(a.at).getTime() < since) return;
        list.unshift({ id: `notif-acc-${kind}-${r.id}-${a.at}`, type: 'quote_accepted', severity: 'info', badge: '✅ Aceptada', title: `${a.name || 'El cliente'} aceptó ${String(r.number || '').replace(/\s+V\d+$/i, '')}`, message: a.note ? `Comentario: ${a.note}` : 'La aceptó desde el link. Confirma la reserva y el anticipo.', quoteId: r.id, days: 0 });
      }));
      return list;
    };
  }

  // Revisar al abrir, al volver a la app y cada 2 minutos
  setTimeout(() => refresh(true), 4000);
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });

  // ---------------------------------------------------------------------------
  // Botones "Link para el cliente"
  // ---------------------------------------------------------------------------
  const LINK_ICO = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></svg>';
  function mk(kind, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.dataset.xpShare = kind;
    b.innerHTML = `${LINK_ICO}<span>Link para el cliente</span>`;
    b.addEventListener('click', () => window.xpOpenShare(kind));
    return b;
  }
  function addButtons() {
    const ev = document.getElementById('btn-download-pdf');
    if (ev && !document.querySelector('[data-xp-share="evento"]')) ev.insertAdjacentElement('afterend', mk('evento', 'px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5 cursor-pointer'));
    document.querySelectorAll('#hos-preview-fullscreen button[onclick="downloadCabinQuotePdf()"]').forEach((btn, i) => {
      if (btn.parentElement.querySelector('[data-xp-share]')) return;
      btn.insertAdjacentElement('afterend', mk('cabana', i === 0
        ? 'min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50'
        : 'w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50'));
    });
    const aside = document.querySelector('.xp-hos-aside .xp-sum-actions');
    if (aside && !aside.parentElement.querySelector('[data-xp-share="cabana"].xp-share-aside')) {
      const b = mk('cabana', 'xp-btn-secondary xp-btn-block xp-share-aside');
      aside.insertAdjacentElement('afterend', b);
    }
    const ds = document.querySelector('#ds-panel-preview button[onclick="shareDayPassWhatsApp()"]');
    if (ds && !document.querySelector('#ds-panel-preview [data-xp-share]')) ds.insertAdjacentElement('afterend', mk('diasol', 'w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50'));
    const dsa = document.querySelector('#ds-panel-edit .xp-ds-actions');
    if (dsa && !document.querySelector('#ds-panel-edit [data-xp-share]')) dsa.insertAdjacentElement('afterend', mk('diasol', 'xp-ds-btn xp-share-ds'));
    const bar = document.querySelector('#xp-ev-bar .xp-ev-btns, #xp-ev-bar');
    if (bar && !document.querySelector('#xp-ev-bar [data-xp-share]')) {
      const wa = Array.from(document.querySelectorAll('#xp-ev-bar button')).find(b => /WhatsApp/.test(b.textContent));
      if (wa) { const b = document.createElement('button'); b.type = 'button'; b.className = 'xp-ev-btn'; b.dataset.xpShare = 'evento'; b.innerHTML = `${LINK_ICO}<span>Link</span>`; b.addEventListener('click', () => window.xpOpenShare('evento')); wa.insertAdjacentElement('afterend', b); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButtons); else addButtons();
  setTimeout(addButtons, 1500);
})();
