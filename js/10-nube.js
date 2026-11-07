/* Xander Pro — 10-nube: conexión con el servidor (Vercel + Neon)
 *
 * - Inicio de sesión contra /api (usuarios por empresa, contraseña cifrada en el servidor).
 * - Sincronización de los datos de la empresa entre dispositivos:
 *     · cada registro (cliente, cabaña, cotización…) se sube cuando cambia,
 *     · los cambios de otros usuarios se bajan cada pocos segundos,
 *     · sin conexión la app sigue funcionando con la copia local y sube los cambios al volver.
 * - Configuración inicial (primera empresa y administrador) y gestión de usuarios/empresas.
 *
 * Si el servidor no existe (por ejemplo, abriendo la app desde el disco), la app
 * funciona como antes, solo con datos locales.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuración de qué se sincroniza
  // ---------------------------------------------------------------------------
  const ARRAY_COLLECTIONS = [
    'eventTypes', 'clients', 'products', 'savedQuotes', 'finances',
    'cabins', 'childPolicies', 'mealPlans', 'tourServices', 'cabinQuotes',
    'eventClosures', 'notifications', 'dayPassExtras', 'dayPassQuotes'
  ];
  const SETTINGS_COLLECTION = '_settings';
  const SETTINGS_KEYS = ['company', 'shoppingLists', 'priceHistory', 'dayPassConfig'];
  // Lo que NO se sincroniza: auth (preferencias del dispositivo), users (los gestiona el servidor),
  // activeQuote / activeCabinQuote (borradores abiertos en cada dispositivo).

  const LS_CLOUD = 'xp_cloud_session';
  const PUSH_DEBOUNCE_MS = 1200;
  const POLL_MS = 25000;
  const MAX_BATCH_BYTES = 2.5 * 1024 * 1024;
  const MAX_BATCH_ITEMS = 400;

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const lsGet = (k, fallback = null) => { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch {} };

  // Hash rápido (cyrb53) para detectar qué registros cambiaron
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { try { showToast(msg); } catch {} };

  class NetworkError extends Error {}

  async function api(method, path, body, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
        cache: 'no-store'
      });
    } catch (e) {
      throw new NetworkError('Sin conexión con el servidor');
    } finally {
      clearTimeout(t);
    }
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
      // No hay API (archivo local o servidor sin /api)
      const err = new NetworkError('El servidor no tiene la API disponible');
      err.noApi = res.status === 404 || res.status === 405 || type.includes('text/html');
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // ---------------------------------------------------------------------------
  // Sesión en la nube (guardada en este dispositivo)
  // ---------------------------------------------------------------------------
  const cloud = {
    get() { return lsGet(LS_CLOUD); },
    active() { return !!(this.get() && this.get().user); },
    set(user, company, remember) { lsSet(LS_CLOUD, { user, company, remember: !!remember, at: Date.now() }); },
    clear() { lsDel(LS_CLOUD); },
    companyId() { return this.get()?.company?.id || null; },
    canWrite() { return this.get()?.user?.role !== 'Consulta'; }
  };
  // ---------------------------------------------------------------------------
  // Copia local: localStorage (rápido, ~5 MB) + IndexedDB (cientos de MB).
  // Si localStorage se llena, la copia completa queda en IndexedDB y se usa al abrir.
  // ---------------------------------------------------------------------------
  const LS_STATE = 'xander_pro_state_v1';
  const IDB_KEY = 'main_state_json';
  const LS_IN_IDB = 'xp_state_in_idb';
  let persistApplying = false;

  function persistLocal() {
    state.__savedAt = Date.now();
    let json;
    try { json = JSON.stringify(state); } catch (e) { console.error('[nube] no se pudo serializar el estado', e); return; }
    let okLS = true;
    try { localStorage.setItem(LS_STATE, json); } catch { okLS = false; }
    if (okLS) { try { localStorage.removeItem(LS_IN_IDB); } catch {} }
    else {
      // localStorage lleno: se libera para no dejar una copia vieja que confunda al abrir
      try { localStorage.removeItem(LS_STATE); localStorage.setItem(LS_IN_IDB, '1'); } catch {}
    }
    try { if (typeof XanderDB !== 'undefined') XanderDB.set(IDB_KEY, json).catch(() => {}); } catch {}
  }

  // Al abrir: si IndexedDB tiene una copia más reciente que localStorage, se usa esa
  async function restoreFromIDB() {
    try {
      if (typeof XanderDB === 'undefined') return false;
      const json = await XanderDB.get(IDB_KEY);
      if (!json || typeof json !== 'string') return false;
      const idb = JSON.parse(json);
      if (!idb || !idb.company || !idb.products) return false;
      const forced = localStorage.getItem(LS_IN_IDB) === '1';
      if (!forced && (idb.__savedAt || 0) <= (state.__savedAt || 0)) return false;
      state = idb;
      try { if (typeof migrateCabanasState === 'function') migrateCabanasState(); } catch {}
      if (!state.auth) state.auth = getDefaultState().auth;
      return true;
    } catch (e) {
      console.warn('[nube] no se pudo leer IndexedDB', e);
      return false;
    }
  }

  let ready = false;
  const restorePromise = restoreFromIDB().then(changed => {
    ready = true;
    if (changed) { try { if (typeof migrateState === 'function') migrateState(); } catch {} }
    if (changed || pendingSaveBeforeReady) persistLocal();
    if (changed) { try { refreshUI(); if (typeof switchView === 'function') { const v = currentView(); if (v) switchView(v); } } catch {} }
    return changed;
  });

  // ---------------------------------------------------------------------------
  // Estado de sincronización (qué versión de cada registro tiene la nube y hasta
  // dónde se descargó). Se guarda DENTRO del estado (state.__sync) para que los
  // datos y su estado de sincronización nunca queden desalineados.
  // ---------------------------------------------------------------------------
  let metaCache = null;
  function meta() {
    const cid = cloud.companyId();
    if (!cid) return null;
    if (metaCache && metaCache.companyId === cid) {
      if (state.__sync !== metaCache) state.__sync = metaCache; // p. ej. después de importar un respaldo
      return metaCache;
    }
    const m = state.__sync;
    if (m && m.companyId === cid && m.snap) { metaCache = m; return m; }
    // Migración desde la versión anterior (claves sueltas en localStorage)
    const oldSnap = lsGet('xp_sync_snap_' + cid, null);
    if (oldSnap) {
      metaCache = state.__sync = { companyId: cid, snap: oldSnap, cursor: lsGet('xp_sync_cursor_' + cid, null) };
      lsDel('xp_sync_snap_' + cid); lsDel('xp_sync_cursor_' + cid);
      return metaCache;
    }
    return null;
  }
  function newMeta() {
    metaCache = state.__sync = { companyId: cloud.companyId(), snap: {}, cursor: null };
    return metaCache;
  }

  // ---------------------------------------------------------------------------
  // Indicador de estado de sincronización (tarjeta de usuario del sidebar)
  // ---------------------------------------------------------------------------
  let statusState = { kind: 'local', text: 'Solo en este dispositivo' };
  function setStatus(kind, text) {
    statusState = { kind, text };
    const dot = document.getElementById('xp-sync-dot');
    const label = document.getElementById('xp-sync-label');
    if (!dot || !label) return;
    const colors = { ok: 'bg-emerald-500', busy: 'bg-sky-500 animate-pulse', pending: 'bg-amber-500 animate-pulse', offline: 'bg-slate-400', error: 'bg-rose-500', local: 'bg-slate-400' };
    dot.className = 'w-1.5 h-1.5 rounded-full ' + (colors[kind] || colors.local);
    label.textContent = text;
  }
  function mountStatus() {
    const nameEl = document.getElementById('sidebar-user-name');
    const row = nameEl?.parentElement?.querySelector('.flex.items-center.gap-1\\.5');
    if (!row || document.getElementById('xp-sync-dot')) return;
    const spans = row.querySelectorAll('span');
    if (spans[0]) spans[0].id = 'xp-sync-dot';
    if (spans[1]) spans[1].id = 'xp-sync-label';
    row.title = 'Estado de sincronización con la nube';
    setStatus(statusState.kind, statusState.text);
  }

  // ---------------------------------------------------------------------------
  // Fotos: se suben a Vercel Blob y el registro guarda solo el enlace
  // ---------------------------------------------------------------------------
  let blobAvailable = null; // null = no se sabe todavía
  const isDataImage = u => typeof u === 'string' && u.startsWith('data:image/');

  async function uploadImage(dataUrl, name) {
    if (!cloud.active() || !cloud.canWrite() || blobAvailable === false || !navigator.onLine) return null;
    try {
      const r = await api('POST', '/api/upload', { dataUrl, name }, 60000);
      if (r.status === 200 && r.data?.url) { blobAvailable = true; return r.data.url; }
      if (r.status === 503 && r.data?.noBlob) blobAvailable = false;
      else console.warn('[nube] subida de foto', r.status, r.data?.error);
    } catch (e) { /* sin conexión: se reintenta en la próxima sincronización */ }
    return null;
  }

  // Sube las fotos que aún están dentro de los datos (fotos antiguas o tomadas sin conexión)
  let migratingPhotos = false;
  async function migratePhotos() {
    if (migratingPhotos || !cloud.active() || !cloud.canWrite() || blobAvailable === false || !navigator.onLine) return 0;
    migratingPhotos = true;
    let moved = 0;
    try {
      for (const cab of (state.cabins || [])) {
        for (const ph of (cab.photos || [])) {
          if (!isDataImage(ph?.url)) continue;
          const url = await uploadImage(ph.url, `${cab.code || 'cabana'}-${cab.name || ''}`);
          if (!url) { if (blobAvailable === false) return moved; continue; }
          ph.url = url;
          moved++;
        }
      }
      if (moved) { persistLocal(); sync.schedulePush(); refreshUI(); }
    } finally { migratingPhotos = false; }
    return moved;
  }

  // Para el PDF: las fotos de Blob se piden a través de /api/media (mismo dominio)
  window.xpPdfImageUrl = function (u) {
    if (typeof u === 'string' && /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(u)) {
      return '/api/media?url=' + encodeURIComponent(u);
    }
    return u;
  };

  // Al elegir fotos en el formulario de cabaña, se suben de inmediato
  const legacyPhotoUpload = window.handleCabinPhotoUpload;
  if (typeof legacyPhotoUpload === 'function') {
    window.handleCabinPhotoUpload = async function handleCabinPhotoUploadCloud(event) {
      await legacyPhotoUpload.apply(this, arguments);
      if (!cloud.active()) return;
      let photos;
      try { photos = currentEditingCabinPhotos; } catch { return; }
      const pending = (photos || []).filter(p => isDataImage(p.url));
      if (!pending.length) return;
      toast(`Subiendo ${pending.length} foto(s) a la nube…`);
      let ok = 0;
      for (const p of pending) {
        const url = await uploadImage(p.url, p.caption || 'foto');
        if (url) { p.url = url; ok++; }
      }
      try { renderCabinPhotosPreview(); } catch {}
      if (ok === pending.length) toast('✅ Fotos guardadas en la nube');
      else if (blobAvailable === false) toast('Las fotos se guardaron en este dispositivo (almacenamiento de fotos no conectado)');
      else toast('Sin conexión: las fotos se subirán automáticamente al volver la conexión');
    };
  }

  // ---------------------------------------------------------------------------
  // Motor de sincronización
  // ---------------------------------------------------------------------------
  const sync = {
    pushTimer: null,
    pollTimer: null,
    running: false,
    again: false,

    localItems() {
      const items = new Map();
      for (const col of ARRAY_COLLECTIONS) {
        const arr = Array.isArray(state[col]) ? state[col] : [];
        for (const item of arr) {
          if (!item || item.id === undefined || item.id === null || item.id === '') continue;
          const id = String(item.id);
          items.set(col + '\u0000' + id, { collection: col, id, data: item });
        }
      }
      for (const key of SETTINGS_KEYS) {
        if (state[key] !== undefined && state[key] !== null) {
          items.set(SETTINGS_COLLECTION + '\u0000' + key, { collection: SETTINGS_COLLECTION, id: key, data: state[key] });
        }
      }
      return items;
    },

    diff() {
      const m = meta();
      if (!m) return [];
      const snap = m.snap;
      const changes = [];
      const local = this.localItems();
      for (const [k, it] of local) {
        const json = JSON.stringify(it.data);
        const h = hash(json);
        if (snap[k] !== h) changes.push({ key: k, collection: it.collection, id: it.id, data: it.data, hash: h, size: json.length });
      }
      for (const k of Object.keys(snap)) {
        if (!local.has(k)) {
          const [collection, id] = k.split('\u0000');
          changes.push({ key: k, collection, id, deleted: true, size: 64 });
        }
      }
      return changes;
    },

    pendingCount() { return cloud.active() ? this.diff().length : 0; },

    schedulePush() {
      if (!cloud.active() || persistApplying) return;
      clearTimeout(this.pushTimer);
      if (cloud.canWrite()) setStatus('pending', 'Guardando cambios…');
      this.pushTimer = setTimeout(() => this.run(), PUSH_DEBOUNCE_MS);
    },

    async push() {
      if (!cloud.canWrite()) return 0;
      const m = meta();
      if (!m) return 0;
      const changes = this.diff();
      if (!changes.length) return 0;
      let sent = 0;
      let batch = [], bytes = 0;
      const flush = async () => {
        if (!batch.length) return;
        const r = await api('POST', '/api/sync', {
          changes: batch.map(c => c.deleted ? { collection: c.collection, id: c.id, deleted: true } : { collection: c.collection, id: c.id, data: c.data })
        }, 60000);
        if (r.status === 401) throw Object.assign(new Error('Sesión vencida'), { expired: true });
        if (r.status !== 200) throw new Error(r.data?.error || 'No se pudieron guardar los cambios');
        for (const c of batch) {
          if (c.deleted) delete m.snap[c.key]; else m.snap[c.key] = c.hash;
        }
        sent += batch.length;
        batch = []; bytes = 0;
        this.saveLocal();
      };
      for (const c of changes) {
        if (batch.length && (bytes + c.size > MAX_BATCH_BYTES || batch.length >= MAX_BATCH_ITEMS)) await flush();
        batch.push(c); bytes += c.size;
      }
      await flush();
      return sent;
    },

    // Aplica registros del servidor al estado local.
    // Solo se aplica una versión que este dispositivo NO conoce todavía: si el servidor
    // devuelve la misma versión que ya está en el snapshot (p. ej. por la ventana de
    // repaso de 30 s), se ignora para no pisar ediciones locales pendientes de subir.
    apply(records, snap) {
      let changed = 0;
      for (const r of records) {
        const k = r.collection + '\u0000' + r.id;
        if (r.collection === SETTINGS_COLLECTION) {
          if (!SETTINGS_KEYS.includes(r.id)) continue;
          if (r.deleted) { delete snap[k]; continue; }
          const json = JSON.stringify(r.data);
          const h = hash(json);
          if (snap[k] === h) continue;
          if (JSON.stringify(state[r.id]) !== json) { state[r.id] = r.data; changed++; }
          snap[k] = h;
          continue;
        }
        if (!ARRAY_COLLECTIONS.includes(r.collection)) continue;
        if (!Array.isArray(state[r.collection])) state[r.collection] = [];
        const arr = state[r.collection];
        const idx = arr.findIndex(x => x && String(x.id) === r.id);
        if (r.deleted) {
          if (!(k in snap)) continue; // ya se sabía que no existe (o es nuevo en este dispositivo)
          if (idx !== -1) { arr.splice(idx, 1); changed++; }
          delete snap[k];
        } else {
          const json = JSON.stringify(r.data);
          const h = hash(json);
          if (snap[k] === h) continue;
          if (idx === -1) { arr.push(r.data); changed++; }
          else if (JSON.stringify(arr[idx]) !== json) { arr[idx] = r.data; changed++; }
          snap[k] = h;
        }
      }
      return changed;
    },

    async pull() {
      const m = meta();
      if (!m) return { changed: 0 };
      let cursor = m.cursor;
      let first = true, changed = 0, more = true, guard = 0;
      while (more && guard++ < 500) {
        let qs = '';
        if (cursor) {
          qs = `?ts=${encodeURIComponent(cursor.ts)}&col=${encodeURIComponent(cursor.col || '')}&id=${encodeURIComponent(cursor.id || '')}`;
          if (first) qs += '&back=30';
        }
        const r = await api('GET', '/api/sync' + qs, null, 60000);
        if (r.status === 401) throw Object.assign(new Error('Sesión vencida'), { expired: true });
        if (r.status !== 200) throw new Error(r.data?.error || 'No se pudieron descargar los datos');
        changed += this.apply(r.data.records || [], m.snap);
        if (r.data.next) cursor = r.data.next;
        else if (!cursor && r.data.serverCursor) cursor = { ts: r.data.serverCursor, col: '', id: '' };
        more = !!r.data.more;
        first = false;
      }
      if (cursor) m.cursor = cursor;
      return { changed };
    },

    saveLocal() {
      persistApplying = true;
      try { persistLocal(); } finally { persistApplying = false; }
    },

    async run() {
      if (!cloud.active() || !ready) return;
      if (this.running) { this.again = true; return; }
      if (!navigator.onLine) { setStatus('offline', this.pendingCount() ? 'Sin conexión · cambios pendientes' : 'Sin conexión'); return; }
      this.running = true;
      try {
        if (!meta() || !meta().cursor) {
          // Este dispositivo no tiene el estado de sincronización de la empresa: empezar de cero
          await firstSync(cloud.get().company);
        } else {
          if (cloud.canWrite() && this.diff().length) setStatus('busy', 'Sincronizando…');
          // Primero se bajan los cambios de los demás y después se suben los propios
          const { changed } = await this.pull();
          this.saveLocal();
          if (changed) refreshUI();
          await this.push();
        }
        setStatus('ok', 'Sincronizado ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
        migratePhotos();
      } catch (e) {
        hideOverlay();
        if (e.expired) return sessionExpired();
        if (e instanceof NetworkError) setStatus('offline', this.pendingCount() ? 'Sin conexión · cambios pendientes' : 'Sin conexión');
        else { setStatus('error', 'Error al sincronizar'); console.error('[nube]', e); }
      } finally {
        this.running = false;
        if (this.again) { this.again = false; setTimeout(() => this.run(), 300); }
      }
    },

    start() {
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => { if (document.visibilityState === 'visible') this.run(); }, POLL_MS);
    },
    stop() { clearInterval(this.pollTimer); clearTimeout(this.pushTimer); }
  };

  window.addEventListener('online', () => sync.run());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync.run(); });

  // Cuenta lo que hay en este dispositivo (para preguntar si se sube a la nube)
  function localSummary() {
    const n = k => (Array.isArray(state[k]) ? state[k].length : 0);
    return { clients: n('clients'), quotes: n('savedQuotes') + n('cabinQuotes'), products: n('products'), cabins: n('cabins'), finances: n('finances') };
  }

  // Primera sincronización de este dispositivo con la empresa (o cambio de empresa)
  async function firstSync(company) {
    const backupKey = 'xander_pro_state_backup_before_cloud';
    try {
      if (typeof XanderDB !== 'undefined' && !(await XanderDB.get(backupKey))) await XanderDB.set(backupKey, JSON.stringify(state));
    } catch {}
    showOverlay('Conectando con la nube…', `Descargando los datos de ${company.name}`);
    // Descarga completa sin aplicar todavía, para decidir qué hacer
    const records = [];
    let cursor = null, more = true, total = 0, first = true, guard = 0, serverCursor = null;
    while (more && guard++ < 500) {
      const qs = cursor ? `?ts=${encodeURIComponent(cursor.ts)}&col=${encodeURIComponent(cursor.col)}&id=${encodeURIComponent(cursor.id)}` : '';
      const r = await api('GET', '/api/sync' + qs, null, 60000);
      if (r.status === 401) { hideOverlay(); throw Object.assign(new Error('Sesión vencida'), { expired: true }); }
      if (r.status !== 200) throw new Error(r.data?.error || 'No se pudieron descargar los datos');
      if (first) { total = r.data.total || 0; serverCursor = r.data.serverCursor; }
      records.push(...(r.data.records || []));
      cursor = r.data.next || cursor;
      more = !!r.data.more;
      first = false;
    }

    const m = newMeta();
    if (total > 0) {
      // La empresa ya tiene datos: este dispositivo adopta los de la nube
      for (const col of ARRAY_COLLECTIONS) state[col] = [];
      sync.apply(records, m.snap);
      m.cursor = cursor || (serverCursor ? { ts: serverCursor, col: '', id: '' } : null);
      if (!Array.isArray(state.eventTypes) || !state.eventTypes.length) state.eventTypes = getDefaultState().eventTypes;
      sync.saveLocal();
      hideOverlay();
      refreshUI();
      return;
    }

    hideOverlay();
    // La empresa está vacía en la nube
    const s = localSummary();
    const hasData = s.clients + s.quotes + s.products + s.cabins + s.finances > 0;
    let upload = false;
    if (hasData && cloud.canWrite()) {
      upload = window.confirm(
        `La empresa "${company.name}" todavía no tiene datos en la nube.\n\n` +
        `¿Quieres subir los datos que hay en este dispositivo?\n` +
        `• ${s.clients} clientes  • ${s.quotes} cotizaciones  • ${s.products} productos  • ${s.cabins} cabañas  • ${s.finances} movimientos\n\n` +
        `Aceptar = subirlos para que todo el equipo los vea.\nCancelar = empezar la empresa sin datos.`
      );
    }
    if (!upload) {
      // Empresa nueva sin datos: se conservan solo catálogos base
      const def = getDefaultState();
      ['clients', 'products', 'savedQuotes', 'finances', 'cabins', 'cabinQuotes', 'eventClosures', 'notifications', 'dayPassQuotes'].forEach(k => { state[k] = []; });
      state.eventTypes = def.eventTypes;
      state.childPolicies = def.childPolicies;
      state.mealPlans = def.mealPlans;
      state.tourServices = def.tourServices;
      state.shoppingLists = {};
      state.priceHistory = {};
      state.company = Object.assign({}, def.company, { name: company.name, nit: company.nit || def.company?.nit || '' });
      state.activeQuote = def.activeQuote;
      state.activeCabinQuote = null;
      state.activeDayPass = null;
    }
    sync.saveLocal();
    if (cloud.canWrite()) {
      // Primero las fotos (así los registros suben livianos), luego los datos
      if (upload) {
        showOverlay('Subiendo fotos a la nube…', 'Esto puede tardar unos segundos la primera vez');
        try { await migratePhotos(); } finally { hideOverlay(); }
      }
      showOverlay('Subiendo datos a la nube…', 'Esto puede tardar unos segundos la primera vez');
      try { await sync.push(); } finally { hideOverlay(); }
    }
    m.cursor = serverCursor ? { ts: serverCursor, col: '', id: '' } : null;
    const p = await sync.pull();
    sync.saveLocal();
    if (p.changed) refreshUI();
  }

  // ---------------------------------------------------------------------------
  // Refrescar la pantalla actual después de recibir cambios
  // ---------------------------------------------------------------------------
  function currentView() {
    const el = Array.from(document.querySelectorAll('section[id^="view-"]')).find(s => !s.classList.contains('hidden'));
    return el ? el.id.replace('view-', '') : null;
  }
  function refreshUI() {
    const v = currentView();
    const call = (fn, ...a) => { try { if (typeof window[fn] === 'function') window[fn](...a); } catch {} };
    try {
      if (v && !['cotizador', 'cotizador-cabanas'].includes(v) && typeof switchView === 'function') {
        const y = window.scrollY; switchView(v); window.scrollTo(0, y);
      } else if (v === 'cotizador') {
        call('populateClientSelect'); call('populateEventTypeSelect'); call('populatePickerProducts');
      } else if (v === 'cotizador-cabanas') {
        call('populateCabinQuotePickers');
        const hist = document.getElementById('hos-history-fullscreen');
        if (hist && !hist.classList.contains('hidden')) call('renderCabinQuotesHistoryPanel');
      }
      call('updateCabinDashboardAndBadges');
      call('updateNotificationBadgeAndList');
    } catch (e) { console.warn('[nube] refresco', e); }
  }

  // ---------------------------------------------------------------------------
  // Overlay de progreso y diálogos propios
  // ---------------------------------------------------------------------------
  function showOverlay(title, sub) {
    let o = document.getElementById('xp-cloud-overlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'xp-cloud-overlay';
      o.className = 'fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4';
      o.innerHTML = `<div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mb-3">
          <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".25"/><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        </div>
        <div id="xp-cloud-overlay-title" class="text-sm font-extrabold text-slate-900 dark:text-white"></div>
        <div id="xp-cloud-overlay-sub" class="text-xs text-slate-500 dark:text-slate-400 mt-1"></div></div>`;
      document.body.appendChild(o);
    }
    o.querySelector('#xp-cloud-overlay-title').textContent = title;
    o.querySelector('#xp-cloud-overlay-sub').textContent = sub || '';
    o.classList.remove('hidden');
  }
  function hideOverlay() { document.getElementById('xp-cloud-overlay')?.classList.add('hidden'); }

  const INPUT = 'w-full min-h-[44px] sm:min-h-0 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none';
  const LABEL = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1';

  function modal(id, title, subtitle, bodyHtml, actionLabel, onSubmit) {
    document.getElementById(id)?.remove();
    const m = document.createElement('div');
    m.id = id;
    m.className = 'fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
    m.innerHTML = `<form class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[94vh]" novalidate>
      <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
        </div>
        <div class="min-w-0 flex-1"><h3 class="text-base font-extrabold text-slate-900 dark:text-white">${esc(title)}</h3><p class="text-xs text-slate-500 dark:text-slate-400">${esc(subtitle)}</p></div>
        <button type="button" data-x class="w-11 h-11 sm:w-8 sm:h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer" aria-label="Cerrar">&#10005;</button>
      </div>
      <div class="p-5 space-y-3 text-xs overflow-y-auto">${bodyHtml}
        <div data-err class="hidden p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 font-semibold"></div>
      </div>
      <div class="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-2">
        <button type="button" data-x class="min-h-[44px] sm:min-h-0 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancelar</button>
        <button type="submit" data-ok class="min-h-[44px] sm:min-h-0 py-2.5 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-600/30 cursor-pointer">${esc(actionLabel)}</button>
      </div></form>`;
    document.body.appendChild(m);
    const form = m.querySelector('form');
    const err = m.querySelector('[data-err]');
    const okBtn = m.querySelector('[data-ok]');
    m.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => m.remove()));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.classList.add('hidden');
      okBtn.disabled = true; const label = okBtn.textContent; okBtn.textContent = 'Procesando…';
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        const msg = await onSubmit(values);
        if (msg) { err.textContent = msg; err.classList.remove('hidden'); }
        else m.remove();
      } catch (ex) {
        err.textContent = ex instanceof NetworkError ? 'Sin conexión con el servidor. Revisa tu internet.' : (ex.message || 'Ocurrió un error');
        err.classList.remove('hidden');
      } finally { okBtn.disabled = false; okBtn.textContent = label; }
    });
    setTimeout(() => m.querySelector('input')?.focus(), 50);
    return m;
  }
  const field = (name, label, type = 'text', value = '', extra = '') =>
    `<div><label class="${LABEL}">${label}</label><input name="${name}" type="${type}" value="${esc(value)}" class="${INPUT}" ${extra} /></div>`;

  // ---------------------------------------------------------------------------
  // Inicio de sesión
  // ---------------------------------------------------------------------------
  const legacyLogin = window.handleLoginSubmit;
  const legacyCheckSession = window.checkActiveSession;
  const legacyLogout = window.logout;
  let loginBusy = false;

  function loginError(text) {
    const box = document.getElementById('auth-error-msg');
    const t = document.getElementById('auth-error-text');
    if (box && t) { t.textContent = text; box.classList.remove('hidden'); } else toast(text);
  }

  function setLoggedUserLocal(user, remember) {
    const loggedUser = { id: user.id, username: user.username, name: user.name, role: user.role, isSuperadmin: !!user.isSuperadmin };
    const token = (typeof generateSecureToken === 'function') ? generateSecureToken() : String(Date.now());
    const now = Date.now().toString();
    sessionStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));
    if (remember) {
      localStorage.setItem('eq_session_token', token);
      localStorage.setItem('eq_session_time', now);
      localStorage.setItem('eq_session_remember', 'true');
      localStorage.setItem('eq_remember_username', user.username);
      localStorage.setItem('eq_logged_user', JSON.stringify(loggedUser));
    } else {
      sessionStorage.setItem('eq_session_token', token);
      sessionStorage.setItem('eq_session_time', now);
      localStorage.removeItem('eq_session_remember');
      localStorage.removeItem('eq_logged_user');
    }
    if (!state.auth) state.auth = getDefaultState().auth;
    state.auth.user = user.username;
    state.auth.operatorName = user.name;
  }

  async function onCloudLogin(data, remember) {
    await restorePromise;
    metaCache = null;
    cloud.set(data.user, data.company, remember);
    setLoggedUserLocal(data.user, remember);
    // run() hace la primera sincronización si este dispositivo aún no la tiene para esta empresa
    await sync.run();
    sync.start();
    setAuthenticated(true);
    mountStatus();
    if (typeof updateOperatorNameDisplay === 'function') try { updateOperatorNameDisplay(); } catch {}
    toast(`Bienvenido, ${data.user.name} · ${data.company.name}`);
    renderCompaniesCard();
    setTimeout(syncCompanyIdentity, 4000);
  }

  window.handleLoginSubmit = async function handleLoginSubmitCloud() {
    if (loginBusy) return;
    const username = (document.getElementById('login-username')?.value || '').trim();
    const password = document.getElementById('login-password')?.value || '';
    const remember = !!document.getElementById('login-remember')?.checked;
    if (!username || !password) return legacyLogin();

    const btn = document.getElementById('btn-submit-login');
    const btnHtml = btn?.innerHTML;
    loginBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }
    document.getElementById('auth-error-msg')?.classList.add('hidden');
    try {
      let r;
      try {
        r = await api('POST', '/api/auth/login', { username, password, remember });
      } catch (e) {
        if (e.noApi && !cloud.active()) return legacyLogin(); // sin servidor: modo local de siempre
        return loginError('Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.');
      }
      if (r.status === 200) return await onCloudLogin(r.data, remember);
      if (r.status === 409 && r.data?.needsSetup) return openSetup(username, password);
      loginError(r.data?.error || 'No se pudo iniciar sesión');
    } finally {
      loginBusy = false;
      if (btn) { btn.disabled = false; if (btnHtml) btn.innerHTML = btnHtml; }
    }
  };

  // Sesión al abrir la app
  window.checkActiveSession = function checkActiveSessionCloud() {
    if (cloud.active()) {
      const c = cloud.get();
      const token = sessionStorage.getItem('eq_session_token') || (c.remember ? localStorage.getItem('eq_session_token') : null);
      if (!token) { setAuthenticated(false); return; }
      // Entra de inmediato con la copia local (funciona sin conexión) y valida en segundo plano
      setLoggedUserLocal(c.user, c.remember);
      setAuthenticated(true);
      setTimeout(async () => {
        mountStatus();
        try {
          const r = await api('GET', '/api/auth/me');
          if (r.status === 401) return sessionExpired();
          if (r.status === 200) {
            cloud.set(r.data.user, r.data.company, c.remember);
            setLoggedUserLocal(r.data.user, c.remember);
            sync.start();
            restorePromise.then(() => sync.run());
            renderCompaniesCard();
            setTimeout(syncCompanyIdentity, 4000);
          }
        } catch (e) {
          setStatus('offline', 'Sin conexión');
          sync.start();
        }
      }, 50);
      return;
    }
    // Nunca se ha usado la nube en este dispositivo: si el servidor existe, pedir login
    setAuthenticated(false);
    api('GET', '/api/setup', null, 6000).then(r => {
      if (r.status === 200) {
        sessionStorage.removeItem('eq_session_token');
        localStorage.removeItem('eq_session_token');
        const hint = document.getElementById('auth-error-msg');
        if (!r.data.initialized && hint) {
          const t = document.getElementById('auth-error-text');
          if (t) t.textContent = 'Primera vez: inicia sesión con tu usuario actual para configurar la nube.';
          hint.classList.remove('hidden');
        }
      }
    }).catch(() => { try { legacyCheckSession(); } catch {} });
  };

  function sessionExpired() {
    sync.stop();
    cloud.clear();
    sessionStorage.removeItem('eq_session_token');
    localStorage.removeItem('eq_session_token');
    setAuthenticated(false);
    loginError('Tu sesión venció o fue cerrada. Inicia sesión de nuevo.');
  }

  window.logout = function logoutCloud() {
    if (cloud.active()) {
      const pending = sync.pendingCount();
      if (pending && !window.confirm(`Hay ${pending} cambio(s) sin subir a la nube (sin conexión). Si cierras sesión ahora se quedarán solo en este dispositivo.\n\n¿Cerrar sesión de todas formas?`)) return;
      api('POST', '/api/auth/logout').catch(() => {});
      sync.stop();
      cloud.clear();
      metaCache = null;
      setStatus('local', 'Solo en este dispositivo');
    }
    return legacyLogout();
  };

  // Cada guardado local programa la subida a la nube
  let pendingSaveBeforeReady = false;
  window.saveState = function saveStateCloud() {
    // Mientras se carga la copia de IndexedDB no se escribe nada (evita pisarla con datos de ejemplo)
    if (!ready) { pendingSaveBeforeReady = true; return; }
    if (cloud.active()) meta(); // vuelve a enlazar el estado de sincronización si el estado fue reemplazado (importar respaldo)
    persistLocal();
    if (cloud.active() && !persistApplying) sync.schedulePush();
  };

  // ---------------------------------------------------------------------------
  // Configuración inicial (primera empresa y administrador)
  // ---------------------------------------------------------------------------
  function openSetup(username, password) {
    const comp = state.company || {};
    modal('xp-setup-modal', 'Configurar la nube', 'Primera vez: crea tu empresa y tu usuario administrador',
      `<div class="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-200 leading-relaxed">
         A partir de ahora los datos se guardan en la nube y se ven en todos tus dispositivos. Este usuario será el <strong>administrador principal</strong>: podrá crear usuarios y otras empresas.
       </div>` +
      field('companyName', 'Nombre de la empresa *', 'text', comp.name || '') +
      field('nit', 'NIT / RUT', 'text', comp.nit || '') +
      field('name', 'Tu nombre *', 'text', (typeof getOperatorName === 'function' ? getOperatorName() : '')) +
      field('username', 'Usuario para iniciar sesión *', 'text', (username || '').toLowerCase(), 'autocomplete="username"') +
      field('password', 'Contraseña * (mínimo 8 caracteres)', 'password', '', 'autocomplete="new-password"') +
      field('password2', 'Repite la contraseña *', 'password', '', 'autocomplete="new-password"'),
      'Crear y entrar',
      async v => {
        if (v.password !== v.password2) return 'Las contraseñas no coinciden';
        const r = await api('POST', '/api/setup', { companyName: v.companyName, nit: v.nit, name: v.name, username: v.username, password: v.password });
        if (r.status !== 200) return r.data?.error || 'No se pudo configurar';
        document.getElementById('xp-setup-modal')?.remove();
        await onCloudLogin(r.data, true);
        return null;
      });
  }

  // ---------------------------------------------------------------------------
  // Cambio de contraseña propia (formulario existente)
  // ---------------------------------------------------------------------------
  document.addEventListener('submit', async e => {
    if (e.target?.id !== 'form-change-password' || !cloud.active()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const curr = document.getElementById('chg-curr-pwd')?.value || '';
    const next = document.getElementById('chg-new-pwd')?.value || '';
    const conf = document.getElementById('chg-conf-pwd')?.value || '';
    if (next.length < 8) return toast('❌ La nueva contraseña debe tener mínimo 8 caracteres.');
    if (next !== conf) return toast('❌ Las nuevas contraseñas no coinciden.');
    try {
      const r = await api('POST', '/api/auth/password', { current: curr, next });
      if (r.status !== 200) return toast('❌ ' + (r.data?.error || 'No se pudo cambiar la contraseña'));
      document.getElementById('modal-change-password')?.classList.add('hidden');
      toast('✅ Contraseña actualizada. Se cerraron tus otras sesiones.');
    } catch { toast('❌ Sin conexión con el servidor'); }
  }, true);

  // "Restaurar datos de ejemplo" en la nube afectaría a toda la empresa
  document.addEventListener('click', e => {
    const btn = e.target?.closest?.('#btn-reset-demo');
    if (!btn || !cloud.active()) return;
    const company = cloud.get()?.company?.name || 'la empresa';
    if (!window.confirm(`⚠️ Estás conectado a la nube.\n\nRestaurar los datos de ejemplo REEMPLAZARÁ los datos de "${company}" para TODOS los usuarios.\n\n¿Continuar?`)) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  // ---------------------------------------------------------------------------
  // Usuarios de la empresa (Mi Empresa)
  // ---------------------------------------------------------------------------
  let cloudUsers = [];
  const legacyRenderUsers = window.renderCompanyUsersList;
  const legacyOpenUser = window.openUserModal;
  const legacySaveUser = window.saveUserFromForm;
  const legacyDeleteUser = window.deleteUser;
  const roleBadges = {
    Administrador: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    Comercial: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    Operaciones: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    Consulta: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  };

  window.renderCompanyUsersList = async function renderUsersCloud() {
    if (!cloud.active()) return legacyRenderUsers?.();
    const box = document.getElementById('empresa-users-list');
    if (!box) return;
    if (cloud.get().user.role !== 'Administrador') {
      box.innerHTML = '<div class="text-xs text-slate-400 py-3 text-center">Solo los administradores pueden ver y gestionar usuarios.</div>';
      return;
    }
    box.innerHTML = '<div class="text-xs text-slate-400 py-3 text-center">Cargando usuarios…</div>';
    try {
      const r = await api('GET', '/api/users');
      if (r.status !== 200) { box.innerHTML = `<div class="text-xs text-rose-500 py-3 text-center">${esc(r.data?.error || 'Error')}</div>`; return; }
      cloudUsers = r.data.users;
      const me = cloud.get().user.id;
      box.innerHTML = cloudUsers.map(u => `
        <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <strong class="text-slate-900 dark:text-white font-extrabold truncate">${esc(u.name)}</strong>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${roleBadges[u.role] || roleBadges.Consulta}">${esc(u.role)}</span>
              ${u.isSuperadmin ? '<span class="px-1.5 py-0.5 rounded text-[9px] bg-teal-100 text-teal-700 font-bold">Principal</span>' : ''}
              ${u.id === me ? '<span class="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-700 font-bold">Tú</span>' : ''}
              ${!u.active ? '<span class="px-1.5 py-0.5 rounded text-[9px] bg-rose-100 text-rose-700 font-bold">Inactivo</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-400 truncate">@${esc(u.username)} · ${u.lastLoginAt ? 'Último ingreso ' + new Date(u.lastLoginAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca ha ingresado'}</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="openUserModal('${u.id}')" class="min-h-[36px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition cursor-pointer">Editar</button>
            ${u.id !== me ? `<button type="button" onclick="deleteUser('${u.id}')" class="min-h-[36px] px-2 rounded-lg ${u.active ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'} font-bold text-[11px] transition cursor-pointer">${u.active ? 'Desactivar' : 'Activar'}</button>` : ''}
          </div>
        </div>`).join('') || '<div class="text-xs text-slate-400 py-3 text-center">Sin usuarios</div>';
    } catch {
      box.innerHTML = '<div class="text-xs text-slate-400 py-3 text-center">Sin conexión: los usuarios se gestionan cuando haya internet.</div>';
    }
  };

  window.openUserModal = function openUserModalCloud(userId = null) {
    if (!cloud.active()) return legacyOpenUser?.(userId);
    if (cloud.get().user.role !== 'Administrador') return toast('Solo administradores pueden gestionar usuarios');
    const modalEl = document.getElementById('modal-user-form');
    if (!modalEl) return;
    const u = userId ? cloudUsers.find(x => x.id === userId) : null;
    document.getElementById('user-form-id').value = u ? u.id : '';
    document.getElementById('user-form-name').value = u ? u.name : '';
    const userIn = document.getElementById('user-form-username');
    userIn.value = u ? u.username : '';
    userIn.disabled = !!u;
    document.getElementById('user-form-role').value = u ? u.role : 'Comercial';
    const pwd = document.getElementById('user-form-password');
    pwd.value = '';
    pwd.placeholder = u ? 'Dejar vacío para no cambiarla (mínimo 8)' : 'Mínimo 8 caracteres';
    document.getElementById('user-form-active').checked = u ? !!u.active : true;
    const title = document.getElementById('modal-user-title-text');
    if (title) title.textContent = u ? `Editar Usuario: ${u.name}` : 'Crear Nuevo Usuario';
    modalEl.classList.remove('hidden');
  };

  window.saveUserFromForm = async function saveUserCloud() {
    if (!cloud.active()) return legacySaveUser?.();
    const id = document.getElementById('user-form-id')?.value;
    const payload = {
      name: document.getElementById('user-form-name')?.value.trim(),
      username: document.getElementById('user-form-username')?.value.trim(),
      role: document.getElementById('user-form-role')?.value,
      password: document.getElementById('user-form-password')?.value || '',
      active: document.getElementById('user-form-active')?.checked ?? true
    };
    try {
      const r = id
        ? await api('PATCH', '/api/users', { id, name: payload.name, role: payload.role, active: payload.active, ...(payload.password ? { password: payload.password } : {}) })
        : await api('POST', '/api/users', payload);
      if (r.status !== 200) return toast('❌ ' + (r.data?.error || 'No se pudo guardar'));
      document.getElementById('user-form-username').disabled = false;
      closeModal('modal-user-form');
      toast(id ? `Usuario ${payload.name} actualizado` : `Usuario ${payload.name} creado. Ya puede iniciar sesión con @${r.data.user.username}`);
      window.renderCompanyUsersList();
    } catch { toast('❌ Sin conexión con el servidor'); }
  };

  window.deleteUser = async function deleteUserCloud(userId) {
    if (!cloud.active()) return legacyDeleteUser?.(userId);
    const u = cloudUsers.find(x => x.id === userId);
    if (!u) return;
    if (u.active && !window.confirm(`¿Desactivar a ${u.name}? No podrá iniciar sesión hasta que lo actives de nuevo.`)) return;
    try {
      const r = await api('PATCH', '/api/users', { id: userId, active: !u.active });
      if (r.status !== 200) return toast('❌ ' + (r.data?.error || 'No se pudo actualizar'));
      toast(u.active ? `${u.name} desactivado` : `${u.name} activado`);
      window.renderCompanyUsersList();
    } catch { toast('❌ Sin conexión con el servidor'); }
  };

  // ---------------------------------------------------------------------------
  // Empresas (solo administrador principal) — tarjeta en Mi Empresa
  // ---------------------------------------------------------------------------
  // Nombre y NIT de la empresa en la nube = los de "Mi Empresa"
  let identityBusy = false;
  async function syncCompanyIdentity() {
    const c = cloud.get();
    if (!c?.user || c.user.role !== 'Administrador' || identityBusy) return;
    const name = String(state.company?.name || '').trim();
    const nit = String(state.company?.nit || '').trim();
    if (!name) return;
    if (c.company?.name === name && String(c.company?.nit || '') === nit) return;
    identityBusy = true;
    try {
      const r = await api('PATCH', '/api/companies', { name, nit });
      if (r.status === 200 && r.data?.company) {
        const cur = cloud.get();
        cloud.set(cur.user, { ...cur.company, ...r.data.company }, cur.remember);
        if (document.getElementById('xp-companies-card')) renderCompaniesCard();
      }
    } catch (e) { console.warn('[nube] nombre de empresa', e); }
    finally { identityBusy = false; }
  }
  window.xpSyncCompanyIdentity = syncCompanyIdentity;
  document.addEventListener('click', e => {
    if (e.target?.closest?.('#btn-save-company')) setTimeout(syncCompanyIdentity, 300);
  });

  async function renderCompaniesCard() {
    const c = cloud.get();
    let card = document.getElementById('xp-companies-card');
    if (!c?.user?.isSuperadmin) { card?.remove(); return; }
    const usersCard = document.getElementById('empresa-users-list')?.closest('.rounded-2xl');
    if (!usersCard) return;
    if (!card) {
      card = document.createElement('div');
      card.id = 'xp-companies-card';
      card.className = 'bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4';
      usersCard.insertAdjacentElement('afterend', card);
    }
    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">Empresas en la nube</span>
        <button type="button" id="xp-btn-new-company" class="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"><span>+</span> Nueva Empresa</button>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900">Empresas con datos separados</h3>
        <p class="text-xs text-slate-500">Cada empresa tiene sus propios clientes, cabañas, cotizaciones y usuarios. Para trabajar en otra empresa, inicia sesión con un usuario de esa empresa.</p>
      </div>
      <div id="xp-companies-list" class="divide-y divide-slate-100 text-xs"><div class="py-3 text-center text-slate-400">Cargando…</div></div>`;
    card.querySelector('#xp-btn-new-company').addEventListener('click', openNewCompany);
    try {
      const r = await api('GET', '/api/companies');
      const list = card.querySelector('#xp-companies-list');
      if (r.status !== 200) { list.innerHTML = `<div class="py-3 text-center text-rose-500">${esc(r.data?.error || 'Error')}</div>`; return; }
      list.innerHTML = r.data.companies.map(co => `
        <div class="py-2.5 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2"><strong class="font-extrabold text-slate-900 dark:text-white truncate">${esc(co.name)}</strong>
            ${co.id === r.data.currentCompanyId ? '<span class="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-700 font-bold">Actual</span>' : ''}</div>
            <div class="text-[11px] text-slate-400">${co.nit ? 'NIT ' + esc(co.nit) + ' · ' : ''}${co.users} usuario(s) · ${co.records} registro(s)</div>
          </div>
        </div>`).join('');
    } catch {
      card.querySelector('#xp-companies-list').innerHTML = '<div class="py-3 text-center text-slate-400">Sin conexión</div>';
    }
  }

  function openNewCompany() {
    modal('xp-company-modal', 'Nueva Empresa', 'Datos separados, con su propio administrador',
      field('name', 'Nombre de la empresa *') +
      field('nit', 'NIT / RUT') +
      '<div class="pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Administrador de la empresa</div>' +
      field('adminName', 'Nombre *') +
      field('adminUsername', 'Usuario *', 'text', '', 'autocomplete="off"') +
      field('adminPassword', 'Contraseña * (mínimo 8 caracteres)', 'password', '', 'autocomplete="new-password"'),
      'Crear Empresa',
      async v => {
        const r = await api('POST', '/api/companies', v);
        if (r.status !== 200) return r.data?.error || 'No se pudo crear la empresa';
        toast(`Empresa "${r.data.company.name}" creada. Su administrador entra con @${String(v.adminUsername).trim().toLowerCase()}`);
        renderCompaniesCard();
        return null;
      });
  }

  // Cada vez que se abre Mi Empresa se refrescan usuarios y empresas desde el servidor
  const legacySwitchView = window.switchView;
  if (typeof legacySwitchView === 'function') {
    window.switchView = function switchViewCloud(viewName) {
      const r = legacySwitchView.apply(this, arguments);
      if (viewName === 'empresa' && cloud.active()) renderCompaniesCard();
      return r;
    };
  }

  // API pública para depuración y otras partes de la app
  window.XPCloud = { api, cloud, sync, refreshUI, openSetup, renderCompaniesCard, status: () => statusState };
})();
