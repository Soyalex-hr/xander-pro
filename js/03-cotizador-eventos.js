/* Xander Pro — 03-cotizador-eventos (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // =====================================================
    // CSV EXPORT ENGINE (EXCEL COMPATIBLE CON UTF-8 BOM)
    // =====================================================
    function exportToCSV(filename, headers, rows) {
      function escapeCell(val) {
        if (val === null || val === undefined) return '';
        let str = String(val).replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) {
          str = `"${str}"`;
        }
        return str;
      }

      let csv = '\uFEFF'; // UTF-8 BOM for Excel
      csv += headers.map(escapeCell).join(',') + '\r\n';
      rows.forEach(r => {
        csv += r.map(escapeCell).join(',') + '\r\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Archivo "${filename}" exportado para Excel.`);
    }

    // =====================================================
    // 3. RECIPE COST CALCULATION HELPER
    // =====================================================
    function calculateRecipeUnitCost(recipeProduct) {
      if (!recipeProduct || recipeProduct.type !== 'compuesto' || !Array.isArray(recipeProduct.ingredients)) {
        return Number(recipeProduct?.cost) || 0;
      }
      let totalRecipeCost = 0;
      recipeProduct.ingredients.forEach(ing => {
        const baseProd = state.products.find(p => p.id === ing.productId);
        if (!baseProd) return;
        const convertedQty = convertUnits(Number(ing.qty) || 0, ing.unit, baseProd.unit);
        totalRecipeCost += convertedQty * (Number(baseProd.cost) || 0);
      });
      const basePax = Math.max(1, Number(recipeProduct.basePax) || 1);
      return totalRecipeCost / basePax;
    }

    // =====================================================
    // 4. QUOTE BUILDER & STAGING LOGIC (Price override before adding)
    // =====================================================
    let stagingMode = 'catalog'; // 'catalog' | 'custom'

    function populateEventTypeSelect() {
      const sel = document.getElementById('q-event-type');
      if (!sel) return;
      if (!state.eventTypes || state.eventTypes.length === 0) {
        state.eventTypes = getDefaultState().eventTypes;
      }

      const currentVal = state.activeQuote?.eventType || 'Boda / Matrimonio';

      let optionsHtml = state.eventTypes.map(et => {
        const icon = et.icon || '✨';
        const isSelected = et.name.toLowerCase() === currentVal.toLowerCase() ||
                           (currentVal === 'Boda' && et.name.includes('Boda')) ||
                           (currentVal === 'Cumpleaños' && et.name.includes('Cumpleaños'));
        return `<option value="${et.name}" ${isSelected ? 'selected' : ''}>${icon} ${et.name}</option>`;
      }).join('');

      optionsHtml += `<option value="__custom__">➕ Crear Otro Tipo / Concepto...</option>`;
      sel.innerHTML = optionsHtml;

      const exists = state.eventTypes.some(et => et.name.toLowerCase() === currentVal.toLowerCase());
      if (!exists && currentVal && currentVal !== '__custom__') {
        const customOpt = document.createElement('option');
        customOpt.value = currentVal;
        customOpt.textContent = `✨ ${currentVal}`;
        customOpt.selected = true;
        sel.insertBefore(customOpt, sel.lastElementChild);
      }
    }

    function renderEventTypesPills() {
      const container = document.getElementById('event-types-pills-list');
      const badge = document.getElementById('badge-event-types-count');
      if (!container) return;

      if (!state.eventTypes || state.eventTypes.length === 0) {
        state.eventTypes = getDefaultState().eventTypes;
      }

      if (badge) badge.textContent = `${state.eventTypes.length} conceptos`;
      const servKpiConcepts = document.getElementById('serv-kpi-concepts');
      if (servKpiConcepts) servKpiConcepts.textContent = state.eventTypes.length;

      container.innerHTML = state.eventTypes.map(et => {
        const icon = et.icon || '✨';
        const deleteBtn = !et.isDefault
          ? `<button type="button" data-del-event-type="${et.id}" class="del-event-type-btn ml-1 w-6 h-6 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-[11px] cursor-pointer" title="Eliminar concepto" aria-label="Eliminar concepto">✕</button>`
          : '';
        return `
          <span class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 transition">
            <span>${icon}</span>
            <span>${et.name}</span>
            ${deleteBtn}
          </span>
        `;
      }).join('');
    }

    function populateClientSelect() {
      const sel = document.getElementById('q-client-select');
      if (!sel) return;
      sel.innerHTML = state.clients.map(c =>
        `<option value="${c.id}" ${c.id === state.activeQuote.clientId ? 'selected' : ''}>${c.name}</option>`
      ).join('');
    }

    function populatePickerProducts() {
      const filterVal = document.getElementById('picker-filter-type')?.value || 'all';
      const sel = document.getElementById('picker-product-select');
      if (!sel) return;

      const filtered = state.products.filter(p => {
        if (filterVal === 'compuesto') return p.type === 'compuesto';
        if (filterVal === 'simple') return p.type === 'simple';
        if (filterVal === 'sin_inventario') return !p.trackStock || Number(p.stock) <= 0;
        return true;
      });

      sel.innerHTML = filtered.map(p => {
        const tag = p.type === 'compuesto'
          ? '🍹 [Receta por Pax]'
          : (p.trackStock ? `📦 [Stock: ${p.stock} ${p.unit}]` : '⚡ [Sin Inventario / Bajo Pedido]');
        return `<option value="${p.id}">${tag} ${p.name} — Sugerido: ${formatCurrency(p.price)}</option>`;
      }).join('');

      loadSelectedProductIntoStaging();
    }

    function loadSelectedProductIntoStaging() {
      const nameInput = document.getElementById('staging-name');
      const qtyInput = document.getElementById('staging-qty');
      const qtyLabel = document.getElementById('staging-qty-label');
      const unitSelect = document.getElementById('staging-unit');
      const priceInput = document.getElementById('staging-price');
      const descInput = document.getElementById('staging-desc');
      const typeBadge = document.getElementById('staging-type-badge');
      const stockBadge = document.getElementById('staging-stock-badge');
      const costRef = document.getElementById('staging-cost-ref');
      const recipePreview = document.getElementById('staging-recipe-preview');

      if (stagingMode === 'custom') {
        nameInput.value = '';
        nameInput.placeholder = 'Escribe cualquier producto o servicio libre...';
        qtyLabel.textContent = 'Cantidad';
        qtyInput.value = 1;
        unitSelect.value = 'Servicio';
        priceInput.value = 150000;
        descInput.value = '';
        typeBadge.textContent = '✨ Ítem Personalizado Libre';
        typeBadge.className = 'px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800';
        stockBadge.textContent = 'Sin restricción de inventario';
        costRef.textContent = '$0';
        recipePreview.classList.add('hidden');
        updateStagingSubtotalPreview();
        return;
      }

      const prodId = document.getElementById('picker-product-select')?.value;
      const prod = state.products.find(p => p.id === prodId) || state.products[0];
      if (!prod) return;

      const unitCost = calculateRecipeUnitCost(prod);
      prod.cost = Math.round(unitCost);

      nameInput.value = prod.name;
      priceInput.value = prod.price;
      descInput.value = prod.desc || '';
      costRef.textContent = formatCurrency(unitCost);

      if (prod.type === 'compuesto') {
        qtyLabel.textContent = 'Personas (Pax)';
        qtyInput.value = state.activeQuote.guestsPax || 100;
        unitSelect.value = 'Personas (Pax)';
        typeBadge.textContent = '🍹 Receta Compuesta (Escalable por Personas)';
        typeBadge.className = 'px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800';
        stockBadge.textContent = 'Se cotiza sin bloqueo de stock (calcula compras al aprobar)';
        stockBadge.className = 'px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800';
        recipePreview.classList.remove('hidden');
      } else {
        qtyLabel.textContent = 'Cantidad';
        qtyInput.value = 1;
        unitSelect.value = prod.unit === 'srv' ? 'Servicio' : (prod.unit === 'und' ? 'Unidad' : 'Unidad');
        typeBadge.textContent = '📦 Producto Simple / Servicio No Compuesto';
        typeBadge.className = 'px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-800';
        if (!prod.trackStock) {
          stockBadge.textContent = '⚡ Sin inventario (Bajo pedido / Servicio)';
          stockBadge.className = 'px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800';
        } else if (Number(prod.stock) <= 0) {
          stockBadge.textContent = `Stock actual: 0 ${prod.unit} (Permitido cotizar)`;
          stockBadge.className = 'px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800';
        } else {
          stockBadge.textContent = `Stock en bodega: ${prod.stock} ${prod.unit}`;
          stockBadge.className = 'px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800';
        }
        recipePreview.classList.add('hidden');
      }

      updateStagingSubtotalPreview();
    }

    function updateStagingSubtotalPreview() {
      const qty = Number(document.getElementById('staging-qty')?.value) || 0;
      const price = Number(document.getElementById('staging-price')?.value) || 0;
      const prodId = document.getElementById('picker-product-select')?.value;
      const prod = stagingMode === 'catalog' ? state.products.find(p => p.id === prodId) : null;
      const unitCost = prod ? calculateRecipeUnitCost(prod) : 0;

      const marginPct = price > 0 ? Math.round(((price - unitCost) / price) * 100) : 0;
      const marginEl = document.getElementById('staging-margin-ref');
      if (marginEl) {
        marginEl.textContent = `${marginPct}% (${formatCurrency(price - unitCost)}/u)`;
      }

      const subEl = document.getElementById('staging-subtotal-preview');
      if (subEl) {
        subEl.textContent = formatCurrency(qty * price);
      }

      // If composite recipe, show scaled ingredients for the entered number of people
      const recipePreview = document.getElementById('staging-recipe-preview');
      if (prod && prod.type === 'compuesto' && recipePreview) {
        const basePax = Math.max(1, Number(prod.basePax) || 1);
        const factor = qty / basePax;
        const lines = (prod.ingredients || []).map(ing => {
          const insumo = state.products.find(p => p.id === ing.productId);
          if (!insumo) return '';
          const totalInRecipeUnit = (Number(ing.qty) || 0) * factor;
          const totalInBaseUnit = convertUnits(totalInRecipeUnit, ing.unit, insumo.unit);
          return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-indigo-200 font-medium">
            ${insumo.name}: <strong>${totalInRecipeUnit.toFixed(1)} ${ing.unit}</strong>
            (${totalInBaseUnit.toFixed(2)} ${insumo.unit})
          </span>`;
        }).join(' ');
        recipePreview.innerHTML = `<div class="font-bold mb-1">📐 Escalado automático de receta para ${qty} Personas (Pax):</div><div class="flex flex-wrap gap-1.5">${lines}</div>`;
      }
    }

    // =====================================================
    // 5. RENDER QUOTE ITEMS & LIVE PDF PREVIEW
    // =====================================================
    function renderQuoteEditorAndPdf() {
      const q = state.activeQuote;
      if (!q.baseNumber) q.baseNumber = (q.number || "").replace(/\s*V\d+$/i, "").trim();
      if (!q.version) q.version = 1;

      // Quote version locking check
      const isLocked = (typeof isQuoteLocked === "function") && isQuoteLocked(q);
      const lockBanner = document.getElementById("quote-version-lock-banner");
      const lockNotice = document.getElementById("quote-version-lock-notice");
      const activeVerBadge = document.getElementById("quote-active-version-badge");
      if (activeVerBadge) {
        activeVerBadge.textContent = "V" + (q.version || 1);
        activeVerBadge.className = "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider " +
          (isLocked ? (q.status === "Aprobada" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : (q.status === "Enviada" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-200 text-slate-700 border border-slate-300")) : "bg-blue-50 text-blue-700 border border-blue-200");
      }

      if (lockBanner && lockNotice) {
        if (isLocked) {
          lockBanner.classList.remove("hidden");
          const statusBg = q.status === "Aprobada" ? "bg-emerald-600" : (q.status === "Enviada" ? "bg-amber-600" : "bg-slate-600");
          lockNotice.innerHTML = `
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-xl ${statusBg} text-white shrink-0 mt-0.5 shadow-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-sm text-slate-900 dark:text-white">Modo Protegido (Solo Lectura)</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-extrabold ${statusBg} text-white">${q.status} &bull; V${q.version || 1}</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Esta cotizaci&oacute;n ya fue <strong>${(q.status || "").toLowerCase()}</strong>. Para mantener la trazabilidad financiera y proteger los acuerdos con el cliente, <strong>no se puede modificar directamente</strong>. Si requieres hacer cambios, crea una nueva versi&oacute;n.
                </p>
              </div>
            </div>
          `;
        } else {
          lockBanner.classList.add("hidden");
        }
      }

      // Lock or unlock inputs based on lock state
      const formFieldsToLock = ["q-number", "q-event-type", "q-status", "q-event-title", "q-guests-pax", "q-event-date", "q-event-venue", "q-issue-date", "q-valid-until", "q-discount-pct", "q-tax-pct", "q-deposit-pct", "q-observations"];
      formFieldsToLock.forEach(fId => {
        const el = document.getElementById(fId);
        if (el) {
          el.disabled = isLocked;
          el.classList.toggle("bg-slate-100", isLocked);
          el.classList.toggle("cursor-not-allowed", isLocked);
        }
      });

      // Sync top inputs
      document.getElementById('q-number').value = q.number;
      const eventTypeSel = document.getElementById('q-event-type');
      if (eventTypeSel) {
        if (!Array.from(eventTypeSel.options).some(o => o.value === q.eventType)) {
          populateEventTypeSelect();
        }
        eventTypeSel.value = q.eventType;
      }
      document.getElementById('q-status').value = q.status;
      document.getElementById('q-event-title').value = q.eventTitle;
      document.getElementById('q-guests-pax').value = q.guestsPax;
      document.getElementById('q-event-date').value = q.eventDate;
      document.getElementById('q-event-venue').value = q.eventVenue;
      document.getElementById('q-issue-date').value = q.issueDate;
      document.getElementById('q-valid-until').value = q.validUntil;
      document.getElementById('q-discount-pct').value = q.discountPct;
      document.getElementById('q-tax-pct').value = q.taxPct;
      document.getElementById('q-deposit-pct').value = q.depositPct;
      document.getElementById('q-observations').value = q.observations;

      // Render Editor Table Rows
      const editorTbody = document.getElementById('quote-items-editor-tbody');
      if (q.items.length === 0) {
        editorTbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Agrega recetas por personas o productos simples usando el panel superior.</td></tr>`;
      } else {
        editorTbody.innerHTML = q.items.map((item, idx) => {
          const lineTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
          return `
            <tr class="hover:bg-slate-50/80">
              <td class="py-2.5 px-2 space-y-1">
                <input type="text" ${isLocked ? 'disabled' : ''} data-item-idx="${idx}" data-field="name" value="${item.name.replace(/"/g, '&quot;')}" class="quote-line-input w-full font-bold text-slate-900 ${isLocked ? 'bg-slate-100/60 cursor-not-allowed' : 'bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white'} px-1 py-0.5 rounded" />
                <input type="text" ${isLocked ? 'disabled' : ''} data-item-idx="${idx}" data-field="desc" value="${(item.desc || '').replace(/"/g, '&quot;')}" placeholder="Descripci&oacute;n en el PDF..." class="quote-line-input w-full text-[11px] text-slate-500 ${isLocked ? 'bg-slate-100/60 cursor-not-allowed' : 'bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white'} px-1 py-0.5 rounded" />
              </td>
              <td class="py-2.5 px-2 text-center">
                <input type="number" ${isLocked ? 'disabled' : ''} step="any" min="0.1" data-item-idx="${idx}" data-field="qty" value="${item.qty}" class="quote-line-input w-20 text-center font-bold text-indigo-900 ${isLocked ? 'bg-slate-100 cursor-not-allowed' : 'bg-indigo-50/60 border border-indigo-200'} rounded-lg px-2 py-1 tabular-nums" />
              </td>
              <td class="py-2.5 px-2">
                <input type="text" ${isLocked ? 'disabled' : ''} data-item-idx="${idx}" data-field="unit" value="${item.unit}" class="quote-line-input w-24 text-xs font-medium text-slate-700 ${isLocked ? 'bg-slate-100 cursor-not-allowed border-slate-200' : 'border border-slate-200'} rounded-lg px-2 py-1" />
              </td>
              <td class="py-2.5 px-2 text-right">
                <input type="number" ${isLocked ? 'disabled' : ''} step="100" min="0" data-item-idx="${idx}" data-field="price" value="${item.price}" class="quote-line-input w-28 text-right font-bold text-emerald-900 ${isLocked ? 'bg-slate-100 cursor-not-allowed border-slate-200' : 'bg-emerald-50/50 border border-emerald-300'} rounded-lg px-2 py-1 tabular-nums" />
              </td>
              <td class="py-2.5 px-2 text-right font-extrabold text-slate-900 tabular-nums">
                ${formatCurrency(lineTotal)}
              </td>
              <td class="py-2.5 px-2 text-center">
                ${isLocked ? '<span class="text-slate-300 font-bold text-xs" title="Cotizaci&oacute;n protegida">-</span>' : `<button type="button" data-remove-idx="${idx}" class="remove-quote-line-btn text-rose-500 hover:text-rose-700 font-bold px-1.5 py-1 rounded hover:bg-rose-50 cursor-pointer" title="Eliminar &iacute;tem">&#10005;</button>`}
              </td>
            </tr>
          `;
        }).join('');
      }

      // Calculate Totals
      const subtotal = q.items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)), 0);
      const discountAmount = subtotal * ((Number(q.discountPct) || 0) / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * ((Number(q.taxPct) || 0) / 100);
      const grandTotal = afterDiscount + taxAmount;
      const depositAmount = grandTotal * ((Number(q.depositPct) || 0) / 100);
      const balanceAmount = Math.max(0, grandTotal - depositAmount);

      // Update Live PDF Header & Company Info
      const comp = state.company;
      const headerComp = document.getElementById('header-company-name');
      if (headerComp) headerComp.textContent = comp.name;
      document.getElementById('pdf-company-name').textContent = comp.name;
      document.getElementById('pdf-company-slogan').textContent = comp.slogan;
      document.getElementById('pdf-company-nit').textContent = `NIT / ID: ${comp.nit}`;
      document.getElementById('pdf-company-contact').textContent = `📞 ${comp.phone} · ✉️ ${comp.email}`;
      document.getElementById('pdf-company-address').textContent = comp.address;
      document.getElementById('pdf-bank-details').textContent = comp.bankDetails;
      document.getElementById('pdf-terms-text').textContent = comp.terms;

      const logoBox = document.getElementById('pdf-logo-box');
      if (comp.logoDataUrl) {
        logoBox.innerHTML = `<img src="${comp.logoDataUrl}" alt="Logo" class="w-full h-full object-contain bg-white" />`;
      } else {
        const initials = (comp.name || 'EQ').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        logoBox.textContent = initials;
      }

      // Update PDF Event & Client Details
      const client = state.clients.find(c => c.id === q.clientId) || state.clients[0] || {
        name: 'Cliente General', doc: '—', email: '', phone: '', city: ''
      };
      const baseNum = (typeof getQuoteBaseNumber === "function") ? getQuoteBaseNumber(q) : (q.baseNumber || q.number);
      document.getElementById("pdf-quote-number").textContent = `COTIZACI\u00D3N N\u00B0 ${baseNum} (V${q.version || 1})`;
      const pdfVerSub = document.getElementById("pdf-quote-version-subtitle");
      if (pdfVerSub) {
        pdfVerSub.textContent = `Versi\u00F3n ${q.version || 1} (${q.status || "Borrador"}) \u2022 Emitida: ${formatDateHuman(q.createdAt || q.issueDate)}`;
      }
      document.getElementById('pdf-issue-date').textContent = formatDateHuman(q.issueDate);
      document.getElementById('pdf-valid-until').textContent = formatDateHuman(q.validUntil);
      document.getElementById('pdf-client-name').textContent = client.name;
      const pdfClientDocEl = document.getElementById('pdf-client-doc');
      if (pdfClientDocEl) {
        pdfClientDocEl.textContent = '';
        pdfClientDocEl.classList.add('hidden');
      }
      document.getElementById('pdf-client-contact').textContent = [client.email, client.phone].filter(Boolean).join(' · ') || 'Sin teléfono o correo registrado';
      document.getElementById('pdf-client-city').textContent = client.city;

      document.getElementById('pdf-event-type-badge').textContent = q.eventType;
      document.getElementById('pdf-event-title').textContent = q.eventTitle || q.eventType;
      document.getElementById('pdf-event-date').textContent = formatDateHuman(q.eventDate);
      document.getElementById('pdf-event-venue').textContent = q.eventVenue || 'Por definir';
      document.getElementById('pdf-event-pax').textContent = `${q.guestsPax} Invitados (Pax)`;

      // Render PDF Items Table
      const pdfTbody = document.getElementById('pdf-items-tbody');
      pdfTbody.innerHTML = q.items.map(it => {
        const lineSub = (Number(it.qty) || 0) * (Number(it.price) || 0);
        return `
          <tr class="pdf-avoid-break hover:bg-slate-50/50">
            <td class="py-2.5 px-3">
              <div class="font-bold text-slate-900">${it.name}</div>
              ${it.desc ? `<div class="text-[10px] text-slate-500 leading-snug mt-0.5 whitespace-pre-line">${it.desc}</div>` : ''}
            </td>
            <td class="py-2.5 px-2 text-center font-bold text-indigo-950 tabular-nums">
              ${it.qty} <span class="text-[10px] font-semibold text-slate-500 block">${it.unit}</span>
            </td>
            <td class="py-2.5 px-2 text-right font-medium text-slate-700 tabular-nums">
              ${formatCurrency(it.price)}
            </td>
            <td class="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
              ${formatCurrency(lineSub)}
            </td>
          </tr>
        `;
      }).join('');

      // Observations in PDF
      const obsBox = document.getElementById('pdf-observations-box');
      const obsText = document.getElementById('pdf-observations-text');
      if (q.observations && q.observations.trim()) {
        obsBox.classList.remove('hidden');
        obsText.textContent = q.observations;
      } else {
        obsBox.classList.add('hidden');
      }

      // Totals in PDF
      document.getElementById('pdf-subtotal').textContent = formatCurrency(subtotal);
      document.getElementById('pdf-discount-pct').textContent = q.discountPct;
      document.getElementById('pdf-discount-amount').textContent = '-' + formatCurrency(discountAmount);
      document.getElementById('pdf-discount-row').classList.toggle('hidden', Number(q.discountPct) <= 0);

      document.getElementById('pdf-tax-pct').textContent = q.taxPct;
      document.getElementById('pdf-tax-amount').textContent = formatCurrency(taxAmount);
      document.getElementById('pdf-tax-row').classList.toggle('hidden', Number(q.taxPct) <= 0);

      document.getElementById('pdf-grand-total').textContent = formatCurrency(grandTotal);
      document.getElementById('pdf-deposit-pct').textContent = q.depositPct;
      document.getElementById('pdf-deposit-amount').textContent = formatCurrency(depositAmount);
      const pdfBalEl = document.getElementById('pdf-balance-amount');
      if (pdfBalEl) pdfBalEl.textContent = formatCurrency(balanceAmount);

      const liveBarPax = document.getElementById('live-bar-pax');
      if (liveBarPax) liveBarPax.textContent = `${q.guestsPax} Pax`;
      const liveBarTotal = document.getElementById('live-bar-total');
      if (liveBarTotal) liveBarTotal.textContent = formatCurrency(grandTotal);
      const editorGrandTotal = document.getElementById('editor-live-grand-total');
      if (editorGrandTotal) editorGrandTotal.textContent = formatCurrency(grandTotal);
      const editorDeposit = document.getElementById('editor-live-deposit');
      if (editorDeposit) editorDeposit.textContent = `${formatCurrency(depositAmount)} (${q.depositPct}%)`;
      document.getElementById('pdf-validity-notice').textContent =
        `* Cotización válida hasta el ${formatDateHuman(q.validUntil)}. La fecha del evento (${formatDateHuman(q.eventDate)}) se bloquea en agenda con el anticipo del ${q.depositPct}%.`;

      // Render Internal Ingredient Explosion & Profitability
      renderInternalIngredientExplosion(grandTotal);
    }

    function renderInternalIngredientExplosion(grandTotal) {
      const container = document.getElementById('internal-bom-breakdown');
      if (!container) return;

      const requiredMap = {}; // productId -> { prod, totalInBaseUnit, details: [] }
      let totalInternalCost = 0;

      state.activeQuote.items.forEach(item => {
        const catalogProd = state.products.find(p => p.id === item.productId);
        if (!catalogProd) return;

        if (catalogProd.type === 'compuesto' && Array.isArray(catalogProd.ingredients)) {
          const basePax = Math.max(1, Number(catalogProd.basePax) || 1);
          const scaleFactor = (Number(item.qty) || 0) / basePax;

          catalogProd.ingredients.forEach(ing => {
            const insumo = state.products.find(p => p.id === ing.productId);
            if (!insumo) return;
            const neededRecipeUnit = (Number(ing.qty) || 0) * scaleFactor;
            const neededBaseUnit = convertUnits(neededRecipeUnit, ing.unit, insumo.unit);
            const costLine = neededBaseUnit * (Number(insumo.cost) || 0);
            totalInternalCost += costLine;

            if (!requiredMap[insumo.id]) {
              requiredMap[insumo.id] = { prod: insumo, neededBase: 0, neededRecipeLabel: `${neededRecipeUnit.toFixed(1)} ${ing.unit}` };
            }
            requiredMap[insumo.id].neededBase += neededBaseUnit;
          });
        } else {
          // Simple product
          const qty = Number(item.qty) || 0;
          const costLine = qty * (Number(catalogProd.cost) || 0);
          totalInternalCost += costLine;
          if (!requiredMap[catalogProd.id]) {
            requiredMap[catalogProd.id] = { prod: catalogProd, neededBase: 0, neededRecipeLabel: '' };
          }
          requiredMap[catalogProd.id].neededBase += qty;
        }
      });

      document.getElementById('internal-total-cost').textContent = formatCurrency(totalInternalCost);
      document.getElementById('internal-total-profit').textContent = formatCurrency(grandTotal - totalInternalCost);

      const entries = Object.values(requiredMap);
      if (entries.length === 0) {
        container.innerHTML = `<div class="text-slate-400">Agrega recetas o productos del catálogo para ver el cálculo de insumos.</div>`;
        return;
      }

      container.innerHTML = entries.map(entry => {
        const p = entry.prod;
        const needed = entry.neededBase;
        const stock = Number(p.stock) || 0;
        const missing = Math.max(0, needed - stock);
        let statusPill = '';
        if (!p.trackStock) {
          statusPill = `<span class="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">Bajo pedido / Servicio (${needed.toFixed(2)} ${p.unit})</span>`;
        } else if (missing > 0) {
          statusPill = `<span class="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 font-semibold">Stock: ${stock} ${p.unit} → Comprar ${missing.toFixed(2)} ${p.unit} al aprobar</span>`;
        } else {
          statusPill = `<span class="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200">Stock suficiente (${stock} ${p.unit} disponibles)</span>`;
        }

        return `
          <div class="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-slate-800/90 border border-slate-700">
            <div>
              <span class="font-semibold text-white">${p.name}</span>
              <span class="text-slate-400 ml-1">Requerido: <strong class="text-indigo-300">${needed.toFixed(2)} ${p.unit}</strong></span>
            </div>
            <div>${statusPill}</div>
          </div>
        `;
      }).join('');
    }

    // =====================================================
    // 6. PRODUCTS & RECIPES CATALOG RENDERING + SIMULATOR
    // =====================================================
    function renderProductsCatalog() {
      const filterButtons = document.querySelectorAll('.prod-filter-btn');
      let activeFilter = 'all';
      filterButtons.forEach(btn => {
        if (btn.classList.contains('bg-indigo-600')) {
          activeFilter = btn.getAttribute('data-prod-filter');
        }
      });

      const searchVal = (document.getElementById('prod-search-input')?.value || '').toLowerCase();
      const tbody = document.getElementById('products-catalog-tbody');
      const cardsContainer = document.getElementById('products-catalog-cards');

      const list = state.products.filter(p => {
        if (activeFilter === 'compuesto' && p.type !== 'compuesto') return false;
        if (activeFilter === 'simple' && p.type !== 'simple') return false;
        if (activeFilter === 'no_stock' && p.trackStock && Number(p.stock) > 0) return false;
        if (searchVal && !p.name.toLowerCase().includes(searchVal) && !(p.desc || '').toLowerCase().includes(searchVal)) return false;
        return true;
      });

      // 1. Render Desktop Table
      if (tbody) {
        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No se encontraron productos con el filtro seleccionado.</td></tr>`;
        } else {
          tbody.innerHTML = list.map(p => {
            const unitCost = calculateRecipeUnitCost(p);
            const typeHtml = p.type === 'compuesto'
              ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">🍹 Receta (Base ${p.basePax || 1} Pax)</span>`
              : `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">📦 Simple / Insumo</span>`;

            let stockHtml = '';
            if (p.type === 'compuesto') {
              stockHtml = `<span class="text-indigo-700 font-medium">Según insumos</span>`;
            } else if (!p.trackStock) {
              stockHtml = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">⚡ Bajo pedido</span>`;
            } else if (Number(p.stock) <= 0) {
              stockHtml = `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">0 ${p.unit}</span>`;
            } else {
              stockHtml = `<span class="font-bold text-slate-800 tabular-nums">${p.stock} ${p.unit}</span>`;
            }

            return `
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">${p.name}</div>
                  ${p.desc ? `<div class="text-[11px] text-slate-500 line-clamp-1">${p.desc}</div>` : ''}
                </td>
                <td class="py-3 px-4">${typeHtml}</td>
                <td class="py-3 px-4 font-semibold text-slate-700">${p.unit}</td>
                <td class="py-3 px-4">${stockHtml}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-600 tabular-nums">${formatCurrency(unitCost)}</td>
                <td class="py-3 px-4 text-right font-extrabold text-emerald-700 tabular-nums">${formatCurrency(p.price)}</td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button type="button" data-edit-prod="${p.id}" class="edit-prod-btn px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition text-xs border border-amber-200" title="Modificar Producto">
                      ✏️ Modificar
                    </button>
                    <button type="button" data-delete-prod="${p.id}" class="delete-prod-btn px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition text-xs border border-rose-200" title="Eliminar Producto">
                      🗑️
                    </button>
                    <button type="button" data-quote-prod="${p.id}" class="send-prod-to-quote-btn px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition text-xs border border-indigo-200" title="Llevar a Cotización">
                      ➕ Cotizar
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // 2. Render Mobile Responsive Cards (Zero Horizontal Scroll!)
      if (cardsContainer) {
        if (list.length === 0) {
          cardsContainer.innerHTML = `
            <div class="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 text-xs">
              No se encontraron productos con el filtro seleccionado.
            </div>
          `;
        } else {
          cardsContainer.innerHTML = list.map(p => {
            const unitCost = calculateRecipeUnitCost(p);
            const typeBadge = p.type === 'compuesto'
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">🍹 Receta (${p.basePax || 1} Pax)</span>`
              : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">📦 Insumo</span>`;

            let stockText = '';
            if (p.type === 'compuesto') {
              stockText = 'Según insumos';
            } else if (!p.trackStock) {
              stockText = '⚡ Bajo pedido';
            } else if (Number(p.stock) <= 0) {
              stockText = `0 ${p.unit}`;
            } else {
              stockText = `${p.stock} ${p.unit}`;
            }

            return `
              <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-extrabold text-slate-900 text-sm leading-tight">${p.name}</span>
                      ${typeBadge}
                    </div>
                    ${p.desc ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${p.desc}</p>` : ''}
                  </div>
                </div>

                <!-- 3 Stats Pills -->
                <div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center text-xs border border-slate-100">
                  <div>
                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">Stock / Und</span>
                    <strong class="text-slate-800 text-[11px] block mt-0.5 truncate">${stockText}</strong>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">Costo Unit</span>
                    <strong class="text-slate-600 text-[11px] block mt-0.5 tabular-nums">${formatCurrency(unitCost)}</strong>
                  </div>
                  <div>
                    <span class="text-[10px] text-emerald-600 block font-bold uppercase">Precio Venta</span>
                    <strong class="text-emerald-700 text-xs block mt-0.5 font-extrabold tabular-nums">${formatCurrency(p.price)}</strong>
                  </div>
                </div>

                <!-- Touch Action Buttons -->
                <div class="flex items-center gap-1.5 pt-1">
                  <button type="button" data-edit-prod="${p.id}" class="edit-prod-btn flex-1 py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 flex items-center justify-center gap-1 transition">
                    <span>✏️</span> Modificar
                  </button>
                  <button type="button" data-quote-prod="${p.id}" class="send-prod-to-quote-btn flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 transition">
                    <span>➕</span> Cotizar
                  </button>
                  <button type="button" data-delete-prod="${p.id}" class="delete-prod-btn p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition" title="Eliminar">
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      populateRecipeSimulator();
    }

    function openEditProductModal(prodId) {
      const prod = state.products.find(p => p.id === prodId);
      if (!prod) {
        showToast('❌ Producto no encontrado');
        return;
      }

      if (prod.type === 'compuesto') {
        // Modo Edición de Receta Compuesta
        document.getElementById('rec-id').value = prod.id;
        const titleEl = document.getElementById('modal-rec-title');
        if (titleEl) titleEl.textContent = '✏️ Modificar Receta Compuesta / Menú por Personas';
        const btnSave = document.getElementById('btn-save-recipe-product');
        if (btnSave) btnSave.textContent = 'Guardar Cambios de la Receta';

        document.getElementById('rec-name').value = prod.name || '';
        document.getElementById('rec-base-pax').value = prod.basePax || 1;
        document.getElementById('rec-price').value = prod.price || 0;
        document.getElementById('rec-desc').value = prod.desc || '';

        const ingSel = document.getElementById('rec-ing-select');
        const simples = state.products.filter(p => p.type === 'simple');
        if (ingSel) {
          ingSel.innerHTML = simples.map(s => `<option value="${s.id}">${s.name} (Base: ${formatCurrency(s.cost)} / ${s.unit})</option>`).join('');
        }

        tempRecipeIngredients = Array.isArray(prod.ingredients) ? JSON.parse(JSON.stringify(prod.ingredients)) : [];
        renderTempRecipeIngredients();
        document.getElementById('modal-recipe-product')?.classList.remove('hidden');
        document.getElementById('rec-name')?.focus();
      } else {
        // Modo Edición de Producto Simple o Insumo
        document.getElementById('sp-id').value = prod.id;
        const titleEl = document.getElementById('modal-sp-title');
        if (titleEl) titleEl.textContent = '✏️ Modificar Producto Simple o Insumo';
        const btnSave = document.getElementById('btn-save-simple-product');
        if (btnSave) btnSave.textContent = 'Guardar Cambios del Producto';

        document.getElementById('sp-name').value = prod.name || '';
        document.getElementById('sp-unit').value = prod.unit || 'und';
        document.getElementById('sp-track-stock').value = prod.trackStock ? 'true' : 'false';
        document.getElementById('sp-stock').value = prod.stock !== undefined ? prod.stock : 0;
        document.getElementById('sp-cost').value = prod.cost !== undefined ? prod.cost : 0;
        document.getElementById('sp-price').value = prod.price !== undefined ? prod.price : 0;
        document.getElementById('sp-desc').value = prod.desc || '';

        document.getElementById('modal-simple-product')?.classList.remove('hidden');
        document.getElementById('sp-name')?.focus();
      }
    }
    window.openEditProductModal = openEditProductModal;

    function populateRecipeSimulator() {
      const sel = document.getElementById('sim-recipe-select');
      if (!sel) return;
      const recipes = state.products.filter(p => p.type === 'compuesto');
      if (recipes.length === 0) {
        sel.innerHTML = `<option value="">No hay recetas compuestas creadas</option>`;
      } else {
        const prevVal = sel.value;
        sel.innerHTML = recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        if (prevVal && recipes.some(r => r.id === prevVal)) {
          sel.value = prevVal;
        }
      }
      renderRecipeSimulatorResults();
    }

    function renderRecipeSimulatorResults() {
      const sel = document.getElementById('sim-recipe-select');
      const paxInput = document.getElementById('sim-pax-input');
      const marginSlider = document.getElementById('sim-margin-slider');
      if (!sel) return;

      const pax = Math.max(1, Number(paxInput?.value) || 1);
      const marginPct = Number(marginSlider?.value) || 50;

      // Update Pax and Margin labels
      const paxDisplay = document.getElementById('sim-pax-display');
      if (paxDisplay) paxDisplay.textContent = `${pax} Pax`;

      const quickPaxLabel = document.getElementById('sim-quick-add-pax-label');
      if (quickPaxLabel) quickPaxLabel.textContent = `${pax} Pax`;

      const marginLabel = document.getElementById('sim-margin-label');
      if (marginLabel) marginLabel.textContent = `${marginPct}% Margen`;

      const rec = state.products.find(p => p.id === sel.value) || state.products.find(p => p.type === 'compuesto');
      const tbody = document.getElementById('sim-ingredients-tbody');
      const countEl = document.getElementById('sim-ingredients-count');
      const descEl = document.getElementById('sim-recipe-desc');
      const specUnit = document.getElementById('sim-spec-unit');

      if (!rec) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay ninguna receta seleccionada.</td></tr>`;
        if (countEl) countEl.textContent = '0 insumos';
        return;
      }

      if (descEl) descEl.textContent = rec.desc || 'Receta gastronómica / coctelería para eventos.';
      if (specUnit) specUnit.textContent = `${rec.unit || 'Por Persona'} (Base ${rec.basePax || 1} Pax)`;
      const specGlass = document.getElementById('sim-spec-glassware');
      if (specGlass) specGlass.textContent = rec.glassware || 'Copa Balón / Vaso Largo';
      const specWaste = document.getElementById('sim-spec-waste');
      if (specWaste) specWaste.textContent = rec.waste ? (rec.waste + (rec.waste.includes('%') ? '' : '%')) : '3% - 5%';

      const unitCost = calculateRecipeUnitCost(rec);
      const totalCost = unitCost * pax;

      // Calculate suggested price according to margin
      const markupFactor = marginPct >= 95 ? 10 : (1 / (1 - (marginPct / 100)));
      const calculatedSuggestedPrice = Math.round(unitCost * markupFactor);
      const suggestedPrice = Math.max(calculatedSuggestedPrice, Number(rec.price) || 0);
      const totalSale = suggestedPrice * pax;
      const grossProfit = totalSale - totalCost;

      // Update KPI Cards
      const kpiUnit = document.getElementById('sim-kpi-unit-cost');
      if (kpiUnit) kpiUnit.textContent = formatCurrency(unitCost);

      const kpiTotal = document.getElementById('sim-kpi-total-cost');
      if (kpiTotal) kpiTotal.textContent = formatCurrency(totalCost);

      const kpiTotalSub = document.getElementById('sim-kpi-total-cost-sub');
      if (kpiTotalSub) kpiTotalSub.textContent = `Para ${pax} personas`;

      const kpiSugg = document.getElementById('sim-kpi-suggested-price');
      if (kpiSugg) kpiSugg.textContent = formatCurrency(suggestedPrice);

      const kpiSuggTotal = document.getElementById('sim-kpi-suggested-total');
      if (kpiSuggTotal) kpiSuggTotal.textContent = `Venta total: ${formatCurrency(totalSale)}`;

      const kpiProfit = document.getElementById('sim-kpi-gross-profit');
      if (kpiProfit) kpiProfit.textContent = formatCurrency(grossProfit);

      const kpiProfitPct = document.getElementById('sim-kpi-profit-pct');
      if (kpiProfitPct) kpiProfitPct.textContent = `${marginPct}% margen comercial`;

      // Render Ingredients Explosion Table
      const factor = pax / Math.max(1, Number(rec.basePax) || 1);
      const ingredients = rec.ingredients || [];

      if (countEl) countEl.textContent = `${ingredients.length} insumos requeridos`;

      if (tbody) {
        if (ingredients.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">Esta receta no tiene ingredientes registrados. Edítala en la pestaña Productos.</td></tr>`;
        } else {
          tbody.innerHTML = ingredients.map(ing => {
            const insumo = state.products.find(p => p.id === ing.productId);
            if (!insumo) return '';

            const dosePerPax = Number(ing.qty) / Math.max(1, Number(rec.basePax) || 1);
            const totalQtyRecUnit = (Number(ing.qty) || 0) * factor;
            const totalQtyBaseUnit = convertUnits(totalQtyRecUnit, ing.unit, insumo.unit);
            const lineCost = totalQtyBaseUnit * (Number(insumo.cost) || 0);

            // Stock check
            let stockStatusHtml = '';
            if (insumo.trackStock) {
              const currentStock = Number(insumo.stock) || 0;
              if (currentStock >= totalQtyBaseUnit) {
                stockStatusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✅ Suficiente</span>`;
              } else {
                const missing = (totalQtyBaseUnit - currentStock).toFixed(2);
                stockStatusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800" title="Faltan ${missing} ${insumo.unit} para el evento">⚠️ Faltan ${missing} ${insumo.unit}</span>`;
              }
            } else {
              stockStatusHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Sin límite</span>`;
            }

            return `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900">${insumo.name}</div>
                  <div class="text-[11px] text-slate-400">Unidad de compra: ${insumo.unit} · Costo base: ${formatCurrency(insumo.cost)}/${insumo.unit}</div>
                </td>
                <td class="py-3 px-3 text-center tabular-nums font-medium text-slate-600">
                  ${dosePerPax.toFixed(2)} ${ing.unit}
                </td>
                <td class="py-3 px-3 text-center tabular-nums font-extrabold text-indigo-700">
                  ${totalQtyRecUnit.toFixed(1)} ${ing.unit}
                  ${ing.unit !== insumo.unit ? `<span class="block text-[10px] text-slate-400 font-normal">(${totalQtyBaseUnit.toFixed(2)} ${insumo.unit})</span>` : ''}
                </td>
                <td class="py-3 px-3 text-center tabular-nums text-slate-600">
                  ${insumo.trackStock ? `${insumo.stock} ${insumo.unit}` : 'Ilimitado'}
                </td>
                <td class="py-3 px-3 text-center">
                  ${stockStatusHtml}
                </td>
                <td class="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                  ${formatCurrency(lineCost)}
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
