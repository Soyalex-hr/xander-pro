/* Xander Pro — 12-borradores: no perder lo que se está escribiendo
 *
 * 1. Autoguardado: cualquier cambio en un formulario guarda el estado (con una
 *    pequeña espera) y se guarda de inmediato al cerrar o minimizar la app.
 *    Así el borrador de la cotización (eventos, cabañas, día de sol) sobrevive
 *    a cerrar la app.
 * 2. Al abrir la app vuelve a la última pantalla usada en este dispositivo.
 * 3. El formulario de cabaña (crear / editar) guarda un borrador en este
 *    dispositivo hasta que se guarde la cabaña o se cancele.
 */
(function () {
  const LS_VIEW = 'xp_last_view';
  const LS_CABIN_DRAFT = 'xp_cabin_form_draft';
  const DRAFT_MAX_AGE = 7 * 24 * 3600 * 1000;

  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin espacio o bloqueado */ } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch { /* */ } };

  // ---------------------------------------------------------------------------
  // 1. Autoguardado
  // ---------------------------------------------------------------------------
  let saveTimer = null;
  let typingIn = null; // campo que solo se registra al salir de él (onchange) y se está escribiendo
  function commitTyping() {
    const el = typingIn;
    typingIn = null;
    if (el && el.isConnected) el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function flush(force) {
    if (!saveTimer && !typingIn && !force) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    commitTyping();
    clearTimeout(saveTimer);
    saveTimer = null;
    try { saveState(); } catch (e) { console.warn('Autoguardado:', e); }
  }
  function schedule() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 900);
  }
  const isAppField = el => el && el.closest && el.closest('#dashboard-wrapper, #app-sidebar, [id^="modal-"]') && !el.closest('#auth-screen');
  document.addEventListener('input', e => {
    const el = e.target;
    if (!isAppField(el)) return;
    if (el.hasAttribute && el.hasAttribute('onchange') && !el.hasAttribute('oninput')) typingIn = el;
    schedule();
  });
  document.addEventListener('change', e => {
    if (e.target === typingIn) typingIn = null;
    if (isAppField(e.target)) schedule();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', () => flush());
  window.addEventListener('beforeunload', () => flush());
  window.xpFlushAutosave = flush;

  // ---------------------------------------------------------------------------
  // 2. Volver a la última pantalla
  // ---------------------------------------------------------------------------
  const RESTORABLE = ['dashboard', 'cotizador', 'historial', 'productos', 'simulador', 'clientes', 'finanzas', 'empresa', 'agenda', 'rentabilidad', 'cabanas', 'cotizador-cabanas', 'servicios', 'dia-sol'];
  // El arranque llama varias veces a switchView('dashboard'); durante esos primeros
  // instantes se redirige a la última pantalla usada en este dispositivo.
  let bootUntil = 0;
  let bootTarget = null;
  const prevSwitch = window.switchView;
  if (typeof prevSwitch === 'function') {
    window.switchView = function (viewName, ...rest) {
      if (!bootUntil) {
        bootUntil = Date.now() + 3000;
        const last = lsGet(LS_VIEW);
        if (last && last !== 'dashboard' && RESTORABLE.includes(last) && document.getElementById('view-' + last)) bootTarget = last;
        setTimeout(reopenCabinDraftOnBoot, 600);
      }
      if (viewName === 'dashboard' && bootTarget && Date.now() < bootUntil) viewName = bootTarget;
      if (RESTORABLE.includes(viewName)) lsSet(LS_VIEW, viewName);
      return prevSwitch.call(this, viewName, ...rest);
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Borrador del formulario de cabaña
  // ---------------------------------------------------------------------------
  function readCabinDraft() {
    try {
      const d = JSON.parse(lsGet(LS_CABIN_DRAFT) || 'null');
      if (!d || !d.values || Date.now() - (d.ts || 0) > DRAFT_MAX_AGE) return null;
      return d;
    } catch { return null; }
  }
  function captureCabinForm() {
    const modal = document.getElementById('modal-cabin-form');
    if (!modal || modal.classList.contains('hidden')) return;
    const values = {};
    modal.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
      if (el.type === 'file') return;
      values[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? !!el.checked : el.value;
    });
    const draft = { ts: Date.now(), cabinId: values['cabin-form-id'] || '', values };
    try {
      if (typeof currentEditingCabinPhotos !== 'undefined') {
        const ph = JSON.stringify(currentEditingCabinPhotos || []);
        if (ph.length < 1500000) draft.photos = JSON.parse(ph);
      }
    } catch { /* */ }
    lsSet(LS_CABIN_DRAFT, JSON.stringify(draft));
  }
  let cabinTimer = null;
  ['input', 'change'].forEach(type => document.addEventListener(type, e => {
    if (e.target && e.target.closest && e.target.closest('#modal-cabin-form')) {
      clearTimeout(cabinTimer);
      cabinTimer = setTimeout(captureCabinForm, 400);
    }
  }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') captureCabinForm(); });
  window.addEventListener('pagehide', captureCabinForm);

  function discardCabinFormDraft() { clearTimeout(cabinTimer); lsDel(LS_CABIN_DRAFT); }
  window.discardCabinFormDraft = discardCabinFormDraft;

  function applyCabinDraft(d) {
    Object.entries(d.values).forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (!el || el.type === 'file') return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v; else el.value = v;
    });
    if (Array.isArray(d.photos) && typeof currentEditingCabinPhotos !== 'undefined') {
      currentEditingCabinPhotos = d.photos;
      if (typeof renderCabinPhotosPreview === 'function') renderCabinPhotosPreview();
    }
    if (typeof toggleCabinFormPetFields === 'function') toggleCabinFormPetFields();
    if (typeof updateCabinPricingModeUI === 'function') updateCabinPricingModeUI();
  }

  const prevOpenCabin = window.openCabinModal;
  if (typeof prevOpenCabin === 'function') {
    window.openCabinModal = function (cabinId = null, opts) {
      const r = prevOpenCabin.call(this, cabinId);
      const d = readCabinDraft();
      const modal = document.getElementById('modal-cabin-form');
      if (d && modal && !modal.classList.contains('hidden') && d.cabinId === (cabinId || '') && !(opts && opts.ignoreDraft)) {
        applyCabinDraft(d);
        showToast('📝 Recuperamos los datos que no habías guardado de esta cabaña');
      }
      return r;
    };
  }

  const prevSaveCabin = window.saveCabinFromForm;
  if (typeof prevSaveCabin === 'function') {
    window.saveCabinFromForm = function (...args) {
      const r = prevSaveCabin.apply(this, args);
      const modal = document.getElementById('modal-cabin-form');
      if (modal && modal.classList.contains('hidden')) {
        discardCabinFormDraft();
        // Si se está cotizando, recalcular con los datos nuevos de la cabaña
        if (!document.getElementById('view-cotizador-cabanas')?.classList.contains('hidden')) {
          if (typeof populateCabinQuotePickers === 'function') populateCabinQuotePickers();
          if (typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
        }
      }
      return r;
    };
  }

  function reopenCabinDraftOnBoot() {
    const d = readCabinDraft();
    if (!d) return;
    if (typeof hasPermission === 'function' && !hasPermission('manage_cabins')) return;
    if (d.cabinId && !(state.cabins || []).some(c => c.id === d.cabinId)) { discardCabinFormDraft(); return; }
    window.openCabinModal(d.cabinId || null);
  }

  // ---------------------------------------------------------------------------
  // Atajo desde el aviso de personas adicionales: pasar la cabaña a tarifa fija
  // ---------------------------------------------------------------------------
  window.openCabinFixedRateFromQuote = function () {
    const id = document.getElementById('hos-cabin-select')?.value || state.activeCabinQuote?.cabinId;
    if (!id) return;
    window.openCabinModal(id, { ignoreDraft: true });
    const sel = document.getElementById('cabin-form-pricing-mode');
    if (!sel || document.getElementById('modal-cabin-form')?.classList.contains('hidden')) return;
    sel.value = 'fixed';
    if (typeof updateCabinPricingModeUI === 'function') updateCabinPricingModeUI();
    sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    sel.classList.add('ring-2', 'ring-amber-400');
    setTimeout(() => sel.classList.remove('ring-2', 'ring-amber-400'), 3000);
    showToast('Modo cambiado a tarifa fija. Revisa y presiona Guardar Cabaña');
  };
})();
