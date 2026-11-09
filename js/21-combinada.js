/* Xander Pro — 21-combinada: varias cotizaciones del mismo cliente en un solo documento
 *
 * Ejemplo: cabaña 2 noches + cumpleaños (evento) + día de sol para los invitados.
 * Se eligen cotizaciones ya guardadas del cliente; el documento muestra cada una con su
 * detalle, el total general y el anticipo sumado. Se puede descargar en PDF, enviar por
 * WhatsApp o compartir con link para que el cliente acepte (al aceptar se aprueban todas).
 * Se guarda en la colección "comboQuotes" (solo referencias a las cotizaciones originales:
 * si una cambia, el paquete muestra la versión actual).
 */
(function () {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const nice = iso => { if (!iso) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if (!m) return iso; const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return `${+m[3]} ${M[+m[2] - 1]} ${m[1]}`; };
  const toast = m => { if (typeof showToast === 'function') showToast(m); };
  const KIND_LABEL = { evento: 'Evento', cabana: 'Hospedaje', diasol: 'Día de sol' };
  const COLL = { evento: 'savedQuotes', cabana: 'cabinQuotes', diasol: 'dayPassQuotes' };
  const baseNum = n => String(n || '').replace(/\s+V\d+$/i, '').trim();

  function ensure() { if (!Array.isArray(state.comboQuotes)) state.comboQuotes = []; }
  function clientOf(id) { return (state.clients || []).find(c => c.id === id) || null; }

  // Resumen normalizado de una cotización guardada
  function part(kind, id) {
    const r = (state[COLL[kind]] || []).find(x => x && String(x.id) === String(id));
    if (!r) return null;
    if (kind === 'evento') {
      const q = r.fullCopy || (state.activeQuote && state.activeQuote.id === r.id ? state.activeQuote : r);
      let T = typeof xpQuoteTotals === 'function' ? xpQuoteTotals(q) : { total: 0, deposit: 0, discount: 0 };
      // Cotizaciones antiguas sin detalle guardado: se usa el total del historial
      if (!(T.total > 0) && Number(r.total) > 0) T = { total: Number(r.total), deposit: Math.round(Number(r.total) * (Number(q.depositPct) || 0) / 100), discount: 0 };
      const lines = (q.items || []).filter(it => !it.optional).map(it => ({ concept: it.name || it.description || 'Ítem', detail: it.unit || '', qty: Number(it.qty) || 0, unit: Number(it.price) || 0, total: (Number(it.qty) || 0) * (Number(it.price) || 0) }));
      return { kind, id: r.id, rec: r, number: baseNum(r.number), title: r.eventTitle || q.eventTitle || r.eventType || 'Evento', date: r.eventDate || q.eventDate, dateLabel: nice(r.eventDate || q.eventDate), people: Number(r.guestsPax || q.guestsPax) || 0, lines, discount: T.discount || 0, total: T.total, deposit: T.deposit, valid: r.validUntil || q.validUntil, status: r.status, clientId: r.clientId || q.clientId, extra: q.eventVenue ? `Lugar: ${q.eventVenue}` : '' };
    }
    if (kind === 'cabana') {
      const p = r.pricing || {};
      const cab = (state.cabins || []).find(c => c.id === r.cabinId) || {};
      const n = Number(p.nights || r.nights) || 0;
      const lines = [];
      const L = (concept, detail, total) => { if (Number(total) > 0) lines.push({ concept, detail, qty: '', unit: '', total: Number(total) }); };
      L(`Hospedaje ${cab.name || 'cabaña'}`, `${n} noche(s)`, p.subtotalBase);
      if (p.seasonAdjust) lines.push({ concept: p.seasonLabel || 'Temporada', detail: `${p.seasonNights || 0} de ${n} noche(s)`, qty: '', unit: '', total: Number(p.seasonAdjust) });
      L('Personas adicionales', `${p.extraPaxCount || 0} persona(s)`, p.subtotalExtraPax);
      L(p.childLabel || 'Niños', `${p.kids5to10 || 0} niño(s)`, p.subtotalKids);
      L(p.infantLabel || 'Bebés', `${p.kids0to4 || 0} bebé(s)`, p.subtotalInfants);
      L('Mascotas', `${p.pets || 0} mascota(s)`, p.subtotalPets);
      L(`Alimentación: ${p.mealPlanName || ''}`, `${p.mealPax || 0} persona(s)`, p.subtotalMeals);
      (p.selectedTours || []).forEach(t => L(t.name || 'Servicio adicional', t.qty ? `${t.qty} unidad(es)` : '', t.total));
      return { kind, id: r.id, rec: r, number: baseNum(r.number), title: cab.name || 'Cabaña', date: r.checkInDate, dateLabel: `${nice(r.checkInDate)} al ${nice(r.checkOutDate)}`, people: Number(p.totalGuests) || 0, lines, discount: Number(p.discount) || 0, total: Number(p.total) || 0, deposit: p.requiresDeposit === false ? 0 : Number(p.deposit) || 0, valid: r.expirationDate, status: r.status, clientId: r.clientId, extra: `${n} noche(s)` };
    }
    const p = r.pricing || (typeof calcDayPass === 'function' ? calcDayPass(r) : {});
    const lines = [...(p.lines || []), ...(p.extraLines || [])].map(l => ({ concept: l.concept, detail: l.detail || '', qty: l.qty, unit: l.unit, total: l.total }));
    return { kind, id: r.id, rec: r, number: baseNum(r.number), title: 'Día de sol', date: r.date, dateLabel: nice(r.date) + (p.schedule ? ` · ${p.schedule}` : ''), people: Number(p.people) || 0, lines, discount: Number(p.discount) || 0, total: Number(p.total) || 0, deposit: p.requiresDeposit ? Number(p.deposit) || 0 : 0, valid: r.expirationDate, status: r.status, clientId: r.clientId, extra: '' };
  }

  function quotesOfClient(clientId) {
    const out = [];
    Object.keys(COLL).forEach(k => (state[COLL[k]] || []).forEach(r => {
      if (!r) return;
      const cid = r.clientId || (r.fullCopy && r.fullCopy.clientId);
      if (cid !== clientId || ['Rechazada', 'Reemplazada'].includes(r.status)) return;
      const pt = part(k, r.id);
      if (pt) out.push(pt);
    }));
    return out.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  function nextNumber() {
    ensure();
    const y = new Date().getFullYear();
    let max = 0;
    state.comboQuotes.forEach(c => { const m = new RegExp(`^PAQ-${y}-(\\d+)`).exec(c.number || ''); if (m) max = Math.max(max, +m[1]); });
    return `PAQ-${y}-${String(max + 1).padStart(4, '0')}`;
  }

  function comboData(c) {
    const parts = (c.parts || []).map(x => part(x.kind, x.id)).filter(Boolean);
    const total = parts.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const deposit = parts.reduce((s, p) => s + (Number(p.deposit) || 0), 0);
    const valids = parts.map(p => p.valid).filter(Boolean).sort();
    return { parts, total, deposit, balance: total - deposit, valid: valids[0] || c.validUntil || '', people: Math.max(0, ...parts.map(p => p.people || 0)) };
  }

  // ---------------------------------------------------------------------------
  // Documento (estilos en línea para que se vea igual en PDF y en el link)
  // ---------------------------------------------------------------------------
  function sheetHtml(c) {
    const d = comboData(c);
    const comp = state.company || {};
    const cl = clientOf(c.clientId) || {};
    const logoSrc = comp.logoUrl || comp.logoDataUrl || '';
    const logo = logoSrc ? `<img src="${esc(typeof xpPdfImageUrl === 'function' ? xpPdfImageUrl(logoSrc) : logoSrc)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:12px">` : `<div style="width:56px;height:56px;border-radius:12px;background:#0B5D7E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px">${esc(String(comp.name || 'XP').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>`;
    const th = 'text-align:left;padding:8px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:#0B5D7E';
    const td = 'padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;vertical-align:top';
    const sections = d.parts.map((p, i) => `
      <div style="margin-top:18px;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 14px;background:#F1F7F9">
          <div><div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0B5D7E">${i + 1}. ${KIND_LABEL[p.kind]} · ${esc(p.number)}</div>
          <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:2px">${esc(p.title)}</div>
          <div style="font-size:12px;color:#475569;margin-top:2px">${esc(p.dateLabel)}${p.people ? ` · ${p.people} persona(s)` : ''}${p.extra && p.kind === 'evento' ? ` · ${esc(p.extra)}` : ''}</div></div>
          <div style="text-align:right;white-space:nowrap"><div style="font-size:10px;color:#64748B;font-weight:700;text-transform:uppercase">Subtotal</div><div style="font-size:16px;font-weight:800;color:#0F172A">${money(p.total)}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th style="${th}">Concepto</th><th style="${th};text-align:center">Cant.</th><th style="${th};text-align:right">Valor unit.</th><th style="${th};text-align:right">Total</th></tr></thead>
          <tbody>${p.lines.map(l => `<tr><td style="${td}"><strong style="color:#0F172A">${esc(l.concept)}</strong>${l.detail ? `<div style="font-size:10.5px;color:#64748B">${esc(l.detail)}</div>` : ''}</td><td style="${td};text-align:center">${l.qty === '' ? '' : esc(l.qty)}</td><td style="${td};text-align:right">${l.unit === '' ? '' : money(l.unit)}</td><td style="${td};text-align:right;font-weight:700">${money(l.total)}</td></tr>`).join('')}
          ${p.discount ? `<tr><td style="${td};color:#B42318;font-weight:700" colspan="3">Descuento</td><td style="${td};text-align:right;color:#B42318;font-weight:700">- ${money(p.discount)}</td></tr>` : ''}</tbody>
        </table>
      </div>`).join('');
    return `
      <div style="font-family:Inter,system-ui,sans-serif;color:#0F172A;background:#fff;padding:32px;max-width:860px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #0B5D7E">
          <div style="display:flex;gap:12px;align-items:flex-start">${logo}
            <div><div style="font-size:18px;font-weight:800">${esc(comp.name || '')}</div>
            ${comp.slogan ? `<div style="font-size:11px;color:#0B5D7E;font-weight:600">${esc(comp.slogan)}</div>` : ''}
            <div style="font-size:11px;color:#475569;margin-top:2px">${[comp.nit ? 'NIT ' + comp.nit : '', comp.phone, comp.email].filter(Boolean).map(esc).join(' · ')}</div>
            ${comp.address ? `<div style="font-size:11px;color:#475569">${esc(comp.address)}</div>` : ''}</div>
          </div>
          <div style="text-align:right">
            <div style="display:inline-block;background:#0B3B4F;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;padding:5px 10px;border-radius:999px">COTIZACIÓN COMPLETA ${esc(c.number)}</div>
            <div style="font-size:11px;color:#475569;margin-top:6px">Emitida: ${esc(nice(c.createdAt))}</div>
            ${d.valid ? `<div style="display:inline-block;margin-top:6px;font-size:11px;font-weight:800;color:#8A5300;background:#FFF5E1;border:1px solid #F2C46D;border-radius:8px;padding:4px 8px">Válida hasta: ${esc(nice(d.valid))}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;padding:14px;border:1px solid #E2E8F0;border-radius:14px;background:#F8FAFC">
          <div style="flex:1;min-width:220px"><div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748B;text-transform:uppercase">Cotizado para</div>
            <div style="font-size:15px;font-weight:800;margin-top:2px">${esc(cl.name || 'Cliente')}</div>
            <div style="font-size:12px;color:#475569">${[cl.doc ? 'Doc. ' + cl.doc : '', cl.phone, cl.email].filter(Boolean).map(esc).join(' · ')}</div></div>
          <div style="flex:1;min-width:220px"><div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#64748B;text-transform:uppercase">Plan</div>
            <div style="font-size:15px;font-weight:800;margin-top:2px">${esc(c.title || 'Plan combinado')}</div>
            <div style="font-size:12px;color:#475569">${d.parts.map(p => KIND_LABEL[p.kind]).join(' + ')}</div></div>
        </div>
        ${sections}
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:18px;page-break-inside:avoid">
          <div style="flex:1;min-width:240px;font-size:11.5px;color:#334155">
            ${c.notes ? `<div style="border-left:3px solid #F2A93B;background:#FFFBF2;padding:10px 12px;border-radius:8px;white-space:pre-line;margin-bottom:10px"><strong style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8A5300">Observaciones</strong><br>${esc(c.notes)}</div>` : ''}
            ${comp.bankDetails ? `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;white-space:pre-line"><strong style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B">Medios de pago</strong><br>${esc(comp.bankDetails)}</div>` : ''}
          </div>
          <div style="flex:1;min-width:240px">
            ${d.parts.map(p => `<div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;padding:3px 0"><span>${KIND_LABEL[p.kind]} · ${esc(p.number)}</span><strong style="color:#0F172A">${money(p.total)}</strong></div>`).join('')}
            <div style="display:flex;justify-content:space-between;align-items:center;background:#0B3B4F;color:#fff;border-radius:10px;padding:10px 12px;margin-top:8px"><strong style="font-size:13px">TOTAL GENERAL</strong><strong style="font-size:17px">${money(d.total)}</strong></div>
            ${d.deposit > 0 ? `<div style="display:flex;justify-content:space-between;background:#E8F4F8;color:#0B5D7E;border-radius:10px;padding:8px 12px;margin-top:6px;font-size:12.5px;font-weight:800"><span>Anticipo para reservar</span><span>${money(d.deposit)}</span></div>
            <div style="display:flex;justify-content:space-between;border:1px solid #E2E8F0;border-radius:10px;padding:8px 12px;margin-top:6px;font-size:12px;font-weight:700;color:#334155"><span>Saldo</span><span>${money(d.balance)}</span></div>` : '<div style="font-size:12px;color:#475569;margin-top:6px">Pago total según las condiciones de cada servicio.</div>'}
          </div>
        </div>
        ${comp.terms ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:10.5px;color:#64748B;white-space:pre-line"><strong>Términos y condiciones:</strong> ${esc(comp.terms)}</div>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Ventana
  // ---------------------------------------------------------------------------
  let current = null; // combo en edición
  function modal() {
    let m = document.getElementById('modal-xp-combo');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-xp-combo';
    m.className = 'hidden fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
    m.innerHTML = `<div class="xp-combo-card" role="dialog" aria-modal="true" aria-labelledby="xp-combo-t">
      <div class="xp-pm-head"><div class="min-w-0"><h3 id="xp-combo-t" class="text-base font-bold">Cotización completa</h3><p class="text-[11px] xp-pm-muted">Une cabaña, evento y día de sol del mismo cliente en un solo documento con un solo total.</p></div>
      <button type="button" class="xp-pm-x" aria-label="Cerrar" onclick="xpCloseCombo()">✕</button></div>
      <div class="xp-combo-body" id="xp-combo-body"></div>
      <div class="xp-pm-foot" id="xp-combo-foot"></div>
    </div>`;
    document.body.appendChild(m);
    return m;
  }
  window.xpCloseCombo = () => { document.getElementById('modal-xp-combo')?.classList.add('hidden'); document.body.classList.remove('xp-print-combo'); };

  // opts.from = 'evento' | 'cabana' | 'diasol': se elige el cliente de la cotización abierta
  window.xpOpenCombo = function (comboId, opts) {
    ensure();
    const m = modal();
    m.classList.remove('hidden');
    if (comboId) { const c = state.comboQuotes.find(x => x.id === comboId); if (c) { current = JSON.parse(JSON.stringify(c)); return renderDoc(); } }
    current = null;
    let cid = '';
    if (opts && opts.from) {
      const a = opts.from === 'evento' ? state.activeQuote : opts.from === 'cabana' ? state.activeCabinQuote : state.activeDayPass;
      cid = (a && a.clientId) || '';
      if (opts.from === 'evento') { const s = document.getElementById('q-client-select'); if (s && s.value) cid = s.value; }
    }
    renderList(cid);
  };

  function renderList(preClient) {
    const body = document.getElementById('xp-combo-body');
    const foot = document.getElementById('xp-combo-foot');
    const list = (state.comboQuotes || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const clients = (state.clients || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    body.innerHTML = `
      <div class="xp-combo-grid">
        <section class="xp-pm-col">
          <div class="xp-pm-sec">Nueva cotización completa</div>
          <div class="xp-pm-f"><label for="xp-combo-client">Cliente</label>
            <select id="xp-combo-client"><option value="">Elige el cliente…</option>${clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
          <div class="xp-pm-f"><label for="xp-combo-title">Nombre de la cotización</label><input id="xp-combo-title" placeholder="Ej. Cumpleaños de Sofía: cabaña + fiesta + día de sol" /></div>
          <div id="xp-combo-quotes" class="xp-combo-quotes"><p class="xp-pm-muted text-xs">Elige un cliente para ver sus cotizaciones guardadas.</p></div>
          <div class="xp-pm-f"><label for="xp-combo-notes">Observaciones para el cliente (opcional)</label><textarea id="xp-combo-notes" rows="2" placeholder="Ej. El día de sol es para los invitados que no se hospedan."></textarea></div>
        </section>
        <section class="xp-pm-col">
          <div class="xp-pm-sec">Cotizaciones completas guardadas</div>
          <div class="xp-combo-saved">${list.length ? list.map(c => { const d = comboData(c); const cl = clientOf(c.clientId) || {}; return `<button type="button" class="xp-combo-item" onclick="xpOpenCombo('${esc(c.id)}')"><span><strong>${esc(c.number)} · ${esc(c.title || 'Paquete')}</strong><small>${esc(cl.name || 'Cliente')} · ${d.parts.map(p => KIND_LABEL[p.kind]).join(' + ') || 'sin cotizaciones'}</small></span><span class="xp-combo-item-r"><strong>${money(d.total)}</strong><small>${esc(c.status || 'Borrador')}</small></span></button>`; }).join('') : '<p class="xp-pm-muted text-xs">Aún no hay cotizaciones completas.</p>'}</div>
        </section>
      </div>`;
    foot.innerHTML = `<span class="xp-pm-muted text-xs" id="xp-combo-sum"></span><div class="flex gap-2"><button type="button" class="xp-pm-btn" onclick="xpCloseCombo()">Cancelar</button><button type="button" class="xp-pm-btn xp-pm-primary" id="xp-combo-create">Crear cotización</button></div>`;
    const sel = body.querySelector('#xp-combo-client');
    const refresh = () => {
      const qs = sel.value ? quotesOfClient(sel.value) : [];
      const box = body.querySelector('#xp-combo-quotes');
      box.innerHTML = !sel.value ? '<p class="xp-pm-muted text-xs">Elige un cliente para ver sus cotizaciones guardadas.</p>'
        : qs.length ? qs.map(p => `<label class="xp-combo-q"><input type="checkbox" value="${p.kind}|${esc(p.id)}" checked /><span><strong>${KIND_LABEL[p.kind]} · ${esc(p.number)}</strong><small>${esc(p.title)} · ${esc(p.dateLabel)} · ${esc(p.status || 'Borrador')}</small></span><b>${money(p.total)}</b></label>`).join('')
          : '<p class="xp-pm-muted text-xs">Este cliente no tiene cotizaciones guardadas. Créalas primero en Eventos, Cabañas o Día de Sol.</p>';
      const upd = () => {
        const chosen = Array.from(box.querySelectorAll('input:checked')).map(i => i.value.split('|'));
        const tot = chosen.reduce((s, [k, id]) => s + ((part(k, id) || {}).total || 0), 0);
        document.getElementById('xp-combo-sum').textContent = chosen.length ? `${chosen.length} cotización(es) · total ${money(tot)}` : '';
      };
      box.querySelectorAll('input').forEach(i => i.addEventListener('change', upd));
      upd();
    };
    sel.addEventListener('change', refresh);
    if (preClient && (state.clients || []).some(c => c.id === preClient)) { sel.value = preClient; refresh(); }
    foot.querySelector('#xp-combo-create').onclick = () => {
      const chosen = Array.from(body.querySelectorAll('#xp-combo-quotes input:checked')).map(i => { const [kind, id] = i.value.split('|'); return { kind, id }; });
      if (!sel.value) return toast('Elige el cliente');
      if (chosen.length < 2) return toast('Elige al menos dos cotizaciones para combinarlas');
      ensure();
      const c = { id: 'paq-' + Date.now(), number: nextNumber(), clientId: sel.value, title: body.querySelector('#xp-combo-title').value.trim() || 'Plan combinado', notes: body.querySelector('#xp-combo-notes').value.trim(), parts: chosen, status: 'Borrador', createdAt: ymd(new Date()), createdBy: typeof getOperatorName === 'function' ? getOperatorName() : '' };
      state.comboQuotes.unshift(c);
      if (typeof saveState === 'function') saveState();
      current = JSON.parse(JSON.stringify(c));
      toast(`Paquete ${c.number} creado`);
      renderDoc();
    };
  }

  function renderDoc() {
    const c = current;
    const body = document.getElementById('xp-combo-body');
    const foot = document.getElementById('xp-combo-foot');
    const d = comboData(c);
    body.innerHTML = `
      <div class="xp-combo-docbar">
        <button type="button" class="xp-pm-btn" onclick="xpOpenCombo()">← Volver</button>
        <div class="xp-pm-f"><label for="xp-combo-status" class="sr-only">Estado</label><select id="xp-combo-status">${['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'].map(s => `<option ${s === (c.status || 'Borrador') ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <span class="xp-pm-muted text-xs">${d.parts.length} cotización(es) · los cambios en cada cotización se ven aquí automáticamente</span>
      </div>
      <div class="xp-combo-sheetwrap"><div id="pdf-combo-sheet" class="pdf-pure-white-export">${sheetHtml(c)}</div></div>`;
    foot.innerHTML = `<button type="button" class="xp-share-revoke" onclick="xpDeleteCombo('${esc(c.id)}')">Eliminar paquete</button>
      <div class="xp-combo-actions">
        <button type="button" class="xp-pm-btn" onclick="xpComboPdf()">Descargar PDF</button>
        <button type="button" class="xp-pm-btn" onclick="xpComboWhatsApp()">WhatsApp</button>
        <button type="button" class="xp-pm-btn xp-pm-primary" onclick="xpOpenShare && xpOpenShare('combinada')">Link para el cliente</button>
      </div>`;
    body.querySelector('#xp-combo-status').addEventListener('change', e => {
      const v = e.target.value;
      const rec = state.comboQuotes.find(x => x.id === c.id);
      if (rec) { rec.status = v; c.status = v; if (v === 'Enviada' && !rec.sentAt) rec.sentAt = ymd(new Date()); }
      if (v === 'Aprobada' && confirm('¿Marcar también como Aprobadas las cotizaciones del paquete?')) approveParts(rec);
      if (typeof saveState === 'function') saveState();
    });
  }

  function approveParts(rec) {
    if (!rec) return;
    (rec.parts || []).forEach(x => {
      const r = (state[COLL[x.kind]] || []).find(q => q && String(q.id) === String(x.id));
      if (r && r.status !== 'Aprobada') { r.status = 'Aprobada'; if (r.fullCopy) r.fullCopy.status = 'Aprobada'; }
    });
  }
  window.xpComboApproveParts = id => approveParts((state.comboQuotes || []).find(x => x.id === id));

  window.xpDeleteCombo = function (id) {
    if (!confirm('¿Eliminar este paquete? Las cotizaciones originales no se borran.')) return;
    state.comboQuotes = (state.comboQuotes || []).filter(x => x.id !== id);
    if (typeof saveState === 'function') saveState();
    toast('Paquete eliminado');
    window.xpOpenCombo();
  };

  window.xpComboPdf = function () {
    const c = current; if (!c) return;
    const cl = clientOf(c.clientId) || {};
    const clean = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const el = document.getElementById('pdf-combo-sheet');
    if (typeof xpSheetToPdf === 'function') xpSheetToPdf(el, `${clean(c.number)}_Paquete_${clean(cl.name)}.pdf`, 'Generando PDF del paquete…');
    else { document.body.classList.add('xp-print-combo'); window.print(); setTimeout(() => document.body.classList.remove('xp-print-combo'), 1000); }
  };

  window.xpComboWhatsApp = function () {
    const c = current; if (!c) return;
    const d = comboData(c);
    const cl = clientOf(c.clientId) || {};
    const first = String(cl.name || '').split(/[\s&,]+/)[0] || '';
    const sh = window.xpShareIndex ? window.xpShareIndex()['combinada:' + c.id] : null;
    const msg = [
      `Hola${first ? ' ' + first : ''}, te comparto el plan "${c.title}" de ${(state.company || {}).name || ''}:`,
      '',
      ...d.parts.map(p => `- ${KIND_LABEL[p.kind]} (${p.number}): ${p.title}, ${p.dateLabel} = ${money(p.total)}`),
      '',
      `TOTAL GENERAL: ${money(d.total)}`,
      d.deposit > 0 ? `Anticipo para reservar: ${money(d.deposit)}` : '',
      d.valid ? `Válida hasta: ${nice(d.valid)}` : '',
      sh && sh.url ? `\nPuedes verla y aceptarla aquí: ${sh.url}` : '',
      '',
      'Quedo atenta a tus comentarios.'
    ].filter(l => l !== '' || true).join('\n').replace(/\n{3,}/g, '\n\n');
    const phone = String(cl.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone ? (phone.length === 10 ? '57' + phone : phone) : ''}?text=${encodeURIComponent(msg)}`, '_blank');
    const rec = (state.comboQuotes || []).find(x => x.id === c.id);
    if (rec && (!rec.status || rec.status === 'Borrador')) { rec.status = 'Enviada'; rec.sentAt = ymd(new Date()); if (typeof saveState === 'function') saveState(); renderDoc(); }
  };

  // Para el link del cliente (20-enlace-cliente.js)
  window.xpComboPrepare = function () {
    const c = current;
    if (!c) return { error: 'Abre un paquete primero' };
    const d = comboData(c);
    if (!d.parts.length) return { error: 'El paquete no tiene cotizaciones' };
    return { sheet: document.getElementById('pdf-combo-sheet'), id: c.id, number: c.number, total: d.total, client: clientOf(c.clientId) || {}, width: 924,
      meta: { validUntil: d.valid || null, deposit: d.deposit, depositPct: 0, title: c.title } };
  };

  // Al aceptar el paquete por link, se aprueban también sus cotizaciones
  setInterval(() => {
    (state.comboQuotes || []).forEach(c => {
      if (c.acceptedOnline && !c.partsApprovedFromLink) { approveParts(c); c.partsApprovedFromLink = true; if (typeof saveState === 'function') saveState(); }
    });
  }, 5000);

  // Entrada en el menú "Nueva cotización" de Inicio y en Historial
  function addEntry() {
    const menu = document.getElementById('xp-new-menu');
    if (menu && !menu.querySelector('[data-xp-combo]')) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitem'); b.dataset.xpCombo = '1';
      b.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></svg><span><strong>Cotización completa</strong><small>Cabaña + evento + día de sol</small></span>`;
      b.addEventListener('click', () => { if (typeof xpToggleNewMenu === 'function') xpToggleNewMenu(false); window.xpOpenCombo(); });
      menu.appendChild(b);
    }
    const hist = document.querySelector('#view-historial');
    if (hist && !hist.querySelector('[data-xp-combo-btn]')) {
      const head = hist.querySelector('h2, h1')?.parentElement;
      if (head) {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.xpComboBtn = '1'; b.className = 'xp-pm-btn';
        b.textContent = 'Cotizaciones completas';
        b.addEventListener('click', () => window.xpOpenCombo());
        head.appendChild(b);
      }
    }
  }
  // Inicio se vuelve a dibujar seguido: se agrega la opción cada vez que cambia
  function watch() {
    addEntry();
    const home = document.getElementById('xp-home');
    if (home && !home.dataset.xpComboWatch) {
      home.dataset.xpComboWatch = '1';
      new MutationObserver(() => { if (!document.querySelector('#xp-new-menu [data-xp-combo]')) addEntry(); }).observe(home, { childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  setTimeout(watch, 1200);
})();

/* Barra inferior del celular: "Cotizar" abre un menú con los cuatro tipos */
(function () {
  const ITEMS = [
    ['evento', '📋', 'Evento', 'Bodas, corporativos, catering'],
    ['cabana', '🏡', 'Cabaña', 'Hospedaje por noches'],
    ['diasol', '☀️', 'Día de sol', 'Entrada por persona y adicionales'],
    ['paquete', '🧩', 'Cotización completa', 'Cabaña + evento + día de sol']
  ];
  function sheet() {
    let m = document.getElementById('xp-quick-quote');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'xp-quick-quote';
    m.className = 'xp-qq hidden';
    m.innerHTML = `<div class="xp-qq-card" role="dialog" aria-modal="true" aria-label="Nueva cotización"><div class="xp-qq-grip"></div><div class="xp-qq-t">¿Qué vas a cotizar?</div>${ITEMS.map(([k, ic, t, d]) => `<button type="button" data-k="${k}"><span class="xp-qq-ic">${ic}</span><span><strong>${t}</strong><small>${d}</small></span></button>`).join('')}<button type="button" class="xp-qq-cancel" data-k="">Cancelar</button></div>`;
    m.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if (!b && e.target !== m) return;
      m.classList.add('hidden');
      const k = b ? b.dataset.k : '';
      if (k === 'evento') switchView('cotizador');
      else if (k === 'cabana' || k === 'diasol') { if (typeof xpNewQuote === 'function') xpNewQuote(k); }
      else if (k === 'paquete' && typeof xpOpenCombo === 'function') xpOpenCombo();
    });
    document.body.appendChild(m);
    return m;
  }
  window.xpOpenQuickQuote = () => sheet().classList.remove('hidden');
})();
