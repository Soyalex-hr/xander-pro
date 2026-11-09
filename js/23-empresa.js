/* Xander Pro — 23-empresa: pantalla Mi Empresa por pestañas
 *
 * Empresa · Pagos y condiciones · Correo · Usuarios · Seguridad · Copia de seguridad.
 * Los campos y botones conservan sus ids, así que guardar, subir logo, correo, usuarios
 * y respaldo siguen funcionando con su código de siempre. Aquí solo se agrega:
 * cambiar de pestaña (se recuerda), la vista previa del encabezado del PDF en vivo,
 * el logo en pantalla y el aviso de "cambios sin guardar".
 */
(function () {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABS = ['empresa', 'pagos', 'correo', 'usuarios', 'seguridad', 'respaldo'];
  const FIELDS = ['comp-name', 'comp-nit', 'comp-rnt', 'comp-slogan', 'comp-phone', 'comp-email', 'comp-address', 'comp-bank', 'comp-terms', 'comp-operator-name'];
  let current = 'empresa';
  try { const t = localStorage.getItem('xp_emp_tab'); if (TABS.includes(t)) current = t; } catch { /* */ }

  const val = id => ($(id)?.value || '').trim();
  const logoSrc = () => {
    const c = (typeof state !== 'undefined' && state.company) || {};
    const u = c.logoDataUrl || c.logoUrl || '';
    return u && typeof window.xpPdfImageUrl === 'function' ? window.xpPdfImageUrl(u) : u;
  };
  const initials = n => String(n || 'Mi Empresa').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  window.xpEmpresaTab = function (tab) {
    if (!TABS.includes(tab)) tab = 'empresa';
    current = tab;
    try { localStorage.setItem('xp_emp_tab', tab); } catch { /* */ }
    document.querySelectorAll('#view-empresa [data-emp-panel]').forEach(p => { p.hidden = p.dataset.empPanel !== tab; });
    document.querySelectorAll('#view-empresa [data-emp-tab]').forEach(b => {
      const on = b.dataset.empTab === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && b.scrollIntoView && window.innerWidth < 768) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    const bar = $('xp-emp-savebar');
    if (bar) bar.hidden = !(tab === 'empresa' || tab === 'pagos');
    render();
  };

  function render() {
    const name = val('comp-name') || 'Mi empresa';
    const logo = logoSrc();
    const headLogo = $('xp-emp-head-logo');
    if (headLogo) headLogo.innerHTML = logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(name));
    const hn = $('xp-emp-head-name'); if (hn) hn.textContent = name;
    const hs = $('xp-emp-head-sub');
    if (hs) {
      const st = window.XPCloud && window.XPCloud.status ? window.XPCloud.status() : null;
      hs.textContent = [val('comp-nit') ? 'NIT ' + val('comp-nit') : '', st && st.text ? st.text : ''].filter(Boolean).join(' · ') || 'Datos, marca y configuración de la app';
    }
    const lp = $('xp-emp-logo-prev');
    if (lp) lp.innerHTML = logo ? `<img src="${esc(logo)}" alt="Logo actual">` : '<span>Sin logo</span>';
    const pv = $('xp-emp-preview');
    if (pv) {
      const ids = [val('comp-nit') ? 'NIT ' + val('comp-nit') : '', val('comp-rnt') ? 'RNT ' + val('comp-rnt') : ''].filter(Boolean).join(' · ');
      const contact = [val('comp-phone'), val('comp-email')].filter(Boolean).join(' · ');
      pv.innerHTML = `
        <div class="xp-emp-pv-sheet">
          <div class="xp-emp-pv-top">
            <div class="xp-emp-pv-brand">
              <div class="xp-emp-pv-logo">${logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(name))}</div>
              <div class="min-w-0">
                <div class="xp-emp-pv-name">${esc(name)}</div>
                ${val('comp-slogan') ? `<div class="xp-emp-pv-slogan">${esc(val('comp-slogan'))}</div>` : ''}
                ${ids ? `<div class="xp-emp-pv-line">${esc(ids)}</div>` : ''}
                ${contact ? `<div class="xp-emp-pv-line">${esc(contact)}</div>` : ''}
                ${val('comp-address') ? `<div class="xp-emp-pv-line">${esc(val('comp-address'))}</div>` : ''}
              </div>
            </div>
            <div class="xp-emp-pv-badge">COTIZACIÓN<br><b>COT-2026-0001</b></div>
          </div>
          <div class="xp-emp-pv-rows"><i></i><i></i><i style="width:60%"></i></div>
          ${val('comp-bank') ? `<div class="xp-emp-pv-pay"><b>Medios de pago</b><span>${esc(val('comp-bank'))}</span></div>` : ''}
        </div>`;
    }
  }

  function markDirty(on) {
    const bar = $('xp-emp-savebar');
    const d = $('xp-emp-dirty');
    if (bar) bar.classList.toggle('is-dirty', !!on);
    if (d) d.textContent = on ? 'Tienes cambios sin guardar.' : 'Los cambios se aplican a todas las cotizaciones y PDF.';
  }

  function wire() {
    const view = $('view-empresa');
    if (!view || view.dataset.xpEmpWired) return;
    view.dataset.xpEmpWired = '1';
    FIELDS.forEach(id => $(id)?.addEventListener('input', () => { render(); markDirty(true); }));
    $('btn-save-company')?.addEventListener('click', () => setTimeout(() => { markDirty(false); render(); }, 50));
    $('comp-logo-upload')?.addEventListener('change', () => setTimeout(render, 400));
    // Al abrir la pantalla se muestra la última pestaña usada y se dibuja la vista previa
    new MutationObserver(() => { if (!view.classList.contains('hidden')) setTimeout(() => { window.xpEmpresaTab(current); markDirty(false); }, 80); }).observe(view, { attributes: true, attributeFilter: ['class'] });
    window.xpEmpresaTab(current);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  setTimeout(() => { wire(); render(); }, 800);
})();
