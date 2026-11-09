/* Xander Pro — 19-seguimiento: a quién llamar hoy
 *
 * Arma la lista de seguimiento de Inicio con las cotizaciones de las tres
 * líneas (eventos, cabañas, día de sol):
 *  - Enviadas sin respuesta hace 3 días o más (con botón de WhatsApp de seguimiento)
 *  - Que vencen en los próximos 7 días
 *  - Aprobadas que piden anticipo y aún no tienen el pago registrado en Finanzas
 *  - Clientes que abrieron el link de la cotización pero no la han aceptado
 *  - Recordatorio de copia de seguridad
 * "Hecho" guarda la fecha del seguimiento en la cotización y la vuelve a mostrar en 3 días.
 * Solo agrega campos nuevos a las cotizaciones (sentAt, followUps, nextFollowUp).
 */
(function () {
  const FOLLOW_DAYS = 3;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const today0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const days = (a, b) => Math.round((a - b) / 86400000);
  const COLL = { evento: 'savedQuotes', cabana: 'cabinQuotes', diasol: 'dayPassQuotes', combinada: 'comboQuotes' };

  function rec(kind, id) {
    const arr = state[COLL[kind]] || [];
    return arr.find(x => x && String(x.id) === String(id)) || null;
  }
  window.xpQuoteRecord = rec;

  // Campos de seguimiento que viven en la cotización guardada y no se deben perder al volver a guardar
  const TRACK_KEYS = ['sentAt', 'followUps', 'nextFollowUp', 'acceptedOnline', 'depositConfirmed'];
  window.xpKeepTrackingFields = function (prev, next) {
    if (!prev || !next) return next;
    TRACK_KEYS.forEach(k => { if (prev[k] !== undefined) next[k] = prev[k]; });
    return next;
  };

  function client(r) { return (state.clients || []).find(c => c.id === r?.clientId) || {}; }
  function phoneTo(p) { const d = String(p || '').replace(/\D/g, ''); return d ? (d.length === 10 ? '57' + d : d) : ''; }
  function baseNumber(n) { return String(n || '').replace(/\s+V\d+$/i, '').trim(); }

  function depositOf(kind, r) {
    if (!r) return 0;
    if (kind === 'evento') {
      const fc = r.fullCopy || r;
      try { return typeof xpQuoteTotals === 'function' ? xpQuoteTotals(fc).deposit : 0; } catch { return 0; }
    }
    const p = r.pricing || {};
    return p.requiresDeposit === false ? 0 : Number(p.deposit) || 0;
  }
  function paymentRegistered(r) {
    const n = baseNumber(r?.number);
    if (!n) return false;
    return (state.finances || []).some(f => f && f.type === 'ingreso' && String(f.concept || '').includes(n));
  }

  // Las cotizaciones "Enviada" sin fecha de envío toman la fecha de creación (una sola vez)
  function stampSent(list) {
    let changed = false;
    list.forEach(x => {
      const r = rec(x.kind, x.id);
      if (r && r.status === 'Enviada' && !r.sentAt) { r.sentAt = x.issued ? ymd(x.issued) : ymd(today0()); changed = true; }
    });
    if (changed && typeof saveState === 'function') saveState();
  }

  function lastBackupDays() {
    let last = null;
    try { last = localStorage.getItem('xp_last_backup'); } catch { /* */ }
    const d = parse(last);
    return d ? days(today0(), d) : null;
  }

  // Lista de pendientes. "all" = salida de xpAllQuotes() de Inicio.
  window.xpFollowUpItems = function (all) {
    const t = today0();
    const items = [];
    stampSent(all);
    const shares = window.xpShareIndex ? window.xpShareIndex() : {};
    all.forEach(x => {
      const r = rec(x.kind, x.id);
      if (!r) return;
      const next = parse(r.nextFollowUp);
      const snoozed = next && next > t;
      const key = `'${x.kind}','${x.id}'`;
      const sh = shares[x.kind + ':' + x.id];
      // Abrió el link y no ha respondido
      if (sh && sh.viewedAt && !sh.acceptedAt && ['Enviada', 'Borrador'].includes(x.status) && !snoozed) {
        items.push({ prio: 1, dot: '#0FA3A3', title: `${x.client} abrió ${x.number}`, sub: `La vio ${sh.viewCount > 1 ? sh.viewCount + ' veces' : 'una vez'} · aún no la acepta · ${money(x.total)}`,
          actions: [{ label: 'WhatsApp', go: `xpFollowUpWhatsApp(${key})`, primary: true }, { label: 'Hecho', go: `xpFollowUpDone(${key})` }, { label: 'Abrir', go: `xpOpenQuote(${key})` }] });
        return;
      }
      // Enviada sin respuesta
      if (x.status === 'Enviada' && !snoozed) {
        const sent = parse(r.sentAt) || x.issued;
        const n = sent ? days(t, sent) : 0;
        if (n >= FOLLOW_DAYS || next) {
          const nf = (r.followUps || []).length;
          items.push({ prio: 2, dot: '#B45309', title: `${x.number} sin respuesta hace ${n} día${n === 1 ? '' : 's'}`, sub: `${x.client} · ${money(x.total)}${nf ? ` · ${nf} seguimiento(s) hecho(s)` : ''}`,
            actions: [{ label: 'WhatsApp', go: `xpFollowUpWhatsApp(${key})`, primary: true }, { label: 'Hecho', go: `xpFollowUpDone(${key})` }, { label: 'Abrir', go: `xpOpenQuote(${key})` }] });
          return;
        }
      }
      // Vence pronto
      if (['Borrador', 'Enviada'].includes(x.status) && x.valid && !snoozed) {
        const dd = days(x.valid, t);
        if (dd >= 0 && dd <= 7) {
          items.push({ prio: dd <= 1 ? 0 : 3, dot: dd <= 1 ? '#C2410C' : '#B45309', title: `${x.number} ${dd === 0 ? 'vence hoy' : dd === 1 ? 'vence mañana' : `vence en ${dd} días`}`, sub: `${x.client} · ${money(x.total)}`,
            actions: [{ label: 'WhatsApp', go: `xpFollowUpWhatsApp(${key})`, primary: true }, { label: 'Abrir', go: `xpOpenQuote(${key})` }] });
          return;
        }
      }
      // Aprobada sin anticipo registrado
      if (x.status === 'Aprobada' && !r.depositConfirmed) {
        const dep = depositOf(x.kind, r);
        const future = !x.date || days(x.date, t) >= 0;
        if (dep > 0 && future && !paymentRegistered(r)) {
          items.push({ prio: 2, dot: '#2563EB', title: `${x.number} aprobada sin anticipo registrado`, sub: `${x.client} · anticipo ${money(dep)}`,
            actions: [{ label: 'Ya pagó', go: `xpFollowUpDepositPaid(${key})`, primary: true }, { label: 'Abrir', go: `xpOpenQuote(${key})` }] });
        }
      }
      // Borrador olvidado
      if (x.status === 'Borrador' && x.issued && days(t, x.issued) >= 3 && !snoozed) {
        items.push({ prio: 5, dot: '#94A3B8', title: `${x.number} sigue en borrador`, sub: `${x.client} · creada hace ${days(t, x.issued)} días`,
          actions: [{ label: 'Terminar', go: `xpOpenQuote(${key})`, primary: true }, { label: 'Después', go: `xpFollowUpDone(${key}, true)` }] });
      }
    });
    // Copia de seguridad
    const lb = lastBackupDays();
    const cloudOn = !!(window.XPCloud && window.XPCloud.cloud && window.XPCloud.cloud.active());
    const limit = cloudOn ? 30 : 7;
    if (lb === null ? (all.length > 0) : lb >= limit) {
      items.push({ prio: 6, dot: '#64748B', title: lb === null ? 'Descarga tu primera copia de seguridad' : `Hace ${lb} días no descargas una copia de seguridad`,
        sub: cloudOn ? 'Tus datos están en la nube; la copia es un respaldo extra en tu computador.' : 'Tus datos solo están en este dispositivo: guarda una copia.',
        actions: [{ label: 'Descargar copia', go: 'xpDownloadBackup()', primary: true }] });
    }
    return items.sort((a, b) => a.prio - b.prio);
  };

  window.xpFollowUpDone = function (kind, id, silent) {
    const r = rec(kind, id);
    if (!r) return;
    const t = today0();
    const next = new Date(t); next.setDate(next.getDate() + FOLLOW_DAYS);
    r.followUps = Array.isArray(r.followUps) ? r.followUps : [];
    if (!silent) r.followUps.push({ date: ymd(t), by: typeof getOperatorName === 'function' ? getOperatorName() : '' });
    r.nextFollowUp = ymd(next);
    if (r.fullCopy) { r.fullCopy.followUps = r.followUps; r.fullCopy.nextFollowUp = r.nextFollowUp; }
    if (typeof saveState === 'function') saveState();
    if (typeof showToast === 'function') showToast(silent ? 'Te la recuerdo en 3 días' : 'Seguimiento registrado. Te la recuerdo en 3 días si no responde');
    if (typeof renderXpHome === 'function') renderXpHome();
  };

  window.xpFollowUpDepositPaid = function (kind, id) {
    const r = rec(kind, id);
    if (!r) return;
    if (!confirm('¿El cliente ya pagó el anticipo?\n\nSe quita de pendientes. Si quieres que aparezca en Finanzas, regístralo allí como ingreso.')) return;
    r.depositConfirmed = ymd(today0());
    if (typeof saveState === 'function') saveState();
    if (typeof renderXpHome === 'function') renderXpHome();
  };

  window.xpFollowUpWhatsApp = function (kind, id) {
    const r = rec(kind, id);
    if (!r) return;
    const cl = client(r);
    const first = String(cl.name || '').split(/[\s&,]+/)[0] || '';
    const comp = (state.company && state.company.name) || '';
    const all = window.xpAllQuotes ? window.xpAllQuotes() : [];
    const x = all.find(q => q.kind === kind && String(q.id) === String(id)) || {};
    const sh = window.xpShareIndex ? window.xpShareIndex()[kind + ':' + id] : null;
    const what = kind === 'cabana' ? 'el hospedaje' : kind === 'diasol' ? 'el día de sol' : (x.title ? `"${x.title}"` : 'tu evento');
    const valid = x.valid ? ` Los precios se mantienen hasta el ${typeof formatDateHuman === 'function' ? formatDateHuman(ymd(x.valid)) : ymd(x.valid)}.` : '';
    const msg = [
      `Hola${first ? ' ' + first : ''}, te saluda ${comp || 'nuestro equipo'}.`,
      `Quería saber si pudiste revisar la cotización ${baseNumber(r.number)} para ${what} por ${money(x.total || 0)}.${valid}`,
      sh && sh.url ? `Puedes verla y aceptarla aquí: ${sh.url}` : '',
      '¿Tienes alguna pregunta o quieres que ajustemos algo? Con gusto te ayudo.'
    ].filter(Boolean).join('\n\n');
    window.open(`https://wa.me/${phoneTo(cl.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
    // Abrir WhatsApp cuenta como seguimiento hecho
    window.xpFollowUpDone(kind, id, false);
  };

  window.xpDownloadBackup = function () {
    const btn = document.getElementById('btn-export-backup');
    if (btn) btn.click();
    else {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `respaldo_xander_pro_${ymd(new Date())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    try { localStorage.setItem('xp_last_backup', ymd(new Date())); } catch { /* */ }
    if (typeof renderXpHome === 'function') setTimeout(renderXpHome, 50);
  };
  // El botón de respaldo de Mi Empresa también cuenta como copia descargada
  document.addEventListener('click', e => {
    if (e.target && e.target.closest && e.target.closest('#btn-export-backup')) {
      try { localStorage.setItem('xp_last_backup', ymd(new Date())); } catch { /* */ }
    }
  }, true);
})();
