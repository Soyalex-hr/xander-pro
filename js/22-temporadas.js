/* Xander Pro — 22-temporadas: precios por temporada para cabañas y día de sol
 *
 * Cada temporada tiene un rango de fechas que se repite todos los años (ej. 15 dic – 15 ene),
 * un % de ajuste (+20 % temporada alta, -10 % temporada baja) y a qué aplica.
 * - Cabañas: el % se aplica al hospedaje (cabaña y personas adicionales) por cada noche que cae
 *   en la temporada, y aparece como una línea aparte en la cotización y el PDF.
 * - Día de sol: el % se aplica a las entradas según la fecha de la visita.
 * En cada cotización se puede quitar el ajuste ("No aplicar"). Se guarda en state.seasons (se sincroniza).
 */
(function () {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { if (typeof showToast === 'function') showToast(m); };
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const md = iso => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[1]}-${m[2]}` : ''; };
  const mdLabel = v => { const m = /^(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${+m[2]} ${MONTHS[+m[1] - 1]}` : ''; };
  const pctTxt = p => `${p > 0 ? '+' : ''}${p} %`;

  function seasons() { if (!Array.isArray(state.seasons)) state.seasons = []; return state.seasons; }

  function inRange(mdv, from, to) {
    if (!mdv || !from || !to) return false;
    return from <= to ? (mdv >= from && mdv <= to) : (mdv >= from || mdv <= to); // cruza fin de año
  }

  // Temporada que aplica en una fecha (si hay varias, la de mayor ajuste)
  window.xpSeasonFor = function (kind, iso) {
    const d = md(iso);
    if (!d) return null;
    const hits = seasons().filter(s => s && s.active !== false && (s.appliesTo ? s.appliesTo[kind] !== false : true) && Number(s.pct) && inRange(d, s.from, s.to));
    if (!hits.length) return null;
    const s = hits.sort((a, b) => Math.abs(Number(b.pct)) - Math.abs(Number(a.pct)))[0];
    return { id: s.id, name: s.name, pct: Number(s.pct), label: `${s.name || 'Temporada'} (${pctTxt(Number(s.pct))})` };
  };

  // Promedio por noche de una estadía (las noches fuera de temporada cuentan 0 %)
  window.xpSeasonForStay = function (kind, inIso, nights) {
    const n = Math.max(0, Number(nights) || 0);
    if (!inIso || !n) return null;
    const start = new Date(inIso + 'T00:00:00');
    let sum = 0, hit = 0;
    const names = new Set();
    for (let i = 0; i < n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const s = window.xpSeasonFor(kind, iso);
      if (s) { sum += s.pct; hit++; names.add(s.name || 'Temporada'); }
    }
    if (!hit) return null;
    const avg = sum / n; // exacto para el cálculo; se redondea solo al mostrarlo
    const single = hit === n && names.size === 1;
    const name = [...names].join(' / ');
    return { avgPct: avg, nights: hit, label: single ? `${name} (${pctTxt(Math.round(avg * 10) / 10)})` : `${name} (${hit} de ${n} noches)` };
  };

  // ---------------------------------------------------------------------------
  // Aviso en el cotizador con opción de quitar el ajuste
  // ---------------------------------------------------------------------------
  function banner(id, anchor, info, off, onToggle) {
    let el = document.getElementById(id);
    if (!anchor) { if (el) el.remove(); return; }
    if (!info && !off) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'xp-season-banner'; anchor.insertAdjacentElement('afterend', el); }
    el.innerHTML = off
      ? `<span>Precio de temporada desactivado en esta cotización.</span><button type="button">Volver a aplicar</button>`
      : `<span>📅 <strong>${esc(info.label)}</strong> aplicada al precio.</span><button type="button">No aplicar</button>`;
    el.querySelector('button').onclick = onToggle;
  }

  function cabinBanner() {
    const q = state.activeCabinQuote;
    const anchor = document.getElementById('hos-nightly-rate-input')?.closest('.grid') || document.getElementById('hos-nightly-rate-input')?.parentElement?.parentElement;
    if (!q) return;
    const p = q.pricing || {};
    const info = p.seasonAdjust ? { label: p.seasonLabel } : null;
    banner('xp-season-cabin', anchor, info, !!q.seasonOff && !!window.xpSeasonForStay('cabana', q.checkInDate, q.nights), () => {
      q.seasonOff = !q.seasonOff; if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
    });
  }
  function dayPassBanner() {
    const q = state.activeDayPass;
    const anchor = document.querySelector('#ds-panel-edit .xp-ds-pax-grid');
    if (!q) return;
    const s = window.xpSeasonFor('diasol', q.date);
    banner('xp-season-ds', anchor, q.seasonOff ? null : s, !!q.seasonOff && !!s, () => {
      q.seasonOff = !q.seasonOff; if (typeof recalcDayPass === 'function') recalcDayPass(false);
    });
  }
  const wrap = (name, after) => {
    const prev = window[name];
    if (typeof prev !== 'function') return;
    window[name] = function () { const r = prev.apply(this, arguments); try { after(); } catch (e) { console.warn('Temporadas:', e); } return r; };
  };
  wrap('recalculateCabinQuoteLive', cabinBanner);
  wrap('recalcDayPass', dayPassBanner);

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------
  function modal() {
    let m = document.getElementById('modal-xp-seasons');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-xp-seasons';
    m.className = 'hidden fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    m.innerHTML = `<div class="xp-pm bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-xl" role="dialog" aria-modal="true" aria-labelledby="xp-seasons-t">
      <div class="xp-pm-head"><div class="min-w-0"><h3 id="xp-seasons-t" class="text-base font-bold">Temporadas y precios especiales</h3>
        <p class="text-[11px] xp-pm-muted">Suben o bajan el precio de cabañas y día de sol según la fecha. Se repiten todos los años.</p></div>
        <button type="button" class="xp-pm-x" aria-label="Cerrar" onclick="document.getElementById('modal-xp-seasons').classList.add('hidden')">✕</button></div>
      <div class="xp-pm-body"><div id="xp-seasons-list" class="xp-seasons-list"></div>
        <div class="xp-pm-sec mt-4" id="xp-season-form-t">Nueva temporada</div>
        <input type="hidden" id="xp-season-id" />
        <div class="xp-season-form">
          <div class="xp-pm-f xp-sf-name"><label for="xp-season-name">Nombre</label><input id="xp-season-name" placeholder="Ej. Temporada alta diciembre" /></div>
          <div class="xp-pm-f"><label for="xp-season-from">Desde</label><input id="xp-season-from" type="date" /></div>
          <div class="xp-pm-f"><label for="xp-season-to">Hasta</label><input id="xp-season-to" type="date" /></div>
          <div class="xp-pm-f"><label for="xp-season-pct">Ajuste (%)</label><input id="xp-season-pct" type="number" step="1" min="-90" max="300" placeholder="Ej. 20 o -10" /></div>
          <div class="xp-sf-checks">
            <label class="xp-pm-active"><input type="checkbox" id="xp-season-cab" checked /> Cabañas</label>
            <label class="xp-pm-active"><input type="checkbox" id="xp-season-ds" checked /> Día de sol</label>
          </div>
        </div>
        <p class="text-[11px] xp-pm-muted mt-2">El año de las fechas no importa: la temporada se aplica cada año en esos días. Usa un % negativo para temporada baja o promociones.</p>
      </div>
      <div class="xp-pm-foot"><button type="button" class="xp-pm-btn" id="xp-season-reset">Limpiar</button>
        <div class="flex gap-2"><button type="button" class="xp-pm-btn" onclick="document.getElementById('modal-xp-seasons').classList.add('hidden')">Cerrar</button><button type="button" class="xp-pm-btn xp-pm-primary" id="xp-season-save">Guardar temporada</button></div></div>
    </div>`;
    document.body.appendChild(m);
    m.querySelector('#xp-season-save').onclick = save;
    m.querySelector('#xp-season-reset').onclick = () => fill(null);
    return m;
  }
  const y = new Date().getFullYear();
  function fill(s) {
    const $ = id => document.getElementById(id);
    $('xp-season-id').value = s ? s.id : '';
    $('xp-season-name').value = s ? s.name || '' : '';
    $('xp-season-from').value = s && s.from ? `${y}-${s.from}` : '';
    $('xp-season-to').value = s && s.to ? `${s.to < s.from ? y + 1 : y}-${s.to}` : '';
    $('xp-season-pct').value = s ? s.pct : '';
    $('xp-season-cab').checked = s ? s.appliesTo?.cabana !== false : true;
    $('xp-season-ds').checked = s ? s.appliesTo?.diasol !== false : true;
    $('xp-season-form-t').textContent = s ? `Editar: ${s.name}` : 'Nueva temporada';
    $('xp-season-save').textContent = s ? 'Guardar cambios' : 'Guardar temporada';
  }
  function renderList() {
    const box = document.getElementById('xp-seasons-list');
    const list = seasons().slice().sort((a, b) => String(a.from).localeCompare(String(b.from)));
    box.innerHTML = list.length ? list.map(s => `
      <div class="xp-season-row ${s.active === false ? 'is-off' : ''}">
        <span class="xp-season-pct ${Number(s.pct) < 0 ? 'neg' : ''}">${pctTxt(Number(s.pct) || 0)}</span>
        <span class="xp-season-main"><strong>${esc(s.name)}</strong><small>${mdLabel(s.from)} – ${mdLabel(s.to)} · ${[s.appliesTo?.cabana !== false ? 'Cabañas' : '', s.appliesTo?.diasol !== false ? 'Día de sol' : ''].filter(Boolean).join(' y ') || 'Sin aplicar'}${s.active === false ? ' · pausada' : ''}</small></span>
        <span class="xp-season-acts">
          <button type="button" class="xp-fu-btn" data-act="edit" data-id="${esc(s.id)}">Editar</button>
          <button type="button" class="xp-fu-btn" data-act="toggle" data-id="${esc(s.id)}">${s.active === false ? 'Activar' : 'Pausar'}</button>
          <button type="button" class="xp-fu-btn" data-act="del" data-id="${esc(s.id)}" aria-label="Eliminar ${esc(s.name)}">✕</button>
        </span>
      </div>`).join('') : '<p class="text-xs xp-pm-muted">Aún no tienes temporadas. Crea la primera abajo, por ejemplo "Temporada alta" del 15 de diciembre al 15 de enero con +20 %.</p>';
    box.querySelectorAll('button[data-act]').forEach(b => b.onclick = () => {
      const s = seasons().find(x => x.id === b.dataset.id); if (!s) return;
      if (b.dataset.act === 'edit') return fill(s);
      if (b.dataset.act === 'toggle') s.active = s.active === false;
      if (b.dataset.act === 'del') { if (!confirm(`¿Eliminar la temporada "${s.name}"? Las cotizaciones ya guardadas conservan su precio.`)) return; state.seasons = seasons().filter(x => x.id !== s.id); }
      persist();
    });
  }
  function persist() {
    if (typeof saveState === 'function') saveState();
    renderList();
    try { if (state.activeCabinQuote && typeof recalculateCabinQuoteLive === 'function' && !document.getElementById('view-cotizador-cabanas')?.classList.contains('hidden')) recalculateCabinQuoteLive(); } catch { /* */ }
    try { if (state.activeDayPass && typeof recalcDayPass === 'function' && !document.getElementById('view-dia-sol')?.classList.contains('hidden')) recalcDayPass(false); } catch { /* */ }
  }
  function save() {
    const $ = id => document.getElementById(id);
    const name = $('xp-season-name').value.trim();
    const from = md($('xp-season-from').value), to = md($('xp-season-to').value);
    const pct = Number($('xp-season-pct').value);
    if (!name) return toast('Escribe el nombre de la temporada');
    if (!from || !to) return toast('Elige las fechas desde y hasta');
    if (!pct || pct < -90 || pct > 300) return toast('Escribe un ajuste entre -90 % y 300 % (distinto de 0)');
    const data = { name, from, to, pct: Math.round(pct * 10) / 10, appliesTo: { cabana: $('xp-season-cab').checked, diasol: $('xp-season-ds').checked } };
    const id = $('xp-season-id').value;
    const ex = id && seasons().find(s => s.id === id);
    if (ex) Object.assign(ex, data); else seasons().push(Object.assign({ id: 'ssn-' + Date.now(), active: true }, data));
    persist();
    fill(null);
    toast(ex ? 'Temporada actualizada' : 'Temporada creada');
  }
  window.xpOpenSeasons = function () {
    const m = modal();
    renderList(); fill(null);
    m.classList.remove('hidden');
  };

  // Botones de acceso: Cabañas & Catálogo y Día de Sol → Precios y Adicionales
  function addButtons() {
    const mk = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.dataset.xpSeasons = '1'; b.innerHTML = '📅 <span>Temporadas</span>'; b.addEventListener('click', window.xpOpenSeasons); return b; };
    const cab = document.querySelector('#view-cabanas');
    if (cab && !cab.querySelector('[data-xp-seasons]')) {
      const firstBtn = cab.querySelector('button');
      const host = firstBtn ? firstBtn.parentElement : null;
      if (host) host.insertBefore(mk('xp-pm-btn xp-season-entry'), firstBtn);
    }
    const ds = document.querySelector('#ds-panel-config');
    if (ds && !ds.querySelector('[data-xp-seasons]')) {
      const card = ds.querySelector('h3')?.parentElement;
      if (card) { const b = mk('xp-pm-btn xp-season-entry w-full sm:w-auto'); b.innerHTML = '📅 <span>Temporadas (precios por fecha)</span>'; card.appendChild(b); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButtons); else addButtons();
  setTimeout(addButtons, 1500);
})();
