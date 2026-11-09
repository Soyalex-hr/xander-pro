// Pruebas rápidas de Xander Pro (antes de publicar).
//
// Uso:
//   1. Servir la carpeta del proyecto, por ejemplo:  python -m http.server 8765
//   2. node tests/smoke.mjs http://localhost:8765
// Requiere Node 18+ y Playwright (npm i -D playwright && npx playwright install chromium).
// Entra en modo local (admin / Admin2026*) con los datos de demostración y revisa los
// flujos principales en computador y en celular. Termina con código 1 si algo falla.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8765').replace(/\/$/, '');
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✔ ' : '✘ ') + msg); if (!cond) failed++; };

async function session(device) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(device === 'mobile' ? { ...devices['iPhone 15 Pro Max'] } : { viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  await page.reload(); await page.waitForTimeout(1500);
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'Admin2026*');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  return { browser, page, errors };
}

// ---------------- Computador ----------------
{
  const { browser, page, errors } = await session('desktop');
  ok(await page.evaluate(() => typeof state === 'object' && Array.isArray(state.savedQuotes)), 'la app carga y entra en modo local');

  // Inicio: seguimiento y número real de cotizaciones
  await page.evaluate(() => { switchView('dashboard'); renderXpHome(); renderSavedQuotes(); });
  ok(await page.evaluate(() => /Seguimiento y pendientes/.test(document.getElementById('xp-home').innerText)), 'Inicio muestra "Seguimiento y pendientes"');
  ok(await page.evaluate(() => String(state.savedQuotes.length) === document.getElementById('badge-quotes-count-sidebar').textContent), 'la insignia de Cotizaciones muestra el número real');

  // Seguimiento: enviada hace 5 días aparece con WhatsApp
  const fu = await page.evaluate(() => {
    const q = state.savedQuotes[0]; q.status = 'Enviada'; const d = new Date(); d.setDate(d.getDate() - 5); q.sentAt = d.toISOString().slice(0, 10); q.nextFollowUp = undefined;
    const items = xpFollowUpItems(xpAllQuotes());
    return items.some(i => /sin respuesta/.test(i.title) && i.actions.some(a => a.label === 'WhatsApp'));
  });
  ok(fu, 'una cotización enviada hace 5 días aparece en seguimiento con WhatsApp');
  const kept = await page.evaluate(() => { const q = state.savedQuotes[0]; q.followUps = [{ date: '2026-01-01' }]; const next = { id: q.id }; xpKeepTrackingFields(q, next); return next.followUps && next.followUps.length === 1; });
  ok(kept, 'volver a guardar conserva los datos de seguimiento');

  // Anticipo: regla única
  ok(await page.evaluate(() => { const a = xpDepositCalc(1000000, true, 0), b = xpDepositCalc(1000000, false, 50), c = xpDepositCalc(1000000, true, 30); return !a.requiresDeposit && a.deposit === 0 && !b.requiresDeposit && c.deposit === 300000; }), 'anticipo: 0 % o "No" = sin anticipo; 30 % calcula bien');

  // Cabañas: 0 % de anticipo y temporada
  await page.evaluate(() => { switchView('cotizador-cabanas'); openCabinQuoteFromHistory(state.cabinQuotes[0].id, 'edit'); });
  await page.waitForTimeout(400);
  const cab = await page.evaluate(() => {
    document.getElementById('hos-deposit-pct-input').value = '0'; recalculateCabinQuoteLive();
    const p0 = state.activeCabinQuote.pricing;
    const inD = state.activeCabinQuote.checkInDate;
    state.seasons = [{ id: 't1', name: 'Prueba', from: inD.slice(5), to: inD.slice(5), pct: 10, active: true, appliesTo: { cabana: true, diasol: true } }];
    recalculateCabinQuoteLive();
    const p1 = state.activeCabinQuote.pricing;
    state.seasons = []; document.getElementById('hos-deposit-pct-input').value = '50'; recalculateCabinQuoteLive();
    return { noDep: p0.requiresDeposit === false && p0.deposit === 0, season: p1.seasonAdjust > 0 && p1.total > p0.total };
  });
  ok(cab.noDep, 'cabañas: 0 % de anticipo queda sin anticipo');
  ok(cab.season, 'cabañas: la temporada sube el precio y aparece como línea aparte');

  // Día de sol: personas visibles y anticipo
  await page.evaluate(() => { switchView('dia-sol'); startNewDayPassQuote(); document.getElementById('ds-adults').value = '12'; recalcDayPass(); });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.getElementById('ds-adults').getBoundingClientRect().width >= 50), 'día de sol: la casilla de personas es lo bastante ancha para ver el número');
  ok(await page.evaluate(() => { document.getElementById('ds-deposit-pct').value = '0'; recalcDayPass(); const r = state.activeDayPass.pricing.requiresDeposit === false; document.getElementById('ds-deposit-pct').value = '50'; recalcDayPass(); return r; }), 'día de sol: 0 % de anticipo queda sin anticipo');

  // Producto: botones visibles sin desplazarse
  await page.evaluate(() => switchView('productos'));
  await page.click('#btn-open-simple-product-modal'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const f = document.querySelector('#modal-simple-product .xp-pm-foot').getBoundingClientRect(); return f.bottom <= innerHeight; }), 'nuevo producto: Guardar y Cancelar se ven sin desplazarse (1366×768)');
  await page.evaluate(() => document.getElementById('modal-simple-product').classList.add('hidden'));

  // Evento desde Inicio (antes fallaba)
  ok(await page.evaluate(() => { try { xpOpenQuote('evento', state.savedQuotes[0].id); return document.getElementById('view-cotizador') && !document.getElementById('view-cotizador').classList.contains('hidden'); } catch { return false; } }), 'abrir una cotización de evento desde Inicio funciona');

  // Paquete combinado
  const combo = await page.evaluate(() => {
    xpOpenCombo();
    const cl = state.clients.find(c => (state.cabinQuotes || []).some(q => q.clientId === c.id));
    const sel = document.getElementById('xp-combo-client'); sel.value = cl.id; sel.dispatchEvent(new Event('change'));
    document.getElementById('xp-combo-title').value = 'Prueba';
    const n = document.querySelectorAll('#xp-combo-quotes input').length;
    document.getElementById('xp-combo-create').click();
    const c = state.comboQuotes[0];
    const total = document.getElementById('pdf-combo-sheet')?.innerText.includes('TOTAL GENERAL');
    xpCloseCombo();
    return n >= 2 && c && c.parts.length >= 2 && total;
  });
  ok(await page.evaluate(() => ['evento', 'cabana', 'diasol'].every(k => document.querySelector(`[data-xp-combo-btn="${k}"]`))), 'el botón Cotización completa está en eventos, cabañas y día de sol');
  ok(combo, 'cotización completa: se crea con 2 o más cotizaciones y muestra el total');

  ok(errors.length === 0, 'sin errores de JavaScript (computador)' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
}

// ---------------- Celular ----------------
{
  const { browser, page, errors } = await session('mobile');
  ok(await page.evaluate(() => document.querySelectorAll('nav .bottom-nav-btn').length + 1 === 5), 'celular: la barra de abajo tiene 5 botones');
  await page.evaluate(() => xpOpenQuickQuote()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelectorAll('#xp-quick-quote button[data-k]').length === 5), 'celular: "Cotizar" abre el menú con los tipos de cotización');
  await page.evaluate(() => document.getElementById('xp-quick-quote').classList.add('hidden'));
  await page.evaluate(() => switchView('productos'));
  await page.click('#btn-open-recipe-modal'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const h = document.querySelector('#modal-recipe-product .xp-pm-head').getBoundingClientRect(); const f = document.querySelector('#modal-recipe-product .xp-pm-foot').getBoundingClientRect(); return h.top >= 0 && f.bottom <= innerHeight + 1; }), 'celular: nueva receta muestra título y botones sin cortarse');
  ok(errors.length === 0, 'sin errores de JavaScript (celular)' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
}

console.log(failed ? `\n${failed} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(failed ? 1 : 0);
