/* Xander Pro — 09-hospedaje-cotizador (extraído de index.html; scripts clásicos que comparten el ámbito global) */
// ============================================================================
// 9. MOTOR DE COTIZACIÓN DE HOSPEDAJE (view-cotizador-cabanas)
// ============================================================================

function generateCabinQuoteNumber() {
  const quotes = state.cabinQuotes || [];
  const year = new Date().getFullYear();
  let maxSeq = 0;
  quotes.forEach(q => {
    const match = (q.baseNumber || q.number || '').match(/HOS-\d{4}-(\d+)/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `HOS-${year}-${nextSeq}`;
}

function populateCabinQuotePickers() {
  // Clients select
  const clSel = document.getElementById('hos-client-select');
  if (clSel) {
    const curVal = clSel.value;
    clSel.innerHTML = (state.clients || []).map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');
    if (curVal && Array.from(clSel.options).some(o => o.value === curVal)) {
      clSel.value = curVal;
    }
  }

  // Active Cabins select
  const cabSel = document.getElementById('hos-cabin-select');
  if (cabSel) {
    const curCab = cabSel.value;
    const activeCabins = (state.cabins || []).filter(c => c.status === 'active');
    cabSel.innerHTML = activeCabins.map(c => `
      <option value="${c.id}">${c.code} - ${c.name} (${formatCurrency(c.baseNightlyRate)}/noche · ${c.baseCapacity} a ${c.maxCapacity} pax)</option>
    `).join('');
    if (curCab && Array.from(cabSel.options).some(o => o.value === curCab)) {
      cabSel.value = curCab;
    } else if (activeCabins.length > 0) {
      cabSel.value = activeCabins[0].id;
    }
  }

  // Meal Plans select
  const mpSel = document.getElementById('hos-meal-plan-select');
  if (mpSel) {
    const curMp = mpSel.value;
    mpSel.innerHTML = (state.mealPlans || []).map(m => `
      <option value="${m.id}">${m.name} (${m.costPerPaxPerNight === 0 ? 'Sin costo adicional' : formatCurrency(m.costPerPaxPerNight) + '/pax/noche'})</option>
    `).join('');
    if (curMp && Array.from(mpSel.options).some(o => o.value === curMp)) {
      mpSel.value = curMp;
    }
  }

  renderTourServicesChecklist();
}

function renderTourServicesChecklist() {
  const container = document.getElementById('hos-tour-services-list');
  if (!container) return;

  const tours = (state.tourServices || []).filter(t => t.status === 'active');
  const activeQuote = state.activeCabinQuote || {};
  const selectedTours = activeQuote.selectedTourServices || [];

  if (tours.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 py-2">No hay servicios turísticos activos</div>';
    return;
  }

  // Compute total guests for vehicle recommendation
  const totalGuests = (Number(document.getElementById('hos-adults-input')?.value) || 2) + 
                      (Number(document.getElementById('hos-kids-5to10-input')?.value) || 0) +
                      (Number(document.getElementById('hos-kids-0to4-input')?.value) || 0);

  container.innerHTML = tours.map(ts => {
    const sel = selectedTours.find(s => s.id === ts.id);
    const isChecked = !!sel;
    const qty = sel ? sel.quantity : (ts.chargeType === 'per_person' ? totalGuests : (ts.chargeType === 'per_vehicle' ? Math.max(1, Math.ceil(totalGuests / (ts.vehicleCapacity || 4))) : 1));

    return `
      <div class="p-3 rounded-2xl border ${isChecked ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition">
        <label class="flex items-start gap-2.5 cursor-pointer flex-1">
          <input type="checkbox" data-tour-id="${ts.id}" onchange="handleTourServiceToggle('${ts.id}')" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 mt-0.5" />
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <strong class="text-xs font-bold text-slate-900 dark:text-white">${ts.name}</strong>
              <span class="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                ${formatCurrency(ts.rate)}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${ts.desc || ''}</p>
            ${ts.chargeType === 'per_vehicle' ? `
              <span class="inline-block mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                🚐 Capacidad ${ts.vehicleCapacity || 4} pax por vehículo (Sugerido para ${totalGuests} pax: ${Math.max(1, Math.ceil(totalGuests / (ts.vehicleCapacity || 4)))} vehículos)
              </span>
            ` : ''}
          </div>
        </label>

        ${isChecked ? `
          <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span class="text-[11px] font-bold text-slate-400">Cant:</span>
            <input type="number" min="1" max="50" value="${qty}" onchange="handleTourQuantityChange('${ts.id}', this.value)" class="w-16 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-bold text-center tabular-nums" />
            <strong class="text-xs font-black text-teal-600 dark:text-teal-400 tabular-nums w-24 text-right">
              ${formatCurrency(qty * ts.rate)}
            </strong>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function handleTourServiceToggle(tourId) {
  if (!state.activeCabinQuote) return;
  state.activeCabinQuote.selectedTourServices = state.activeCabinQuote.selectedTourServices || [];

  const existingIdx = state.activeCabinQuote.selectedTourServices.findIndex(s => s.id === tourId);
  const tour = (state.tourServices || []).find(t => t.id === tourId);
  if (!tour) return;

  if (existingIdx !== -1) {
    state.activeCabinQuote.selectedTourServices.splice(existingIdx, 1);
  } else {
    const totalGuests = (Number(document.getElementById('hos-adults-input')?.value) || 2) + 
                        (Number(document.getElementById('hos-kids-5to10-input')?.value) || 0) +
                        (Number(document.getElementById('hos-kids-0to4-input')?.value) || 0);

    const defaultQty = tour.chargeType === 'per_person' ? totalGuests : (tour.chargeType === 'per_vehicle' ? Math.max(1, Math.ceil(totalGuests / (tour.vehicleCapacity || 4))) : 1);

    state.activeCabinQuote.selectedTourServices.push({
      id: tour.id,
      name: tour.name,
      chargeType: tour.chargeType,
      unitRate: tour.rate,
      quantity: defaultQty,
      total: defaultQty * tour.rate
    });
  }

  renderTourServicesChecklist();
  recalculateCabinQuoteLive();
}

function handleTourQuantityChange(tourId, newQty) {
  if (!state.activeCabinQuote) return;
  const q = Math.max(1, parseInt(newQty, 10) || 1);
  const item = (state.activeCabinQuote.selectedTourServices || []).find(s => s.id === tourId);
  if (item) {
    item.quantity = q;
    item.total = q * item.unitRate;
  }
  renderTourServicesChecklist();
  recalculateCabinQuoteLive();
}

function startNewCabinQuote() {
  const activeCabins = (state.cabins || []).filter(c => c.status === 'active');
  const firstCabin = activeCabins[0] || (state.cabins || [])[0];
  const firstClient = (state.clients || [])[0];

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 3);

  const checkIn = today.toISOString().slice(0, 10);
  const checkOut = tomorrow.toISOString().slice(0, 10);

  const expDate = new Date();
  expDate.setDate(today.getDate() + 7);

  const num = generateCabinQuoteNumber();

  state.activeCabinQuote = {
    id: 'cq-' + Date.now(),
    number: num,
    baseNumber: num,
    version: 1,
    status: 'Enviada',
    clientId: firstClient ? firstClient.id : '',
    cabinId: firstCabin ? firstCabin.id : '',
    checkInDate: checkIn,
    checkOutDate: checkOut,
    nights: 3,
    adults: firstCabin ? Math.min(4, firstCabin.baseCapacity) : 2,
    kids5to10: 0,
    kids0to4: 0,
    pets: 0,
    baseNightlyRate: firstCabin ? firstCabin.baseNightlyRate : 480000,
    originalRate: firstCabin ? firstCabin.baseNightlyRate : 480000,
    rateModified: false,
    modificationReason: '',
    modifiedBy: '',
    modifiedAt: '',
    mealPlanId: (state.mealPlans && state.mealPlans[1]) ? state.mealPlans[1].id : 'mp-1',
    mealPlanPax: firstCabin ? Math.min(4, firstCabin.baseCapacity) : 2,
    selectedTourServices: [],
    discountAmount: 0,
    depositPercentage: 50,
    expirationDate: expDate.toISOString().slice(0, 10),
    observations: getDefaultCabinObservations(),
    pricing: {},
    createdBy: (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander'),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  loadCabinQuoteIntoEditor();
  showToast('Nueva cotización de hospedaje iniciada');
}

function loadCabinQuoteIntoEditor(quoteId = null) {
  if (quoteId) {
    const found = (state.cabinQuotes || []).find(q => q.id === quoteId || q.number === quoteId);
    if (found) {
      state.activeCabinQuote = JSON.parse(JSON.stringify(found));
    }
  }

  if (!state.activeCabinQuote) {
    startNewCabinQuote();
    return;
  }

  const q = state.activeCabinQuote;
  populateCabinQuotePickers();

  // Populate inputs
  const dispNum = document.getElementById('hos-display-number');
  const verBadge = document.getElementById('hos-version-badge');
  const statSel = document.getElementById('hos-status-select');
  const clSel = document.getElementById('hos-client-select');
  const cabSel = document.getElementById('hos-cabin-select');
  const inDate = document.getElementById('hos-checkin-date');
  const outDate = document.getElementById('hos-checkout-date');
  const adIn = document.getElementById('hos-adults-input');
  const k5In = document.getElementById('hos-kids-5to10-input');
  const k0In = document.getElementById('hos-kids-0to4-input');
  const petIn = document.getElementById('hos-pets-input');
  const rateIn = document.getElementById('hos-nightly-rate-input');
  const reasonIn = document.getElementById('hos-rate-reason-input');
  const mpSel = document.getElementById('hos-meal-plan-select');
  const mpPaxIn = document.getElementById('hos-meal-pax-input');
  const discIn = document.getElementById('hos-discount-input');
  const depPctIn = document.getElementById('hos-deposit-pct-input');
  const expIn = document.getElementById('hos-expiry-date-input');
  const obsIn = document.getElementById('hos-observations-input');

  if (dispNum) dispNum.textContent = q.number || 'HOS-2026-0001';
  if (verBadge) verBadge.textContent = 'V' + (q.version || 1);
  if (statSel) statSel.value = q.status || 'Enviada';
  if (clSel && q.clientId) clSel.value = q.clientId;
  if (cabSel && q.cabinId) cabSel.value = q.cabinId;
  if (inDate) inDate.value = q.checkInDate || '';
  if (outDate) outDate.value = q.checkOutDate || '';
  if (adIn) adIn.value = q.adults || 2;
  if (k5In) k5In.value = q.kids5to10 || 0;
  if (k0In) k0In.value = q.kids0to4 || 0;
  if (petIn) petIn.value = q.pets || 0;
  if (rateIn) rateIn.value = q.baseNightlyRate || 480000;
  if (reasonIn) reasonIn.value = q.modificationReason || '';
  if (mpSel && q.mealPlanId) mpSel.value = q.mealPlanId;
  if (mpPaxIn) mpPaxIn.value = q.mealPlanPax !== undefined ? q.mealPlanPax : 2;
  if (discIn) discIn.value = q.discountAmount || 0;
  if (depPctIn) depPctIn.value = q.depositPercentage || 50;
  const reqDepSel = document.getElementById('hos-requires-deposit-select');
  if (reqDepSel) reqDepSel.value = q.requiresDeposit === false ? 'no' : 'yes';
  if (depPctIn) depPctIn.disabled = q.requiresDeposit === false;
  if (expIn) expIn.value = q.expirationDate || '';
  if (obsIn) obsIn.value = q.observations || '';
  updateDefaultObservationsHint();

  handleCabinSelectionChange(false);
  handleCabinDatesChange(false);
  recalculateCabinQuoteLive();
}

function handleCabinSelectionChange(triggerRecalc = true) {
  const cabSel = document.getElementById('hos-cabin-select');
  if (!cabSel) return;

  const cabId = cabSel.value;
  const cabin = (state.cabins || []).find(c => c.id === cabId);
  if (!cabin) return;

  // Update selected cabin info pill
  const nameEl = document.getElementById('hos-info-cabin-name');
  const codeEl = document.getElementById('hos-info-cabin-code');
  const capEl = document.getElementById('hos-info-cabin-cap');
  const rateEl = document.getElementById('hos-info-cabin-rate');
  const origRateEl = document.getElementById('hos-original-rate-display');
  const rateInput = document.getElementById('hos-nightly-rate-input');

  if (nameEl) nameEl.textContent = cabin.name;
  if (codeEl) codeEl.textContent = cabin.code;
  if (capEl) capEl.textContent = cabin.pricingMode === 'fixed' ? `Tarifa fija · hasta ${cabin.maxCapacity} pax` : `De ${cabin.baseCapacity} a ${cabin.maxCapacity} pax · extra sobre ${cabin.maxCapacity}`;
  if (rateEl) rateEl.textContent = `${formatCurrency(cabin.baseNightlyRate)} / noche`;
  if (origRateEl) origRateEl.textContent = `${formatCurrency(cabin.baseNightlyRate)} / noche`;

  // Pet field handling
  const petIn = document.getElementById('hos-pets-input');
  const petWarn = document.getElementById('hos-pet-policy-warning');
  if (petIn && petWarn) {
    if (!cabin.allowsPets) {
      petIn.value = 0;
      petIn.disabled = true;
      petWarn.classList.remove('hidden');
    } else {
      petIn.disabled = false;
      petWarn.classList.add('hidden');
    }
  }

  // Update active quote cabin & original rate if not previously modified
  if (state.activeCabinQuote) {
    state.activeCabinQuote.cabinId = cabin.id;
    state.activeCabinQuote.originalRate = cabin.baseNightlyRate;

    if (!state.activeCabinQuote.rateModified) {
      state.activeCabinQuote.baseNightlyRate = cabin.baseNightlyRate;
      if (rateInput) rateInput.value = cabin.baseNightlyRate;
    }
  }

  handleRateAdjustmentChange(false);
  checkCabinDateConflictsBanner();
  if (triggerRecalc) recalculateCabinQuoteLive();
}

function handleCabinDatesChange(triggerRecalc = true) {
  const inDate = document.getElementById('hos-checkin-date')?.value;
  const outDate = document.getElementById('hos-checkout-date')?.value;
  const nightsDisp = document.getElementById('hos-nights-display');
  const nightsBadge = document.getElementById('hos-calc-nights-badge');

  if (!inDate || !outDate) return;

  const dIn = new Date(inDate + 'T00:00:00');
  const dOut = new Date(outDate + 'T00:00:00');

  let diffDays = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    diffDays = 1;
    // Auto-adjust outDate to inDate + 1
    const nextDay = new Date(dIn);
    nextDay.setDate(nextDay.getDate() + 1);
    const correctedOut = nextDay.toISOString().slice(0, 10);
    const outInput = document.getElementById('hos-checkout-date');
    if (outInput) outInput.value = correctedOut;
  }

  if (nightsDisp) nightsDisp.textContent = diffDays;
  if (nightsBadge) nightsBadge.textContent = `${diffDays} Noches`;

  if (state.activeCabinQuote) {
    state.activeCabinQuote.checkInDate = inDate;
    state.activeCabinQuote.checkOutDate = outDate;
    state.activeCabinQuote.nights = diffDays;
  }

  checkCabinDateConflictsBanner();
  if (triggerRecalc) recalculateCabinQuoteLive();
}

function handleRateAdjustmentChange(triggerRecalc = true) {
  const cabId = document.getElementById('hos-cabin-select')?.value;
  const cabin = (state.cabins || []).find(c => c.id === cabId);
  const rateInput = document.getElementById('hos-nightly-rate-input');
  const auditBox = document.getElementById('hos-rate-audit-box');
  const auditAuthor = document.getElementById('hos-audit-author');

  if (!cabin || !rateInput) return;

  const currentRate = Number(rateInput.value) || cabin.baseNightlyRate;
  const isDifferent = Math.abs(currentRate - cabin.baseNightlyRate) > 1;

  if (auditBox) auditBox.classList.toggle('hidden', !isDifferent);

  if (state.activeCabinQuote) {
    state.activeCabinQuote.rateModified = isDifferent;
    state.activeCabinQuote.baseNightlyRate = currentRate;
    state.activeCabinQuote.originalRate = cabin.baseNightlyRate;

    if (isDifferent) {
      state.activeCabinQuote.modifiedBy = state.activeCabinQuote.modifiedBy || (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander');
      state.activeCabinQuote.modifiedAt = state.activeCabinQuote.modifiedAt || new Date().toLocaleString();
      if (auditAuthor) auditAuthor.textContent = `Ajustado por ${state.activeCabinQuote.modifiedBy}`;
    }
  }

  if (triggerRecalc) recalculateCabinQuoteLive();
}

function handleMealPlanSelectChange() {
  const mpSel = document.getElementById('hos-meal-plan-select');
  const noteEl = document.getElementById('hos-meal-plan-note');
  if (!mpSel) return;

  const plan = (state.mealPlans || []).find(m => m.id === mpSel.value);
  if (noteEl && plan) {
    noteEl.textContent = plan.desc || plan.observations || '';
  }

  if (state.activeCabinQuote) {
    state.activeCabinQuote.mealPlanId = mpSel.value;
  }
  recalculateCabinQuoteLive();
}

function handleCabinQuoteStatusChange() {
  const statSel = document.getElementById('hos-status-select');
  if (statSel && state.activeCabinQuote) {
    state.activeCabinQuote.status = statSel.value;
  }
}

function handleCabinQuoteInputChange() {
  recalculateCabinQuoteLive();
}

// 10. DETECTOR DE CRUCE O CERCANÍA DE FECHAS (±2 DÍAS)
function checkCabinDateConflicts(cabinId, checkIn, checkOut, excludeQuoteId = null) {
  if (!cabinId || !checkIn || !checkOut) return [];
  const inTime = new Date(checkIn + 'T00:00:00').getTime();
  const outTime = new Date(checkOut + 'T00:00:00').getTime();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return (state.cabinQuotes || []).filter(q => {
    if (q.id === excludeQuoteId) return false;
    if (q.cabinId !== cabinId) return false;
    if (q.status === 'Rechazada') return false;
    if (!q.checkInDate || !q.checkOutDate) return false;

    const qIn = new Date(q.checkInDate + 'T00:00:00').getTime();
    const qOut = new Date(q.checkOutDate + 'T00:00:00').getTime();

    // Overlap: [checkIn, checkOut] overlaps with [qIn, qOut]
    const isOverlap = (inTime < qOut && outTime > qIn);
    // Proximity: within +-2 days of each other
    const isNearBefore = Math.abs(inTime - qOut) <= TWO_DAYS_MS;
    const isNearAfter = Math.abs(outTime - qIn) <= TWO_DAYS_MS;

    return isOverlap || isNearBefore || isNearAfter;
  });
}

function checkCabinDateConflictsBanner() {
  const cabId = document.getElementById('hos-cabin-select')?.value;
  const inDate = document.getElementById('hos-checkin-date')?.value;
  const outDate = document.getElementById('hos-checkout-date')?.value;
  const banner = document.getElementById('hos-conflict-banner');
  const bannerText = document.getElementById('hos-conflict-text');

  if (!banner || !cabId || !inDate || !outDate) return;

  const currentId = state.activeCabinQuote ? state.activeCabinQuote.id : null;
  const conflicts = checkCabinDateConflicts(cabId, inDate, outDate, currentId);

  if (conflicts.length > 0) {
    const c = conflicts[0];
    const client = (state.clients || []).find(cl => cl.id === c.clientId) || { name: 'Cliente' };
    const cab = (state.cabins || []).find(cb => cb.id === cabId) || { name: 'Cabaña' };

    banner.classList.remove('hidden');
    if (bannerText) {
      bannerText.innerHTML = `
        Existe otra cotización registrada (<strong>${c.number}</strong> - <em>${client.name}</em>) para <strong>${cab.name}</strong> en fechas iguales o cercanas (<strong>${c.checkInDate} al ${c.checkOutDate}</strong>). Recuerda que este sistema es de trazabilidad comercial informativa; verifica disponibilidad oficial en el sistema de reservas externo.
      `;
    }

    // Push into notification system if available
    injectCabinConflictNotification(c, client, cab);
  } else {
    banner.classList.add('hidden');
  }
}

function injectCabinConflictNotification(confQuote, client, cab) {
  const notifList = document.getElementById('notifications-list');
  const badge = document.getElementById('notif-badge-count');
  if (!notifList) return;

  const notifId = 'notif-conflict-' + confQuote.id;
  if (document.getElementById(notifId)) return; // Avoid duplicates

  const item = document.createElement('div');
  item.id = notifId;
  item.className = 'p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex items-start gap-2.5';
  item.innerHTML = `
    <span class="text-base shrink-0">⚠️</span>
    <div class="flex-1">
      <div class="font-bold text-amber-600 dark:text-amber-400">Posible Cruce de Hospedaje</div>
      <div class="text-[11px] text-slate-600 dark:text-slate-300">Cotización ${confQuote.number} (${cab.name}) para ${client.name} en fechas ${confQuote.checkInDate} a ${confQuote.checkOutDate}.</div>
    </div>
  `;
  notifList.prepend(item);

  if (badge) {
    badge.classList.remove('hidden');
    badge.textContent = Number(badge.textContent || 0) + 1;
  }
}

// 11. CÁLCULO EN VIVO & DESGLOSE MATEMÁTICO COMPLETO
// SIDEBAR MENU & SUBMENU ACCORDION ENGINE (ZERO SCROLL ACCORDION)
function toggleSidebarMenu(menuId) {
  const menus = ['hospedaje', 'eventos', 'gestion'];
  const targetSubmenu = document.getElementById(`submenu-${menuId}`);
  const targetChevron = document.getElementById(`chevron-${menuId}`);
  if (!targetSubmenu) return;

  const isTargetHidden = targetSubmenu.classList.contains('hidden');

  // Accordion mode: close other submenus so sidebar stays ultra-compact with zero scrollbar
  menus.forEach(m => {
    if (m !== menuId) {
      const sub = document.getElementById(`submenu-${m}`);
      const chv = document.getElementById(`chevron-${m}`);
      if (sub && !sub.classList.contains('hidden')) {
        sub.classList.add('hidden');
        if (chv) chv.classList.remove('rotate-180');
      }
    }
  });

  targetSubmenu.classList.toggle('hidden', !isTargetHidden);
  if (targetChevron) {
    targetChevron.classList.toggle('rotate-180', isTargetHidden);
  }
}
window.toggleSidebarMenu = toggleSidebarMenu;

function openSidebarMenuForView(viewName) {
  const viewMap = {
    cabanas: 'hospedaje',
    'cotizador-cabanas': 'hospedaje',
    servicios: 'hospedaje',
    'dia-sol': 'hospedaje',
    cotizador: 'eventos',
    historial: 'eventos',
    productos: 'eventos',
    simulador: 'eventos',
    agenda: 'gestion',
    clientes: 'gestion',
    finanzas: 'gestion',
    rentabilidad: 'gestion',
    empresa: 'gestion'
  };

  const targetMenu = viewMap[viewName];
  if (targetMenu) {
    const menus = ['hospedaje', 'eventos', 'gestion'];
    menus.forEach(m => {
      const sub = document.getElementById(`submenu-${m}`);
      const chv = document.getElementById(`chevron-${m}`);
      if (m === targetMenu) {
        if (sub && sub.classList.contains('hidden')) {
          sub.classList.remove('hidden');
          if (chv) chv.classList.add('rotate-180');
        }
      } else {
        if (sub && !sub.classList.contains('hidden')) {
          sub.classList.add('hidden');
          if (chv) chv.classList.remove('rotate-180');
        }
      }
    });
  }
}
window.openSidebarMenuForView = openSidebarMenuForView;

// CABIN QUOTE STEPPER TOGGLE (EDIT VS PREVIEW)
function setCabinQuoteStep(step) {
  const builderEl = document.getElementById('hos-builder-fullscreen');
  const previewEl = document.getElementById('hos-preview-fullscreen');
  const historyEl = document.getElementById('hos-history-fullscreen');
  if (!builderEl || !previewEl) return;

  const current = ['edit', 'preview', 'history'].includes(step) ? step : 'edit';
  builderEl.classList.toggle('hidden', current !== 'edit');
  previewEl.classList.toggle('hidden', current !== 'preview');
  if (historyEl) historyEl.classList.toggle('hidden', current !== 'history');

  // Alertas del editor solo visibles al armar / previsualizar
  ['hos-conflict-banner', 'hos-capacity-banner'].forEach(id => {
    const el = document.getElementById(id);
    if (el && current === 'history') el.dataset.hiddenByHistory = el.classList.contains('hidden') ? '' : '1';
    if (el && current === 'history') el.classList.add('hidden');
    if (el && current !== 'history' && el.dataset.hiddenByHistory === '1') { el.classList.remove('hidden'); el.dataset.hiddenByHistory = ''; }
  });

  [['btn-hos-step-edit', 'edit'], ['btn-hos-step-preview', 'preview'], ['btn-hos-step-history', 'history']].forEach(([id, key]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.add('hos-tab-btn');
    btn.classList.toggle('hos-tab-active', key === current);
    btn.setAttribute('aria-selected', key === current ? 'true' : 'false');
  });

  if (current === 'preview') {
    if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (current === 'history') {
    renderCabinQuotesHistoryPanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.setCabinQuoteStep = setCabinQuoteStep;

function recalculateCabinQuoteLive() {
  const q = state.activeCabinQuote;
  if (!q) return;

  const cabId = document.getElementById('hos-cabin-select')?.value || q.cabinId;
  const cabin = (state.cabins || []).find(c => c.id === cabId) || (state.cabins || [])[0];
  if (!cabin) return;

  const inDate = document.getElementById('hos-checkin-date')?.value || q.checkInDate;
  const outDate = document.getElementById('hos-checkout-date')?.value || q.checkOutDate;

  let nights = 1;
  if (inDate && outDate) {
    const dIn = new Date(inDate + 'T00:00:00');
    const dOut = new Date(outDate + 'T00:00:00');
    nights = Math.max(1, Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const adults = Number(document.getElementById('hos-adults-input')?.value) || 1;
  const kids5to10 = Number(document.getElementById('hos-kids-5to10-input')?.value) || 0;
  const kids0to4 = Number(document.getElementById('hos-kids-0to4-input')?.value) || 0;
  const pets = cabin.allowsPets ? (Number(document.getElementById('hos-pets-input')?.value) || 0) : 0;

  const nightlyRate = Number(document.getElementById('hos-nightly-rate-input')?.value) || cabin.baseNightlyRate;
  const reason = document.getElementById('hos-rate-reason-input')?.value || '';

  // Child Policies lookup
  const tiers = getChildPolicyTiers();
  const p0 = tiers.infant;
  const p5 = tiers.child;
  applyChildPolicyLabels();

  // Occupancy rules & Extra Person math
  const totalOccupants = adults + (p5.countsTowardsMaxCapacity ? kids5to10 : 0) + (p0.countsTowardsMaxCapacity ? kids0to4 : 0);
  const isFixedRate = cabin.pricingMode === 'fixed';
  // Entre la capacidad mínima (base) y la máxima solo se cobra la cabaña.
  // Las personas adicionales son las que superan la capacidad máxima (los niños ya pagan su propia tarifa,
  // por eso el excedente cobrado como persona adicional nunca es mayor que el número de adultos).
  const overMax = Math.max(0, totalOccupants - (Number(cabin.maxCapacity) || 0));
  const extraPaxCount = (isFixedRate || !(Number(cabin.extraPersonRate) > 0)) ? 0 : Math.min(adults, overMax);

  // Hard Max Capacity Alert
  const capBanner = document.getElementById('hos-capacity-banner');
  const capText = document.getElementById('hos-capacity-text');
  const isCapExceeded = totalOccupants > cabin.maxCapacity;

  if (capBanner) {
    capBanner.classList.toggle('hidden', !isCapExceeded);
    if (capText) {
      capText.textContent = `La cabaña ${cabin.name} tiene capacidad máxima de ${cabin.maxCapacity} huéspedes. Tienes ${totalOccupants} ocupantes (${adults} ${tiers.adult.label.toLowerCase()} + ${kids5to10} ${p5.label.toLowerCase()}${p0.countsTowardsMaxCapacity ? ' + ' + kids0to4 + ' ' + p0.label.toLowerCase() : ''}).` +
        (extraPaxCount > 0 ? ` Se cobran ${extraPaxCount} persona(s) adicional(es).` : (isFixedRate ? ' Esta cabaña tiene tarifa fija: no se cobran personas adicionales.' : ''));
    }
  }

  // Extra Person Alert
  const extraPaxAlert = document.getElementById('hos-extra-pax-alert');
  const extraPaxText = document.getElementById('hos-extra-pax-text');
  const extraPaxBadge = document.getElementById('hos-extra-pax-rate-badge');

  if (extraPaxAlert) {
    extraPaxAlert.classList.toggle('hidden', extraPaxCount <= 0);
    if (extraPaxText) {
      extraPaxText.textContent = `Esta cotización supera la capacidad máxima (${cabin.maxCapacity} pax): se cobran ${extraPaxCount} persona(s) adicional(es).`;
    }
    if (extraPaxBadge) {
      extraPaxBadge.textContent = `${formatCurrency(cabin.extraPersonRate)} / noche c/u`;
    }
  }

  // Summary badge
  const occSummary = document.getElementById('hos-occupancy-summary-badge');
  if (occSummary) {
    occSummary.textContent = `${adults} ${tiers.adult.label}, ${kids5to10} ${p5.label}, ${kids0to4} ${p0.label}, ${pets} Mascotas`;
  }

  // Calculations
  const subtotalBase = nights * nightlyRate;
  const subtotalExtraPax = extraPaxCount * (cabin.extraPersonRate || 0) * nights;
  const subtotalKids = kids5to10 * (p5.rate || 0) * nights;
  const subtotalInfants = kids0to4 * (p0.rate || 0) * nights;

  let subtotalPets = 0;
  if (cabin.allowsPets && pets > 0) {
    subtotalPets = pets * (cabin.petRate || 0) * (cabin.petChargeType === 'per_night' ? nights : 1);
  }

  // Meal Plan
  const mpSel = document.getElementById('hos-meal-plan-select');
  const mealPlan = (state.mealPlans || []).find(m => m.id === (mpSel?.value || q.mealPlanId));
  const mealPaxInput = document.getElementById('hos-meal-pax-input');
  const mealPax = mealPaxInput ? (Number(mealPaxInput.value) || 0) : (adults + kids5to10);
  const mealRate = mealPlan ? mealPlan.costPerPaxPerNight : 0;
  const subtotalMeals = mealPax * mealRate * nights;

  // Additional Tour Services
  const selectedTours = q.selectedTourServices || [];
  const subtotalTours = selectedTours.reduce((acc, t) => acc + (t.total || 0), 0);

  // Discount
  const discount = Number(document.getElementById('hos-discount-input')?.value) || 0;

  // General Total
  const subtotalAll = subtotalBase + subtotalExtraPax + subtotalKids + subtotalInfants + subtotalPets + subtotalMeals + subtotalTours;
  const total = Math.max(0, subtotalAll - discount);

  // Deposit & Balance
  // Anticipo opcional (retrocompatible: cotizaciones antiguas = con anticipo)
  const reqDepSel = document.getElementById('hos-requires-deposit-select');
  const requiresDeposit = reqDepSel ? reqDepSel.value !== 'no' : q.requiresDeposit !== false;
  const depPctInput = document.getElementById('hos-deposit-pct-input');
  if (depPctInput) depPctInput.disabled = !requiresDeposit;
  const configuredDepositPct = Number(depPctInput?.value) || 50;
  const depositPct = requiresDeposit ? configuredDepositPct : 0;
  const deposit = requiresDeposit ? Math.round(total * (depositPct / 100)) : 0;
  const balance = total - deposit;

  // Save pricing object in state
  const pricing = {
    nights,
    nightlyRate,
    subtotalBase,
    extraPaxCount,
    extraPersonRate: cabin.extraPersonRate || 0,
    pricingMode: isFixedRate ? 'fixed' : 'base_plus_extra',
    includedGuests: cabin.maxCapacity,
    subtotalExtraPax,
    kids5to10,
    childRate5to10: p5.rate || 0,
    subtotalKids,
    kids0to4,
    infantRate: p0.rate || 0,
    subtotalInfants,
    childLabel: p5.text,
    infantLabel: p0.text,
    adultLabel: tiers.adult.text,
    pets,
    petRate: cabin.petRate || 0,
    petChargeType: cabin.petChargeType,
    subtotalPets,
    mealPlanName: mealPlan ? mealPlan.name : 'Sin Alimentación',
    mealPax,
    mealRate,
    subtotalMeals,
    selectedTours,
    subtotalTours,
    discount,
    totalGuests: (Number(adults) || 0) + (Number(kids5to10) || 0) + (Number(kids0to4) || 0),
    depositPct,
    requiresDeposit,
    total,
    deposit,
    balance
  };

  q.pricing = pricing;
  q.cabinId = cabin.id;
  q.checkInDate = inDate;
  q.checkOutDate = outDate;
  q.nights = nights;
  q.adults = adults;
  q.kids5to10 = kids5to10;
  q.kids0to4 = kids0to4;
  q.pets = pets;
  q.baseNightlyRate = nightlyRate;
  q.modificationReason = reason;
  q.mealPlanId = mealPlan ? mealPlan.id : '';
  q.mealPlanPax = mealPax;
  q.discountAmount = discount;
  q.depositPercentage = configuredDepositPct;
  q.requiresDeposit = requiresDeposit;
  q.expirationDate = document.getElementById('hos-expiry-date-input')?.value || q.expirationDate;
  q.observations = document.getElementById('hos-observations-input')?.value || q.observations;

  // Etiquetas de anticipo según la opción elegida
  const liveDepLabel = document.getElementById('hos-live-deposit-label');
  if (liveDepLabel) liveDepLabel.innerHTML = requiresDeposit
    ? 'Anticipo Sugerido (<span id="hos-live-deposit-pct">' + depositPct + '</span>%):'
    : 'Sin anticipo (pago total al check-in):';
  const barDepLabel = document.getElementById('hos-bar-deposit-label');
  if (barDepLabel) barDepLabel.innerHTML = requiresDeposit
    ? 'Anticipo (<span id="hos-bar-deposit-pct">' + depositPct + '</span>%):'
    : 'Sin anticipo:';

  // Render Live Breakdown in Left Column
  renderLiveFormulaBreakdown(cabin, pricing);

  // Render Pure White PDF Preview Sheet in Right Column
    renderCabinQuotePdfSheet(q, cabin, pricing);

  // Update Bottom Summary Bar in Editor Fullscreen
  const barNights = document.getElementById('hos-bar-nights-display');
  const barPax = document.getElementById('hos-bar-pax-display');
  const barTotal = document.getElementById('hos-bar-total-display');
  const barDepPct = document.getElementById('hos-bar-deposit-pct');
  const barDep = document.getElementById('hos-bar-deposit-display');

  if (barNights) barNights.textContent = `${pricing.nights} Noches`;
  if (barPax) barPax.textContent = `${pricing.totalGuests} Pax`;
  if (barTotal) barTotal.textContent = formatCurrency(pricing.total);
  if (barDepPct) barDepPct.textContent = pricing.depositPct;
  if (barDep) barDep.textContent = formatCurrency(pricing.deposit);
}

function renderLiveFormulaBreakdown(cabin, calc) {
  const container = document.getElementById('hos-live-breakdown-container');
  const totalEl = document.getElementById('hos-live-total-display');
  const depPctEl = document.getElementById('hos-live-deposit-pct');
  const depEl = document.getElementById('hos-live-deposit-display');
  const balEl = document.getElementById('hos-live-balance-display');

  if (totalEl) totalEl.textContent = formatCurrency(calc.total);
  if (depPctEl) depPctEl.textContent = calc.depositPct;
  if (depEl) depEl.textContent = formatCurrency(calc.deposit);
  if (balEl) balEl.textContent = formatCurrency(calc.balance);

  if (!container) return;

  let itemsHtml = `
    <!-- Base accommodation -->
    <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
      <div>
        <span class="font-bold text-slate-800 dark:text-slate-200">Hospedaje Cabaña Base</span>
        <div class="text-[11px] text-slate-400 font-mono">${formatCurrency(calc.nightlyRate)} × ${calc.nights} noches</div>
      </div>
      <strong class="font-black text-slate-900 dark:text-white tabular-nums">${formatCurrency(calc.subtotalBase)}</strong>
    </div>
  `;

  // Extra pax
  if (calc.extraPaxCount > 0) {
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-indigo-700 dark:text-indigo-300">
        <div>
          <span class="font-bold">Persona(s) Adicional(es)</span>
          <div class="text-[11px] opacity-80 font-mono">${calc.extraPaxCount} pax × ${formatCurrency(calc.extraPersonRate)} × ${calc.nights} noches</div>
        </div>
        <strong class="font-black tabular-nums">${formatCurrency(calc.subtotalExtraPax)}</strong>
      </div>
    `;
  }

  // Children 5 to 10
  if (calc.kids5to10 > 0) {
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-blue-700 dark:text-blue-300">
        <div>
          <span class="font-bold">${calc.childLabel || 'Niños (5 a 10 años)'}</span>
          <div class="text-[11px] opacity-80 font-mono">${calc.kids5to10} × ${formatCurrency(calc.childRate5to10)} × ${calc.nights} noches</div>
        </div>
        <strong class="font-black tabular-nums">${formatCurrency(calc.subtotalKids)}</strong>
      </div>
    `;
  }

  // Primer grupo de edad (si tiene tarifa)
  if (calc.kids0to4 > 0 && calc.subtotalInfants > 0) {
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-pink-700 dark:text-pink-300">
        <div>
          <span class="font-bold">${calc.infantLabel || 'Bebés'}</span>
          <div class="text-[11px] opacity-80 font-mono">${calc.kids0to4} × ${formatCurrency(calc.infantRate)} × ${calc.nights} noches</div>
        </div>
        <strong class="font-black tabular-nums">${formatCurrency(calc.subtotalInfants)}</strong>
      </div>
    `;
  }

  // Pets
  if (calc.pets > 0 && calc.subtotalPets > 0) {
    const petLabel = calc.petChargeType === 'per_night' ? `${calc.pets} mascota(s) × ${formatCurrency(calc.petRate)} × ${calc.nights} noches` : `${calc.pets} mascota(s) × ${formatCurrency(calc.petRate)} (cobro único)`;
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-300">
        <div>
          <span class="font-bold">Mascotas</span>
          <div class="text-[11px] opacity-80 font-mono">${petLabel}</div>
        </div>
        <strong class="font-black tabular-nums">${formatCurrency(calc.subtotalPets)}</strong>
      </div>
    `;
  }

  // Meal Plan
  if (calc.subtotalMeals > 0) {
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-teal-700 dark:text-teal-300">
        <div>
          <span class="font-bold">${calc.mealPlanName}</span>
          <div class="text-[11px] opacity-80 font-mono">${calc.mealPax} pax × ${formatCurrency(calc.mealRate)} × ${calc.nights} noches</div>
        </div>
        <strong class="font-black tabular-nums">${formatCurrency(calc.subtotalMeals)}</strong>
      </div>
    `;
  }

  // Tour Services
  if (calc.selectedTours && calc.selectedTours.length > 0) {
    calc.selectedTours.forEach(ts => {
      itemsHtml += `
        <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <div>
            <span class="font-bold">${ts.name}</span>
            <div class="text-[11px] opacity-80 font-mono">${ts.quantity} unidad(es) × ${formatCurrency(ts.unitRate)}</div>
          </div>
          <strong class="font-black tabular-nums">${formatCurrency(ts.total)}</strong>
        </div>
      `;
    });
  }

  // Discount
  if (calc.discount > 0) {
    itemsHtml += `
      <div class="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 dark:text-rose-400">
        <div>
          <span class="font-bold">Descuento Comercial Aplicado</span>
        </div>
        <strong class="font-black tabular-nums">- ${formatCurrency(calc.discount)}</strong>
      </div>
    `;
  }

  container.innerHTML = itemsHtml;
}

// 12. RENDERIZADOR DEL DOCUMENTO OFICIAL PDF DE HOSPEDAJE (SOLID WHITE PAPER)
// Observaciones predeterminadas de las cotizaciones de cabaña (se guardan con los datos
// de la empresa, así que se comparten entre usuarios y dispositivos)
function getDefaultCabinObservations() {
  const t = state.company && typeof state.company.cabinDefaultObservations === 'string' ? state.company.cabinDefaultObservations.trim() : '';
  return t || 'Check-in: 3:00 PM | Check-out: 12:00 M.';
}

function saveDefaultCabinObservations() {
  const el = document.getElementById('hos-observations-input');
  const text = (el?.value || '').trim();
  if (!text) { showToast('Escribe el texto que quieres dejar como predeterminado'); return; }
  if (!state.company) state.company = {};
  state.company.cabinDefaultObservations = text;
  saveState();
  updateDefaultObservationsHint();
  showToast('⭐ Texto guardado: saldrá en todas las cotizaciones nuevas de cabaña');
}

function applyDefaultCabinObservations() {
  const el = document.getElementById('hos-observations-input');
  if (!el) return;
  const def = getDefaultCabinObservations();
  if (el.value.trim() && el.value.trim() !== def && !confirm('¿Reemplazar las observaciones actuales por el texto predeterminado?')) return;
  el.value = def;
  if (state.activeCabinQuote) state.activeCabinQuote.observations = def;
  if (typeof handleCabinQuoteInputChange === 'function') handleCabinQuoteInputChange();
}

function updateDefaultObservationsHint() {
  const hint = document.getElementById('hos-observations-default-hint');
  if (!hint) return;
  const has = !!(state.company && state.company.cabinDefaultObservations && state.company.cabinDefaultObservations.trim());
  hint.textContent = has
    ? '⭐ Hay un texto predeterminado guardado: sale automáticamente en cada cotización nueva.'
    : 'Este texto sale en el PDF. Guárdalo como predeterminado para que aparezca en cada cotización nueva.';
}

// Fecha legible para el PDF: "vie. 6 nov. 2026" (sin partirse en dos renglones)
function pdfStayDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  const dias = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  const meses = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function renderCabinQuotePdfSheet(q, cabin, calc) {
  const sheet = document.getElementById('pdf-cabin-document-sheet');
  if (!sheet) return;

  const comp = state.company || {
    name: 'Xander Pro Turismo',
    nit: '900.000.000-1',
    phone: '+57 300 000 0000',
    email: 'reservas@xanderpro.com',
    bankDetails: 'Bancolombia Ahorros: 000-000000-00'
  };

  const client = (state.clients || []).find(c => c.id === q.clientId) || {
    name: 'Cliente Cotización',
    doc: '-',
    phone: '-',
    email: '-'
  };

  const mainPhoto = (cabin.photos || []).find(p => p.isMain) || (cabin.photos || [])[0] || {
    url: 'img/cabana-1.svg'
  };

  sheet.innerHTML = `
    <!-- Header / Letterhead -->
    <div class="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        ${comp.logoDataUrl ? `
          <img src="${comp.logoDataUrl}" alt="Logo" class="w-14 h-14 object-contain rounded-xl" />
        ` : `
          <div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xs">
            XP
          </div>
        `}
        <div>
          <h2 class="text-base font-black text-slate-900 uppercase tracking-tight">${comp.name}</h2>
          <p class="text-[10px] text-slate-500 font-medium">NIT / RUT: ${comp.nit}${comp.rnt ? ` · RNT: ${comp.rnt}` : ''} · Tel: ${comp.phone}</p>
          <p class="text-[10px] text-slate-500 font-medium">${comp.email} · ${comp.address || ''}</p>
        </div>
      </div>

      <div class="text-right sm:self-center">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
          Cotización de Hospedaje
        </span>
        <div class="text-base sm:text-lg font-black text-slate-900 mt-1 tabular-nums">${q.number}</div>
        <div class="text-[10px] text-slate-500 font-semibold">
          Emisión: ${q.createdAt || new Date().toISOString().slice(0, 10)} · Versión V${q.version || 1}
        </div>
        ${q.expirationDate ? `
          <div class="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
            Oferta Válida Hasta: ${q.expirationDate}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Client & Stay Meta Grid (Never cut across page break) -->
    <div class="pdf-avoid-break grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Huésped Principal / Cliente</span>
        <strong class="text-sm font-black text-slate-900 block">${client.name}</strong>
        <span class="text-slate-600 block text-[11px] mt-0.5">Identificación: ${client.doc || '-'} · Tel: ${client.phone || '-'}</span>
        <span class="text-slate-600 block text-[11px]">Email: ${client.email || '-'}</span>
      </div>
      <div class="sm:border-l sm:border-slate-200 sm:pl-3.5">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detalles de Estadía</span>
        <div class="grid grid-cols-2 gap-2 mt-1.5">
          <div class="px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200">
            <span class="block text-[9px] font-extrabold uppercase tracking-wider text-teal-700 whitespace-nowrap">Entrada · Check-in</span>
            <strong class="block text-xs font-black text-teal-900 whitespace-nowrap">${pdfStayDate(q.checkInDate)}</strong>
            <span class="block text-[10px] font-bold text-teal-700 whitespace-nowrap">Desde las 3:00 p. m.</span>
          </div>
          <div class="px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200">
            <span class="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">Salida · Check-out</span>
            <strong class="block text-xs font-black text-slate-900 whitespace-nowrap">${pdfStayDate(q.checkOutDate)}</strong>
            <span class="block text-[10px] font-bold text-slate-500 whitespace-nowrap">Hasta las 12:00 m.</span>
          </div>
        </div>
        <div class="text-slate-700 text-[11px] font-bold mt-2 flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded bg-teal-700 text-white text-[10px] font-black whitespace-nowrap">${calc.nights} noche(s)</span>
          <span class="whitespace-nowrap">👥 ${q.adults} adulto(s)</span>
          <span class="whitespace-nowrap">👶 ${(Number(q.kids5to10) || 0) + (Number(q.kids0to4) || 0)} niño(s)</span>
          <span class="whitespace-nowrap">🐾 ${q.pets || 0} mascota(s)</span>
        </div>
      </div>
    </div><!-- Visual Cabin Card in PDF -->
    <div class="pdf-avoid-break rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
      <div class="flex flex-row items-stretch">
        <div class="shrink-0 bg-slate-100" role="img" aria-label="${cabin.name}"
             style="width:240px;min-width:240px;height:160px;background-image:url('${(window.xpPdfImageUrl ? window.xpPdfImageUrl(mainPhoto.url) : mainPhoto.url)}'), url('img/cabana-1.svg');background-size:cover;background-position:center;background-repeat:no-repeat;"></div>
        <div class="p-4 flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                ${cabin.code}
              </span>
              <span class="text-[10px] text-slate-500 font-bold">
                Capacidad: ${cabin.baseCapacity} a ${cabin.maxCapacity} Huéspedes
              </span>
            </div>
            <h3 class="text-sm font-black text-slate-900 mt-1">${cabin.name}</h3>
            <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line">${cabin.description || ''}</p>
          </div>

          <!-- Included Amenities Badges -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${cabin.pool ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">🏊 Piscina</span>' : ''}
            ${cabin.jacuzzi ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">🛁 Jacuzzi</span>' : ''}
            ${cabin.ac ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">❄️ A/C</span>' : ''}
            ${cabin.parking ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">🚗 Parqueadero</span>' : ''}
            ${cabin.wifi ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">📶 Wi-Fi</span>' : ''}
            ${cabin.bbq ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-700">🥩 Zona BBQ</span>' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- DETAILED MATHEMATICAL COST BREAKDOWN TABLE (PROHIBIDO SOLO UN TOTAL) -->
    <div>
      <div class="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5">
        Detalle y Desglose de Liquidación de Servicios
      </div>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-900 text-[10px] uppercase font-black text-slate-600 text-left bg-slate-50">
            <th class="py-2 px-2.5">Concepto / Servicio</th>
            <th class="py-2 px-2.5 text-center">Fórmula de Cálculo</th>
            <th class="py-2 px-2.5 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <!-- Row 1: Base Cabin -->
          <tr>
            <td class="py-2 px-2.5">
              <strong class="text-slate-900 block">Hospedaje Cabaña (${cabin.name})</strong>
              <span class="text-[10px] text-slate-500">${(() => { const a = Number(q.adults) || 0, k = Number(q.kids5to10) || 0, i = Number(q.kids0to4) || 0; const t = getChildPolicyTiers(); const parts = [`${a} ${t.adult.label.toLowerCase()}`]; if (k) parts.push(`${k} ${t.child.label.toLowerCase()}`); if (i) parts.push(`${i} ${t.infant.label.toLowerCase()}`); return `${a + k + i} huésped(es): ${parts.join(', ')}`; })()}</span>
            </td>
            <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
              ${formatCurrency(calc.nightlyRate)} × ${calc.nights} noches
            </td>
            <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
              ${formatCurrency(calc.subtotalBase)}
            </td>
          </tr>

          <!-- Row 2: Extra Pax -->
          ${calc.extraPaxCount > 0 ? `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">Persona(s) Adicional(es)</strong>
                <span class="text-[10px] text-slate-500">Excedente sobre la capacidad máxima (${cabin.maxCapacity} pax)</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${calc.extraPaxCount} pax × ${formatCurrency(calc.extraPersonRate)} × ${calc.nights} noches
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(calc.subtotalExtraPax)}
              </td>
            </tr>
          ` : ''}

          <!-- Row 3: Kids 5 to 10 -->
          ${calc.kids5to10 > 0 ? `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">${calc.childLabel || 'Niños (5 a 10 años)'}</strong>
                <span class="text-[10px] text-slate-500">Tarifa reducida por menor de edad</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${calc.kids5to10} × ${formatCurrency(calc.childRate5to10)} × ${calc.nights} noches
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(calc.subtotalKids)}
              </td>
            </tr>
          ` : ''}

          <!-- Row 3b: primer grupo de edad con tarifa -->
          ${calc.kids0to4 > 0 && calc.subtotalInfants > 0 ? `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">${calc.infantLabel || 'Bebés'}</strong>
                <span class="text-[10px] text-slate-500">Tarifa por menor de edad</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${calc.kids0to4} × ${formatCurrency(calc.infantRate)} × ${calc.nights} noches
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(calc.subtotalInfants)}
              </td>
            </tr>
          ` : ''}

          <!-- Row 4: Pets -->
          ${calc.pets > 0 && calc.subtotalPets > 0 ? `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">Mascotas Acompañantes</strong>
                <span class="text-[10px] text-slate-500">Suplemento de limpieza y estadía pet friendly</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${calc.petChargeType === 'per_night' 
                  ? `${calc.pets} pet(s) × ${formatCurrency(calc.petRate)} × ${calc.nights} noches`
                  : `${calc.pets} pet(s) × ${formatCurrency(calc.petRate)} (cobro único)`}
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(calc.subtotalPets)}
              </td>
            </tr>
          ` : ''}

          <!-- Row 5: Meal Plan -->
          ${calc.subtotalMeals > 0 ? `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">Alimentación: ${calc.mealPlanName}</strong>
                <span class="text-[10px] text-slate-500">Plan gastronómico en cabaña</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${calc.mealPax} pax × ${formatCurrency(calc.mealRate)} × ${calc.nights} noches
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(calc.subtotalMeals)}
              </td>
            </tr>
          ` : ''}

          <!-- Rows for Tour Services -->
          ${(calc.selectedTours || []).map(ts => `
            <tr>
              <td class="py-2 px-2.5">
                <strong class="text-slate-900 block">${ts.name}</strong>
                <span class="text-[10px] text-slate-500">Servicio turístico y traslados</span>
              </td>
              <td class="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600">
                ${ts.quantity} unidad(es) × ${formatCurrency(ts.unitRate)}
              </td>
              <td class="py-2 px-2.5 text-right font-black text-slate-900 tabular-nums">
                ${formatCurrency(ts.total)}
              </td>
            </tr>
          `).join('')}

          <!-- Discount Row if any -->
          ${calc.discount > 0 ? `
            <tr class="text-rose-600">
              <td class="py-2 px-2.5" colspan="2">
                <strong class="block">Descuento Especial Aplicado</strong>
              </td>
              <td class="py-2 px-2.5 text-right font-black tabular-nums">
                - ${formatCurrency(calc.discount)}
              </td>
            </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-900 bg-slate-50">
            <td colspan="2" class="py-2.5 px-2.5 text-sm font-black text-slate-900 uppercase">
              TOTAL GENERAL DE LA COTIZACIÓN:
            </td>
            <td class="py-2.5 px-2.5 text-right text-base font-black text-slate-900 tabular-nums">
              ${formatCurrency(calc.total)}
            </td>
          </tr>
          ${calc.requiresDeposit === false ? `
          <tr>
            <td colspan="2" class="py-1.5 px-2.5 text-xs font-bold text-slate-700">
              Forma de Pago: Pago total al ingreso (Check-in) · No requiere anticipo
            </td>
            <td class="py-1.5 px-2.5 text-right text-xs font-black text-slate-800 tabular-nums">
              ${formatCurrency(calc.total)}
            </td>
          </tr>
          ` : `
          <tr>
            <td colspan="2" class="py-1.5 px-2.5 text-xs font-bold text-blue-700">
              Anticipo Sugerido para Reserva (${calc.depositPct}%):
            </td>
            <td class="py-1.5 px-2.5 text-right text-xs font-black text-blue-700 tabular-nums">
              ${formatCurrency(calc.deposit)}
            </td>
          </tr>
          <tr>
            <td colspan="2" class="py-1.5 px-2.5 text-xs font-semibold text-slate-600">
              Saldo Restante a Liquidar al Ingreso (Check-in):
            </td>
            <td class="py-1.5 px-2.5 text-right text-xs font-bold text-slate-800 tabular-nums">
              ${formatCurrency(calc.balance)}
            </td>
          </tr>
          `}
        </tfoot>
      </table>
    </div>


    <!-- Observations and Bank Details -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
      <div class="space-y-1">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observaciones &amp; Normas</span>
        <p class="text-[11px] text-slate-600 leading-relaxed">${q.observations || cabin.observations || 'Check-in: 3:00 PM | Check-out: 12:00 M. Se prohíbe el uso de bafles de alta potencia después de las 11:00 PM.'}</p>
      </div>
      <div class="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">${calc.requiresDeposit === false ? 'Cuentas Bancarias para Pago' : 'Cuentas Bancarias para Anticipo'}</span>
        <div class="text-[11px] text-slate-700 font-medium whitespace-pre-line">${comp.bankDetails || 'Bancolombia Ahorros: 000-000000-00\nNequi: 300 000 0000'}</div>
      </div>
    </div>

    <!-- Signatures and Validity Footnote -->
    <div class="pt-6 border-t border-slate-200 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        Generado por <strong>${q.createdBy || 'Alexander'}</strong> el ${new Date().toLocaleDateString()} a través de <strong>Xander Pro</strong>.
      </div>
      <div class="flex items-center gap-6 text-center">
        <div class="w-36 border-t border-slate-400 pt-1 text-slate-600 font-bold">Firma Comercial</div>
        <div class="w-36 border-t border-slate-400 pt-1 text-slate-600 font-bold">Aceptado por Huésped</div>
      </div>
    </div>
  `;
}

// 13. GUARDAR COTIZACIÓN & HISTORIAL
function saveCurrentCabinQuote() {
  if (!state.activeCabinQuote) return;
  recalculateCabinQuoteLive();

  const q = state.activeCabinQuote;

  // Validation: Check-in & Check-out
  if (!q.checkInDate || !q.checkOutDate) {
    showToast('Selecciona las fechas de ingreso y salida');
    return;
  }
  if (!q.clientId) {
    showToast('Selecciona un cliente para la cotización');
    return;
  }
  if (!q.cabinId) {
    showToast('Selecciona una cabaña');
    return;
  }

  // Mandatory Reason if Rate Modified
  if (q.rateModified && (!q.modificationReason || q.modificationReason.trim().length < 3)) {
    showToast('Debes ingresar un motivo obligatorio para el ajuste de tarifa');
    const reasonInput = document.getElementById('hos-rate-reason-input');
    if (reasonInput) reasonInput.focus();
    return;
  }

  state.cabinQuotes = state.cabinQuotes || [];
  const idx = state.cabinQuotes.findIndex(x => x.id === q.id);

  if (idx !== -1) {
    state.cabinQuotes[idx] = JSON.parse(JSON.stringify(q));
    showToast(`Cotización ${q.number} actualizada con éxito`);
  } else {
    state.cabinQuotes.unshift(JSON.parse(JSON.stringify(q)));
    showToast(`Cotización ${q.number} guardada con éxito`);
  }

  saveState();
    updateCabinDashboardAndBadges();
  try {
    const savedMod = localStorage.getItem('xander_active_module') || 'all';
    filterSidebarModule(savedMod);
  } catch (e) {}
  if (typeof renderAgenda === 'function') renderAgenda();
}

function openCabinQuotesHistoryModal() {
  // El historial ahora vive como pestaña dentro del Cotizador de Hospedaje
  if (typeof switchView === 'function') switchView('cotizador-cabanas');
  setCabinQuoteStep('history');
}

function openCabinQuoteFromHistory(quoteId, step) {
  loadCabinQuoteIntoEditor(quoteId);
  setCabinQuoteStep(step || 'edit');
}

function renderCabinQuotesHistoryPanel() {
  const list = document.getElementById('hos-hist-list');
  const all = state.cabinQuotes || [];

  const badge = document.getElementById('hos-history-count-badge');
  if (badge) badge.textContent = all.length;

  // KPIs
  const totalOf = q => (q.pricing ? q.pricing.total : (q.total || 0)) || 0;
  const pending = all.filter(q => q.status === 'Enviada' || q.status === 'Borrador');
  const approved = all.filter(q => q.status === 'Aprobada');
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('hos-hist-kpi-total', all.length);
  setTxt('hos-hist-kpi-pending', pending.length);
  setTxt('hos-hist-kpi-pending-val', formatCurrency(pending.reduce((a, q) => a + totalOf(q), 0)));
  setTxt('hos-hist-kpi-approved', approved.length);
  setTxt('hos-hist-kpi-approved-val', formatCurrency(approved.reduce((a, q) => a + totalOf(q), 0)));
  setTxt('hos-hist-kpi-rate', all.length ? Math.round((approved.length / all.length) * 100) + '%' : '0%');

  if (!list) return;

  const search = (document.getElementById('hos-hist-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('hos-hist-status')?.value || '';
  const sort = document.getElementById('hos-hist-sort')?.value || 'recent';

  let quotes = all.map((q, idx) => ({ q, idx,
    client: (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente' },
    cabin: (state.cabins || []).find(c => c.id === q.cabinId) || { name: 'Cabaña', code: '' }
  }));
  if (statusFilter) quotes = quotes.filter(x => x.q.status === statusFilter);
  if (search) {
    quotes = quotes.filter(x => (x.q.number || '').toLowerCase().includes(search) ||
      (x.client.name || '').toLowerCase().includes(search) ||
      (x.cabin.name || '').toLowerCase().includes(search));
  }
  if (sort === 'checkin') quotes.sort((a, b) => String(a.q.checkInDate || '').localeCompare(String(b.q.checkInDate || '')));
  else if (sort === 'total') quotes.sort((a, b) => totalOf(b.q) - totalOf(a.q));
  else quotes.sort((a, b) => a.idx - b.idx);

  if (quotes.length === 0) {
    list.innerHTML = `
      <div class="py-14 px-4 text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
        </div>
        <div class="text-sm font-bold text-slate-700 dark:text-slate-200">${all.length ? 'Sin resultados para este filtro' : 'Aún no hay cotizaciones de hospedaje'}</div>
        <div class="text-xs text-slate-400 mt-1">${all.length ? 'Prueba con otro texto o estado.' : 'Arma una cotización y pulsa Guardar para verla aquí.'}</div>
      </div>`;
    return;
  }

  const statusBadges = {
    'Aprobada': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    'Enviada': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    'Borrador': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'Rechazada': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    'Vencida': 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  };
  const activeId = state.activeCabinQuote ? state.activeCabinQuote.id : null;
  const iconBtn = 'min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center transition cursor-pointer';
  const canDelete = typeof hasPermission === 'function' ? hasPermission('delete_records') : false;

  list.innerHTML = quotes.map(({ q, client, cabin }) => {
    const total = totalOf(q);
    const guests = (Number(q.adults) || 0) + (Number(q.kids5to10) || 0) + (Number(q.kids0to4) || 0);
    const noDeposit = q.pricing && q.pricing.requiresDeposit === false;
    return `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${q.id === activeId ? 'bg-teal-50/60 dark:bg-teal-950/20' : ''}">
        <div class="md:col-span-3 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <strong class="font-extrabold text-slate-900 dark:text-white text-xs tabular-nums">${q.number}</strong>
            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">V${q.version || 1}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusBadges[q.status] || statusBadges.Enviada}">${q.status || 'Enviada'}</span>
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">Emitida ${q.createdAt || '-'}${q.expirationDate ? ' · Vence ' + q.expirationDate : ''}</div>
        </div>
        <div class="md:col-span-3 min-w-0">
          <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${client.name}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${cabin.name}${cabin.code ? ' · ' + cabin.code : ''}</div>
        </div>
        <div class="md:col-span-2 min-w-0">
          <div class="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">${q.checkInDate || '-'} → ${q.checkOutDate || '-'}</div>
          <div class="text-[11px] text-slate-400">${q.nights || 0} noche(s) · ${guests} huésped(es)</div>
        </div>
        <div class="md:col-span-2 md:text-right">
          <div class="text-sm font-black text-slate-900 dark:text-white tabular-nums">${formatCurrency(total)}</div>
          <div class="text-[11px] ${noDeposit ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400'} tabular-nums">${noDeposit ? 'Sin anticipo' : 'Anticipo ' + formatCurrency(q.pricing?.deposit || 0)}</div>
        </div>
        <div class="md:col-span-2 flex items-center md:justify-end gap-1.5 pt-1 md:pt-0">
          <button type="button" onclick="openCabinQuoteFromHistory('${q.id}', 'preview')" class="${iconBtn} text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40" title="Ver documento / PDF" aria-label="Ver documento">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          <button type="button" onclick="openCabinQuoteFromHistory('${q.id}', 'edit')" class="${iconBtn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar cotización" aria-label="Editar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button type="button" onclick="duplicateCabinQuoteAsNewVersion('${q.id}')" class="${iconBtn} text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40" title="Crear nueva versión" aria-label="Nueva versión">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </button>
          ${canDelete ? `
          <button type="button" onclick="deleteCabinQuote('${q.id}')" class="${iconBtn} text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Eliminar" aria-label="Eliminar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>` : ''}
        </div>
      </div>`;
  }).join('');
}
window.renderCabinQuotesHistoryPanel = renderCabinQuotesHistoryPanel;
window.openCabinQuoteFromHistory = openCabinQuoteFromHistory;

function renderCabinQuotesHistoryTable() {
  const container = document.getElementById('cabin-quotes-history-container');
  if (!container) return;

  const search = (document.getElementById('cabin-quotes-history-search')?.value || '').toLowerCase().trim();
  let quotes = state.cabinQuotes || [];

  if (search) {
    quotes = quotes.filter(q => {
      const client = (state.clients || []).find(c => c.id === q.clientId);
      const cabin = (state.cabins || []).find(c => c.id === q.cabinId);
      return (q.number || '').toLowerCase().includes(search) ||
             (client?.name || '').toLowerCase().includes(search) ||
             (cabin?.name || '').toLowerCase().includes(search);
    });
  }

  if (quotes.length === 0) {
    container.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">No hay cotizaciones de cabañas registradas</div>';
    return;
  }

  const statusBadges = {
    'Aprobada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    'Enviada': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    'Borrador': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    'Rechazada': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    'Vencida': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  };

  container.innerHTML = quotes.map(q => {
    const client = (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente' };
    const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || { name: 'Cabaña' };
    const total = q.pricing ? q.pricing.total : (q.total || 0);

    return `
      <div class="py-3 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs transition mb-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <strong class="font-extrabold text-slate-900 dark:text-white text-sm">${q.number}</strong>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${statusBadges[q.status] || statusBadges.Enviada}">
              ${q.status}
            </span>
            <span class="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">V${q.version || 1}</span>
          </div>
          <div class="text-slate-600 dark:text-slate-300 font-semibold truncate mt-0.5">${cabin.name} · ${client.name}</div>
          <div class="text-[11px] text-slate-400 truncate">
            📅 ${q.checkInDate} al ${q.checkOutDate} (${q.nights} noches) · ${q.adults} adultos
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right">
            <strong class="text-sm font-black text-teal-600 dark:text-teal-400 block tabular-nums">${formatCurrency(total)}</strong>
            <span class="text-[10px] text-slate-400">Emisión: ${q.createdAt || '-'}</span>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" onclick="loadCabinQuoteIntoEditor('${q.id}'); closeModal('modal-cabin-quote-history'); switchView('cotizador-cabanas');" class="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer">
              Cargar
            </button>
            <button type="button" onclick="duplicateCabinQuoteAsNewVersion('${q.id}')" class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer" title="Crear versión V2">
              📑
            </button>
            ${hasPermission('delete_records') ? `
              <button type="button" onclick="deleteCabinQuote('${q.id}')" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer" title="Eliminar">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function duplicateCabinQuoteAsNewVersion(quoteId) {
  const original = (state.cabinQuotes || []).find(q => q.id === quoteId);
  if (!original) return;

  const currentVersion = original.version || 1;
  const newVersion = currentVersion + 1;
  const baseNumber = original.baseNumber || original.number;

  const copy = JSON.parse(JSON.stringify(original));
  copy.id = 'cq-' + Date.now();
  copy.version = newVersion;
  copy.number = `${baseNumber} V${newVersion}`;
  copy.baseNumber = baseNumber;
  copy.createdAt = new Date().toISOString().slice(0, 10);
  copy.status = 'Borrador';

  state.cabinQuotes.unshift(copy);
  saveState();
  showToast(`Versión ${copy.number} creada con éxito`);
  closeModal('modal-cabin-quote-history');
  loadCabinQuoteIntoEditor(copy.id);
  switchView('cotizador-cabanas');
}

function deleteCabinQuote(quoteId) {
  if (!hasPermission('delete_records')) {
    showToast('Permiso denegado para eliminar cotizaciones');
    return;
  }
  if (!confirm('¿Eliminar esta cotización de hospedaje?')) return;
  state.cabinQuotes = (state.cabinQuotes || []).filter(q => q.id !== quoteId);
  saveState();
  showToast('Cotización eliminada');
  renderCabinQuotesHistoryTable();
  renderCabinQuotesHistoryPanel();
    updateCabinDashboardAndBadges();
  try {
    const savedMod = localStorage.getItem('xander_active_module') || 'all';
    filterSidebarModule(savedMod);
  } catch (e) {}
  if (typeof renderAgenda === 'function') renderAgenda();
}

// 14. EXPORTACIÓN PDF, IMPRESIÓN & WHATSAPP
// 14. EXPORTACIÓN PDF PROFESIONAL DE HOSPEDAJE (ZERO BLANK GAP & MULTI-PAGE SLICING)
function downloadCabinQuotePdf() {
  const sheet = document.getElementById('pdf-cabin-document-sheet');
  if (!sheet) {
    showToast('Hoja de cotización no disponible');
    return;
  }

  const q = state.activeCabinQuote || {};
  const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || { name: 'Cabaña' };
  const cleanNumber = (q.number || 'HOS-2026-0001').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanCabin = (cabin.name || 'Cabana').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanNumber}_${cleanCabin}_${q.checkInDate || '2026'}.pdf`;

  showToast('Generando PDF oficial en fondo blanco...');

  // 1. Temporarily switch DOM to light mode
  const wasDark = document.documentElement.classList.contains('dark');
  if (wasDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }

  // 2. Clone sheet into an off-screen fixed 794px A4 container (pixel-perfect A4 geometry)
  const clone = sheet.cloneNode(true);
  clone.id = 'pdf-cabin-render-clone';
  clone.className = 'bg-white space-y-5 text-slate-900 pdf-pure-white-export';
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.margin = '0px';
  clone.style.padding = '28px 34px';
  clone.style.boxSizing = 'border-box';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.colorScheme = 'light';
  clone.style.transform = 'none';

  // Ensure tables and wrappers don't clip
  clone.querySelectorAll('.overflow-x-auto, .overflow-visible, .overflow-hidden').forEach(el => {
    el.style.overflow = 'visible';
    el.style.maxWidth = '100%';
  });
  clone.querySelectorAll('*').forEach(el => {
    el.style.transform = 'none';
  });

  // Fix html2canvas + Tailwind preflight image baseline bug
  const h2cFixStyle = document.createElement('style');
  h2cFixStyle.id = 'h2c-cabin-baseline-fix';
  h2cFixStyle.textContent = 'img{display:inline-block !important;}';
  document.head.appendChild(h2cFixStyle);

  // 3. Off-screen sandbox fixed at (0,0) - GUARANTEES ZERO TOP GAP / OFFSET
  const sandbox = document.createElement('div');
  sandbox.id = 'pdf-cabin-render-sandbox';
  sandbox.style.cssText = 'position:fixed;left:0;top:0;width:794px;margin:0;padding:0;background:#ffffff;color:#0f172a;color-scheme:light;z-index:999998;pointer-events:none;overflow:visible;';
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Loading veil
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#ffffff;display:flex;align-items:center;justify-content:center;font:600 14px Inter,system-ui,sans-serif;color:#0d9488;';
  veil.textContent = '📄 Generando PDF de Hospedaje en blanco...';
  document.body.appendChild(veil);

  // Remember previous scroll and force scroll to top
  const prevScrollX = window.scrollX;
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const cleanup = () => {
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
    cleanup();
    if (window.html2pdf) {
      window.html2pdf().from(sheet).save(filename);
    } else {
      window.print();
    }
    return;
  }

  // Safe break points: avoid slicing through table rows or .pdf-avoid-break blocks
  const cloneTop = clone.getBoundingClientRect().top;
  const breakPoints = [];
  clone.querySelectorAll('tr, .pdf-avoid-break, .rounded-2xl').forEach(el => {
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
      const pxPerMm = 794 / pageWmm;
      const pageHpx = pageHmm * pxPerMm;
      const topPadNext = 28;
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
          const candidates = breakPoints.filter(b => b > start + 140 && b <= limit);
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
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWmm, pageHmm, 'F');
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', 0, pad / pxPerMm, pageWmm, (sliceH / SCALE) / pxPerMm);

        start = end;
        pageIndex++;
      }

      pdf.save(filename);
      cleanup();
      showToast(`✅ PDF descargado con éxito: ${filename}`);
    }).catch(err => {
      console.error('Error generating cabin PDF:', err);
      cleanup();
      window.print();
    });
  }, 100);
}

function printCabinQuoteSheet() {
  window.print();
}

function shareCabinQuoteWhatsApp() {
  const q = state.activeCabinQuote;
  if (!q) return;

  const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || { name: 'Cabaña' };
  const client = (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente', phone: '' };
  const total = q.pricing ? formatCurrency(q.pricing.total) : '$ 0';
  const deposit = q.pricing ? formatCurrency(q.pricing.deposit) : '$ 0';

  const message = `Hola ${client.name}! 🏡 Te comparto la cotización de hospedaje oficial de *${state.company?.name || 'Xander Pro'}*:\n\n` +
    `📋 *Cotización:* ${q.number} (V${q.version || 1})\n` +
    `🏡 *Cabaña:* ${cabin.name}\n` +
    `📅 *Check-in:* ${q.checkInDate} | *Check-out:* ${q.checkOutDate} (${q.nights} noches)\n` +
    `👥 *Huéspedes:* ${q.adults} adultos, ${q.kids5to10 || 0} niños, ${q.pets || 0} mascotas\n` +
    `💵 *Total General:* ${total}\n` +
    (q.pricing && q.pricing.requiresDeposit === false
      ? `💳 *Forma de pago:* Pago total al check-in (sin anticipo)\n\n`
      : `💰 *Anticipo para reservar:* ${deposit} (${q.pricing?.depositPct ?? q.depositPercentage ?? 50}%)\n\n`) +
    `Válida hasta: ${q.expirationDate || 'próximos 7 días'}.\n` +
    `Quedamos atentos para ayudarte a confirmar tu estadía! ✨`;

  const cleanPhone = (client.phone || '').replace(/[^\d]/g, '');
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// 15. PUENTES: CUENTA DE COBRO & ANTICIPO EN FLUJO DE CAJA
function openCabinCuentaDeCobroModal() {
  const q = state.activeCabinQuote;
  if (!q) return;

  const modal = document.getElementById('modal-cuenta-cobro');
  if (!modal) {
    showToast('Generando recibo de cuenta de cobro...');
    return;
  }

  // Pre-fill existing cuenta de cobro modal fields
  const client = (state.clients || []).find(c => c.id === q.clientId);
  const cabin = (state.cabins || []).find(c => c.id === q.cabinId);

  const conceptIn = document.getElementById('cc-concept');
  const amountIn = document.getElementById('cc-amount');
  const clientIn = document.getElementById('cc-client-name');
  const docIn = document.getElementById('cc-client-doc');

  const ccNoDeposit = q.pricing?.requiresDeposit === false;
  const ccDepPct = q.pricing?.depositPct || q.depositPercentage || 50;
  if (conceptIn) conceptIn.value = `${ccNoDeposit ? 'Pago total' : 'Anticipo ' + ccDepPct + '%'} Hospedaje Cabaña ${cabin?.name || ''} (${q.nights} noches: ${q.checkInDate} al ${q.checkOutDate}) - Ref: ${q.number}`;
  if (amountIn) amountIn.value = ccNoDeposit ? (q.pricing?.total || 0) : (q.pricing?.deposit || Math.round((q.pricing?.total || 0) * 0.5));
  if (clientIn && client) clientIn.value = client.name;
  if (docIn && client) docIn.value = client.doc || '';

  modal.classList.remove('hidden');
}

function registerCabinQuoteDepositToFinances() {
  const q = state.activeCabinQuote;
  if (!q) return;

  const depositVal = q.pricing?.deposit || 0;
  if (depositVal <= 0) {
    showToast(q.pricing?.requiresDeposit === false ? 'Esta cotización no tiene anticipo (pago total al check-in)' : 'El valor del anticipo es $0');
    return;
  }

  const cabin = (state.cabins || []).find(c => c.id === q.cabinId);
  const client = (state.clients || []).find(c => c.id === q.clientId);

  state.finances = state.finances || [];
  const newIncome = {
    id: 'fin-' + Date.now(),
    type: 'ingreso',
    date: new Date().toISOString().slice(0, 10),
    concept: `Anticipo Hospedaje ${cabin?.name || 'Cabaña'} - ${client?.name || 'Cliente'} (${q.number})`,
    category: 'Hospedaje Cabañas',
    method: 'Transferencia Bancaria',
    amount: depositVal
  };

  state.finances.push(newIncome);
  saveState();
  showToast(`Anticipo de ${formatCurrency(depositVal)} registrado en Flujo de Caja`);
  if (typeof renderFinancesView === 'function') renderFinancesView();
}

// 16. AGENDA OPERATIVA: DETALLES AL CLICAR SOLICITUD DE HOSPEDAJE
function openAgendaCabinQuoteDetails(quoteId) {
  const q = (state.cabinQuotes || []).find(x => x.id === quoteId || x.number === quoteId);
  if (!q) {
    showToast('Cotización de hospedaje no encontrada');
    return;
  }

  const modal = document.getElementById('modal-agenda-cabin-details');
  const title = document.getElementById('agenda-cabin-modal-title');
  const body = document.getElementById('agenda-cabin-modal-body');
  const openBtn = document.getElementById('btn-agenda-open-cabin-quote');

  const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || { name: 'Cabaña', code: 'CAB' };
  const client = (state.clients || []).find(c => c.id === q.clientId) || { name: 'Cliente', phone: '-', email: '-' };
  const total = q.pricing ? formatCurrency(q.pricing.total) : '$ 0';
  const deposit = q.pricing ? formatCurrency(q.pricing.deposit) : '$ 0';

  if (title) title.textContent = `${cabin.name} (${cabin.code})`;

  if (body) {
    body.innerHTML = `
      <div class="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Cotización</span>
          <strong class="font-black text-slate-900 dark:text-white">${q.number} (V${q.version || 1})</strong>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Estado Comercial</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">${q.status}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Cliente / Huésped</span>
          <strong class="font-extrabold text-slate-800 dark:text-slate-200">${client.name}</strong>
          <div class="text-[10px] text-slate-500">Tel: ${client.phone}</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Estadía Programada</span>
          <strong class="font-extrabold text-teal-600 dark:text-teal-400">${q.nights} Noches</strong>
          <div class="text-[10px] text-slate-500">${q.checkInDate} al ${q.checkOutDate}</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Huéspedes</span>
          <div class="text-slate-700 dark:text-slate-300 font-bold">${q.adults} Adultos, ${q.kids5to10 || 0} Niños, ${q.pets || 0} Mascotas</div>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase">Total & Anticipo</span>
          <strong class="text-slate-900 dark:text-white">${total}</strong>
          <div class="text-[10px] text-blue-600 font-semibold">Anticipo: ${deposit}</div>
        </div>
      </div>
    `;
  }

  if (openBtn) {
    openBtn.onclick = function() {
      closeModal('modal-agenda-cabin-details');
      loadCabinQuoteIntoEditor(q.id);
      switchView('cotizador-cabanas');
    };
  }

  if (modal) modal.classList.remove('hidden');
}

// 17. DASHBOARD KPI & SIDEBAR BADGES
function updateCabinDashboardAndBadges() {
  const quotes = state.cabinQuotes || [];
  const activeQuotes = quotes.filter(q => q.status !== 'Rechazada');
  const totalVal = activeQuotes.reduce((acc, q) => acc + (q.pricing?.total || 0), 0);

  // Sidebar badge
  const sbBadge = document.getElementById('badge-cabin-quotes-count-sidebar');
  if (sbBadge) sbBadge.textContent = quotes.length;
  const histBadge = document.getElementById('hos-history-count-badge');
  if (histBadge) histBadge.textContent = quotes.length;
  const histPanel = document.getElementById('hos-history-fullscreen');
  if (histPanel && !histPanel.classList.contains('hidden')) renderCabinQuotesHistoryPanel();

  // Dashboard KPI
  const kpiCount = document.getElementById('dash-kpi-cabin-quotes');
  const kpiVal = document.getElementById('dash-kpi-cabin-quotes-val');

  if (kpiCount) kpiCount.textContent = activeQuotes.length;
  if (kpiVal) kpiVal.textContent = `Valor: ${formatCurrency(totalVal)}`;
}
  // Exponer métodos del módulo de cabañas globalmente
  window.compressImageFile = compressImageFile;
  window.migrateCabanasState = migrateCabanasState;
  window.getCurrentUser = getCurrentUser;
  window.hasPermission = hasPermission;
  window.renderCompanyUsersList = renderCompanyUsersList;
  window.openUserModal = openUserModal;
  window.saveUserFromForm = saveUserFromForm;
  window.deleteUser = deleteUser;
  window.renderChildPoliciesInputs = renderChildPoliciesInputs;
  window.saveChildPoliciesSettings = saveChildPoliciesSettings;
  window.switchCabanasTab = switchCabanasTab;
  window.renderCabinsGrid = renderCabinsGrid;
  window.quickQuoteCabin = quickQuoteCabin;
  window.openCabinModal = openCabinModal;
  window.toggleCabinFormPetFields = toggleCabinFormPetFields;
  window.handleCabinPhotoUpload = handleCabinPhotoUpload;
  window.setMainCabinPhoto = setMainCabinPhoto;
  window.removeCabinPhoto = removeCabinPhoto;
  window.saveCabinFromForm = saveCabinFromForm;
  window.toggleCabinStatus = toggleCabinStatus;
  window.deleteCabin = deleteCabin;
  window.renderMealPlansGrid = renderMealPlansGrid;
  window.openMealPlanModal = openMealPlanModal;
  window.saveMealPlanFromForm = saveMealPlanFromForm;
  window.deleteMealPlan = deleteMealPlan;
  window.renderTourServicesGrid = renderTourServicesGrid;
  window.openTourServiceModal = openTourServiceModal;
  window.toggleTourFormVehicleCapacity = toggleTourFormVehicleCapacity;
  window.saveTourServiceFromForm = saveTourServiceFromForm;
  window.deleteTourService = deleteTourService;
  window.generateCabinQuoteNumber = generateCabinQuoteNumber;
  window.populateCabinQuotePickers = populateCabinQuotePickers;
  window.renderTourServicesChecklist = renderTourServicesChecklist;
  window.handleTourServiceToggle = handleTourServiceToggle;
  window.handleTourQuantityChange = handleTourQuantityChange;
  window.startNewCabinQuote = startNewCabinQuote;
  window.loadCabinQuoteIntoEditor = loadCabinQuoteIntoEditor;
  window.handleCabinSelectionChange = handleCabinSelectionChange;
  window.handleCabinDatesChange = handleCabinDatesChange;
  window.handleRateAdjustmentChange = handleRateAdjustmentChange;
  window.handleMealPlanSelectChange = handleMealPlanSelectChange;
  window.handleCabinQuoteStatusChange = handleCabinQuoteStatusChange;
  window.handleCabinQuoteInputChange = handleCabinQuoteInputChange;
  window.checkCabinDateConflicts = checkCabinDateConflicts;
  window.checkCabinDateConflictsBanner = checkCabinDateConflictsBanner;
  window.recalculateCabinQuoteLive = recalculateCabinQuoteLive;
  window.saveCurrentCabinQuote = saveCurrentCabinQuote;
  window.openCabinQuotesHistoryModal = openCabinQuotesHistoryModal;
  window.renderCabinQuotesHistoryTable = renderCabinQuotesHistoryTable;
  window.duplicateCabinQuoteAsNewVersion = duplicateCabinQuoteAsNewVersion;
  window.deleteCabinQuote = deleteCabinQuote;
  window.downloadCabinQuotePdf = downloadCabinQuotePdf;
  window.printCabinQuoteSheet = printCabinQuoteSheet;
  window.shareCabinQuoteWhatsApp = shareCabinQuoteWhatsApp;
  window.openCabinCuentaDeCobroModal = openCabinCuentaDeCobroModal;
  window.registerCabinQuoteDepositToFinances = registerCabinQuoteDepositToFinances;
  window.openAgendaCabinQuoteDetails = openAgendaCabinQuoteDetails;
  window.updateCabinDashboardAndBadges = updateCabinDashboardAndBadges;
  
