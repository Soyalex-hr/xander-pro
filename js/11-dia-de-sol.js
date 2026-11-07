/* Xander Pro — 11-dia-de-sol: cotizador de Día de Sol (pasadía)
 *
 * Precio de entrada por persona (adulto / niño / bebé, según los grupos de edad
 * configurados en Políticas de Niños) + adicionales (por persona, por unidad o
 * valor fijo). Numeración DS-AAAA-NNNN, PDF propio e historial.
 *
 * Datos:
 *   state.dayPassConfig  → precios de entrada, horario, qué incluye, anticipo (se sincroniza)
 *   state.dayPassExtras  → catálogo de adicionales (se sincroniza)
 *   state.dayPassQuotes  → cotizaciones guardadas (se sincroniza)
 *   state.activeDayPass  → borrador abierto en este dispositivo (no se sincroniza)
 */

const DAYPASS_DEFAULT_CONFIG = {
  adultPrice: 60000,
  childPrice: 40000,
  infantPrice: 0,
  schedule: '8:00 a. m. a 5:00 p. m.',
  includes: 'Uso de piscina y zonas verdes\nZona de juegos y descanso\nParqueadero',
  depositPct: 50,
  defaultObservations: ''
};

const DAYPASS_DEFAULT_EXTRAS = [
  { id: 'dsx-1', name: 'Almuerzo típico', desc: 'Plato del día con bebida natural', chargeType: 'per_person', price: 35000, status: 'active' },
  { id: 'dsx-2', name: 'Bebida de bienvenida', desc: 'Cóctel o jugo natural a la llegada', chargeType: 'per_person', price: 8000, status: 'active' },
  { id: 'dsx-3', name: 'Kiosco privado', desc: 'Kiosco con mesa para el grupo durante el día', chargeType: 'fixed', price: 80000, status: 'active' },
  { id: 'dsx-4', name: 'Alquiler de toalla', desc: 'Toalla de piscina', chargeType: 'per_unit', price: 5000, status: 'active' }
];

const DS_CHARGE_LABEL = { per_person: 'Por persona', per_unit: 'Por unidad', fixed: 'Valor fijo' };
const DS_STATUS_BADGE = {
  Aprobada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Enviada: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Borrador: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Rechazada: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  Vencida: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

let dsStep = 'edit';

function dsEsc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dsYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
function ensureDayPassState() {
  if (!state.dayPassConfig || typeof state.dayPassConfig !== 'object') state.dayPassConfig = { ...DAYPASS_DEFAULT_CONFIG };
  else state.dayPassConfig = { ...DAYPASS_DEFAULT_CONFIG, ...state.dayPassConfig };
  if (!Array.isArray(state.dayPassExtras)) state.dayPassExtras = DAYPASS_DEFAULT_EXTRAS.map(x => ({ ...x }));
  if (!Array.isArray(state.dayPassQuotes)) state.dayPassQuotes = [];
}

function dsTiers() {
  return typeof getChildPolicyTiers === 'function' ? getChildPolicyTiers() : {
    infant: { label: 'Bebés', text: 'Bebés (0-4 años)', short: 'Bebés (0-4 a.)' },
    child: { label: 'Niños', text: 'Niños (5-10 años)', short: 'Niños (5-10 a.)' },
    adult: { label: 'Adultos', text: 'Adultos (11+ años)', short: 'Adultos (11+ a.)' }
  };
}

function generateDayPassNumber() {
  const year = new Date().getFullYear();
  const prefix = `DS-${year}-`;
  const max = (state.dayPassQuotes || []).reduce((m, q) => {
    const n = String(q.baseNumber || q.number || '').startsWith(prefix) ? parseInt(String(q.baseNumber || q.number).slice(prefix.length), 10) : 0;
    return Math.max(m, isNaN(n) ? 0 : n);
  }, 0);
  return prefix + String(max + 1).padStart(4, '0');
}

function newDayPassQuote() {
  ensureDayPassState();
  const cfg = state.dayPassConfig;
  const date = new Date(); date.setDate(date.getDate() + 7);
  const exp = new Date(); exp.setDate(exp.getDate() + 7);
  const num = generateDayPassNumber();
  return {
    id: 'ds-' + Date.now(),
    number: num,
    baseNumber: num,
    status: 'Borrador',
    clientId: (state.clients || [])[0]?.id || '',
    date: dsYmd(date),
    adults: 2,
    children: 0,
    infants: 0,
    extras: [],
    discount: 0,
    requiresDeposit: true,
    depositPct: Number(cfg.depositPct) || 50,
    expirationDate: dsYmd(exp),
    observations: cfg.defaultObservations || '',
    pricing: {},
    createdBy: (typeof getOperatorName === 'function' ? getOperatorName() : ''),
    createdAt: dsYmd(new Date())
  };
}

function startNewDayPassQuote() {
  state.activeDayPass = newDayPassQuote();
  saveState();
  loadDayPassIntoForm();
  setDayPassStep('edit');
  showToast('Nueva cotización de Día de Sol');
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
function calcDayPass(q) {
  ensureDayPassState();
  const cfg = state.dayPassConfig;
  const t = dsTiers();
  const adults = Math.max(0, Number(q.adults) || 0);
  const children = Math.max(0, Number(q.children) || 0);
  const infants = Math.max(0, Number(q.infants) || 0);
  const lines = [];
  const add = (concept, detail, qty, unit) => { if (qty > 0) lines.push({ concept, detail, qty, unit, total: qty * unit }); };
  add(`Entrada ${t.adult.text}`, 'Día de sol', adults, Number(cfg.adultPrice) || 0);
  add(`Entrada ${t.child.text}`, 'Día de sol', children, Number(cfg.childPrice) || 0);
  add(`Entrada ${t.infant.text}`, (Number(cfg.infantPrice) || 0) > 0 ? 'Día de sol' : 'Sin costo', infants, Number(cfg.infantPrice) || 0);
  const entries = lines.reduce((a, l) => a + l.total, 0);

  const extraLines = [];
  (q.extras || []).forEach(sel => {
    const ex = (state.dayPassExtras || []).find(x => x.id === sel.id);
    if (!ex) return;
    const qty = ex.chargeType === 'fixed' ? 1 : Math.max(0, Number(sel.qty) || 0);
    if (!qty) return;
    extraLines.push({ id: ex.id, concept: ex.name, detail: DS_CHARGE_LABEL[ex.chargeType] || '', chargeType: ex.chargeType, qty, unit: Number(ex.price) || 0, total: qty * (Number(ex.price) || 0) });
  });
  const extrasTotal = extraLines.reduce((a, l) => a + l.total, 0);
  const discount = Math.max(0, Number(q.discount) || 0);
  const total = Math.max(0, entries + extrasTotal - discount);
  const requiresDeposit = q.requiresDeposit !== false;
  const depositPct = requiresDeposit ? Math.min(100, Math.max(0, Number(q.depositPct) || 0)) : 0;
  const deposit = requiresDeposit ? Math.round(total * depositPct / 100) : 0;
  return {
    adults, children, infants, people: adults + children + infants, payingPeople: adults + children,
    lines, entries, extraLines, extrasTotal, discount, total, requiresDeposit, depositPct, deposit, balance: total - deposit,
    schedule: cfg.schedule, includes: cfg.includes
  };
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------
function dsVal(id) { return document.getElementById(id)?.value ?? ''; }

function populateDayPassClients() {
  const sel = document.getElementById('ds-client-select');
  if (!sel) return;
  const cur = state.activeDayPass?.clientId || sel.value;
  sel.innerHTML = (state.clients || []).map(c => `<option value="${dsEsc(c.id)}">${dsEsc(c.name)}</option>`).join('');
  if (cur && Array.from(sel.options).some(o => o.value === cur)) sel.value = cur;
}

function renderDayPassPeopleLabels() {
  ensureDayPassState();
  const t = dsTiers();
  const cfg = state.dayPassConfig;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ds-label-adults', t.adult.short + ' *');
  set('ds-label-children', t.child.short);
  set('ds-label-infants', t.infant.short);
  set('ds-price-adults', formatCurrency(cfg.adultPrice) + ' c/u');
  set('ds-price-children', formatCurrency(cfg.childPrice) + ' c/u');
  set('ds-price-infants', (Number(cfg.infantPrice) || 0) > 0 ? formatCurrency(cfg.infantPrice) + ' c/u' : 'Sin costo');
  set('ds-schedule-display', cfg.schedule || '');
}

function renderDayPassExtrasPicker() {
  const box = document.getElementById('ds-extras-list');
  if (!box) return;
  const q = state.activeDayPass;
  const active = (state.dayPassExtras || []).filter(x => x.status !== 'inactive');
  if (!active.length) {
    box.innerHTML = `<div class="text-xs text-slate-400 py-4 text-center">No hay adicionales. Créalos en la pestaña <button type="button" onclick="setDayPassStep('config')" class="font-bold text-amber-600 hover:underline">Configuración</button>.</div>`;
    return;
  }
  const paying = (Number(q?.adults) || 0) + (Number(q?.children) || 0);
  box.innerHTML = active.map(ex => {
    const sel = (q?.extras || []).find(s => s.id === ex.id);
    const checked = !!sel;
    const qty = sel ? sel.qty : (ex.chargeType === 'per_person' ? paying : 1);
    return `
      <label class="flex items-center gap-3 p-3 rounded-xl border ${checked ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50'} transition cursor-pointer">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleDayPassExtra('${ex.id}', this.checked)" class="w-5 h-5 rounded text-amber-600 shrink-0" />
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2 flex-wrap"><strong class="text-xs font-extrabold text-slate-900 dark:text-white">${dsEsc(ex.name)}</strong><span class="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">${formatCurrency(ex.price)}</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">${DS_CHARGE_LABEL[ex.chargeType] || ''}</span></span>
          ${ex.desc ? `<span class="block text-[11px] text-slate-500 dark:text-slate-400 truncate">${dsEsc(ex.desc)}</span>` : ''}
        </span>
        ${ex.chargeType !== 'fixed' ? `<span class="shrink-0 flex items-center gap-1" onclick="event.preventDefault()">
          <span class="text-[10px] text-slate-400">Cant.</span>
          <input type="number" min="0" value="${qty}" ${checked ? '' : 'disabled'} oninput="setDayPassExtraQty('${ex.id}', this.value)" class="w-16 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-xs font-bold text-center tabular-nums bg-white dark:bg-slate-800" />
        </span>` : ''}
        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); openDayPassExtraModal('${ex.id}')" class="shrink-0 w-11 h-11 sm:w-9 sm:h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center justify-center transition cursor-pointer" title="Editar nombre y valor" aria-label="Editar ${dsEsc(ex.name)}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      </label>`;
  }).join('');
}

function toggleDayPassExtra(id, on) {
  const q = state.activeDayPass; if (!q) return;
  const ex = (state.dayPassExtras || []).find(x => x.id === id); if (!ex) return;
  q.extras = (q.extras || []).filter(s => s.id !== id);
  if (on) q.extras.push({ id, qty: ex.chargeType === 'per_person' ? ((Number(q.adults) || 0) + (Number(q.children) || 0)) : 1 });
  renderDayPassExtrasPicker();
  recalcDayPass();
}

function setDayPassExtraQty(id, v) {
  const q = state.activeDayPass; if (!q) return;
  const sel = (q.extras || []).find(s => s.id === id);
  if (sel) sel.qty = Math.max(0, Number(v) || 0);
  recalcDayPass(false);
}

function readDayPassForm() {
  const q = state.activeDayPass; if (!q) return;
  const prevPaying = (Number(q.adults) || 0) + (Number(q.children) || 0);
  q.clientId = dsVal('ds-client-select') || q.clientId;
  q.date = dsVal('ds-date') || q.date;
  q.adults = Math.max(0, Number(dsVal('ds-adults')) || 0);
  q.children = Math.max(0, Number(dsVal('ds-children')) || 0);
  q.infants = Math.max(0, Number(dsVal('ds-infants')) || 0);
  q.discount = Math.max(0, Number(dsVal('ds-discount')) || 0);
  q.requiresDeposit = dsVal('ds-requires-deposit') !== 'no';
  q.depositPct = Math.min(100, Math.max(0, Number(dsVal('ds-deposit-pct')) || 0));
  q.expirationDate = dsVal('ds-expiry') || q.expirationDate;
  q.observations = dsVal('ds-observations');
  q.status = dsVal('ds-status-select') || q.status;
  // Si cambian las personas, los adicionales "por persona" que seguían la cantidad se actualizan
  const paying = q.adults + q.children;
  if (paying !== prevPaying) {
    (q.extras || []).forEach(s => {
      const ex = (state.dayPassExtras || []).find(x => x.id === s.id);
      if (ex && ex.chargeType === 'per_person' && Number(s.qty) === prevPaying) s.qty = paying;
    });
    renderDayPassExtrasPicker();
  }
}

function recalcDayPass(read = true) {
  const q = state.activeDayPass; if (!q) return;
  if (read) readDayPassForm();
  const dep = document.getElementById('ds-deposit-pct');
  if (dep) dep.disabled = q.requiresDeposit === false;
  q.pricing = calcDayPass(q);
  const p = q.pricing;
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ds-bar-people', `${p.people} persona(s)`);
  set('ds-bar-total', formatCurrency(p.total));
  set('ds-bar-deposit-label', p.requiresDeposit ? `Anticipo (${p.depositPct}%):` : 'Sin anticipo');
  set('ds-bar-deposit', p.requiresDeposit ? formatCurrency(p.deposit) : '—');
  set('ds-display-number', q.number);
  const d = document.getElementById('ds-date-weekday');
  if (d) d.textContent = q.date && typeof pdfStayDate === 'function' ? pdfStayDate(q.date) : '';
  renderDayPassBreakdown();
  renderDayPassPdf();
}

function loadDayPassIntoForm() {
  ensureDayPassState();
  if (!state.activeDayPass) state.activeDayPass = newDayPassQuote();
  const q = state.activeDayPass;
  populateDayPassClients();
  renderDayPassPeopleLabels();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('ds-client-select', q.clientId);
  set('ds-date', q.date);
  set('ds-adults', q.adults);
  set('ds-children', q.children);
  set('ds-infants', q.infants);
  set('ds-discount', q.discount || 0);
  set('ds-requires-deposit', q.requiresDeposit === false ? 'no' : 'yes');
  set('ds-deposit-pct', q.depositPct ?? 50);
  set('ds-expiry', q.expirationDate);
  set('ds-observations', q.observations || '');
  set('ds-status-select', q.status || 'Borrador');
  updateDayPassObsHint();
  renderDayPassExtrasPicker();
  recalcDayPass(false);
}

// ---------------------------------------------------------------------------
// Observaciones predeterminadas
// ---------------------------------------------------------------------------
function saveDefaultDayPassObservations() {
  const text = dsVal('ds-observations').trim();
  if (!text) return showToast('Escribe el texto que quieres dejar como predeterminado');
  ensureDayPassState();
  state.dayPassConfig.defaultObservations = text;
  saveState();
  updateDayPassObsHint();
  showToast('⭐ Texto guardado: saldrá en todas las cotizaciones nuevas de Día de Sol');
}

function applyDefaultDayPassObservations() {
  ensureDayPassState();
  const def = state.dayPassConfig.defaultObservations || '';
  if (!def) return showToast('Aún no hay un texto predeterminado guardado');
  const el = document.getElementById('ds-observations');
  if (el.value.trim() && el.value.trim() !== def && !confirm('¿Reemplazar las observaciones actuales por el texto predeterminado?')) return;
  el.value = def;
  recalcDayPass();
}

function updateDayPassObsHint() {
  const hint = document.getElementById('ds-observations-hint');
  if (!hint) return;
  hint.textContent = state.dayPassConfig?.defaultObservations
    ? '⭐ Hay un texto predeterminado: sale automáticamente en cada cotización nueva.'
    : 'Este texto sale en el PDF. Guárdalo como predeterminado para que aparezca en cada cotización nueva.';
}

// ---------------------------------------------------------------------------
// Desglose y PDF
// ---------------------------------------------------------------------------
function renderDayPassBreakdown() {
  const box = document.getElementById('ds-breakdown');
  const q = state.activeDayPass;
  if (!box || !q) return;
  const p = q.pricing || calcDayPass(q);
  const row = (l, color) => `
    <div class="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 ${color}">
      <div class="min-w-0"><span class="font-bold block truncate">${dsEsc(l.concept)}</span><span class="text-[11px] opacity-80 font-mono">${l.qty} × ${formatCurrency(l.unit)}</span></div>
      <strong class="font-black tabular-nums shrink-0">${formatCurrency(l.total)}</strong>
    </div>`;
  box.innerHTML = (p.lines.map(l => row(l, 'text-slate-700 dark:text-slate-200')).join('') +
    p.extraLines.map(l => row(l, 'text-amber-700 dark:text-amber-300')).join('') +
    (p.discount ? `<div class="flex items-center justify-between py-1.5 text-rose-600"><span class="font-bold">Descuento</span><strong class="tabular-nums">- ${formatCurrency(p.discount)}</strong></div>` : '')) ||
    '<div class="text-xs text-slate-400 py-3 text-center">Agrega personas para calcular</div>';
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ds-live-total', formatCurrency(p.total));
  set('ds-live-deposit-label', p.requiresDeposit ? `Anticipo (${p.depositPct}%):` : 'Sin anticipo (pago total el día):');
  set('ds-live-deposit', p.requiresDeposit ? formatCurrency(p.deposit) : formatCurrency(p.total));
  set('ds-live-balance', formatCurrency(p.balance));
}

function renderDayPassPdf() {
  const sheet = document.getElementById('pdf-daypass-sheet');
  const q = state.activeDayPass;
  if (!sheet || !q) return;
  const p = q.pricing || calcDayPass(q);
  const comp = state.company || {};
  const client = (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente', doc: '-', phone: '-', email: '-' };
  const includes = String(p.includes || '').split('\n').map(s => s.trim()).filter(Boolean);
  const dateTxt = typeof pdfStayDate === 'function' ? pdfStayDate(q.date) : q.date;
  const tr = l => `
    <tr>
      <td class="py-2 px-2.5"><strong class="text-slate-900 block">${dsEsc(l.concept)}</strong><span class="text-[10px] text-slate-500">${dsEsc(l.detail || '')}</span></td>
      <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">${l.qty} × ${formatCurrency(l.unit)}</td>
      <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">${formatCurrency(l.total)}</td>
    </tr>`;

  sheet.innerHTML = `
    <div class="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        ${comp.logoDataUrl ? `<img src="${comp.logoDataUrl}" alt="Logo" class="w-14 h-14 object-contain rounded-xl" />` : `<div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">XP</div>`}
        <div class="min-w-0">
          <h2 class="text-base font-black text-slate-900 uppercase tracking-tight">${dsEsc(comp.name || '')}</h2>
          <p class="text-[10px] text-slate-500 font-medium">NIT / RUT: ${dsEsc(comp.nit || '-')}${comp.rnt ? ` · RNT: ${dsEsc(comp.rnt)}` : ''} · Tel: ${dsEsc(comp.phone || '-')}</p>
          <p class="text-[10px] text-slate-500 font-medium">${dsEsc(comp.email || '')} ${comp.address ? '· ' + dsEsc(comp.address) : ''}</p>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">Cotización Día de Sol</span>
        <div class="text-lg font-black text-slate-900 mt-1 tabular-nums">${dsEsc(q.number)}</div>
        <div class="text-[10px] text-slate-500 font-semibold">Emisión: ${dsEsc(q.createdAt || '')}</div>
        ${q.expirationDate ? `<div class="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">Oferta válida hasta: ${dsEsc(q.expirationDate)}</div>` : ''}
      </div>
    </div>

    <div class="pdf-avoid-break grid grid-cols-2 gap-3.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div class="min-w-0">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente</span>
        <strong class="text-sm font-black text-slate-900 block">${dsEsc(client.name)}</strong>
        <span class="text-slate-600 block text-[11px] mt-0.5">Identificación: ${dsEsc(client.doc || '-')} · Tel: ${dsEsc(client.phone || '-')}</span>
        <span class="text-slate-600 block text-[11px]">Email: ${dsEsc(client.email || '-')}</span>
      </div>
      <div class="border-l border-slate-200 pl-3.5 min-w-0">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalles del día</span>
        <div class="mt-1.5 px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <span class="block text-[9px] font-extrabold uppercase tracking-wider text-amber-700 whitespace-nowrap">Fecha del día de sol</span>
          <strong class="block text-xs font-black text-amber-900 whitespace-nowrap">${dsEsc(dateTxt)}</strong>
          ${p.schedule ? `<span class="block text-[10px] font-bold text-amber-700 whitespace-nowrap">Horario: ${dsEsc(p.schedule)}</span>` : ''}
        </div>
        <div class="text-slate-700 text-[11px] font-bold mt-2 flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black whitespace-nowrap">${p.people} persona(s)</span>
          <span class="whitespace-nowrap">👥 ${p.adults} adulto(s)</span>
          <span class="whitespace-nowrap">🧒 ${p.children} niño(s)</span>
          <span class="whitespace-nowrap">👶 ${p.infants} bebé(s)</span>
        </div>
      </div>
    </div>

    <div>
      <div class="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">Detalle de la cotización</div>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-900 text-[10px] uppercase font-black text-slate-600 text-left bg-slate-50">
            <th class="py-2 px-2.5">Concepto</th><th class="py-2 px-2.5 text-center">Cantidad × Valor</th><th class="py-2 px-2.5 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${p.lines.map(tr).join('')}
          ${p.extraLines.length ? `<tr><td colspan="3" class="pt-3 pb-1 px-2.5 text-[10px] font-black uppercase tracking-wider text-amber-700">Adicionales</td></tr>` + p.extraLines.map(tr).join('') : ''}
          ${p.discount ? `<tr class="text-rose-600"><td class="py-2 px-2.5" colspan="2"><strong>Descuento especial</strong></td><td class="py-2 px-2.5 text-right font-black tabular-nums">- ${formatCurrency(p.discount)}</td></tr>` : ''}
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-900 bg-slate-50">
            <td colspan="2" class="py-2.5 px-2.5 text-sm font-black text-slate-900 uppercase">Total de la cotización:</td>
            <td class="py-2.5 px-2.5 text-right text-base font-black text-slate-900 tabular-nums">${formatCurrency(p.total)}</td>
          </tr>
          ${p.requiresDeposit ? `
          <tr><td colspan="2" class="py-1.5 px-2.5 text-xs font-bold text-blue-700">Anticipo para reservar (${p.depositPct}%):</td><td class="py-1.5 px-2.5 text-right text-xs font-black text-blue-700 tabular-nums">${formatCurrency(p.deposit)}</td></tr>
          <tr><td colspan="2" class="py-1.5 px-2.5 text-xs font-semibold text-slate-600">Saldo a pagar el día de la visita:</td><td class="py-1.5 px-2.5 text-right text-xs font-bold text-slate-800 tabular-nums">${formatCurrency(p.balance)}</td></tr>` : `
          <tr><td colspan="2" class="py-1.5 px-2.5 text-xs font-bold text-slate-700">Forma de pago: pago total el día de la visita · No requiere anticipo</td><td class="py-1.5 px-2.5 text-right text-xs font-black text-slate-800 tabular-nums">${formatCurrency(p.total)}</td></tr>`}
        </tfoot>
      </table>
    </div>

    <div class="pdf-avoid-break grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
      <div class="space-y-2">
        ${includes.length ? `<div><span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">El día de sol incluye</span>
          <ul class="space-y-0.5">${includes.map(i => `<li class="text-[11px] text-slate-700">✔ ${dsEsc(i)}</li>`).join('')}</ul></div>` : ''}
        ${q.observations ? `<div><span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Observaciones</span><p class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">${dsEsc(q.observations)}</p></div>` : ''}
      </div>
      <div class="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 self-start">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">${p.requiresDeposit ? 'Cuentas para el anticipo' : 'Cuentas para el pago'}</span>
        <div class="text-[11px] text-slate-700 font-medium whitespace-pre-line">${dsEsc(comp.bankDetails || '')}</div>
      </div>
    </div>

    <div class="pt-6 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between gap-4">
      <div>Generado por <strong>${dsEsc(q.createdBy || '')}</strong> el ${new Date().toLocaleDateString('es-CO')} · Xander Pro</div>
      <div class="flex items-center gap-6 text-center">
        <div class="w-36 border-t border-slate-400 pt-1 text-slate-600 font-bold">Firma comercial</div>
        <div class="w-36 border-t border-slate-400 pt-1 text-slate-600 font-bold">Aceptado por el cliente</div>
      </div>
    </div>`;
}

// PDF A4 a partir de una hoja (mismo método que el PDF de cabañas)
function xpSheetToPdf(sheet, filename, label) {
  const wasDark = document.documentElement.classList.contains('dark');
  if (wasDark) { document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }
  const clone = sheet.cloneNode(true);
  clone.id = sheet.id + '-render-clone';
  clone.className = 'bg-white space-y-5 text-slate-900 pdf-pure-white-export';
  Object.assign(clone.style, { width: '794px', minWidth: '794px', maxWidth: '794px', margin: '0px', padding: '28px 34px', boxSizing: 'border-box', boxShadow: 'none', border: 'none', borderRadius: '0px', backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light', transform: 'none' });
  clone.querySelectorAll('*').forEach(el => { el.style.transform = 'none'; });
  const fix = document.createElement('style');
  fix.textContent = 'img{display:inline-block !important;}';
  document.head.appendChild(fix);
  const sandbox = document.createElement('div');
  sandbox.style.cssText = 'position:fixed;left:0;top:0;width:794px;margin:0;padding:0;background:#ffffff;color:#0f172a;color-scheme:light;z-index:999998;pointer-events:none;overflow:visible;';
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#ffffff;display:flex;align-items:center;justify-content:center;font:600 14px Inter,system-ui,sans-serif;color:#d97706;';
  veil.textContent = label || 'Generando PDF…';
  document.body.appendChild(veil);
  const px = window.scrollX, py = window.scrollY;
  window.scrollTo(0, 0);
  const cleanup = () => {
    sandbox.remove(); veil.remove(); fix.remove();
    window.scrollTo(px, py);
    if (wasDark) { document.documentElement.classList.add('dark'); document.documentElement.style.colorScheme = 'dark'; }
  };
  const h2c = window.html2canvas;
  const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (!h2c || !JsPDF) { cleanup(); if (window.html2pdf) window.html2pdf().from(sheet).save(filename); else window.print(); return; }
  const top = clone.getBoundingClientRect().top;
  const breaks = [];
  clone.querySelectorAll('tr, .pdf-avoid-break, .rounded-2xl').forEach(el => breaks.push(Math.round(el.getBoundingClientRect().bottom - top)));
  Array.from(clone.children).forEach(el => breaks.push(Math.round(el.getBoundingClientRect().bottom - top)));
  breaks.sort((a, b) => a - b);
  const SCALE = 2;
  setTimeout(() => {
    h2c(clone, { scale: SCALE, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff', width: 794, windowWidth: 794, scrollX: 0, scrollY: 0 }).then(canvas => {
      const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const pxPerMm = 794 / 210, pageHpx = 297 * pxPerMm, totalH = canvas.height / SCALE;
      let start = 0, page = 0;
      while (start < totalH - 2) {
        const pad = page === 0 ? 0 : 28;
        const limit = start + pageHpx - pad - 20;
        let end = limit >= totalH ? totalH : ((breaks.filter(b => b > start + 140 && b <= limit).pop()) || limit);
        const sliceH = Math.max(1, Math.round((end - start) * SCALE));
        const c = document.createElement('canvas');
        c.width = canvas.width; c.height = sliceH;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, 0, Math.round(start * SCALE), canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (page > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(c.toDataURL('image/jpeg', 0.96), 'JPEG', 0, pad / pxPerMm, 210, (sliceH / SCALE) / pxPerMm);
        start = end; page++;
      }
      pdf.save(filename);
      cleanup();
      showToast(`✅ PDF descargado: ${filename}`);
    }).catch(err => { console.error('PDF Día de Sol:', err); cleanup(); window.print(); });
  }, 100);
}

function downloadDayPassPdf() {
  const q = state.activeDayPass;
  if (!q) return;
  recalcDayPass();
  const client = (state.clients || []).find(c => c.id === q.clientId);
  const clean = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  xpSheetToPdf(document.getElementById('pdf-daypass-sheet'), `${clean(q.number)}_DiaDeSol_${clean(client?.name)}_${q.date || ''}.pdf`, '☀️ Generando PDF de Día de Sol…');
}

function shareDayPassWhatsApp() {
  const q = state.activeDayPass;
  if (!q) return;
  recalcDayPass();
  const p = q.pricing;
  const client = (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente', phone: '' };
  const msg = `Hola ${client.name}! ☀️ Te comparto la cotización de *Día de Sol* de *${state.company?.name || ''}*:\n\n` +
    `📋 *Cotización:* ${q.number}\n` +
    `📅 *Fecha:* ${typeof pdfStayDate === 'function' ? pdfStayDate(q.date) : q.date}${p.schedule ? ` (${p.schedule})` : ''}\n` +
    `👥 *Personas:* ${p.adults} adultos, ${p.children} niños, ${p.infants} bebés\n` +
    (p.extraLines.length ? `➕ *Adicionales:* ${p.extraLines.map(l => l.concept).join(', ')}\n` : '') +
    `💵 *Total:* ${formatCurrency(p.total)}\n` +
    (p.requiresDeposit ? `💰 *Anticipo para reservar:* ${formatCurrency(p.deposit)} (${p.depositPct}%)\n` : `💳 *Forma de pago:* total el día de la visita\n`) +
    `\nVálida hasta: ${q.expirationDate || ''}.`;
  const phone = String(client.phone || '').replace(/\D/g, '');
  const target = phone ? (phone.length === 10 ? '57' + phone : phone) : '';
  window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------------------------------------------------------------------------
// Guardar e historial
// ---------------------------------------------------------------------------
function saveDayPassQuote() {
  const q = state.activeDayPass;
  if (!q) return;
  recalcDayPass();
  if (!q.clientId) return showToast('Selecciona un cliente');
  if (!q.date) return showToast('Selecciona la fecha del día de sol');
  if ((Number(q.adults) || 0) + (Number(q.children) || 0) < 1) return showToast('Agrega al menos una persona que pague entrada');
  state.dayPassQuotes = state.dayPassQuotes || [];
  const copy = JSON.parse(JSON.stringify(q));
  const i = state.dayPassQuotes.findIndex(x => x.id === q.id);
  if (i !== -1) state.dayPassQuotes[i] = copy; else state.dayPassQuotes.unshift(copy);
  saveState();
  renderDayPassHistory();
  showToast(`✅ Cotización ${q.number} guardada`);
}

function openDayPassFromHistory(id, step) {
  const found = (state.dayPassQuotes || []).find(x => x.id === id);
  if (!found) return;
  state.activeDayPass = JSON.parse(JSON.stringify(found));
  saveState();
  loadDayPassIntoForm();
  setDayPassStep(step || 'edit');
}

function duplicateDayPassQuote(id) {
  const found = (state.dayPassQuotes || []).find(x => x.id === id);
  if (!found) return;
  const copy = JSON.parse(JSON.stringify(found));
  copy.id = 'ds-' + Date.now();
  copy.number = copy.baseNumber = generateDayPassNumber();
  copy.status = 'Borrador';
  copy.createdAt = dsYmd(new Date());
  state.activeDayPass = copy;
  saveState();
  loadDayPassIntoForm();
  setDayPassStep('edit');
  showToast(`Copia creada como ${copy.number} (sin guardar todavía)`);
}

function deleteDayPassQuote(id) {
  if (typeof hasPermission === 'function' && !hasPermission('delete_records')) return showToast('No tienes permiso para eliminar');
  const q = (state.dayPassQuotes || []).find(x => x.id === id);
  if (!q || !confirm(`¿Eliminar la cotización ${q.number}?`)) return;
  state.dayPassQuotes = state.dayPassQuotes.filter(x => x.id !== id);
  saveState();
  renderDayPassHistory();
  showToast('Cotización eliminada');
}

function renderDayPassHistory() {
  const list = document.getElementById('ds-history-list');
  const all = state.dayPassQuotes || [];
  const badge = document.getElementById('ds-history-count');
  if (badge) badge.textContent = all.length;
  if (!list) return;
  const search = dsVal('ds-hist-search').toLowerCase().trim();
  const st = dsVal('ds-hist-status');
  const rows = all.map(q => ({ q, client: (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente' } }))
    .filter(x => (!st || x.q.status === st) && (!search || (x.q.number || '').toLowerCase().includes(search) || (x.client.name || '').toLowerCase().includes(search)))
    .sort((a, b) => String(b.q.createdAt || '').localeCompare(String(a.q.createdAt || '')) || String(b.q.number).localeCompare(String(a.q.number)));
  const total = s => all.filter(q => !s || q.status === s).reduce((a, q) => a + (q.pricing?.total || 0), 0);
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ds-kpi-total', all.length);
  set('ds-kpi-approved', all.filter(q => q.status === 'Aprobada').length);
  set('ds-kpi-approved-val', formatCurrency(total('Aprobada')));
  set('ds-kpi-people', all.filter(q => q.status === 'Aprobada').reduce((a, q) => a + (q.pricing?.people || 0), 0));
  if (!rows.length) {
    list.innerHTML = `<div class="py-12 text-center text-xs text-slate-400">${all.length ? 'Sin resultados para este filtro' : 'Aún no hay cotizaciones de Día de Sol guardadas'}</div>`;
    return;
  }
  const btn = 'min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center transition cursor-pointer';
  const canDelete = typeof hasPermission === 'function' ? hasPermission('delete_records') : true;
  list.innerHTML = rows.map(({ q, client }) => `
    <div class="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
      <div class="md:col-span-3 min-w-0">
        <div class="flex items-center gap-2 flex-wrap"><strong class="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">${dsEsc(q.number)}</strong>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${DS_STATUS_BADGE[q.status] || DS_STATUS_BADGE.Borrador}">${dsEsc(q.status || 'Borrador')}</span></div>
        <div class="text-[11px] text-slate-400">Emitida ${dsEsc(q.createdAt || '-')}</div>
      </div>
      <div class="md:col-span-3 min-w-0 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${dsEsc(client.name)}</div>
      <div class="md:col-span-2 text-xs text-slate-600 dark:text-slate-300"><div class="font-semibold">${typeof pdfStayDate === 'function' ? pdfStayDate(q.date) : dsEsc(q.date)}</div><div class="text-[11px] text-slate-400">${q.pricing?.people || 0} persona(s)</div></div>
      <div class="md:col-span-2 md:text-right text-sm font-black text-slate-900 dark:text-white tabular-nums">${formatCurrency(q.pricing?.total || 0)}</div>
      <div class="md:col-span-2 flex items-center md:justify-end gap-1.5">
        <button type="button" onclick="openDayPassFromHistory('${q.id}','preview')" class="${btn} text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" title="Ver PDF" aria-label="Ver PDF"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
        <button type="button" onclick="openDayPassFromHistory('${q.id}','edit')" class="${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar" aria-label="Editar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button type="button" onclick="duplicateDayPassQuote('${q.id}')" class="${btn} text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40" title="Duplicar" aria-label="Duplicar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
        ${canDelete ? `<button type="button" onclick="deleteDayPassQuote('${q.id}')" class="${btn} text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Eliminar" aria-label="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
      </div>
    </div>`).join('');
}

// ---------------------------------------------------------------------------
// Configuración: precios de entrada y adicionales
// ---------------------------------------------------------------------------
function renderDayPassConfig() {
  ensureDayPassState();
  const cfg = state.dayPassConfig;
  const t = dsTiers();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('ds-cfg-adult', cfg.adultPrice); set('ds-cfg-child', cfg.childPrice); set('ds-cfg-infant', cfg.infantPrice);
  set('ds-cfg-schedule', cfg.schedule); set('ds-cfg-includes', cfg.includes); set('ds-cfg-deposit', cfg.depositPct);
  const lbl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  lbl('ds-cfg-adult-label', `Entrada ${t.adult.text}`);
  lbl('ds-cfg-child-label', `Entrada ${t.child.text}`);
  lbl('ds-cfg-infant-label', `Entrada ${t.infant.text}`);
  const box = document.getElementById('ds-cfg-extras');
  if (!box) return;
  const extras = state.dayPassExtras || [];
  box.innerHTML = extras.length ? extras.map(ex => `
    <div class="flex items-center justify-between gap-3 py-2.5">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap"><strong class="text-xs font-extrabold text-slate-900 dark:text-white">${dsEsc(ex.name)}</strong>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">${DS_CHARGE_LABEL[ex.chargeType] || ''}</span>
          ${ex.status === 'inactive' ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">Inactivo</span>' : ''}</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${dsEsc(ex.desc || '')}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">${formatCurrency(ex.price)}</span>
        <button type="button" onclick="openDayPassExtraModal('${ex.id}')" class="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Editar</button>
        <button type="button" onclick="deleteDayPassExtra('${ex.id}')" class="min-h-[36px] px-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold cursor-pointer">Eliminar</button>
      </div>
    </div>`).join('') : '<div class="py-6 text-center text-xs text-slate-400">Sin adicionales</div>';
}

function saveDayPassConfig() {
  if (typeof hasPermission === 'function' && !hasPermission('manage_catalogs')) return showToast('No tienes permiso para cambiar la configuración');
  ensureDayPassState();
  const n = id => Math.max(0, Number(dsVal(id)) || 0);
  Object.assign(state.dayPassConfig, {
    adultPrice: n('ds-cfg-adult'), childPrice: n('ds-cfg-child'), infantPrice: n('ds-cfg-infant'),
    schedule: dsVal('ds-cfg-schedule').trim(), includes: dsVal('ds-cfg-includes').trim(),
    depositPct: Math.min(100, n('ds-cfg-deposit'))
  });
  saveState();
  renderDayPassPeopleLabels();
  recalcDayPass(false);
  showToast('✅ Configuración del Día de Sol guardada');
}

function openDayPassExtraModal(id) {
  if (typeof hasPermission === 'function' && !hasPermission('manage_catalogs')) return showToast('No tienes permiso para editar adicionales');
  const ex = id ? (state.dayPassExtras || []).find(x => x.id === id) : null;
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('ds-extra-id', ex?.id || ''); set('ds-extra-name', ex?.name || ''); set('ds-extra-desc', ex?.desc || '');
  set('ds-extra-type', ex?.chargeType || 'per_person'); set('ds-extra-price', ex?.price ?? ''); set('ds-extra-status', ex?.status || 'active');
  const title = document.getElementById('ds-extra-title'); if (title) title.textContent = ex ? `Editar: ${ex.name}` : 'Nuevo adicional';
  document.getElementById('modal-ds-extra')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('ds-extra-name')?.focus(), 50);
}

function saveDayPassExtra() {
  const name = dsVal('ds-extra-name').trim();
  if (!name) return showToast('Escribe el nombre del adicional');
  const id = dsVal('ds-extra-id');
  const obj = { id: id || ('dsx-' + Date.now()), name, desc: dsVal('ds-extra-desc').trim(), chargeType: dsVal('ds-extra-type') || 'per_person', price: Math.max(0, Number(dsVal('ds-extra-price')) || 0), status: dsVal('ds-extra-status') || 'active' };
  state.dayPassExtras = state.dayPassExtras || [];
  const i = state.dayPassExtras.findIndex(x => x.id === obj.id);
  if (i !== -1) state.dayPassExtras[i] = obj; else state.dayPassExtras.push(obj);
  saveState();
  closeModal('modal-ds-extra');
  renderDayPassConfig();
  renderDayPassExtrasPicker();
  recalcDayPass(false);
  showToast(`Adicional "${name}" guardado`);
}

function deleteDayPassExtra(id) {
  if (typeof hasPermission === 'function' && !hasPermission('manage_catalogs')) return showToast('No tienes permiso para eliminar adicionales');
  const ex = (state.dayPassExtras || []).find(x => x.id === id);
  if (!ex || !confirm(`¿Eliminar el adicional "${ex.name}"? Las cotizaciones guardadas no cambian.`)) return;
  state.dayPassExtras = state.dayPassExtras.filter(x => x.id !== id);
  saveState();
  renderDayPassConfig();
  renderDayPassExtrasPicker();
}

// ---------------------------------------------------------------------------
// Pestañas y entrada a la vista
// ---------------------------------------------------------------------------
function setDayPassStep(step) {
  dsStep = ['edit', 'preview', 'history', 'config'].includes(step) ? step : 'edit';
  ['edit', 'preview', 'history', 'config'].forEach(s => {
    document.getElementById('ds-panel-' + s)?.classList.toggle('hidden', s !== dsStep);
    const b = document.getElementById('ds-tab-' + s);
    if (b) { b.classList.add('hos-tab-btn'); b.classList.toggle('hos-tab-active', s === dsStep); }
  });
  if (dsStep === 'preview') recalcDayPass(false);
  if (dsStep === 'history') renderDayPassHistory();
  if (dsStep === 'config') renderDayPassConfig();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDayPassView() {
  ensureDayPassState();
  loadDayPassIntoForm();
  renderDayPassHistory();
  setDayPassStep(dsStep);
}

window.renderDayPassView = renderDayPassView;
