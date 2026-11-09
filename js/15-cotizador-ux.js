/* Xander Pro — 15-cotizador-ux: resumen lateral del cotizador de cabañas y
 * botones − / + para las cantidades de personas (estilo A).
 * Solo lee el cálculo existente (state.activeCabinQuote.pricing); no lo cambia.
 */
(function () {
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  function renderCabinAside() {
    const q = state.activeCabinQuote;
    const box = document.getElementById('xp-hos-sum-lines');
    if (!q || !box) return;
    const p = q.pricing || {};
    const cabin = (state.cabins || []).find(c => c.id === q.cabinId) || {};
    set('xp-hos-sum-cabin', cabin.name || 'Selecciona una cabaña');
    const stay = q.checkInDate && q.checkOutDate && typeof pdfStayDate === 'function'
      ? `${pdfStayDate(q.checkInDate)} → ${pdfStayDate(q.checkOutDate)}`
      : '—';
    set('xp-hos-sum-stay', `${stay} · ${p.nights || 0} noche(s) · ${p.totalGuests || 0} huésped(es)`);

    // Ocupación respecto a la capacidad máxima
    const max = Number(cabin.maxCapacity) || 0;
    const tiers = typeof getChildPolicyTiers === 'function' ? getChildPolicyTiers() : { infant: {} };
    const occ = (Number(q.adults) || 0) + (Number(q.kids5to10) || 0) + (tiers.infant?.countsTowardsMaxCapacity ? (Number(q.kids0to4) || 0) : 0);
    const over = max && occ > max;
    set('xp-hos-sum-occ-text', max ? `Ocupación: ${occ} de ${max} cupos${over ? ` · ${occ - max} sobre el máximo` : ''}` : 'Ocupación');
    const fill = document.getElementById('xp-hos-sum-occ-fill');
    const rest = document.getElementById('xp-hos-sum-occ-rest');
    if (fill && rest) {
      fill.style.flex = String(Math.min(occ, max || occ));
      fill.style.background = over ? '#D97706' : '#0FA3A3';
      rest.style.background = 'var(--xp-border)'; rest.style.flex = String(Math.max(0, (max || 0) - occ));
    }

    // Foto principal
    const ph = document.getElementById('xp-hos-sum-photo');
    const main = (cabin.photos || []).find(x => x.isMain) || (cabin.photos || [])[0];
    if (ph) {
      const url = main && main.url ? main.url : '';
      if (ph.dataset.url !== url) {
        ph.dataset.url = url;
        ph.style.backgroundImage = url ? `url("${url.replace(/"/g, '%22')}")` : '';
        ph.classList.toggle('has-img', !!url);
      }
    }

    const lines = [];
    const add = (label, detail, value, cls) => { if (value) lines.push(`<div class="xp-sum-line ${cls || ''}"><span><span>${esc(label)}</span><small>${esc(detail)}</small></span><strong>${value < 0 ? '- ' + money(-value) : money(value)}</strong></div>`); };
    add(p.rateMode === 'per_person' ? 'Hospedaje por persona' : 'Cabaña completa (privada)', p.rateMode === 'per_person' ? `${p.payingAdults || 0} pers. × ${money(p.perPersonRate)} × ${p.nights || 0}` : `${money(p.nightlyRate)} × ${p.nights || 0} noche(s)`, p.subtotalBase);
    if (p.seasonAdjust) add(p.seasonLabel || 'Temporada', `${p.seasonNights || 0} de ${p.nights || 0} noche(s)`, p.seasonAdjust);
    add('Personas adicionales', `${p.extraPaxCount || 0} × ${money(p.extraPersonRate)} × ${p.nights || 0}`, p.subtotalExtraPax);
    add(p.childLabel || 'Niños', `${p.kids5to10 || 0} × ${money(p.childRate5to10)} × ${p.nights || 0}`, p.subtotalKids);
    add(p.infantLabel || 'Bebés', `${p.kids0to4 || 0} × ${money(p.infantRate)} × ${p.nights || 0}`, p.subtotalInfants);
    add('Mascotas', `${p.pets || 0} mascota(s)`, p.subtotalPets);
    add(p.mealPlanName || 'Alimentación', `${p.mealPax || 0} × ${money(p.mealRate)} × ${p.nights || 0}`, p.subtotalMeals);
    add('Servicios y experiencias', `${(p.selectedTours || []).length} servicio(s)`, p.subtotalTours);
    if (p.discount) add('Descuento', '', -Math.abs(p.discount), 'xp-sum-disc');
    box.innerHTML = lines.join('') || '<div class="xp-muted" style="padding:6px 0">Completa los datos para ver el valor.</div>';

    set('xp-hos-sum-total', money(p.total));
    set('xp-hos-sum-dep-label', p.requiresDeposit === false ? 'Sin anticipo' : `Anticipo ${p.depositPct || 0} %`);
    set('xp-hos-sum-dep', p.requiresDeposit === false ? '—' : money(p.deposit));
    set('xp-hos-sum-bal', money(p.requiresDeposit === false ? p.total : p.balance));
  }
  window.renderCabinAside = renderCabinAside;

  const prevRecalc = window.recalculateCabinQuoteLive;
  if (typeof prevRecalc === 'function') {
    window.recalculateCabinQuoteLive = function (...args) {
      const r = prevRecalc.apply(this, args);
      try { renderCabinAside(); } catch (e) { console.warn('Resumen lateral:', e); }
      return r;
    };
  }

  // Botones − / + junto a los campos de cantidad de personas
  function addSteppers(ids) {
    ids.forEach(id => {
      const input = document.getElementById(id);
      if (!input || input.dataset.stepper) return;
      input.dataset.stepper = '1';
      const wrap = input.parentElement;
      const box = document.createElement('div');
      box.className = 'xp-stepper';
      const mk = (delta, label, path) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'xp-step-btn';
        b.setAttribute('aria-label', label);
        b.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="${path}"/></svg>`;
        b.addEventListener('click', () => {
          const min = input.min !== '' ? Number(input.min) : 0;
          input.value = Math.max(min, (Number(input.value) || 0) + delta);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        return b;
      };
      const label = (document.querySelector(`label[for="${id}"]`)?.textContent || '').replace(/\*/g, '').trim();
      wrap.parentNode.insertBefore(box, wrap);
      box.appendChild(mk(-1, `Quitar ${label}`, 'M5 12h14'));
      box.appendChild(wrap);
      box.appendChild(mk(1, `Agregar ${label}`, 'M12 5v14M5 12h14'));
    });
  }
  function initSteppers() {
    addSteppers(['hos-adults-input', 'hos-kids-5to10-input', 'hos-kids-0to4-input', 'hos-pets-input']);
    ['ds-adults', 'ds-children', 'ds-infants'].forEach(id => {
      const input = document.getElementById(id);
      if (input && !input.dataset.stepper) {
        // En Día de Sol el campo no tiene contenedor propio: se crea uno
        const w = document.createElement('div');
        w.className = 'relative';
        input.parentNode.insertBefore(w, input);
        w.appendChild(input);
      }
    });
    addSteppers(['ds-adults', 'ds-children', 'ds-infants']);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSteppers); else initSteppers();
})();
