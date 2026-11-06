/* Xander Pro — 07-versiones-cotizacion (extraído de index.html; scripts clásicos que comparten el ámbito global) */
// =============================================================
// CONTROL DE VERSIONES DE COTIZACIONES (VERSION CONTROL ENGINE)
// =============================================================

function isQuoteLocked(q) {
  const quote = q || state.activeQuote;
  if (!quote) return false;
  const status = (quote.status || '').trim();
  return status === 'Enviada' || status === 'Aprobada' || status === 'Reemplazada';
}

function getQuoteBaseNumber(numberOrQuote) {
  if (!numberOrQuote) return 'COT-2026-0001';
  const num = typeof numberOrQuote === 'string' ? numberOrQuote : (numberOrQuote.baseNumber || numberOrQuote.number || '');
  return num.replace(/\s*V\d+$/i, '').trim();
}

function getAllVersionsOfQuote(baseNumberOrQuoteId) {
  let baseNum = '';
  if (typeof baseNumberOrQuoteId === 'string' && baseNumberOrQuoteId.startsWith('sq-')) {
    const q = (state.savedQuotes || []).find(x => x.id === baseNumberOrQuoteId);
    baseNum = q ? (q.baseNumber || getQuoteBaseNumber(q.number)) : '';
  } else if (typeof baseNumberOrQuoteId === 'string') {
    baseNum = getQuoteBaseNumber(baseNumberOrQuoteId);
  } else if (baseNumberOrQuoteId && typeof baseNumberOrQuoteId === 'object') {
    baseNum = baseNumberOrQuoteId.baseNumber || getQuoteBaseNumber(baseNumberOrQuoteId.number);
  }
  if (!baseNum && state.activeQuote) {
    baseNum = state.activeQuote.baseNumber || getQuoteBaseNumber(state.activeQuote.number);
  }
  const all = (state.savedQuotes || []).filter(sq => {
    const sqBase = sq.baseNumber || getQuoteBaseNumber(sq.number);
    return sqBase.toLowerCase() === baseNum.toLowerCase();
  });
  return all.sort((a, b) => (Number(a.version) || 1) - (Number(b.version) || 1));
}

function openCreateQuoteVersionModal(sourceQuoteId) {
  const source = sourceQuoteId 
    ? ((state.savedQuotes || []).find(q => q.id === sourceQuoteId) || state.activeQuote)
    : state.activeQuote;
  if (!source) return;

  const baseNumber = source.baseNumber || getQuoteBaseNumber(source.number);
  const allVersions = getAllVersionsOfQuote(baseNumber);
  const maxVer = allVersions.reduce((max, v) => Math.max(max, Number(v.version) || 1), Number(source.version) || 1);
  const nextVer = maxVer + 1;
  const nextNumber = `${baseNumber} V${nextVer}`;
  const curNumber = `${baseNumber} V${source.version || 1}`;

  const fromBadge = document.getElementById('new-ver-from-badge');
  if (fromBadge) fromBadge.textContent = curNumber;
  const fromStatus = document.getElementById('new-ver-from-status');
  if (fromStatus) {
    fromStatus.textContent = source.status || 'Borrador';
    fromStatus.className = 'inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ' + 
      (source.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-800' : (source.status === 'Enviada' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'));
  }

  const toBadge = document.getElementById('new-ver-to-badge');
  if (toBadge) toBadge.textContent = nextNumber;

  const dateInput = document.getElementById('new-ver-date-input');
  if (dateInput) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateInput.value = new Date().toLocaleDateString('es-CO', options);
  }

  const opInput = document.getElementById('new-ver-operator-input');
  if (opInput) opInput.value = getOperatorName();

  const reasonInput = document.getElementById('new-ver-reason-input');
  if (reasonInput) {
    reasonInput.value = '';
    setTimeout(() => reasonInput.focus(), 150);
  }

  const confirmBtn = document.getElementById('btn-confirm-create-quote-version');
  if (confirmBtn) {
    confirmBtn.setAttribute('data-source-id', source.id || 'active');
    confirmBtn.setAttribute('data-next-version', nextVer);
    confirmBtn.setAttribute('data-base-number', baseNumber);
  }

  const modal = document.getElementById('modal-new-quote-version');
  if (modal) modal.classList.remove('hidden');
}

function confirmCreateQuoteVersion() {
  const confirmBtn = document.getElementById('btn-confirm-create-quote-version');
  const sourceId = confirmBtn?.getAttribute('data-source-id') || 'active';
  const nextVer = parseInt(confirmBtn?.getAttribute('data-next-version') || '2', 10);
  const baseNumber = confirmBtn?.getAttribute('data-base-number') || getQuoteBaseNumber(state.activeQuote?.number);

  const reasonInput = document.getElementById('new-ver-reason-input');
  const reason = (reasonInput?.value || '').trim();
  if (!reason) {
    showToast('Por favor describe el motivo del cambio para mantener la trazabilidad');
    reasonInput?.focus();
    return;
  }

  const operatorInput = document.getElementById('new-ver-operator-input');
  const operatorName = (operatorInput?.value || '').trim() || getOperatorName();

  let source = (state.savedQuotes || []).find(q => q.id === sourceId);
  if (!source) source = state.activeQuote;

  source.status = 'Reemplazada';
  if (source.fullCopy) {
    source.fullCopy.status = 'Reemplazada';
  }
  const sourceIdx = (state.savedQuotes || []).findIndex(q => q.id === source.id);
  if (sourceIdx >= 0) {
    state.savedQuotes[sourceIdx].status = 'Reemplazada';
    if (state.savedQuotes[sourceIdx].fullCopy) {
      state.savedQuotes[sourceIdx].fullCopy.status = 'Reemplazada';
    }
  }

  const rawCopy = source.fullCopy ? JSON.parse(JSON.stringify(source.fullCopy)) : JSON.parse(JSON.stringify(source));
  const newId = 'sq-' + Date.now();
  const nextNumber = `${baseNumber} V${nextVer}`;
  const nowIso = new Date().toISOString();

  const newQuote = {
    ...rawCopy,
    id: newId,
    baseNumber: baseNumber,
    version: nextVer,
    number: nextNumber,
    status: 'Borrador',
    createdAt: nowIso,
    issueDate: nowIso.split('T')[0],
    createdBy: operatorName,
    changeReason: reason,
    parentQuoteId: source.id,
    items: JSON.parse(JSON.stringify(source.items || rawCopy.items || []))
  };

  const subtotal = (newQuote.items || []).reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)), 0);
  const afterDisc = subtotal * (1 - (Number(newQuote.discountPct) || 0) / 100);
  const total = afterDisc * (1 + (Number(newQuote.taxPct) || 0) / 100);
  newQuote.total = total;

  const summaryRecord = {
    id: newId,
    baseNumber: baseNumber,
    version: nextVer,
    number: nextNumber,
    eventType: newQuote.eventType,
    eventTitle: newQuote.eventTitle,
    clientId: newQuote.clientId,
    guestsPax: newQuote.guestsPax,
    eventDate: newQuote.eventDate,
    validUntil: newQuote.validUntil,
    total: total,
    status: 'Borrador',
    createdAt: nowIso,
    createdBy: operatorName,
    changeReason: reason,
    parentQuoteId: source.id,
    fullCopy: JSON.parse(JSON.stringify(newQuote))
  };

  state.savedQuotes.unshift(summaryRecord);
  state.activeQuote = JSON.parse(JSON.stringify(newQuote));

  saveState();
  closeModal('modal-new-quote-version');

  switchView('cotizador');
  renderQuoteEditorAndPdf();
  renderSavedQuotes();
  renderDashboard();

  showToast(`Nueva versi\u00F3n ${nextNumber} creada con \u00E9xito en modo Borrador.`);
}

function openQuoteVersionHistoryModal(quoteIdOrBaseNumber) {
  const baseNumber = quoteIdOrBaseNumber ? getQuoteBaseNumber(quoteIdOrBaseNumber) : (state.activeQuote?.baseNumber || getQuoteBaseNumber(state.activeQuote?.number));
  const versions = getAllVersionsOfQuote(baseNumber);

  const titleEl = document.getElementById('ver-hist-quote-title');
  if (titleEl) titleEl.textContent = `Historial de Versiones: ${baseNumber}`;
  const countBadge = document.getElementById('ver-hist-count-badge');
  if (countBadge) countBadge.textContent = `${versions.length} ${versions.length === 1 ? 'versi\u00F3n' : 'versiones'}`;

  const container = document.getElementById('ver-hist-timeline-container');
  if (container) {
    if (versions.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-400">No se encontraron versiones registradas para esta cotizaci\u00F3n.</div>`;
    } else {
      const sorted = [...versions].sort((a, b) => (Number(b.version) || 1) - (Number(a.version) || 1));
      container.innerHTML = sorted.map((v, idx) => {
        const isCurrentActive = state.activeQuote && (state.activeQuote.id === v.id || (state.activeQuote.baseNumber === baseNumber && Number(state.activeQuote.version) === Number(v.version)));
        const statusColor = v.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
          (v.status === 'Enviada' ? 'bg-amber-100 text-amber-800 border-amber-200' :
          (v.status === 'Reemplazada' ? 'bg-slate-100 text-slate-600 border-slate-200 line-through decoration-slate-400' :
          'bg-blue-100 text-blue-800 border-blue-200'));

        const dateFormatted = v.createdAt ? new Date(v.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : formatDateHuman(v.eventDate);

        return `
          <div class="relative bg-white dark:bg-slate-800/80 rounded-2xl border ${isCurrentActive ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'} p-4.5 space-y-3 transition">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">V${v.version || 1}</span>
                <div>
                  <strong class="text-slate-900 dark:text-white text-xs font-bold">${v.number || (baseNumber + ' V' + (v.version || 1))}</strong>
                  ${isCurrentActive ? '<span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white">Activa en Editor</span>' : ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}">${v.status || 'Borrador'}</span>
                <span class="text-[11px] text-slate-400 tabular-nums">${dateFormatted}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5">
              <div>
                <span class="block text-slate-400 text-[10px]">Invitados:</span>
                <strong class="text-slate-800 dark:text-slate-200">${v.guestsPax || 0} Pax</strong>
              </div>
              <div>
                <span class="block text-slate-400 text-[10px]">Total Cotizado:</span>
                <strong class="text-slate-900 dark:text-white font-extrabold">${formatCurrency(v.total || 0)}</strong>
              </div>
              <div>
                <span class="block text-slate-400 text-[10px]">Responsable:</span>
                <strong class="text-slate-700 dark:text-slate-300">${v.createdBy || 'Alexander'}</strong>
              </div>
              <div>
                <span class="block text-slate-400 text-[10px]">\u00CDtems:</span>
                <strong class="text-slate-700 dark:text-slate-300">${(v.fullCopy?.items || v.items || []).length} renglones</strong>
              </div>
            </div>

            ${v.changeReason ? `
              <div class="text-[11px] text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-amber-400 p-2 rounded-r-lg">
                <span class="font-bold text-amber-800 dark:text-amber-300">Motivo:</span> "${v.changeReason}"
              </div>
            ` : ''}

            <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button type="button" onclick="loadSpecificQuoteVersion('${v.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>Cargar en Editor</span>
              </button>
              ${idx < sorted.length - 1 ? `
                <button type="button" onclick="openQuoteVersionCompareModal('${sorted[idx+1].id}', '${v.id}', '${baseNumber}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <span>Comparar con V${sorted[idx+1].version || 1}</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const btnCompare = document.getElementById('btn-ver-hist-compare');
  if (btnCompare) {
    btnCompare.onclick = () => {
      closeModal('modal-quote-versions-history');
      openQuoteVersionCompareModal(null, null, baseNumber);
    };
  }

  const btnNewVer = document.getElementById('btn-ver-hist-new-version');
  if (btnNewVer) {
    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : state.activeQuote;
    btnNewVer.onclick = () => {
      closeModal('modal-quote-versions-history');
      openCreateQuoteVersionModal(latestVersion?.id);
    };
  }

  const modal = document.getElementById('modal-quote-versions-history');
  if (modal) modal.classList.remove('hidden');
}

function loadSpecificQuoteVersion(quoteId) {
  const q = (state.savedQuotes || []).find(x => x.id === quoteId);
  if (!q) return;
  if (q.fullCopy) {
    state.activeQuote = JSON.parse(JSON.stringify(q.fullCopy));
  } else {
    state.activeQuote = {
      ...state.activeQuote,
      id: q.id,
      baseNumber: q.baseNumber || getQuoteBaseNumber(q.number),
      version: q.version || 1,
      number: q.number,
      eventType: q.eventType,
      eventTitle: q.eventTitle,
      clientId: q.clientId,
      guestsPax: q.guestsPax,
      eventDate: q.eventDate,
      validUntil: q.validUntil,
      status: q.status,
      items: q.items || []
    };
  }
  saveState();
  closeModal('modal-quote-versions-history');
  switchView('cotizador');
  renderQuoteEditorAndPdf();
  showToast(`Cotizaci\u00F3n ${q.number} cargada en el editor.`);
}

function openQuoteVersionCompareModal(idA, idB, baseNumber) {
  const baseNum = baseNumber || state.activeQuote?.baseNumber || getQuoteBaseNumber(state.activeQuote?.number);
  const versions = getAllVersionsOfQuote(baseNum);

  if (versions.length < 2) {
    showToast('Esta cotizaci\u00F3n solo tiene una versi\u00F3n registrada (V1). Crea la versi\u00F3n V2 para poder comparar cambios.');
    return;
  }

  const baseBadge = document.getElementById('compare-quote-base-badge');
  if (baseBadge) baseBadge.textContent = baseNum;

  let selA = idA;
  let selB = idB;

  if (!selA || !selB) {
    selA = versions[0].id;
    selB = versions[versions.length - 1].id;
  }

  const selectA = document.getElementById('compare-select-ver-a');
  const selectB = document.getElementById('compare-select-ver-b');

  if (selectA) {
    selectA.innerHTML = versions.map(v => `
      <option value="${v.id}" ${v.id === selA ? 'selected' : ''}>V${v.version || 1} (${v.status || 'Borrador'} \u2022 ${formatCurrency(v.total || 0)})</option>
    `).join('');
    selectA.onchange = () => renderQuoteVersionComparison(selectA.value, selectB.value);
  }

  if (selectB) {
    selectB.innerHTML = versions.map(v => `
      <option value="${v.id}" ${v.id === selB ? 'selected' : ''}>V${v.version || 1} (${v.status || 'Borrador'} \u2022 ${formatCurrency(v.total || 0)})</option>
    `).join('');
    selectB.onchange = () => renderQuoteVersionComparison(selectA.value, selectB.value);
  }

  renderQuoteVersionComparison(selA, selB);

  const modal = document.getElementById('modal-compare-quote-versions');
  if (modal) modal.classList.remove('hidden');
}

function renderQuoteVersionComparison(idA, idB) {
  const quoteA = (state.savedQuotes || []).find(q => q.id === idA) || (state.activeQuote?.id === idA ? state.activeQuote : null);
  const quoteB = (state.savedQuotes || []).find(q => q.id === idB) || (state.activeQuote?.id === idB ? state.activeQuote : null);

  if (!quoteA || !quoteB) return;

  const fullA = quoteA.fullCopy || quoteA;
  const fullB = quoteB.fullCopy || quoteB;

  const totalA = Number(quoteA.total) || 0;
  const totalB = Number(quoteB.total) || 0;
  const totalDiff = totalB - totalA;
  const totalPct = totalA > 0 ? ((totalDiff / totalA) * 100).toFixed(1) : 0;

  const paxA = Number(quoteA.guestsPax) || 0;
  const paxB = Number(quoteB.guestsPax) || 0;
  const paxDiff = paxB - paxA;

  const kpisContainer = document.getElementById('compare-summary-kpis');
  if (kpisContainer) {
    const isTotalUp = totalDiff > 0;
    const isTotalSame = totalDiff === 0;
    const totalColorClass = isTotalSame ? 'text-slate-700' : (isTotalUp ? 'text-emerald-600' : 'text-rose-600');
    const totalDiffBadge = isTotalSame ? 'Sin variaci\u00F3n' : `${isTotalUp ? '+' : ''}${formatCurrency(totalDiff)} (${totalPct > 0 ? '+' : ''}${totalPct}%)`;

    const isPaxUp = paxDiff > 0;
    const isPaxSame = paxDiff === 0;
    const paxColorClass = isPaxSame ? 'text-slate-700' : (isPaxUp ? 'text-blue-600' : 'text-amber-600');
    const paxDiffBadge = isPaxSame ? 'Mismo aforo' : `${isPaxUp ? '+' : ''}${paxDiff} Pax`;

    kpisContainer.innerHTML = `
      <div class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <span class="block text-[10px] font-bold uppercase text-slate-400">Total Cotizado</span>
        <div class="flex items-baseline justify-between mt-1">
          <strong class="text-sm font-extrabold ${totalColorClass}">${formatCurrency(totalB)}</strong>
          <span class="text-[10px] text-slate-400">Ant: ${formatCurrency(totalA)}</span>
        </div>
        <div class="mt-2 text-[11px] font-extrabold ${totalColorClass}">
          ${totalDiffBadge}
        </div>
      </div>

      <div class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <span class="block text-[10px] font-bold uppercase text-slate-400">Invitados (Pax)</span>
        <div class="flex items-baseline justify-between mt-1">
          <strong class="text-sm font-extrabold ${paxColorClass}">${paxB} Pax</strong>
          <span class="text-[10px] text-slate-400">Ant: ${paxA} Pax</span>
        </div>
        <div class="mt-2 text-[11px] font-extrabold ${paxColorClass}">
          ${paxDiffBadge}
        </div>
      </div>

      <div class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <span class="block text-[10px] font-bold uppercase text-slate-400">Fechas del Evento</span>
        <div class="mt-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[10px]">V${quoteB.version || 2}:</span>
            <strong class="text-slate-800 dark:text-slate-200">${formatDateHuman(quoteB.eventDate)}</strong>
          </div>
          <div class="flex items-center justify-between text-slate-400 text-[10px] mt-0.5">
            <span>V${quoteA.version || 1}:</span>
            <span>${formatDateHuman(quoteA.eventDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  const traceEl = document.getElementById('compare-trace-meta');
  if (traceEl) {
    traceEl.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 dark:border-blue-900/40 pb-2">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white">V${quoteB.version || 2}</span>
          <span class="font-bold text-slate-900 dark:text-white">Detalles del Cambio Registrado</span>
        </div>
        <div class="text-[11px] text-slate-500">
          Operador: <strong>${quoteB.createdBy || 'Alexander'}</strong> &bull; Fecha: <strong>${formatDateHuman(quoteB.createdAt || quoteB.issueDate)}</strong>
        </div>
      </div>
      <p class="text-xs text-slate-700 dark:text-slate-200 italic pt-1">
        "${quoteB.changeReason || 'Sin motivo de cambio documentado'}"
      </p>
    `;
  }

  const itemsA = fullA.items || [];
  const itemsB = fullB.items || [];

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  const matchedInA = new Set();

  itemsB.forEach(itB => {
    const qtyB = Number(itB.qty) || 0;
    const priceB = Number(itB.price) || 0;
    const lineSubB = qtyB * priceB;

    const matchIdx = itemsA.findIndex((itA, idx) => {
      if (matchedInA.has(idx)) return false;
      if (itB.productId && itA.productId && itB.productId === itA.productId) return true;
      return (itB.name || '').trim().toLowerCase() === (itA.name || '').trim().toLowerCase();
    });

    if (matchIdx >= 0) {
      matchedInA.add(matchIdx);
      const itA = itemsA[matchIdx];
      const qtyA = Number(itA.qty) || 0;
      const priceA = Number(itA.price) || 0;
      const lineSubA = qtyA * priceA;

      if (qtyA !== qtyB || priceA !== priceB || (itA.unit || '') !== (itB.unit || '')) {
        modified.push({
          name: itB.name,
          unit: itB.unit,
          qtyA, qtyB,
          priceA, priceB,
          lineSubA, lineSubB,
          diffVal: lineSubB - lineSubA
        });
      } else {
        unchanged.push({
          name: itB.name,
          unit: itB.unit,
          qty: qtyB,
          price: priceB,
          lineSub: lineSubB
        });
      }
    } else {
      added.push({
        name: itB.name,
        unit: itB.unit,
        qty: qtyB,
        price: priceB,
        lineSub: lineSubB
      });
    }
  });

  itemsA.forEach((itA, idx) => {
    if (!matchedInA.has(idx)) {
      const qtyA = Number(itA.qty) || 0;
      const priceA = Number(itA.price) || 0;
      removed.push({
        name: itA.name,
        unit: itA.unit,
        qty: qtyA,
        price: priceA,
        lineSub: qtyA * priceA
      });
    }
  });

  const secAdded = document.getElementById('compare-section-added');
  if (secAdded) {
    if (added.length === 0) {
      secAdded.innerHTML = '';
    } else {
      secAdded.innerHTML = `
        <div class="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 space-y-2">
          <div class="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
            <span class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">+</span>
              \u00CDtems Nuevos Agregados en V${quoteB.version || 2} (${added.length})
            </span>
            <span>+${formatCurrency(added.reduce((s, it) => s + it.lineSub, 0))}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="text-[10px] text-emerald-700/80 uppercase font-bold border-b border-emerald-200/60">
                  <th class="py-1 px-2">\u00CDtem</th>
                  <th class="py-1 px-2 text-center">Cantidad</th>
                  <th class="py-1 px-2 text-right">Precio Unit.</th>
                  <th class="py-1 px-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-emerald-200/40">
                ${added.map(it => `
                  <tr>
                    <td class="py-1.5 px-2 font-bold text-slate-900 dark:text-white">${it.name}</td>
                    <td class="py-1.5 px-2 text-center font-semibold text-emerald-900 dark:text-emerald-200">${it.qty} ${it.unit}</td>
                    <td class="py-1.5 px-2 text-right">${formatCurrency(it.price)}</td>
                    <td class="py-1.5 px-2 text-right font-extrabold text-emerald-700 dark:text-emerald-400">+${formatCurrency(it.lineSub)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  const secRemoved = document.getElementById('compare-section-removed');
  if (secRemoved) {
    if (removed.length === 0) {
      secRemoved.innerHTML = '';
    } else {
      secRemoved.innerHTML = `
        <div class="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3.5 space-y-2">
          <div class="flex items-center justify-between text-rose-800 dark:text-rose-300 font-extrabold text-xs">
            <span class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center text-xs">-</span>
              \u00CDtems Eliminados en V${quoteB.version || 2} (${removed.length})
            </span>
            <span>-${formatCurrency(removed.reduce((s, it) => s + it.lineSub, 0))}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="text-[10px] text-rose-700/80 uppercase font-bold border-b border-rose-200/60">
                  <th class="py-1 px-2">\u00CDtem</th>
                  <th class="py-1 px-2 text-center">Cantidad</th>
                  <th class="py-1 px-2 text-right">Precio Unit.</th>
                  <th class="py-1 px-2 text-right">Subtotal Eliminado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-rose-200/40">
                ${removed.map(it => `
                  <tr>
                    <td class="py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300 line-through decoration-rose-400">${it.name}</td>
                    <td class="py-1.5 px-2 text-center font-semibold text-rose-900 dark:text-rose-200">${it.qty} ${it.unit}</td>
                    <td class="py-1.5 px-2 text-right">${formatCurrency(it.price)}</td>
                    <td class="py-1.5 px-2 text-right font-extrabold text-rose-700 dark:text-rose-400">-${formatCurrency(it.lineSub)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  const secMod = document.getElementById('compare-section-modified');
  if (secMod) {
    if (modified.length === 0) {
      secMod.innerHTML = '';
    } else {
      secMod.innerHTML = `
        <div class="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 space-y-2">
          <div class="flex items-center justify-between text-amber-800 dark:text-amber-300 font-extrabold text-xs">
            <span class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              \u00CDtems con Variaci\u00F3n de Cantidad o Precio (${modified.length})
            </span>
            <span>${modified.reduce((s, it) => s + it.diffVal, 0) >= 0 ? '+' : ''}${formatCurrency(modified.reduce((s, it) => s + it.diffVal, 0))}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="text-[10px] text-amber-800/80 uppercase font-bold border-b border-amber-200/60">
                  <th class="py-1 px-2">\u00CDtem</th>
                  <th class="py-1 px-2 text-center">Cantidad (Ant \u2192 Nueva)</th>
                  <th class="py-1 px-2 text-right">Precio Unitario</th>
                  <th class="py-1 px-2 text-right">Diferencia Neta</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-amber-200/40">
                ${modified.map(it => {
                  const isUp = it.diffVal >= 0;
                  return `
                    <tr>
                      <td class="py-1.5 px-2 font-bold text-slate-900 dark:text-white">${it.name}</td>
                      <td class="py-1.5 px-2 text-center font-medium">
                        <span class="text-slate-400">${it.qtyA}</span> \u2192 <strong class="text-amber-900 dark:text-amber-200">${it.qtyB} ${it.unit}</strong>
                      </td>
                      <td class="py-1.5 px-2 text-right font-medium">
                        ${it.priceA !== it.priceB ? `<span class="text-slate-400">${formatCurrency(it.priceA)}</span> \u2192 ` : ''}<strong>${formatCurrency(it.priceB)}</strong>
                      </td>
                      <td class="py-1.5 px-2 text-right font-extrabold ${isUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}">
                        ${isUp ? '+' : ''}${formatCurrency(it.diffVal)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  const secUnchanged = document.getElementById('compare-section-unchanged');
  if (secUnchanged) {
    if (unchanged.length === 0) {
      secUnchanged.innerHTML = '';
    } else {
      secUnchanged.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-500 flex items-center justify-between">
          <span class="font-medium">&bull; <strong>${unchanged.length} renglones</strong> se mantuvieron exactamente id&eacute;nticos en ambas versiones.</span>
          <span class="font-bold text-slate-700 dark:text-slate-300">${formatCurrency(unchanged.reduce((s, it) => s + it.lineSub, 0))}</span>
        </div>
      `;
    }
  }
}

  // Expose version control and modal helpers globally
  window.closeModal = closeModal;
  window.openModal = openModal;
  window.openCreateQuoteVersionModal = openCreateQuoteVersionModal;
  window.confirmCreateQuoteVersion = confirmCreateQuoteVersion;
  window.openQuoteVersionHistoryModal = openQuoteVersionHistoryModal;
  window.loadSpecificQuoteVersion = loadSpecificQuoteVersion;
  window.openQuoteVersionCompareModal = openQuoteVersionCompareModal;
  window.renderQuoteVersionComparison = renderQuoteVersionComparison;
  window.isQuoteLocked = isQuoteLocked;
  window.getQuoteBaseNumber = getQuoteBaseNumber;
  window.getAllVersionsOfQuote = getAllVersionsOfQuote;
