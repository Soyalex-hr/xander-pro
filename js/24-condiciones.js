/* Xander Pro — 24-condiciones: paso 7 del cotizador de cabañas (pago, descuento, vigencia)
 * Botones "Con anticipo / Pago total al llegar", % rápidos, el valor del anticipo en pesos
 * y atajos de vigencia. Usan los mismos campos de siempre (select, % y fecha), así que el
 * cálculo y lo guardado no cambian.
 */
(function () {
  const $ = id => document.getElementById(id);
  const money = v => (typeof formatCurrency === 'function' ? formatCurrency(Math.round(Number(v) || 0)) : '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'));
  const fire = el => { el.dispatchEvent(new Event('change', { bubbles: true })); };

  window.xpCondDeposit = function (v) {
    const sel = $('hos-requires-deposit-select');
    if (!sel || sel.value === v) return sync();
    sel.value = v;
    fire(sel);
    sync();
  };
  window.xpCondPct = function (n) {
    const i = $('hos-deposit-pct-input');
    if (!i) return;
    i.value = n;
    fire(i);
    sync();
  };
  window.xpCondValid = function (days) {
    const i = $('hos-expiry-date-input');
    if (!i) return;
    const d = new Date(); d.setDate(d.getDate() + days);
    i.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fire(i);
  };

  function sync() {
    const sel = $('hos-requires-deposit-select');
    if (!sel) return;
    const v = sel.value === 'no' ? 'no' : 'yes';
    document.querySelectorAll('.xp-cond [data-dep]').forEach(b => {
      const on = b.dataset.dep === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    const pct = Number($('hos-deposit-pct-input')?.value) || 0;
    document.querySelectorAll('.xp-cond [data-pct]').forEach(b => b.classList.toggle('is-on', Number(b.dataset.pct) === pct));
    const p = (state.activeCabinQuote && state.activeCabinQuote.pricing) || {};
    const amt = $('xp-cond-dep-amount');
    if (amt) amt.textContent = p.requiresDeposit === false ? 'Sin anticipo' : money(p.deposit);
  }
  window.xpCondSync = sync;

  const prev = window.recalculateCabinQuoteLive;
  if (typeof prev === 'function') {
    window.recalculateCabinQuoteLive = function () { const r = prev.apply(this, arguments); try { sync(); } catch { /* */ } return r; };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
