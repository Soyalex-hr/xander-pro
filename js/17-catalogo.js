/* Xander Pro — 17-catalogo: ayudas del catálogo de Productos & Insumos.
 * - Formulario de insumo: presentación de compra (calcula el costo por unidad), stock mínimo, margen en vivo.
 * - Margen en vivo en el formulario de recetas.
 * - Eliminar con aviso si el insumo se usa en recetas (con opción de desactivar).
 * - Duplicar, activar / desactivar.
 * - Exportar e importar el catálogo en CSV (Excel).
 * Todo es aditivo: campos nuevos opcionales (category, active, minStock, pack).
 */
(function () {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'));
  const num = v => (Number(v) || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  const minMargin = () => window.XP_MIN_MARGIN || 30;

  function refreshAll() {
    if (typeof saveState === 'function') saveState();
    ['renderProductsCatalog', 'populatePickerProducts', 'populateRecipeSimulator', 'renderQuoteEditorAndPdf'].forEach(fn => {
      try { if (typeof window[fn] === 'function') window[fn](); else if (typeof globalThis[fn] === 'function') globalThis[fn](); } catch (e) { console.warn(fn, e); }
    });
  }

  function marginText(cost, price) {
    if (!(price > 0)) return { txt: 'Margen: escribe el precio de venta', cls: '' };
    const m = ((price - cost) / price) * 100;
    const cls = m < 0 ? 'm-neg' : m < minMargin() ? 'm-low' : 'm-ok';
    const extra = m < 0 ? ' · vendes por debajo del costo' : m < minMargin() ? ` · por debajo del ${minMargin()} %` : '';
    return { txt: `Margen: ${m.toLocaleString('es-CO', { maximumFractionDigits: 1 })} % · ganas ${money(price - cost)} por unidad${extra}`, cls };
  }

  // ---------- Formulario de insumo / servicio ----------
  function refreshSimpleForm() {
    const unit = $('sp-unit')?.value || 'und';
    const lbl = $('sp-pack-unit-label'); if (lbl) lbl.textContent = unit;
    const track = $('sp-track-stock')?.value === 'true';
    const minBox = $('sp-min-stock-box'); if (minBox) minBox.style.display = track ? '' : 'none'; const stBox = $('sp-stock-box'); if (stBox) stBox.style.display = track ? '' : 'none';
    const size = Number($('sp-pack-size')?.value) || 0;
    const pprice = Number($('sp-pack-price')?.value) || 0;
    const hint = $('sp-pack-hint');
    const costEl = $('sp-cost');
    if (size > 0 && pprice > 0) {
      const unitCost = Math.round((pprice / size) * 100) / 100;
      if (costEl) { costEl.value = String(Math.round(unitCost)); costEl.readOnly = true; costEl.classList.add('xp-cat-ro'); }
      if (hint) hint.textContent = `Costo por ${unit}: ${money(unitCost)} (se calcula de la presentación).`;
    } else {
      if (costEl) { costEl.readOnly = false; costEl.classList.remove('xp-cat-ro'); }
      if (hint) hint.textContent = size > 0 || pprice > 0 ? 'Completa cuánto trae y el precio de compra para calcular el costo.' : '';
    }
    const mh = $('sp-margin-hint');
    if (mh) {
      const r = marginText(Number(costEl?.value) || 0, Number($('sp-price')?.value) || 0);
      mh.textContent = r.txt; mh.className = 'text-[11px] font-bold xp-cat-mhint ' + r.cls;
    }
  }
  window.xpRefreshSimpleForm = refreshSimpleForm;

  window.xpReadSimpleExtras = function () {
    const out = {
      category: ($('sp-category')?.value || '').trim(),
      active: $('sp-active') ? $('sp-active').checked : true
    };
    const minRaw = ($('sp-min-stock')?.value || '').trim();
    if (minRaw !== '' && !isNaN(Number(minRaw))) out.minStock = Math.max(0, Number(minRaw));
    const size = Number($('sp-pack-size')?.value) || 0;
    const pprice = Number($('sp-pack-price')?.value) || 0;
    const pname = ($('sp-pack-name')?.value || '').trim();
    if (size > 0) out.pack = { name: pname || 'Presentación', size, price: pprice > 0 ? pprice : 0 };
    return out;
  };

  // ---------- Margen en vivo de recetas ----------
  function refreshRecipeMargin() {
    const box = $('rec-margin-hint');
    if (!box) return;
    let ings = [];
    try { ings = typeof tempRecipeIngredients !== 'undefined' ? tempRecipeIngredients : []; } catch (e) { ings = []; }
    const fake = { type: 'compuesto', basePax: Math.max(1, Number($('rec-base-pax')?.value) || 1), ingredients: ings };
    const cost = typeof calculateRecipeUnitCost === 'function' ? calculateRecipeUnitCost(fake) : 0;
    if (!ings.length) { box.textContent = 'Agrega insumos para ver el costo y el margen.'; box.className = 'text-right text-[11px] font-bold text-slate-500'; return; }
    const r = marginText(cost, Number($('rec-price')?.value) || 0);
    box.textContent = r.txt.replace('por unidad', 'por persona');
    box.className = 'text-right text-[11px] font-bold xp-cat-mhint ' + r.cls;
  }
  window.xpRefreshRecipeMargin = refreshRecipeMargin;

  // ---------- Eliminar / desactivar / duplicar ----------
  function ensureDeleteModal() {
    let m = $('modal-xp-del-prod');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-xp-del-prod';
    m.className = 'hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'xp-del-prod-title');
    m.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 my-8">
        <h3 id="xp-del-prod-title" class="text-base font-bold text-slate-900 dark:text-white">Eliminar producto</h3>
        <div id="xp-del-prod-body" class="text-xs text-slate-600 dark:text-slate-300 space-y-2"></div>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" data-xp-del="cancel" class="min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-bold">Cancelar</button>
          <button type="button" data-xp-del="deactivate" class="min-h-[44px] px-4 rounded-xl xp-cat-btn-primary text-xs font-bold">Desactivar</button>
          <button type="button" data-xp-del="delete" class="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">Eliminar definitivamente</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if (e.target === m) { m.classList.add('hidden'); return; }
      const b = e.target.closest('[data-xp-del]');
      if (!b) return;
      const act = b.getAttribute('data-xp-del');
      const id = m.dataset.prodId;
      m.classList.add('hidden');
      if (act === 'deactivate') setActive(id, false);
      if (act === 'delete') doDelete(id);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.classList.contains('hidden')) m.classList.add('hidden'); });
    return m;
  }

  function doDelete(id) {
    const prod = (state.products || []).find(p => p.id === id);
    if (!prod) return;
    const users = window.xpRecipesUsing ? window.xpRecipesUsing(id) : [];
    // Quita el insumo de las recetas que lo usaban para que su costo no quede con un ingrediente fantasma
    users.forEach(r => {
      r.ingredients = (r.ingredients || []).filter(i => i.productId !== id);
      if (typeof calculateRecipeUnitCost === 'function') r.cost = Math.round(calculateRecipeUnitCost(r));
    });
    state.products = state.products.filter(p => p.id !== id);
    refreshAll();
    showToast(`🗑️ "${prod.name}" eliminado${users.length ? ` y quitado de ${users.length} receta(s)` : ''}`);
  }

  function setActive(id, on) {
    const prod = (state.products || []).find(p => p.id === id);
    if (!prod) return;
    prod.active = !!on;
    refreshAll();
    showToast(on ? `▶️ "${prod.name}" activo de nuevo` : `⏸️ "${prod.name}" desactivado: ya no aparece al cotizar`);
  }

  window.xpRequestDeleteProduct = function (id) {
    const prod = (state.products || []).find(p => p.id === id);
    if (!prod) return;
    const users = window.xpRecipesUsing ? window.xpRecipesUsing(id) : [];
    const m = ensureDeleteModal();
    m.dataset.prodId = id;
    const body = $('xp-del-prod-body');
    const deact = m.querySelector('[data-xp-del="deactivate"]');
    if (users.length) {
      body.innerHTML = `
        <p><strong class="text-slate-900 dark:text-white">${esc(prod.name)}</strong> se usa en ${users.length} receta(s):</p>
        <ul class="list-disc pl-5 font-semibold">${users.slice(0, 6).map(r => `<li>${esc(r.name)}</li>`).join('')}${users.length > 6 ? `<li>y ${users.length - 6} más</li>` : ''}</ul>
        <p class="rounded-lg bg-amber-50 text-amber-900 px-3 py-2 dark:bg-amber-950/40 dark:text-amber-200">Si lo eliminas, se quita de esas recetas y su costo por persona baja. Te recomendamos <strong>desactivarlo</strong>: las recetas siguen igual y deja de aparecer al cotizar.</p>`;
    } else {
      body.innerHTML = `<p>¿Eliminar <strong class="text-slate-900 dark:text-white">${esc(prod.name)}</strong> del catálogo? No se puede deshacer.</p>
        <p class="text-slate-500">Las cotizaciones ya guardadas no cambian. Si solo quieres ocultarlo, desactívalo.</p>`;
    }
    if (deact) deact.style.display = prod.active === false ? 'none' : '';
    m.classList.remove('hidden');
    m.querySelector('[data-xp-del="cancel"]')?.focus();
  };

  window.xpToggleProductActive = function (id) {
    const prod = (state.products || []).find(p => p.id === id);
    if (prod) setActive(id, prod.active === false);
  };

  window.xpDuplicateProduct = function (id) {
    const prod = (state.products || []).find(p => p.id === id);
    if (!prod) return;
    const copy = JSON.parse(JSON.stringify(prod));
    copy.id = (prod.type === 'compuesto' ? 'rec-' : 'p-') + Date.now();
    copy.name = `${prod.name} (copia)`;
    copy.active = true;
    const idx = state.products.indexOf(prod);
    state.products.splice(idx + 1, 0, copy);
    refreshAll();
    showToast(`📋 Copia creada: cámbiale el nombre y los valores`);
    if (typeof window.openEditProductModal === 'function') window.openEditProductModal(copy.id);
  };

  // ---------- Exportar / importar CSV ----------
  const COLS = ['id', 'tipo', 'nombre', 'categoria', 'unidad', 'maneja_inventario', 'stock', 'stock_minimo', 'costo', 'precio_venta', 'margen_%', 'presentacion', 'cantidad_presentacion', 'precio_presentacion', 'activo', 'descripcion'];
  const csvCell = v => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const dec = v => (v === '' || v === null || v === undefined ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));

  function exportCsv() {
    const rows = [COLS.join(';')];
    (state.products || []).forEach(p => {
      const cost = typeof xpProductCost === 'function' ? xpProductCost(p) : Number(p.cost) || 0;
      const m = typeof xpProductMargin === 'function' ? xpProductMargin(p) : null;
      rows.push([
        p.id, p.type === 'compuesto' ? 'receta' : (window.xpIsService && xpIsService(p) ? 'servicio' : 'insumo'),
        p.name, window.xpCatOf ? xpCatOf(p) : (p.category || ''), p.unit,
        p.type === 'compuesto' ? '' : (p.trackStock ? 'si' : 'no'),
        p.type === 'compuesto' ? '' : dec(p.stock), p.minStock !== undefined ? dec(p.minStock) : '',
        Math.round(cost), Math.round(Number(p.price) || 0), m === null ? '' : dec(m),
        p.pack ? p.pack.name : '', p.pack ? dec(p.pack.size) : '', p.pack ? Math.round(p.pack.price || 0) : '',
        p.active === false ? 'no' : 'si', p.desc || ''
      ].map(csvCell).join(';'));
    });
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `catalogo-productos-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast(`📥 Catálogo exportado (${state.products.length} productos)`);
  }

  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = []; let cell = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }

  // "1.250.000" → 1250000 · "0,75" → 0.75 · "$ 38.000" → 38000 · "12.5" → 12.5
  function parseNum(v) {
    let s = String(v ?? '').replace(/[$\s%]/g, '');
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  const yes = v => /^(si|sí|s|yes|true|1|x)$/i.test(String(v || '').trim());
  const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const UNITS = ['und', 'srv', 'hr', 'L', 'ml', 'oz', 'kg', 'g'];

  function importCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) { showToast('❌ El archivo no tiene filas para importar'); return; }
    const head = rows[0].map(norm);
    const col = name => head.indexOf(norm(name));
    const get = (r, name) => { const i = col(name); return i >= 0 ? String(r[i] ?? '').trim() : ''; };
    if (col('nombre') < 0) { showToast('❌ Falta la columna "nombre". Usa el archivo de Exportar como plantilla.'); return; }

    const plan = { create: [], update: [] , skipped: 0 };
    rows.slice(1).forEach(r => {
      const name = get(r, 'nombre');
      if (!name) { plan.skipped++; return; }
      const id = get(r, 'id');
      const existing = (state.products || []).find(p => (id && p.id === id)) || (state.products || []).find(p => norm(p.name) === norm(name));
      plan[existing ? 'update' : 'create'].push({ r, existing, name });
    });
    const recipesNew = plan.create.filter(x => /receta/i.test(get(x.r, 'tipo'))).length;
    const msg = `Se van a importar ${plan.create.length + plan.update.length} producto(s):\n\n• ${plan.update.length} existentes se actualizan (nombre, categoría, precios, inventario…)\n• ${plan.create.length - recipesNew} nuevos se crean como insumos o servicios` +
      (recipesNew ? `\n• ${recipesNew} receta(s) nuevas se omiten (las recetas se crean en la app con sus insumos)` : '') +
      (plan.skipped ? `\n• ${plan.skipped} fila(s) sin nombre se omiten` : '') +
      '\n\nLos ingredientes de las recetas no cambian. ¿Continuar?';
    if (!confirm(msg)) return;

    const apply = (p, r, isRecipe) => {
      const set = (key, val) => { if (val !== null && val !== undefined && val !== '') p[key] = val; };
      set('name', get(r, 'nombre'));
      const cat = get(r, 'categoria'); if (cat && cat !== 'Sin categoría') p.category = cat;
      const price = parseNum(get(r, 'precio_venta')); if (price !== null) p.price = Math.max(0, price);
      const desc = get(r, 'descripcion'); if (col('descripcion') >= 0) p.desc = desc;
      if (col('activo') >= 0 && get(r, 'activo') !== '') p.active = yes(get(r, 'activo'));
      if (isRecipe) return;
      const unit = get(r, 'unidad'); if (UNITS.includes(unit)) p.unit = unit;
      if (col('maneja_inventario') >= 0 && get(r, 'maneja_inventario') !== '') p.trackStock = yes(get(r, 'maneja_inventario'));
      const stock = parseNum(get(r, 'stock')); if (stock !== null) p.stock = stock;
      if (col('stock_minimo') >= 0) { const mn = parseNum(get(r, 'stock_minimo')); if (mn === null) delete p.minStock; else p.minStock = Math.max(0, mn); }
      const psize = parseNum(get(r, 'cantidad_presentacion'));
      const pprice = parseNum(get(r, 'precio_presentacion'));
      if (psize && psize > 0) {
        p.pack = { name: get(r, 'presentacion') || 'Presentación', size: psize, price: pprice && pprice > 0 ? pprice : 0 };
        if (p.pack.price > 0) p.cost = Math.round(p.pack.price / psize);
      } else if (col('cantidad_presentacion') >= 0) delete p.pack;
      const cost = parseNum(get(r, 'costo'));
      if (cost !== null && !(p.pack && p.pack.price > 0)) p.cost = Math.max(0, cost);
    };

    let created = 0, updated = 0;
    plan.update.forEach(({ r, existing }) => { apply(existing, r, existing.type === 'compuesto'); updated++; });
    plan.create.forEach(({ r }, i) => {
      if (/receta/i.test(get(r, 'tipo'))) return;
      const p = { id: 'p-' + (Date.now() + i), name: '', type: 'simple', unit: 'und', trackStock: false, stock: 0, cost: 0, price: 0, desc: '' };
      apply(p, r, false);
      state.products.push(p); created++;
    });
    state.products.filter(p => p.type === 'compuesto').forEach(r => { if (typeof calculateRecipeUnitCost === 'function') r.cost = Math.round(calculateRecipeUnitCost(r)); });
    refreshAll();
    showToast(`📤 Importación lista: ${updated} actualizado(s), ${created} nuevo(s)`);
  }

  // ---------- Conexiones ----------
  function init() {
    ['sp-unit', 'sp-track-stock', 'sp-pack-size', 'sp-pack-price', 'sp-cost', 'sp-price'].forEach(id => {
      $(id)?.addEventListener('input', refreshSimpleForm);
      $(id)?.addEventListener('change', refreshSimpleForm);
    });
    ['rec-price', 'rec-base-pax'].forEach(id => $(id)?.addEventListener('input', refreshRecipeMargin));
    const list = $('rec-ingredients-list');
    if (list && 'MutationObserver' in window) new MutationObserver(refreshRecipeMargin).observe(list, { childList: true, subtree: true });

    document.querySelectorAll('.xp-cat-sort').forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.sort;
      let cur = 'name:asc';
      try { cur = localStorage.getItem('xp_cat_sort') || cur; } catch (e) { /* */ }
      const [k, d] = cur.split(':');
      const defDesc = ['price', 'cost'].includes(key);
      const next = k === key ? (d === 'asc' ? 'desc' : 'asc') : (defDesc ? 'desc' : 'asc');
      window.xpSetCatSort(`${key}:${next}`);
    }));

    $('btn-cat-export')?.addEventListener('click', exportCsv);
    $('btn-cat-import')?.addEventListener('click', () => $('cat-import-file')?.click());
    $('cat-import-file')?.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { importCsv(String(rd.result || '')); } catch (err) { console.error(err); showToast('❌ No se pudo leer el archivo. Guárdalo como CSV desde Excel.'); } e.target.value = ''; };
      rd.readAsText(f, 'utf-8');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
