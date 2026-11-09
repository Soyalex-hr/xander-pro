/* Xander Pro — 16-correo: envío de cotizaciones por correo (SMTP de la empresa)
 * y mensajes de WhatsApp sin caracteres dañados.
 *
 * - Mi Empresa → "Correo para enviar cotizaciones": servidor SMTP, usuario, contraseña
 *   (se guarda cifrada en el servidor y nunca vuelve al navegador), remitente.
 * - Botón "Enviar por correo" en cotizaciones de cabañas, día de sol y eventos:
 *   arma el mensaje, genera el PDF y lo adjunta.
 * - WhatsApp: algunos emojis llegan como "�" en WhatsApp Web/escritorio; se quitan
 *   del mensaje antes de abrir WhatsApp (el texto y los *negritas* se conservan).
 */
(function () {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0));
  const niceDate = iso => (iso && typeof pdfStayDate === 'function' ? pdfStayDate(iso) : (iso || ''));
  const ico = p => `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const MAIL_ICO = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>';

  // ---------------------------------------------------------------------------
  // WhatsApp: quitar emojis que se dañan ("�") al abrir wa.me
  // ---------------------------------------------------------------------------
  function cleanWhatsAppText(t) {
    return String(t)
      .replace(/(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])(?:️|‍(?:\p{Extended_Pictographic})️?|[\u{1F3FB}-\u{1F3FF}])*/gu, '')
      .replace(/[️‍⃣]/g, '')
      .replace(/[\uD800-\uDFFF]/g, '')
      .split('\n').map(l => l.replace(/^[ \t]+/, '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([!,.])/g, '$1')).join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  window.xpCleanWhatsAppText = cleanWhatsAppText;
  const origOpen = window.open.bind(window);
  window.open = function (url, ...rest) {
    try {
      const s = String(url || '');
      if (/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(s)) {
        const u = new URL(s);
        const t = u.searchParams.get('text');
        if (t) {
          u.searchParams.set('text', cleanWhatsAppText(t));
          url = u.toString().replace(/\+/g, '%20');
        }
      }
    } catch { /* deja la URL como venía */ }
    return origOpen(url, ...rest);
  };

  // ---------------------------------------------------------------------------
  // API de correo
  // ---------------------------------------------------------------------------
  async function api(method, payload) {
    let r;
    try {
      r = await fetch('/api/email', {
        method,
        credentials: 'same-origin',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined
      });
    } catch {
      throw new Error('Sin conexión con el servidor. Revisa tu internet.');
    }
    if (r.status === 404) throw Object.assign(new Error('El envío de correos funciona cuando usas la app publicada en la nube.'), { offline: true });
    let j = {};
    try { j = await r.json(); } catch { /* */ }
    if (!r.ok || j.ok === false) throw Object.assign(new Error(j.error || `Error ${r.status}`), { status: r.status, notConfigured: j.notConfigured });
    return j;
  }

  // ---------------------------------------------------------------------------
  // PDF → base64 (mismo método de los PDF de cabañas y día de sol)
  // ---------------------------------------------------------------------------
  function sheetToPdfBase64(sheet) {
    return new Promise((resolve, reject) => {
      const h2c = window.html2canvas;
      const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!sheet) return reject(new Error('No se encontró la hoja de la cotización'));
      if (!h2c || !JsPDF) return reject(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión e intenta de nuevo.'));
      const wasDark = document.documentElement.classList.contains('dark');
      if (wasDark) { document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }
      const clone = sheet.cloneNode(true);
      clone.removeAttribute('id');
      clone.className = 'bg-white space-y-5 text-slate-900 pdf-pure-white-export';
      Object.assign(clone.style, { width: '794px', minWidth: '794px', maxWidth: '794px', margin: '0', padding: '28px 34px', boxSizing: 'border-box', boxShadow: 'none', border: 'none', borderRadius: '0', backgroundColor: '#ffffff', color: '#0f172a', transform: 'none' });
      clone.querySelectorAll('.hidden.print\\:block, .print\\:block').forEach(el => el.classList.remove('hidden'));
      const fix = document.createElement('style');
      fix.textContent = 'img{display:inline-block !important;}';
      document.head.appendChild(fix);
      const sandbox = document.createElement('div');
      sandbox.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;z-index:-1;pointer-events:none;';
      sandbox.appendChild(clone);
      document.body.appendChild(sandbox);
      const cleanup = () => { sandbox.remove(); fix.remove(); if (wasDark) { document.documentElement.classList.add('dark'); document.documentElement.style.colorScheme = 'dark'; } };
      const top = clone.getBoundingClientRect().top;
      const breaks = [];
      clone.querySelectorAll('tr, .pdf-avoid-break, .rounded-2xl').forEach(el => breaks.push(Math.round(el.getBoundingClientRect().bottom - top)));
      Array.from(clone.children).forEach(el => breaks.push(Math.round(el.getBoundingClientRect().bottom - top)));
      breaks.sort((a, b) => a - b);
      const SCALE = 1.6;
      setTimeout(() => {
        h2c(clone, { scale: SCALE, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', width: 794, windowWidth: 794, scrollX: 0, scrollY: 0 }).then(canvas => {
          const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
          const pxPerMm = 794 / 210, pageHpx = 297 * pxPerMm, totalH = canvas.height / SCALE;
          let start = 0, page = 0;
          while (start < totalH - 2) {
            const pad = page === 0 ? 0 : 28;
            const limit = start + pageHpx - pad - 20;
            const end = limit >= totalH ? totalH : ((breaks.filter(b => b > start + 140 && b <= limit).pop()) || limit);
            const sliceH = Math.max(1, Math.round((end - start) * SCALE));
            const c = document.createElement('canvas');
            c.width = canvas.width; c.height = sliceH;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            if (page > 0) pdf.addPage('a4', 'portrait');
            pdf.addImage(c.toDataURL('image/jpeg', 0.86), 'JPEG', 0, pad / pxPerMm, 210, (sliceH / SCALE) / pxPerMm);
            start = end; page++;
          }
          const uri = pdf.output('datauristring');
          cleanup();
          resolve(uri.slice(uri.indexOf(',') + 1));
        }).catch(err => { cleanup(); reject(err); });
      }, 80);
    });
  }

  // ---------------------------------------------------------------------------
  // Datos de cada tipo de cotización
  // ---------------------------------------------------------------------------
  const company = () => state.company || {};
  const clientOf = id => (state.clients || []).find(c => c.id === id) || {};
  const cleanFile = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '');

  function contextFor(kind) {
    const comp = company();
    if (kind === 'cabin') {
      const q = state.activeCabinQuote;
      if (!q) return null;
      if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
      const p = q.pricing || {};
      const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || {};
      const cl = clientOf(q.clientId);
      return {
        kind, q, client: cl, number: q.number,
        sheetId: 'pdf-cabin-document-sheet',
        filename: `${cleanFile(q.number)}_Cotizacion_${cleanFile(cabin.name)}_${cleanFile(cl.name)}.pdf`,
        subject: `Cotización ${q.number} · ${cabin.name || 'Hospedaje'} · ${comp.name || ''}`.trim(),
        intro: `te compartimos la cotización de hospedaje en ${cabin.name || 'nuestra cabaña'}.`,
        rows: [
          ['Cotización', q.number],
          ['Cabaña', cabin.name || ''],
          ['Llegada', niceDate(q.checkInDate)],
          ['Salida', niceDate(q.checkOutDate)],
          ['Noches', String(p.nights || '')],
          ['Huéspedes', String(p.totalGuests || '')],
          ['Tarifa', p.rateMode === 'per_person' ? 'Por persona · cabaña compartida' : 'Cabaña completa de uso privado']
        ],
        total: p.total, deposit: p.requiresDeposit === false ? null : p.deposit, depositPct: p.depositPct,
        valid: q.expirationDate,
        afterSend: () => {
          q.emailLog = (q.emailLog || []).concat([{ at: new Date().toISOString() }]);
          if (!q.status || q.status === 'Borrador') { q.status = 'Enviada'; const sel = document.getElementById('hos-status-select'); if (sel) sel.value = 'Enviada'; }
          if (typeof saveCurrentCabinQuote === 'function') saveCurrentCabinQuote();
        }
      };
    }
    if (kind === 'daypass') {
      const q = state.activeDayPass;
      if (!q) return null;
      if (typeof recalcDayPass === 'function') recalcDayPass();
      const p = q.pricing || {};
      const cl = clientOf(q.clientId);
      return {
        kind, q, client: cl, number: q.number,
        sheetId: 'pdf-daypass-sheet',
        filename: `${cleanFile(q.number)}_DiaDeSol_${cleanFile(cl.name)}.pdf`,
        subject: `Cotización ${q.number} · Día de sol · ${comp.name || ''}`.trim(),
        intro: 'te compartimos la cotización de tu día de sol.',
        rows: [
          ['Cotización', q.number],
          ['Fecha', niceDate(q.date)],
          ['Horario', p.schedule || ''],
          ['Personas', `${p.adults || 0} adultos, ${p.children || 0} niños, ${p.infants || 0} bebés`]
        ],
        total: p.total, deposit: p.requiresDeposit ? p.deposit : null, depositPct: p.depositPct,
        valid: q.expirationDate,
        afterSend: () => {
          q.emailLog = (q.emailLog || []).concat([{ at: new Date().toISOString() }]);
          if (!q.status || q.status === 'Borrador') { q.status = 'Enviada'; const sel = document.getElementById('ds-status-select'); if (sel) sel.value = 'Enviada'; }
          if (typeof saveDayPassQuote === 'function') saveDayPassQuote();
        }
      };
    }
    if (kind === 'event') {
      const q = state.activeQuote;
      if (!q) return null;
      if (typeof renderQuoteEditorAndPdf === 'function') { try { renderQuoteEditorAndPdf(); } catch { /* */ } }
      const total = xpQuoteTotals(q).total;
      const depPct = Number(q.depositPct) || 0;
      const cl = clientOf(q.clientId);
      return {
        kind, q, client: cl, number: q.number,
        sheetId: 'pdf-document-sheet',
        filename: `${cleanFile(q.number)}_Cotizacion_${cleanFile(q.eventTitle || cl.name)}.pdf`,
        subject: `Cotización ${q.number} · ${q.eventTitle || 'Evento'} · ${comp.name || ''}`.trim(),
        intro: `te compartimos la cotización para ${q.eventTitle || 'tu evento'}.`,
        rows: [
          ['Cotización', q.number],
          ['Evento', q.eventTitle || q.eventType || ''],
          ['Fecha', niceDate(q.eventDate)],
          ['Lugar', q.eventVenue || ''],
          ['Invitados', String(q.guestsPax || '')]
        ],
        total, deposit: depPct ? total * depPct / 100 : null, depositPct: depPct,
        valid: q.validUntil,
        afterSend: () => { q.emailLog = (q.emailLog || []).concat([{ at: new Date().toISOString() }]); if (typeof saveState === 'function') saveState(); }
      };
    }
    return null;
  }

  function defaultMessage(ctx) {
    const comp = company();
    const first = String(ctx.client.name || '').split(/[&,]| y /)[0].trim() || 'cliente';
    const lines = [
      `Hola ${first},`,
      '',
      `Gracias por escribirnos. ${ctx.intro.charAt(0).toUpperCase() + ctx.intro.slice(1)}`,
      '',
      `Total: ${money(ctx.total)}`,
      ctx.deposit ? `Anticipo para reservar (${ctx.depositPct}%): ${money(ctx.deposit)}` : null,
      ctx.valid ? `Oferta válida hasta: ${niceDate(ctx.valid)}` : null,
      '',
      'Encontrarás el detalle completo en el PDF adjunto. Si tienes alguna pregunta, responde este correo o escríbenos por WhatsApp.',
      '',
      'Saludos,',
      comp.name || '',
      [comp.phone, comp.email].filter(Boolean).join(' · ')
    ];
    return lines.filter(l => l !== null).join('\n');
  }

  function buildHtml(ctx, messageText) {
    const comp = company();
    const paras = esc(messageText).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('');
    const rows = ctx.rows.filter(r => r[1]).map(r => `<tr><td style="padding:6px 0;color:#5B6B77;font-size:13px">${esc(r[0])}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#10283A">${esc(r[1])}</td></tr>`).join('');
    return `<!doctype html><html><body style="margin:0;padding:0;background:#F7F3EC">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E6DED0;font-family:Arial,Helvetica,sans-serif;color:#10283A">
<tr><td style="background:#0B5D7E;padding:22px 28px;color:#ffffff"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.85">Cotización ${esc(ctx.number)}</div><div style="font-size:20px;font-weight:700;margin-top:4px">${esc(comp.name || '')}</div></td></tr>
<tr><td style="padding:26px 28px 6px;font-size:14px;line-height:1.55">${paras}</td></tr>
<tr><td style="padding:0 28px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;border:1px solid #E6DED0;border-radius:10px;padding:10px 16px">${rows}
<tr><td colspan="2" style="border-top:1px solid #E6DED0;padding-top:10px"></td></tr>
<tr><td style="font-size:15px;font-weight:700">Total</td><td style="text-align:right;font-size:18px;font-weight:700;color:#0B5D7E">${esc(money(ctx.total))}</td></tr>
${ctx.deposit ? `<tr><td style="font-size:13px;color:#5B6B77;padding-top:4px">Anticipo para reservar (${esc(ctx.depositPct)}%)</td><td style="text-align:right;font-size:14px;font-weight:700;color:#237046;padding-top:4px">${esc(money(ctx.deposit))}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:16px 28px 26px;font-size:12px;color:#5B6B77;border-top:1px solid #F1EBE0">${esc(comp.name || '')}${comp.nit ? ' · NIT ' + esc(comp.nit) : ''}${comp.rnt ? ' · RNT ' + esc(comp.rnt) : ''}<br>${esc([comp.phone, comp.email, comp.address].filter(Boolean).join(' · '))}</td></tr>
</table></td></tr></table></body></html>`;
  }

  // ---------------------------------------------------------------------------
  // Ventana "Enviar por correo"
  // ---------------------------------------------------------------------------
  let current = null;
  function ensureModal() {
    if (document.getElementById('modal-xp-email')) return;
    const m = document.createElement('div');
    m.id = 'modal-xp-email';
    m.className = 'hidden fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-3 sm:p-4';
    m.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="xp-email-title">
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">${ico(MAIL_ICO)}</span>
            <div class="min-w-0"><h3 id="xp-email-title" class="text-base font-bold text-slate-900 dark:text-white">Enviar cotización por correo</h3><p id="xp-email-sub" class="text-xs text-slate-500 truncate"></p></div>
          </div>
          <button type="button" onclick="xpCloseEmailModal()" class="w-11 h-11 sm:w-9 sm:h-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer" aria-label="Cerrar">${ico('<path d="M18 6L6 18M6 6l12 12"/>')}</button>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto text-xs">
          <div id="xp-email-config-warn" class="hidden p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs"></div>
          <div><label for="xp-email-to" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Para *</label><input id="xp-email-to" type="email" multiple autocomplete="email" placeholder="correo@cliente.com" class="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" /></div>
          <div><label for="xp-email-cc" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Con copia a <span class="font-normal text-slate-400">(opcional, separa con coma)</span></label><input id="xp-email-cc" type="text" placeholder="otro@correo.com" class="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" /></div>
          <div><label for="xp-email-subject" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Asunto *</label><input id="xp-email-subject" type="text" class="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" /></div>
          <div><label for="xp-email-body" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Mensaje</label><textarea id="xp-email-body" rows="10" class="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm leading-relaxed bg-white dark:bg-slate-800 text-slate-900 dark:text-white"></textarea>
            <p class="text-[11px] text-slate-400 mt-1">El correo incluye además un resumen con el total y el anticipo, y los datos de tu empresa.</p></div>
          <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"><input id="xp-email-attach" type="checkbox" checked class="w-5 h-5" /><span><strong class="text-slate-800 dark:text-slate-100">Adjuntar la cotización en PDF</strong><span id="xp-email-attach-name" class="block text-[11px] text-slate-500"></span></span></label>
        </div>
        <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-2">
          <button type="button" onclick="xpCloseEmailModal()" class="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer">Cancelar</button>
          <button type="button" id="xp-email-send" onclick="xpSendEmailNow()" class="xp-btn-primary min-h-[44px]">${ico(MAIL_ICO)}<span>Enviar correo</span></button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) closeModal_(); });
    document.body.appendChild(m);
  }
  function closeModal_() { document.getElementById('modal-xp-email')?.classList.add('hidden'); current = null; }
  window.xpCloseEmailModal = closeModal_;

  async function openEmailModal(kind) {
    if (typeof hasPermission === 'function' && typeof getCurrentUser === 'function' && getCurrentUser()?.role === 'Consulta') return showToast('Tu usuario es de solo lectura');
    const ctx = contextFor(kind);
    if (!ctx) return showToast('Primero abre o crea una cotización');
    if (!ctx.client || !ctx.client.name) return showToast('Selecciona un cliente para la cotización');
    ensureModal();
    current = ctx;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('xp-email-to', ctx.client.email || '');
    set('xp-email-cc', '');
    set('xp-email-subject', ctx.subject);
    set('xp-email-body', defaultMessage(ctx));
    document.getElementById('xp-email-sub').textContent = `${ctx.number} · ${ctx.client.name}`;
    document.getElementById('xp-email-attach-name').textContent = ctx.filename;
    const warn = document.getElementById('xp-email-config-warn');
    warn.classList.add('hidden');
    document.getElementById('modal-xp-email').classList.remove('hidden');
    setTimeout(() => document.getElementById(ctx.client.email ? 'xp-email-subject' : 'xp-email-to')?.focus(), 50);
    try {
      const j = await api('GET');
      if (!j.smtp.configured) {
        warn.innerHTML = `El correo de la empresa aún no está configurado. Un administrador debe llenarlo en <button type="button" class="font-bold underline cursor-pointer" onclick="xpCloseEmailModal(); switchView('empresa'); window.xpEmpresaTab && xpEmpresaTab('correo'); setTimeout(()=>document.getElementById('xp-smtp-card')?.scrollIntoView({behavior:'smooth'}),300)">Mi Empresa → Correo para enviar cotizaciones</button>.`;
        warn.classList.remove('hidden');
      }
    } catch (e) {
      warn.textContent = e.message;
      warn.classList.remove('hidden');
    }
  }
  window.xpOpenEmailModal = openEmailModal;

  async function sendNow() {
    if (!current) return;
    const ctx = current;
    const to = document.getElementById('xp-email-to').value.trim();
    const cc = document.getElementById('xp-email-cc').value.trim();
    const subject = document.getElementById('xp-email-subject').value.trim();
    const bodyText = document.getElementById('xp-email-body').value;
    const attach = document.getElementById('xp-email-attach').checked;
    if (!to) return showToast('Escribe el correo del cliente');
    if (!subject) return showToast('Escribe el asunto');
    const btn = document.getElementById('xp-email-send');
    const label = btn.querySelector('span');
    btn.disabled = true;
    const setLabel = t => { if (label) label.textContent = t; };
    try {
      const attachments = [];
      if (attach) {
        setLabel('Generando PDF…');
        const base64 = await sheetToPdfBase64(document.getElementById(ctx.sheetId));
        attachments.push({ filename: ctx.filename, contentType: 'application/pdf', base64 });
      }
      setLabel('Enviando…');
      const r = await api('POST', { action: 'send', to, cc, subject, text: bodyText + '\n', html: buildHtml(ctx, bodyText), attachments });
      closeModal_();
      try { ctx.afterSend(); } catch (e) { console.warn(e); }
      // Guardar el correo en la ficha del cliente si no lo tenía
      const first = r.sentTo && r.sentTo[0];
      if (first && ctx.client && !ctx.client.email) { ctx.client.email = first; if (typeof saveState === 'function') saveState(); }
      showToast(`Correo enviado a ${r.sentTo.join(', ')}`);
    } catch (e) {
      const warn = document.getElementById('xp-email-config-warn');
      if (warn) { warn.textContent = e.message; warn.classList.remove('hidden'); }
      showToast(e.message);
    } finally {
      btn.disabled = false;
      setLabel('Enviar correo');
    }
  }
  window.xpSendEmailNow = sendNow;

  // ---------------------------------------------------------------------------
  // Botones "Enviar por correo"
  // ---------------------------------------------------------------------------
  function addButtons() {
    const mk = (kind, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.dataset.xpEmail = kind;
      b.innerHTML = `${ico(MAIL_ICO)}<span>Enviar por correo</span>`;
      b.addEventListener('click', () => openEmailModal(kind));
      return b;
    };
    // Eventos: junto a "Descargar PDF"
    const ev = document.getElementById('btn-download-pdf');
    if (ev && !document.querySelector('[data-xp-email="event"]')) ev.insertAdjacentElement('afterend', mk('event', 'px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5 cursor-pointer'));
    // Cabañas: barra de la vista previa
    document.querySelectorAll('#hos-preview-fullscreen button[onclick="downloadCabinQuotePdf()"]').forEach((btn, i) => {
      if (btn.nextElementSibling?.dataset?.xpEmail) return;
      btn.insertAdjacentElement('afterend', mk('cabin', i === 0
        ? 'min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50'
        : 'w-full py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50'));
    });
    // Día de sol: junto a WhatsApp
    const ds = document.querySelector('#ds-panel-preview button[onclick="shareDayPassWhatsApp()"]');
    if (ds && !document.querySelector('[data-xp-email="daypass"]')) ds.insertAdjacentElement('afterend', mk('daypass', 'w-full min-h-[44px] px-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50'));
  }

  // ---------------------------------------------------------------------------
  // Mi Empresa → Correo para enviar cotizaciones
  // ---------------------------------------------------------------------------
  const PRESETS = {
    gmail: { host: 'smtp.gmail.com', port: 465, secure: true, help: 'Gmail: activa la verificación en dos pasos y crea una "contraseña de aplicación" en tu cuenta de Google (Seguridad → Contraseñas de aplicaciones). Usa esa contraseña aquí, no la normal.' },
    outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false, help: 'Outlook / Hotmail: si tu cuenta tiene verificación en dos pasos, crea una contraseña de aplicación en account.microsoft.com.' },
    office365: { host: 'smtp.office365.com', port: 587, secure: false, help: 'Microsoft 365 (correo corporativo): el administrador debe tener habilitado "SMTP AUTH" para el buzón.' },
    zoho: { host: 'smtp.zoho.com', port: 465, secure: true, help: 'Zoho Mail: usa tu correo y contraseña (o contraseña de aplicación si tienes verificación en dos pasos).' },
    hostinger: { host: 'smtp.hostinger.com', port: 465, secure: true, help: 'Hostinger: usa el correo completo y la contraseña del buzón.' },
    cpanel: { host: 'mail.tudominio.com', port: 465, secure: true, help: 'Hosting con cPanel: el servidor suele ser mail.tudominio.com, puerto 465 con SSL.' },
    other: { help: 'Pide a tu proveedor de correo el servidor SMTP, el puerto (465 con SSL o 587) y usa tu correo y contraseña.' }
  };

  function smtpVal(id) { return document.getElementById(id)?.value ?? ''; }
  function fillSmtpForm(s) {
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? ''; };
    set('xp-smtp-host', s.host); set('xp-smtp-port', s.port || 587); set('xp-smtp-secure', s.secure);
    set('xp-smtp-user', s.user); set('xp-smtp-from-name', s.fromName || company().name || ''); set('xp-smtp-from-email', s.fromEmail || s.user || company().email || '');
    set('xp-smtp-reply', s.replyTo); set('xp-smtp-bcc', s.bccSelf); set('xp-smtp-pass', '');
    const pass = document.getElementById('xp-smtp-pass');
    if (pass) pass.placeholder = s.hasPassword ? '•••••••• (guardada; escribe solo si quieres cambiarla)' : 'Contraseña o contraseña de aplicación';
    const st = document.getElementById('xp-smtp-status');
    if (st) {
      st.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold ' + (s.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800');
      st.textContent = s.configured ? 'Configurado' : 'Sin configurar';
    }
    const preset = Object.entries(PRESETS).find(([, p]) => p.host && p.host === s.host);
    set('xp-smtp-preset', preset ? preset[0] : (s.host ? 'other' : 'gmail'));
    showPresetHelp();
  }
  function showPresetHelp() {
    const p = PRESETS[smtpVal('xp-smtp-preset')] || PRESETS.other;
    const h = document.getElementById('xp-smtp-help');
    if (h) h.textContent = p.help || '';
  }
  window.xpSmtpPreset = () => {
    const p = PRESETS[smtpVal('xp-smtp-preset')];
    if (p && p.host) {
      document.getElementById('xp-smtp-host').value = p.host;
      document.getElementById('xp-smtp-port').value = p.port;
      document.getElementById('xp-smtp-secure').checked = p.secure;
    }
    showPresetHelp();
  };
  window.xpSmtpPortChanged = () => {
    const port = Number(smtpVal('xp-smtp-port'));
    if (port === 465) document.getElementById('xp-smtp-secure').checked = true;
    if (port === 587 || port === 25) document.getElementById('xp-smtp-secure').checked = false;
  };

  async function loadSmtpCard() {
    const card = document.getElementById('xp-smtp-card');
    if (!card) return;
    const isAdmin = typeof getCurrentUser !== 'function' || (getCurrentUser()?.role || 'Administrador') === 'Administrador';
    card.querySelectorAll('input, select, button[data-admin]').forEach(el => { el.disabled = !isAdmin; });
    document.getElementById('xp-smtp-admin-note')?.classList.toggle('hidden', isAdmin);
    try {
      const j = await api('GET');
      fillSmtpForm(j.smtp);
      document.getElementById('xp-smtp-offline')?.classList.add('hidden');
    } catch (e) {
      const off = document.getElementById('xp-smtp-offline');
      if (off) { off.textContent = e.message; off.classList.remove('hidden'); }
    }
  }
  window.xpLoadSmtpCard = loadSmtpCard;

  async function saveSmtp(silent) {
    const payload = {
      action: 'save',
      host: smtpVal('xp-smtp-host').trim(), port: Number(smtpVal('xp-smtp-port')), secure: document.getElementById('xp-smtp-secure').checked,
      user: smtpVal('xp-smtp-user').trim(), password: smtpVal('xp-smtp-pass'),
      fromName: smtpVal('xp-smtp-from-name').trim(), fromEmail: smtpVal('xp-smtp-from-email').trim(),
      replyTo: smtpVal('xp-smtp-reply').trim(), bccSelf: document.getElementById('xp-smtp-bcc').checked
    };
    const j = await api('POST', payload);
    fillSmtpForm(j.smtp);
    if (!silent) showToast('Configuración de correo guardada');
    return j;
  }
  window.xpSaveSmtp = async () => { try { await saveSmtp(); } catch (e) { showToast(e.message); } };
  window.xpTestSmtp = async () => {
    const btn = document.getElementById('xp-smtp-test');
    const to = smtpVal('xp-smtp-test-to').trim() || smtpVal('xp-smtp-from-email').trim();
    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Enviando prueba…'; }
    try {
      await saveSmtp(true);
      await api('POST', { action: 'test', to });
      showToast(`Correo de prueba enviado a ${to}. Revisa la bandeja de entrada (y spam).`);
    } catch (e) {
      showToast(e.message);
      const off = document.getElementById('xp-smtp-offline');
      if (off) { off.textContent = e.message; off.classList.remove('hidden'); }
    } finally {
      if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Guardar y enviar prueba'; }
    }
  };

  const prevSwitch = window.switchView;
  if (typeof prevSwitch === 'function') {
    window.switchView = function (v, ...rest) {
      const r = prevSwitch.call(this, v, ...rest);
      if (v === 'empresa') setTimeout(loadSmtpCard, 50);
      setTimeout(addButtons, 50);
      return r;
    };
  }
  const init = () => { addButtons(); ensureModal(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
