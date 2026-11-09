/* Xander Pro — 04-clientes-finanzas-cobro (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // =====================================================
    // 7. SAVED QUOTES, CLIENTS, FINANCES & COMPANY RENDER
    // =====================================================
        // =====================================================
    // NÚMERO A LETRAS FORMAL EN PESOS COLOMBIANOS (M/CTE.)
    // =====================================================
    function _cdcUnidades(num) {
      switch (num) {
        case 1: return 'UN';
        case 2: return 'DOS';
        case 3: return 'TRES';
        case 4: return 'CUATRO';
        case 5: return 'CINCO';
        case 6: return 'SEIS';
        case 7: return 'SIETE';
        case 8: return 'OCHO';
        case 9: return 'NUEVE';
      }
      return '';
    }

    function _cdcDecenasY(strSin, numUnidades) {
      if (numUnidades > 0) return strSin + ' Y ' + _cdcUnidades(numUnidades);
      return strSin;
    }

    function _cdcDecenas(num) {
      const decena = Math.floor(num / 10);
      const unidad = num - (decena * 10);
      switch (decena) {
        case 1:
          switch (unidad) {
            case 0: return 'DIEZ';
            case 1: return 'ONCE';
            case 2: return 'DOCE';
            case 3: return 'TRECE';
            case 4: return 'CATORCE';
            case 5: return 'QUINCE';
            default: return 'DIECI' + _cdcUnidades(unidad);
          }
        case 2:
          switch (unidad) {
            case 0: return 'VEINTE';
            default: return 'VEINTI' + _cdcUnidades(unidad);
          }
        case 3: return _cdcDecenasY('TREINTA', unidad);
        case 4: return _cdcDecenasY('CUARENTA', unidad);
        case 5: return _cdcDecenasY('CINCUENTA', unidad);
        case 6: return _cdcDecenasY('SESENTA', unidad);
        case 7: return _cdcDecenasY('SETENTA', unidad);
        case 8: return _cdcDecenasY('OCHENTA', unidad);
        case 9: return _cdcDecenasY('NOVENTA', unidad);
        case 0: return _cdcUnidades(unidad);
      }
      return '';
    }

    function _cdcCentenas(num) {
      const centenas = Math.floor(num / 100);
      const decenas = num - (centenas * 100);
      switch (centenas) {
        case 1:
          if (decenas > 0) return 'CIENTO ' + _cdcDecenas(decenas);
          return 'CIEN';
        case 2: return 'DOSCIENTOS ' + _cdcDecenas(decenas);
        case 3: return 'TRESCIENTOS ' + _cdcDecenas(decenas);
        case 4: return 'CUATROCIENTOS ' + _cdcDecenas(decenas);
        case 5: return 'QUINIENTOS ' + _cdcDecenas(decenas);
        case 6: return 'SEISCIENTOS ' + _cdcDecenas(decenas);
        case 7: return 'SETECIENTOS ' + _cdcDecenas(decenas);
        case 8: return 'OCHOCIENTOS ' + _cdcDecenas(decenas);
        case 9: return 'NOVECIENTOS ' + _cdcDecenas(decenas);
      }
      return _cdcDecenas(decenas);
    }

    function _cdcMiles(num) {
      const divisor = 1000;
      const cientos = Math.floor(num / divisor);
      const resto = num - (cientos * divisor);
      let strMiles = '';
      if (cientos > 0) {
        strMiles = cientos === 1 ? 'MIL' : _cdcCentenas(cientos) + ' MIL';
      }
      let strCentenas = _cdcCentenas(resto);
      if (strMiles === '') return strCentenas;
      return (strMiles + ' ' + strCentenas).trim();
    }

    function _cdcMillones(num) {
      const divisor = 1000000;
      const cientos = Math.floor(num / divisor);
      const resto = num - (cientos * divisor);
      let strMillones = '';
      if (cientos > 0) {
        strMillones = cientos === 1 ? 'UN MILLÓN' : _cdcCentenas(cientos) + ' MILLONES';
      }
      let strMiles = _cdcMiles(resto);
      if (strMillones === '') return strMiles;
      return (strMillones + ' ' + strMiles).trim();
    }

    function numeroALetras(num) {
      const entero = Math.round(Math.abs(Number(num) || 0));
      if (entero === 0) return 'CERO PESOS M/CTE.';
      if (entero === 1) return 'UN PESO M/CTE.';
      let resultado = _cdcMillones(entero);
      if (resultado.endsWith('MILLÓN') || resultado.endsWith('MILLONES')) {
        resultado += ' DE PESOS M/CTE.';
      } else {
        resultado += ' PESOS M/CTE.';
      }
      return resultado.replace(/\s+/g, ' ').trim();
    }

    // =====================================================
    // CUENTA DE COBRO STATE & VIEW CONTROLLER
    // =====================================================
    let currentCDCQuote = null;

    // Auto-Scale A4 Sheet to fit smoothly on mobile screens (iPhone, Android, etc.)
    function updateCDCScale() {
      const container = document.getElementById('cdc-scale-container');
      const sheet = document.getElementById('cdc-printable-sheet');
      if (!container || !sheet) return;

      const availW = container.clientWidth - 20; // 10px padding on each side
      if (availW < 794 && availW > 150) {
        const scale = availW / 794;
        sheet.style.transform = `scale(${scale})`;
        sheet.style.transformOrigin = 'top center';
        const origH = sheet.offsetHeight || 1050;
        const diffH = origH * (1 - scale);
        sheet.style.marginBottom = `-${Math.round(diffH)}px`;
      } else {
        sheet.style.transform = 'none';
        sheet.style.marginBottom = '0px';
      }
    }

    function setCDCViewMode(mode) {
      const editorPanel = document.getElementById('cdc-panel-editor');
      const previewPanel = document.getElementById('cdc-panel-preview');
      const grid = document.getElementById('cdc-main-body');
      const btnEdit = document.getElementById('btn-cdc-mode-edit');
      const btnPrev = document.getElementById('btn-cdc-mode-preview');
      const btnSplit = document.getElementById('btn-cdc-mode-split');

      // On screens smaller than 1200px, disable split mode to avoid squishing
      if (window.innerWidth < 1200 && mode === 'split') {
        mode = 'preview';
      }

      const activeClasses = ['bg-white', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-white', 'shadow-sm'];
      const inactiveClasses = ['text-slate-600', 'dark:text-slate-300'];

      const setBtnActive = (btn, isActive) => {
        if (!btn) return;
        if (isActive) {
          btn.classList.add(...activeClasses);
          btn.classList.remove(...inactiveClasses);
        } else {
          btn.classList.remove(...activeClasses);
          btn.classList.add(...inactiveClasses);
        }
      };

      setBtnActive(btnEdit, mode === 'edit');
      setBtnActive(btnPrev, mode === 'preview');
      setBtnActive(btnSplit, mode === 'split');

      if (mode === 'preview') {
        // FULL WIDTH A4 PREVIEW (No dividing screen, 100% visible centered sheet)
        if (editorPanel) { editorPanel.classList.add('hidden'); editorPanel.style.display = 'none'; }
        if (previewPanel) { previewPanel.classList.remove('hidden', 'lg:col-span-6'); previewPanel.classList.add('col-span-12', 'w-full'); previewPanel.style.display = 'flex'; }
        if (grid) { grid.classList.remove('lg:grid-cols-12'); grid.classList.add('grid-cols-1'); }
        setTimeout(updateCDCScale, 50);
        previewPanel?.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (mode === 'edit') {
        // FULL WIDTH FORM EDITOR (Comfortable spacious layout)
        if (previewPanel) { previewPanel.classList.add('hidden'); previewPanel.style.display = 'none'; }
        if (editorPanel) { editorPanel.classList.remove('hidden', 'lg:col-span-6'); editorPanel.classList.add('col-span-12', 'w-full'); editorPanel.style.display = 'block'; }
        if (grid) { grid.classList.remove('lg:grid-cols-12'); grid.classList.add('grid-cols-1'); }
        editorPanel?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // SPLIT SCREEN (Side-by-side for widescreen monitors)
        if (editorPanel) { editorPanel.classList.remove('hidden', 'col-span-12'); editorPanel.classList.add('lg:col-span-6'); editorPanel.style.display = 'block'; }
        if (previewPanel) { previewPanel.classList.remove('hidden', 'col-span-12'); previewPanel.classList.add('lg:col-span-6'); previewPanel.style.display = 'flex'; }
        if (grid) { grid.classList.remove('grid-cols-1'); grid.classList.add('lg:grid-cols-12'); }
        setTimeout(updateCDCScale, 50);
      }
    }

    function openCuentaCobroModal(quoteObj) {
      const q = quoteObj || state.activeQuote;
      if (!q) {
        showToast('No hay cotización activa para generar cuenta de cobro.');
        return;
      }
      currentCDCQuote = q;

      // Calculate totals (handles both detailed items quotes and summary quotes)
      let total = Number(q.total) || 0;
      let subtotal = 0;
      if (q.items && q.items.length > 0) {
        const tt = xpQuoteTotals(q);
        subtotal = tt.subtotal;
        if (!total) {
          total = Math.round(tt.total);
        }
      } else {
        subtotal = total;
      }
      if (total <= 0 && state.activeQuote && state.activeQuote.total) {
        total = Number(state.activeQuote.total) || 0;
      }
      const anticipoPct = Number(q.depositPct) || 50;
      const anticipoVal = Math.round(total * (anticipoPct / 100));
      const saldoVal = Math.max(0, total - anticipoVal);

      // Quote badge: KEEP IT SHORT so it never wraps on mobile screens!
      const badge = document.getElementById('cdc-header-quote-badge');
      if (badge) badge.textContent = q.number || 'COT-001';

      const totalRef = document.getElementById('cdc-quote-total-ref');
      if (totalRef) totalRef.textContent = `Total: ${formatCurrency(total)}`;

      // Update preset buttons values
      const pTot = document.getElementById('cdc-preset-total-val');
      if (pTot) pTot.textContent = formatCurrency(total);
      const pAnt = document.getElementById('cdc-preset-anticipo-val');
      if (pAnt) pAnt.textContent = formatCurrency(anticipoVal);
      const pSal = document.getElementById('cdc-preset-saldo-val');
      if (pSal) pSal.textContent = formatCurrency(saldoVal);

      // Generate next CDC number
      const cdcInputNumber = document.getElementById('cdc-input-number');
      if (cdcInputNumber) {
        const nextSeq = String((state.savedQuotes || []).length + 1).padStart(4, '0');
        const defaultNum = `CDC-${new Date().getFullYear()}-${nextSeq}`;
        cdcInputNumber.value = defaultNum;
      }

      // Dates: issue today, due date quote expiration or +15 days
      const todayIso = new Date().toISOString().slice(0, 10);
      const cdcDate = document.getElementById('cdc-input-date');
      if (cdcDate) cdcDate.value = todayIso;
      const cdcDueDate = document.getElementById('cdc-input-due-date');
      if (cdcDueDate) {
        if (q.validUntil) {
          cdcDueDate.value = q.validUntil;
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 15);
          cdcDueDate.value = d.toISOString().slice(0, 10);
        }
      }

      // Creditor info from company state
      const comp = state.company || {};
      const cName = document.getElementById('cdc-creditor-name');
      if (cName) cName.value = comp.name || 'Aura Eventos & Catering';
      const cDoc = document.getElementById('cdc-creditor-doc');
      if (cDoc) cDoc.value = comp.nit || 'NIT: 901.482.310-9';
      const cPhone = document.getElementById('cdc-creditor-phone');
      if (cPhone) cPhone.value = comp.phone || '+57 300 456 7890';
      const cCity = document.getElementById('cdc-creditor-city');
      if (cCity) cCity.value = `${comp.address || 'El Poblado'}, ${comp.city || 'Medellín'}`;

      // Debtor info from client
      const cl = (state.clients || []).find(c => c.id === q.clientId) || {};
      const dName = document.getElementById('cdc-debtor-name');
      if (dName) dName.value = cl.name || q.eventTitle || 'Cliente';
      const dDoc = document.getElementById('cdc-debtor-doc');
      if (dDoc) dDoc.value = cl.doc || 'C.C. / NIT';
      const dContact = document.getElementById('cdc-debtor-contact');
      if (dContact) dContact.value = `${cl.email || ''} ${cl.phone ? ' · ' + cl.phone : ''}`.trim() || 'contacto@cliente.com';
      const dCity = document.getElementById('cdc-debtor-city');
      if (dCity) dCity.value = cl.city || comp.city || 'Medellín, Antioquia';

      // Concept prefill
      const cdcConcept = document.getElementById('cdc-input-concept');
      if (cdcConcept) {
        cdcConcept.value = `Prestación de servicios para el evento '${q.eventTitle || 'Evento'}' (${q.eventType || 'Evento'}), programado para el día ${formatDateHuman(q.eventDate)} en ${q.eventVenue || 'Lugar por definir'} para ${q.guestsPax || 1} personas (Pax), según Cotización N&deg; ${q.number}.`;
      }

      // Bank details
      const cdcBank = document.getElementById('cdc-input-bank');
      if (cdcBank) {
        cdcBank.value = comp.bankDetails || 'Bancolombia Ahorros: 412-000981-23\nNequi / Daviplata: 300 456 7890\nTitular: ' + (comp.name || 'Aura Eventos SAS');
      }

      // Tax clause
      const cdcTax = document.getElementById('cdc-input-tax-clause');
      if (cdcTax) {
        cdcTax.value = 'Para efectos tributarios, manifiesto bajo la gravedad de juramento que no soy responsable del Impuesto sobre las Ventas (IVA), de conformidad con el Artículo 437 del Estatuto Tributario nacional.';
      }

      // Default amount: 100% Total
      const amountInput = document.getElementById('cdc-input-amount');
      if (amountInput) amountInput.value = total;

      const wordsInput = document.getElementById('cdc-input-amount-words');
      if (wordsInput) wordsInput.value = numeroALetras(total);

      highlightCDCPreset('btn-cdc-preset-total');
      updateCuentaCobroPreview();

      const modal = document.getElementById('modal-cuenta-cobro');
      if (modal) modal.classList.remove('hidden');

      // Start in Edit mode by default with prominent "Ver Vista Previa" button
      setCDCViewMode('edit');
    }

    function highlightCDCPreset(btnId) {
      document.querySelectorAll('.cdc-preset-btn').forEach(b => {
        b.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-100', 'dark:bg-amber-900/40');
      });
      const active = document.getElementById(btnId);
      if (active) active.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100', 'dark:bg-amber-900/40');
    }

    function updateCuentaCobroPreview() {
      const q = currentCDCQuote || state.activeQuote || {};
      const amount = Number(document.getElementById('cdc-input-amount')?.value) || 0;
      const num = document.getElementById('cdc-input-number')?.value.trim() || 'CDC-2026-0001';
      const issueDate = document.getElementById('cdc-input-date')?.value || new Date().toISOString().slice(0, 10);
      const dueDate = document.getElementById('cdc-input-due-date')?.value || '';
      const words = document.getElementById('cdc-input-amount-words')?.value.trim() || numeroALetras(amount);
      const cName = document.getElementById('cdc-creditor-name')?.value.trim() || 'AURA EVENTOS & CATERING';
      const cDoc = document.getElementById('cdc-creditor-doc')?.value.trim() || 'NIT: 901.482.310-9';
      const cPhone = document.getElementById('cdc-creditor-phone')?.value.trim() || '';
      const cCity = document.getElementById('cdc-creditor-city')?.value.trim() || '';
      const dName = document.getElementById('cdc-debtor-name')?.value.trim() || 'CLIENTE';
      const dDoc = document.getElementById('cdc-debtor-doc')?.value.trim() || '';
      const dContact = document.getElementById('cdc-debtor-contact')?.value.trim() || '';
      const dCity = document.getElementById('cdc-debtor-city')?.value.trim() || '';
      const concept = document.getElementById('cdc-input-concept')?.value.trim() || '';
      const bank = document.getElementById('cdc-input-bank')?.value.trim() || '';
      const taxClause = document.getElementById('cdc-input-tax-clause')?.value.trim() || '';
      const showItems = document.getElementById('cdc-toggle-items')?.checked;
      const showTax = document.getElementById('cdc-toggle-tax-clause')?.checked;

      // Bind to preview sheet
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('cdc-pv-creditor-name', cName.toUpperCase());
      setTxt('cdc-pv-creditor-doc', cDoc);
      setTxt('cdc-pv-creditor-contact', cPhone ? `📞 ${cPhone}` : '');
      setTxt('cdc-pv-creditor-city', cCity);

      setTxt('cdc-pv-number', `N&deg; ${num}`);
      setTxt('cdc-pv-date', formatDateHuman(issueDate));
      setTxt('cdc-pv-due-date', dueDate ? formatDateHuman(dueDate) : 'Contraentrega');

      setTxt('cdc-pv-debtor-name', dName);
      setTxt('cdc-pv-debtor-doc', dDoc);
      setTxt('cdc-pv-debtor-contact', dContact);
      setTxt('cdc-pv-debtor-city', dCity);

      setTxt('cdc-pv-debe-a-name', cName.toUpperCase());
      setTxt('cdc-pv-debe-a-doc', cDoc);

      setTxt('cdc-pv-amount-num', `${formatCurrency(amount)} COP`);
      setTxt('cdc-pv-amount-words', words);
      setTxt('cdc-pv-concept', concept);
      setTxt('cdc-pv-bank', bank);
      setTxt('cdc-pv-tax-clause', taxClause);

      setTxt('cdc-pv-sig-name', cName.toUpperCase());
      setTxt('cdc-pv-sig-doc', cDoc);

      // Tax clause toggle
      const taxWrap = document.getElementById('cdc-pv-tax-wrapper');
      if (taxWrap) taxWrap.style.display = showTax ? 'block' : 'none';

      // Items breakdown table
      const itemsWrap = document.getElementById('cdc-pv-items-wrapper');
      const itemsTbody = document.getElementById('cdc-pv-items-tbody');
      if (itemsWrap && itemsTbody) {
        if (showItems && q.items && q.items.length > 0) {
          itemsWrap.style.display = 'block';
          itemsTbody.innerHTML = q.items.filter(it => it && !it.optional).map(it => {
            const qty = Number(it.qty) || 0;
            const price = Number(it.price) || 0;
            const rowTot = qty * price;
            return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">
                  <div>${it.name || 'Servicio'}</div>
                  ${it.desc ? `<div style="font-size: 10px; color: #64748b; font-weight: normal;">${it.desc}</div>` : ''}
                </td>
                <td style="padding: 6px 8px; text-align: center; color: #475569;">${qty} ${it.unit || 'und'}</td>
                <td style="padding: 6px 8px; text-align: right; color: #475569;">${formatCurrency(price)}</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(rowTot)}</td>
              </tr>
            `;
          }).join('');
        } else {
          itemsWrap.style.display = 'none';
        }
      }
    }

    // High-Precision Cuenta de Cobro PDF Generation (100% Pure White Background, Exact A4 Geometry)
    function downloadCuentaCobroPDF() {
      const sheet = document.getElementById('cdc-printable-sheet');
      if (!sheet) return;

      const num = document.getElementById('cdc-input-number')?.value.trim() || 'CDC-001';
      const cleanNum = num.replace(/[^a-zA-Z0-9_-]/g, '_');
      const clientName = (document.getElementById('cdc-debtor-name')?.value || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Cuenta_de_Cobro_${cleanNum}_${clientName}.pdf`;

      showToast('Generando Cuenta de Cobro oficial en PDF...');

      const clone = sheet.cloneNode(true);
      clone.id = 'cdc-render-clone';
      clone.style.width = '794px';
      clone.style.minWidth = '794px';
      clone.style.maxWidth = '794px';
      clone.style.margin = '0px';
      clone.style.padding = '35px 40px';
      clone.style.boxSizing = 'border-box';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.borderRadius = '0px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.colorScheme = 'light';
      clone.style.transform = 'none';

      const sandbox = document.createElement('div');
      sandbox.id = 'cdc-render-sandbox';
      sandbox.style.cssText = 'position:fixed;left:0;top:0;width:794px;margin:0;padding:0;background:#ffffff;color:#0f172a;color-scheme:light;z-index:999998;pointer-events:none;overflow:visible;';
      sandbox.appendChild(clone);
      document.body.appendChild(sandbox);

      const veil = document.createElement('div');
      veil.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#ffffff;display:flex;align-items:center;justify-content:center;font:600 14px Inter,system-ui,sans-serif;color:#d97706;';
      veil.textContent = '📄 Generando Cuenta de Cobro en PDF...';
      document.body.appendChild(veil);

      const prevScrollX = window.scrollX;
      const prevScrollY = window.scrollY;
      window.scrollTo(0, 0);

      const cleanup = () => {
        if (sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
        if (veil.parentNode) veil.parentNode.removeChild(veil);
        window.scrollTo(prevScrollX, prevScrollY);
      };

      const h2c = window.html2canvas;
      const JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!h2c || !JsPDF) {
        cleanup();
        window.print();
        return;
      }

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
          const totalH = canvas.height / SCALE;

          let start = 0;
          let pageIndex = 0;
          while (start < totalH - 2) {
            const limit = start + pageHpx;
            const end = Math.min(totalH, limit);
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
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, (sliceH / SCALE) / pxPerMm);

            start = end;
            pageIndex++;
          }

          pdf.save(filename);
          cleanup();
          showToast(`✅ Cuenta de Cobro descargada: ${filename}`);
        }).catch(err => {
          console.error('Error generating CDC PDF:', err);
          cleanup();
          window.print();
        });
      }, 100);
    }

    function renderSavedQuotes() {
      ['badge-quotes-count', 'badge-quotes-count-drawer', 'badge-quotes-count-bottom'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.textContent = state.savedQuotes.length;
      });
      const tbody = document.getElementById('saved-quotes-tbody');
      if (!tbody) return;

      const searchEl = document.getElementById('quote-search-input');
      const searchTerm = (searchEl?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('quote-filter-status')?.value || 'all';
      const txt = v => String(v ?? '').toLowerCase();
      const all = (state.savedQuotes || []).filter(sq => sq && typeof sq === 'object');
      const clients = state.clients || [];

      const filtered = all.filter(sq => {
        const cl = clients.find(c => c.id === sq.clientId);
        const matchesStatus = statusFilter === 'all' || sq.status === statusFilter;
        const matchesSearch = !searchTerm ||
          txt(sq.number).includes(searchTerm) ||
          txt(sq.eventTitle).includes(searchTerm) ||
          txt(cl && cl.name).includes(searchTerm);
        return matchesStatus && matchesSearch;
      });

      const mobileBox = document.getElementById('saved-quotes-mobile-cards');
      const escH = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      if (filtered.length === 0) {
        const hidden = all.length && (searchTerm || statusFilter !== 'all');
        if (mobileBox) mobileBox.innerHTML = `<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
          ${all.length ? 'No se encontraron cotizaciones con los filtros actuales.' : 'Aún no hay cotizaciones de eventos guardadas.'}
          ${hidden ? `<div class="mt-2 text-[11px] text-slate-400">Hay ${all.length} cotización(es) ocultas por el filtro.</div>
          <button type="button" onclick="xpClearQuoteFilters()" class="mt-3 min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer">Ver todas las cotizaciones</button>` : ''}
        </div>`;
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500">
          ${all.length ? 'No se encontraron cotizaciones con los filtros actuales.' : 'Aún no hay cotizaciones de eventos guardadas.'}
          ${hidden ? `<div class="mt-2 text-[11px] text-slate-400">Hay ${all.length} cotización(es) guardada(s) ocultas por el filtro${searchTerm ? ` «${searchTerm.replace(/[<>&"]/g, '')}»` : ''}.</div>
          <button type="button" onclick="xpClearQuoteFilters()" class="mt-3 min-h-[40px] px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Ver todas las cotizaciones</button>` : ''}
        </td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(sq => { try {
        const cl = state.clients.find(c => c.id === sq.clientId);
        const baseOf = x => x.baseNumber || String(x.number || '').replace(/\s*V\d+$/i, '');
        const sqBase = sq.baseNumber || (typeof getQuoteBaseNumber === "function" && sq.number ? getQuoteBaseNumber(sq.number) : baseOf(sq));
        const familyVersions = all.filter(x => baseOf(x) === sqBase);
        const familyCount = familyVersions.length;
        const isLocked = sq.status === 'Enviada' || sq.status === 'Aprobada' || sq.status === 'Reemplazada';

        const statusColor = sq.status === 'Aprobada'
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          : (sq.status === 'Enviada' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            (sq.status === 'Reemplazada' ? 'bg-slate-100 text-slate-600 border border-slate-200 line-through decoration-slate-400' :
            (sq.status === 'Rechazada' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-100 text-blue-800 border border-blue-200')));

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-bold text-indigo-700 tabular-nums">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span>${sq.number}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-black ${sq.version > 1 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}">V${sq.version || 1}</span>
              </div>
              ${familyCount > 1 ? `<button type="button" onclick="openQuoteVersionHistoryModal('${sq.id}')" class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline block mt-0.5 cursor-pointer">(${familyCount} versiones)</button>` : ''}
            </td>
            <td class="py-3 px-4">
              <div class="font-bold text-slate-900">${sq.eventTitle}</div>
              <div class="text-[11px] text-slate-500">${cl ? cl.name : 'Cliente'} &bull; ${sq.eventType}</div>
            </td>
            <td class="py-3 px-4 text-center font-bold tabular-nums">${sq.guestsPax} Pax</td>
            <td class="py-3 px-4 tabular-nums">${formatDateHuman(sq.eventDate)}</td>
            <td class="py-3 px-4 tabular-nums text-amber-800 font-semibold">${formatDateHuman(sq.validUntil)}</td>
            <td class="py-3 px-4 text-right font-extrabold text-slate-900 tabular-nums">${formatCurrency(sq.total)}</td>
            <td class="py-3 px-4 text-center">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusColor}">${sq.status}</span>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="inline-flex items-center gap-1.5 justify-end flex-wrap">
                <button type="button" data-load-quote="${sq.id}" class="load-saved-quote-btn px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition inline-flex items-center gap-1" title="Abrir y editar cotizaci&oacute;n">
                  <span>Abrir / PDF</span>
                </button>
                ${isLocked ? `
                  <button type="button" onclick="openCreateQuoteVersionModal('${sq.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition border border-emerald-200 flex items-center gap-1 cursor-pointer" title="Crear nueva versi&oacute;n a partir de esta cotizaci&oacute;n">
                    <span>+ Versi&oacute;n</span>
                  </button>
                ` : ''}
                <button type="button" onclick="openQuoteVersionHistoryModal('${sq.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer" title="Ver historial y comparar versiones">
                  <span>Versiones</span>
                </button>
                <button type="button" data-cdc-quote="${sq.id}" class="generate-cdc-quote-btn px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition inline-flex items-center gap-1 border border-amber-200" title="Generar Cuenta de Cobro">
                  <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span>Cobro</span>
                </button>
                <button type="button" onclick="xpDuplicateSavedQuote('${sq.id}')" class="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition inline-flex items-center gap-1 border border-sky-200 cursor-pointer" title="Crear una cotizaci&oacute;n nueva a partir de esta">
                  <span>📋</span><span>Duplicar</span>
                </button>
                <button type="button" data-delete-quote="${sq.id}" class="xp-delete-quote-btn px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition inline-flex items-center gap-1 border border-rose-200 cursor-pointer" title="Eliminar esta cotizaci&oacute;n del historial">
                  <span>🗑️</span><span>Eliminar</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      } catch (err) {
        console.warn('Cotización con datos incompletos en el historial:', sq, err);
        return `<tr><td colspan="8" class="py-3 px-4 text-xs text-slate-500">${String(sq.number || 'Cotización sin número')} — datos incompletos <button type="button" data-load-quote="${sq.id}" class="load-saved-quote-btn ml-2 underline font-bold">Abrir</button> <button type="button" data-delete-quote="${sq.id}" class="xp-delete-quote-btn ml-2 underline font-bold text-rose-700">Eliminar</button></td></tr>`;
      } }).join('');

      // Tarjetas para celular (antes este contenedor quedaba vacío y en el iPhone no se veía el historial)
      if (mobileBox) {
        mobileBox.innerHTML = filtered.map(sq => {
          try {
            const cl = clients.find(c => c.id === sq.clientId);
            const isLocked = sq.status === 'Enviada' || sq.status === 'Aprobada' || sq.status === 'Reemplazada';
            const st = sq.status || 'Borrador';
            const stCls = st === 'Aprobada' ? 'bg-emerald-100 text-emerald-800' : st === 'Enviada' ? 'bg-amber-100 text-amber-800' : st === 'Reemplazada' ? 'bg-slate-100 text-slate-600 line-through' : st === 'Rechazada' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800';
            const items = (sq.fullCopy && Array.isArray(sq.fullCopy.items)) ? sq.fullCopy.items.length : null;
            const btn = 'min-h-[44px] px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition';
            return `
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-[11px] font-bold text-indigo-700 tabular-nums">${escH(sq.number || 'Sin número')}</div>
                  <div class="font-bold text-sm text-slate-900 dark:text-white leading-snug">${escH(sq.eventTitle || 'Evento sin nombre')}</div>
                  <div class="text-[11px] text-slate-500">${escH(cl ? cl.name : 'Sin cliente')}${sq.eventType ? ' · ' + escH(sq.eventType) : ''}</div>
                </div>
                <span class="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${stCls}">${escH(st)}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-[11px]">
                <div><div class="text-slate-400">Evento</div><div class="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">${sq.eventDate ? formatDateHuman(sq.eventDate) : '—'}</div></div>
                <div><div class="text-slate-400">Personas</div><div class="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">${Number(sq.guestsPax) || 0} Pax</div></div>
                <div class="text-right"><div class="text-slate-400">Total</div><div class="font-extrabold text-slate-900 dark:text-white tabular-nums">${formatCurrency(sq.total)}</div></div>
              </div>
              ${items === 0 ? '<div class="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">Sin productos agregados</div>' : ''}
              <div class="grid grid-cols-2 gap-2">
                <button type="button" data-load-quote="${sq.id}" class="load-saved-quote-btn ${btn} bg-indigo-600 text-white">Abrir / PDF</button>
                ${isLocked
                  ? `<button type="button" onclick="openCreateQuoteVersionModal('${sq.id}')" class="${btn} bg-emerald-50 text-emerald-800 border border-emerald-200">+ Versión</button>`
                  : `<button type="button" onclick="openQuoteVersionHistoryModal('${sq.id}')" class="${btn} bg-slate-100 text-slate-700">Versiones</button>`}
                <button type="button" data-cdc-quote="${sq.id}" class="generate-cdc-quote-btn ${btn} bg-amber-50 text-amber-800 border border-amber-200">Cobro</button>
                <button type="button" onclick="xpDuplicateSavedQuote('${sq.id}')" class="${btn} bg-sky-50 text-sky-800 border border-sky-200">📋 Duplicar</button>
                <button type="button" data-delete-quote="${sq.id}" class="xp-delete-quote-btn ${btn} bg-rose-50 text-rose-700 border border-rose-200 col-span-2">🗑️ Eliminar</button>
              </div>
            </div>`;
          } catch (err) {
            console.warn('Cotización con datos incompletos (celular):', sq, err);
            return `<div class="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">${escH(sq.number || 'Cotización sin número')} — datos incompletos
              <div class="grid grid-cols-2 gap-2 mt-2"><button type="button" data-load-quote="${sq.id}" class="load-saved-quote-btn min-h-[44px] rounded-xl bg-indigo-600 text-white font-bold">Abrir</button>
              <button type="button" data-delete-quote="${sq.id}" class="xp-delete-quote-btn min-h-[44px] rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold">Eliminar</button></div></div>`;
          }
        }).join('');
      }
    }

    // Eliminar una cotización de eventos del historial (con confirmación)
    window.xpDeleteSavedQuote = function (id) {
      const list = state.savedQuotes || [];
      const sq = list.find(x => x && x.id === id);
      if (!sq) { showToast('No se encontró la cotización'); return; }
      try {
        const sess = JSON.parse(localStorage.getItem('xp_cloud_session') || 'null');
        if (sess && sess.user && sess.user.role === 'Consulta') { showToast('Tu usuario es de solo consulta: no puede eliminar cotizaciones'); return; }
      } catch (e) { /* sin sesión en la nube */ }
      const cl = (state.clients || []).find(c => c.id === sq.clientId);
      const label = `${sq.number || 'Sin número'} · ${sq.eventTitle || 'Evento'}${cl ? ' · ' + cl.name : ''}`;
      const warn = sq.status === 'Aprobada' ? '\n\nATENCIÓN: esta cotización está APROBADA por el cliente.'
        : sq.status === 'Enviada' ? '\n\nEsta cotización ya fue enviada al cliente.' : '';
      if (!confirm(`¿Eliminar la cotización ${label}?${warn}\n\nSe borra del historial en todos tus dispositivos y no se puede deshacer.`)) return;
      state.savedQuotes = list.filter(x => x !== sq);
      saveState();
      renderSavedQuotes();
      if (typeof window.renderXpHome === 'function') { try { window.renderXpHome(); } catch (e) { /* */ } }
      showToast(`🗑️ Cotización ${sq.number || ''} eliminada`);
    };

    window.xpClearQuoteFilters = function () {
      const s = document.getElementById('quote-search-input'); if (s) s.value = '';
      const f = document.getElementById('quote-filter-status'); if (f) f.value = 'all';
      renderSavedQuotes();
    };

    function renderFinancesView() {
      const filterType = document.getElementById('finance-filter-type')?.value || 'all';
      const finances = state.finances || [];
      const totalIncome = finances.filter(f => f && f.type === 'ingreso').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const totalExpense = finances.filter(f => f && f.type === 'egreso').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const netBalance = totalIncome - totalExpense;

      const incEl = document.getElementById('kpi-total-income');
      const expEl = document.getElementById('kpi-total-expense');
      const balEl = document.getElementById('kpi-net-balance');
      if (incEl) incEl.textContent = formatCurrency(totalIncome);
      if (expEl) expEl.textContent = formatCurrency(totalExpense);
      if (balEl) balEl.textContent = formatCurrency(netBalance);

      const tbody = document.getElementById('finance-movements-tbody');
      if (tbody) {
        const filtered = finances.filter(f => f && (filterType === 'all' || f.type === filterType));
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">No hay movimientos financieros registrados.</td></tr>';
        } else {
          tbody.innerHTML = filtered.map(f => {
            const isInc = f.type === 'ingreso';
            return `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td class="py-2.5 px-3 tabular-nums text-slate-500">${formatDateHuman(f.date)}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">${f.concept || 'Movimiento de caja'}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${f.category || 'General'} · ${f.method || 'Efectivo'}</span>
                </td>
                <td class="py-2.5 px-3 text-right font-extrabold tabular-nums ${isInc ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}">
                  ${isInc ? '+' : '-'}${formatCurrency(f.amount || 0)}
                </td>
                <td class="py-2.5 px-3 text-right">
                  <button type="button" data-del-fin="${f.id}" class="del-fin-btn text-slate-400 hover:text-rose-600 font-bold cursor-pointer" title="Eliminar">✕</button>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Update Chart.js
      const ctx = document.getElementById('finance-chart-canvas');
      if (ctx && typeof Chart !== 'undefined') {
        if (financeChartInstance) {
          try { financeChartInstance.destroy(); } catch (e) {}
        }
        try {
          financeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Ingresos (Anticipos)', 'Egresos (Compras)', 'Utilidad Neta'],
              datasets: [{
                label: 'Monto ($ COP)',
                data: [totalIncome, totalExpense, Math.max(0, netBalance)],
                backgroundColor: ['#059669', '#e11d48', '#4f46e5'],
                borderRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              }
            }
          });
        } catch (err) {
          console.warn('Finance chart init note:', err);
        }
      }
    }
    window.renderFinancesView = renderFinancesView;

    function loadCompanyFormInputs() {
      const c = state.company;
      document.getElementById('comp-name').value = c.name;
      document.getElementById('comp-nit').value = c.nit;
      const rntIn = document.getElementById('comp-rnt');
      if (rntIn) rntIn.value = c.rnt || '';
      document.getElementById('comp-slogan').value = c.slogan;
      document.getElementById('comp-phone').value = c.phone;
      document.getElementById('comp-email').value = c.email;
      document.getElementById('comp-address').value = c.address;
      document.getElementById('comp-bank').value = c.bankDetails;
      document.getElementById('comp-terms').value = c.terms;
      const compOpInput = document.getElementById('comp-operator-name'); if (compOpInput) compOpInput.value = getOperatorName();
      const sidebarComp = document.getElementById('sidebar-company-name');
      if (sidebarComp) sidebarComp.textContent = c.name || 'Aura Eventos';
      const secAutoLock = document.getElementById('sec-auto-lock-mins');
      if (secAutoLock) {
        secAutoLock.value = state.auth?.sessionTimeoutMins ?? 15;
      }
    }

// El navegador a veces rellena el buscador del historial con el usuario guardado;
// al cargar la app se limpia si nadie lo escribió.
window.addEventListener('load', () => {
  [800, 2500].forEach(ms => setTimeout(() => {
    const s = document.getElementById('quote-search-input');
    if (s && s.value && document.activeElement !== s) { s.value = ''; if (typeof renderSavedQuotes === 'function') renderSavedQuotes(); }
  }, ms));
});
