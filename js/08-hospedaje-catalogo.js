/* Xander Pro — 08-hospedaje-catalogo (extraído de index.html; scripts clásicos que comparten el ámbito global) */
// ============================================================================
// XANDER PRO — MÓDULO DE COTIZACIÓN DE HOSPEDAJE (CABAÑAS) Y SERVICIOS TURÍSTICOS
// ============================================================================

// 1. UTILIDAD: COMPRESIÓN DE IMÁGENES OFFLINE VÍA CANVAS (MÁX 800px WebP/JPEG)
function compressImageFile(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
        } catch (err) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Error al procesar imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

// 2. MIGRACIÓN Y SEMILLAS DE DATOS DE HOSPEDAJE
function migrateCabanasState() {
  if (!state) return;
  const def = getDefaultState();

  if (!Array.isArray(state.cabins) || state.cabins.length === 0) {
    state.cabins = def.cabins;
  }
  if (!Array.isArray(state.childPolicies) || state.childPolicies.length === 0) {
    state.childPolicies = def.childPolicies;
  }
  if (!Array.isArray(state.mealPlans) || state.mealPlans.length === 0) {
    state.mealPlans = def.mealPlans;
  }
  if (!Array.isArray(state.tourServices) || state.tourServices.length === 0) {
    state.tourServices = def.tourServices;
  }
  if (!Array.isArray(state.cabinQuotes)) {
    state.cabinQuotes = def.cabinQuotes || [];
  }
  // Fotos de ejemplo: reemplaza las de Unsplash (externas) por las ilustraciones locales de la app
  const demoPhotoMap = {
    'photo-1542314831-068cd1dbfeeb': 'img/cabana-1.svg',
    'photo-1512917774080-9991f1c4c750': 'img/cabana-2.svg',
    'photo-1587061949409-02df41d5e562': 'img/cabana-3.svg'
  };
  (state.cabins || []).forEach(cab => {
    (cab.photos || []).forEach(ph => {
      if (ph && typeof ph.url === 'string' && ph.url.includes('images.unsplash.com')) {
        const key = Object.keys(demoPhotoMap).find(k => ph.url.includes(k));
        ph.url = key ? demoPhotoMap[key] : 'img/cabana-1.svg';
      }
    });
  });
  if (!Array.isArray(state.users) || state.users.length === 0) {
    state.users = def.users || [
      { id: 'usr-1', username: 'admin', name: (typeof getOperatorName === 'function' ? getOperatorName() : 'Alexander'), role: 'Administrador', password: 'Admin2026*', active: true }
    ];
  }
}

// 3. SISTEMA DE ROLES Y CONTROL DE ACCESO
function getCurrentUser() {
  const stored = sessionStorage.getItem('eq_logged_user') || localStorage.getItem('eq_logged_user');
  if (stored) {
    try {
      const u = JSON.parse(stored);
      if (u && u.username) return u;
    } catch(e) {}
  }
  return {
    id: 'usr-1',
    username: (state.auth && state.auth.user) ? state.auth.user : 'admin',
    name: (typeof getOperatorName === 'function' ? getOperatorName() : 'Administrador'),
    role: 'Administrador'
  };
}

function hasPermission(action) {
  const user = getCurrentUser();
  const role = user.role || 'Administrador';
  if (role === 'Administrador') return true;

  if (role === 'Comercial') {
    const allowed = [
      'create_quote', 'edit_quote', 'modify_base_rate_with_reason', 
      'manage_clients', 'view_agenda', 'print_pdf', 'view_quotes', 
      'view_cabins', 'view_dashboard', 'download_pdf', 'whatsapp_quote'
    ];
    return allowed.includes(action);
  }

  if (role === 'Operaciones') {
    const allowed = ['view_agenda', 'view_quotes', 'view_cabins', 'view_alerts', 'view_dashboard'];
    return allowed.includes(action);
  }

  if (role === 'Consulta') {
    const allowed = ['view_quotes', 'view_cabins', 'view_agenda', 'view_dashboard'];
    return allowed.includes(action);
  }

  return false;
}

function renderCompanyUsersList() {
  const container = document.getElementById('empresa-users-list');
  if (!container) return;

  const users = state.users || [];
  if (users.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 py-3 text-center">No hay usuarios registrados</div>';
    return;
  }

  const roleBadges = {
    'Administrador': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    'Comercial': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    'Operaciones': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    'Consulta': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  };

  container.innerHTML = users.map(u => {
    const isMaster = u.username.toLowerCase() === 'admin';
    return `
      <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <strong class="text-slate-900 dark:text-white font-extrabold truncate">${u.name}</strong>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${roleBadges[u.role] || roleBadges.Consulta}">
              ${u.role}
            </span>
            ${!u.active ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-700 font-bold">Inactivo</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-400 truncate">Usuario: @${u.username}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="openUserModal('${u.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition">
            Editar
          </button>
          ${!isMaster ? `
            <button type="button" onclick="deleteUser('${u.id}')" class="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-[11px] transition">
              Eliminar
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openUserModal(userId = null) {
  if (!hasPermission('manage_users')) {
    showToast('Solo administradores pueden gestionar usuarios');
    return;
  }
  const modal = document.getElementById('modal-user-form');
  if (!modal) return;

  const idIn = document.getElementById('user-form-id');
  const nameIn = document.getElementById('user-form-name');
  const userIn = document.getElementById('user-form-username');
  const roleIn = document.getElementById('user-form-role');
  const pwdIn = document.getElementById('user-form-password');
  const actIn = document.getElementById('user-form-active');
  const titleText = document.getElementById('modal-user-title-text');

  if (userId) {
    const u = (state.users || []).find(x => x.id === userId);
    if (!u) return;
    idIn.value = u.id;
    nameIn.value = u.name;
    userIn.value = u.username;
    roleIn.value = u.role;
    pwdIn.value = '';
    actIn.checked = !!u.active;
    if (titleText) titleText.textContent = `Editar Usuario: ${u.name}`;
  } else {
    idIn.value = '';
    nameIn.value = '';
    userIn.value = '';
    roleIn.value = 'Comercial';
    pwdIn.value = '';
    actIn.checked = true;
    if (titleText) titleText.textContent = 'Crear Nuevo Usuario';
  }
  modal.classList.remove('hidden');
}

function saveUserFromForm() {
  const id = document.getElementById('user-form-id')?.value;
  const name = document.getElementById('user-form-name')?.value.trim();
  const username = document.getElementById('user-form-username')?.value.trim().toLowerCase();
  const role = document.getElementById('user-form-role')?.value || 'Comercial';
  const pwd = document.getElementById('user-form-password')?.value;
  const active = document.getElementById('user-form-active')?.checked ?? true;

  if (!name || !username) {
    showToast('Ingresa el nombre y el usuario');
    return;
  }

  state.users = state.users || [];

  if (id) {
    const idx = state.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      state.users[idx].name = name;
      state.users[idx].username = username;
      state.users[idx].role = role;
      state.users[idx].active = active;
      if (pwd && pwd.trim().length >= 4) {
        state.users[idx].password = pwd.trim();
      }
      showToast(`Usuario ${name} actualizado`);
    }
  } else {
    if (state.users.some(u => u.username.toLowerCase() === username)) {
      showToast('Ya existe un usuario con ese nombre de usuario');
      return;
    }
    const newUser = {
      id: 'usr-' + Date.now(),
      name,
      username,
      role,
      password: (pwd && pwd.trim().length >= 4) ? pwd.trim() : 'Xander2026*',
      active
    };
    state.users.push(newUser);
    showToast(`Usuario ${name} creado con éxito`);
  }

  saveState();
  closeModal('modal-user-form');
  renderCompanyUsersList();
}

function deleteUser(userId) {
  if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
  state.users = (state.users || []).filter(u => u.id !== userId);
  saveState();
  showToast('Usuario eliminado');
  renderCompanyUsersList();
}

// 4. POLÍTICAS DE NIÑOS (edades, nombres y tarifas configurables)
// Se conservan los tres tramos con sus claves de siempre ('0-4', '5-10', '11+') para que
// las cotizaciones guardadas sigan funcionando; lo que cambia es la parametrización.
const CHILD_POLICY_DEFAULTS = {
  infant: { minAge: 0, maxAge: 4, label: 'Bebés', rate: 0, countsTowardsMaxCapacity: false, note: 'Sin costo, en cama compartida o cuna portátil' },
  child: { maxAge: 10, label: 'Niños', rate: 40000, countsTowardsMaxCapacity: true, note: 'Tarifa reducida por noche; ocupan cama individual' },
  adult: { label: 'Adultos', note: 'Tarifa completa; si superan la capacidad máxima pagan persona adicional' }
};

function getChildPolicyTiers() {
  const list = state.childPolicies || [];
  const p0 = list.find(p => p.range === '0-4') || {};
  const p5 = list.find(p => p.range === '5-10') || {};
  const p11 = list.find(p => p.range === '11+') || {};
  const cleanLabel = (v, def) => (typeof v === 'string' && v.trim() && !/\d+\s*(a|-)\s*\d+\s*años|años en adelante/i.test(v)) ? v.trim() : def;
  const num = (v, def) => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? def : Number(v);
  const infantMax = Math.max(0, Math.round(num(p0.maxAge, CHILD_POLICY_DEFAULTS.infant.maxAge)));
  const childMax = Math.max(infantMax + 1, Math.round(num(p5.maxAge, CHILD_POLICY_DEFAULTS.child.maxAge)));
  const infant = {
    minAge: 0, maxAge: infantMax,
    label: cleanLabel(p0.label, CHILD_POLICY_DEFAULTS.infant.label),
    rate: Math.max(0, num(p0.rate, 0)),
    countsTowardsMaxCapacity: p0.countsTowardsMaxCapacity !== undefined ? !!p0.countsTowardsMaxCapacity : false,
    note: p0.note || CHILD_POLICY_DEFAULTS.infant.note
  };
  const child = {
    minAge: infantMax + 1, maxAge: childMax,
    label: cleanLabel(p5.label, CHILD_POLICY_DEFAULTS.child.label),
    rate: Math.max(0, num(p5.rate, CHILD_POLICY_DEFAULTS.child.rate)),
    countsTowardsMaxCapacity: p5.countsTowardsMaxCapacity !== undefined ? !!p5.countsTowardsMaxCapacity : true,
    note: p5.note || CHILD_POLICY_DEFAULTS.child.note
  };
  const adult = {
    minAge: childMax + 1,
    label: cleanLabel(p11.label, CHILD_POLICY_DEFAULTS.adult.label),
    note: p11.note || CHILD_POLICY_DEFAULTS.adult.note
  };
  infant.text = `${infant.label} (${infant.minAge}-${infant.maxAge} años)`;
  child.text = `${child.label} (${child.minAge}-${child.maxAge} años)`;
  adult.text = `${adult.label} (${adult.minAge}+ años)`;
  infant.short = `${infant.label} (${infant.minAge}-${infant.maxAge} a.)`;
  child.short = `${child.label} (${child.minAge}-${child.maxAge} a.)`;
  adult.short = `${adult.label} (${adult.minAge}+ a.)`;
  return { infant, child, adult };
}

// Etiquetas del formulario de cotización de cabañas según las políticas
function applyChildPolicyLabels() {
  const t = getChildPolicyTiers();
  const setLabel = (forId, text) => { const el = document.querySelector(`label[for="${forId}"]`); if (el) el.textContent = text; };
  setLabel('hos-adults-input', t.adult.short + ' *');
  setLabel('hos-kids-5to10-input', t.child.short);
  setLabel('hos-kids-0to4-input', t.infant.short);
}

function renderChildPoliciesInputs() {
  const t = getChildPolicyTiers();
  const set = (id, v) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
  set('pol-inf-label', t.infant.label); set('pol-inf-max', t.infant.maxAge); set('pol-inf-rate', t.infant.rate);
  set('pol-inf-counts', t.infant.countsTowardsMaxCapacity); set('pol-inf-note', t.infant.note);
  set('pol-chd-label', t.child.label); set('pol-chd-max', t.child.maxAge); set('pol-chd-rate', t.child.rate);
  set('pol-chd-counts', t.child.countsTowardsMaxCapacity); set('pol-chd-note', t.child.note);
  set('pol-adl-label', t.adult.label); set('pol-adl-note', t.adult.note);
  updateChildPolicyPreview();
}

// Actualiza los rangos mostrados mientras se escriben las edades
function updateChildPolicyPreview() {
  const infMax = Math.max(0, parseInt(document.getElementById('pol-inf-max')?.value, 10) || 0);
  const chdMax = parseInt(document.getElementById('pol-chd-max')?.value, 10) || 0;
  const v = id => (document.getElementById(id)?.value || '').trim();
  const put = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  put('pol-inf-range', `0 a ${infMax} años`);
  put('pol-chd-min', String(infMax + 1));
  put('pol-chd-range', chdMax > infMax ? `${infMax + 1} a ${chdMax} años` : 'Revisa la edad máxima');
  put('pol-adl-range', `${(chdMax > infMax ? chdMax : infMax + 1) + 1} años en adelante`);
  put('pol-adl-min', String((chdMax > infMax ? chdMax : infMax + 1) + 1));
  const infRate = Number(document.getElementById('pol-inf-rate')?.value) || 0;
  put('pol-inf-price', infRate > 0 ? formatCurrency(infRate) + ' / noche' : 'GRATIS');
  put('pol-inf-title', v('pol-inf-label') || 'Bebés');
  put('pol-chd-title', v('pol-chd-label') || 'Niños');
  put('pol-adl-title', v('pol-adl-label') || 'Adultos');
}

function saveChildPoliciesSettings() {
  if (!hasPermission('manage_catalogs')) {
    showToast('No tienes permiso para modificar políticas');
    return;
  }
  const v = id => (document.getElementById(id)?.value || '').trim();
  const infMax = parseInt(v('pol-inf-max'), 10);
  const chdMax = parseInt(v('pol-chd-max'), 10);
  if (isNaN(infMax) || infMax < 0 || infMax > 16) return showToast('❌ La edad máxima del primer grupo debe estar entre 0 y 16 años');
  if (isNaN(chdMax) || chdMax <= infMax || chdMax > 17) return showToast(`❌ La edad máxima del segundo grupo debe ser mayor que ${infMax} y máximo 17 años`);
  const infLabel = v('pol-inf-label') || CHILD_POLICY_DEFAULTS.infant.label;
  const chdLabel = v('pol-chd-label') || CHILD_POLICY_DEFAULTS.child.label;
  const adlLabel = v('pol-adl-label') || CHILD_POLICY_DEFAULTS.adult.label;

  state.childPolicies = [
    { id: 'cp-1', range: '0-4', minAge: 0, maxAge: infMax, label: infLabel, rate: Math.max(0, Number(v('pol-inf-rate')) || 0),
      countsTowardsMaxCapacity: !!document.getElementById('pol-inf-counts')?.checked, note: v('pol-inf-note') },
    { id: 'cp-2', range: '5-10', minAge: infMax + 1, maxAge: chdMax, label: chdLabel, rate: Math.max(0, Number(v('pol-chd-rate')) || 0),
      countsTowardsMaxCapacity: !!document.getElementById('pol-chd-counts')?.checked, note: v('pol-chd-note') },
    { id: 'cp-3', range: '11+', minAge: chdMax + 1, label: adlLabel, rate: null, isAdult: true, countsTowardsMaxCapacity: true, note: v('pol-adl-note') }
  ];

  saveState();
  applyChildPolicyLabels();
  renderChildPoliciesInputs();
  showToast('✅ Políticas de edades actualizadas');
  if (state.activeCabinQuote && typeof recalculateCabinQuoteLive === 'function') recalculateCabinQuoteLive();
}

// 5. PESTAÑAS DENTRO DE view-cabanas
function switchCabanasTab(tab) {
  const tabs = ['cabins', 'meals', 'tours', 'policies'];
  tabs.forEach(t => {
    const pane = document.getElementById(`cabanas-pane-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (pane) pane.classList.toggle('hidden', t !== tab);
    if (btn) {
      // Estilo de pestaña en css/theme-a.css (.xp-tabbar)
      btn.classList.add('cabanas-tab-btn');
      btn.classList.toggle('is-on', t === tab);
      btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    }
  });

  if (tab === 'cabins') renderCabinsGrid();
  if (tab === 'meals') renderMealPlansGrid();
  if (tab === 'tours') renderTourServicesGrid();
  if (tab === 'policies') renderChildPoliciesInputs();
}

// 6. CABAÑAS CRUD
let currentEditingCabinPhotos = [];

function renderCabinsGrid() {
  const container = document.getElementById('cabins-cards-grid');
  if (!container) return;

  const search = (document.getElementById('cabins-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('cabins-filter-status')?.value || 'active';
  const petsFilter = document.getElementById('cabins-filter-pets')?.value || 'all';

  let cabins = state.cabins || [];

  if (statusFilter !== 'all') {
    cabins = cabins.filter(c => c.status === statusFilter);
  }
  if (petsFilter === 'pets_yes') {
    cabins = cabins.filter(c => c.allowsPets);
  } else if (petsFilter === 'pets_no') {
    cabins = cabins.filter(c => !c.allowsPets);
  }

  if (search) {
    cabins = cabins.filter(c => 
      (c.name || '').toLowerCase().includes(search) ||
      (c.code || '').toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search)
    );
  }

  // Update counter badges
  const badge = document.getElementById('badge-tab-cabins-count');
  if (badge) badge.textContent = (state.cabins || []).length;

  if (cabins.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <span class="text-3xl block mb-2">🏡</span>
        <strong class="text-sm font-bold block text-slate-700 dark:text-slate-300">No se encontraron cabañas</strong>
        <p class="text-xs text-slate-500 mt-1">Ajusta los filtros de búsqueda o registra una nueva cabaña.</p>
        <button type="button" onclick="openCabinModal()" class="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs hover:bg-teal-700 transition">
          + Nueva Cabaña
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = cabins.map(cab => {
    const mainPhoto = (cab.photos || []).find(p => p.isMain) || (cab.photos || [])[0] || { url: 'img/cabana-1.svg' };
    const isActive = cab.status === 'active';

    return `
      <div class="ag-tilt-card ag-glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between group transition-all duration-300 hover:border-teal-400 dark:hover:border-teal-500">
        <div>
          <!-- Photo Container -->
          <div class="relative h-48 w-full bg-slate-900 overflow-hidden">
            <img src="${mainPhoto.url}" alt="${cab.name}" onerror="this.onerror=null;this.src='img/cabana-1.svg'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30"></div>
            
            <!-- Badges over photo -->
            <div class="absolute top-3 left-3 flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md border border-white/20">
                ${cab.code}
              </span>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isActive ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'} backdrop-blur-md">
                ${isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <!-- Price over photo bottom -->
            <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-300 block">Tarifa por noche</span>
                <strong class="text-lg font-black text-white tabular-nums">${formatCurrency(cab.baseNightlyRate)}</strong>
              </div>
              <div class="text-right">
                ${cab.pricingMode === 'fixed' ? `<span class="text-[10px] text-teal-300 font-semibold block">Tarifa fija</span>
                <span class="text-xs font-bold text-white tabular-nums">Hasta ${cab.maxCapacity} pax</span>` : `<span class="text-[10px] text-teal-300 font-semibold block">+ Persona adic.</span>
                <span class="text-xs font-bold text-white tabular-nums">${formatCurrency(cab.extraPersonRate)}</span>`}
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="p-4 sm:p-5 space-y-3">
            <div>
              <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">${cab.name}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">${cab.description || 'Cabaña campestre equipada con todas las comodidades.'}</p>
            </div>

            <!-- Capacity & Rooms Bar -->
            <div class="grid grid-cols-3 gap-2 text-center py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold">Capacidad</span>
                <strong class="font-black text-slate-800 dark:text-slate-200">${cab.baseCapacity} a ${cab.maxCapacity} pax</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 font-bold">Habitaciones</span>
                <strong class="font-black text-slate-800 dark:text-slate-200">${cab.rooms || 1} hab / ${cab.bathrooms || 1} bñ</strong>
              </div>
              <div>
                <span class="block text-[10px] text-slate-400 font-bold">Mascotas</span>
                <strong class="font-black ${cab.allowsPets ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                  ${cab.allowsPets ? 'Sí permite' : 'No permite'}
                </strong>
              </div>
            </div>

            <!-- Amenities Badges -->
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${cab.pool ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">🏊 Piscina</span>' : ''}
              ${cab.jacuzzi ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">🛁 Jacuzzi</span>' : ''}
              ${cab.ac ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">❄️ A/C</span>' : ''}
              ${cab.parking ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">🚗 Parking</span>' : ''}
              ${cab.wifi ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">📶 Wi-Fi</span>' : ''}
              ${cab.bbq ? '<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">🥩 BBQ</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center justify-between gap-2">
          <button type="button" onclick="quickQuoteCabin('${cab.id}')" class="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
            <span>📝</span>
            <span>Cotizar</span>
          </button>
          <button type="button" onclick="openCabinModal('${cab.id}')" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer" title="Editar cabaña">
            ✏️
          </button>
          <button type="button" onclick="toggleCabinStatus('${cab.id}')" class="p-2 rounded-xl ${isActive ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'} text-xs font-bold transition cursor-pointer" title="${isActive ? 'Desactivar' : 'Activar'}">
            ${isActive ? '⏸️' : '▶️'}
          </button>
          ${hasPermission('delete_records') ? `
            <button type="button" onclick="deleteCabin('${cab.id}')" class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer" title="Eliminar cabaña">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function quickQuoteCabin(cabinId) {
  switchView('cotizador-cabanas');
  const sel = document.getElementById('hos-cabin-select');
  if (sel) {
    sel.value = cabinId;
    handleCabinSelectionChange();
  }
}

function openCabinModal(cabinId = null) {
  if (!hasPermission('manage_cabins')) {
    showToast('Permiso denegado para editar cabañas');
    return;
  }
  const modal = document.getElementById('modal-cabin-form');
  if (!modal) return;

  const idIn = document.getElementById('cabin-form-id');
  const codeIn = document.getElementById('cabin-form-code');
  const nameIn = document.getElementById('cabin-form-name');
  const descIn = document.getElementById('cabin-form-desc');
  const baseCapIn = document.getElementById('cabin-form-base-cap');
  const maxCapIn = document.getElementById('cabin-form-max-cap');
  const rateIn = document.getElementById('cabin-form-nightly-rate');
  const extraIn = document.getElementById('cabin-form-extra-rate');
  const roomsIn = document.getElementById('cabin-form-rooms');
  const bathsIn = document.getElementById('cabin-form-bathrooms');
  const petsCheck = document.getElementById('cabin-form-allows-pets');
  const petRateIn = document.getElementById('cabin-form-pet-rate');
  const petTypeIn = document.getElementById('cabin-form-pet-charge-type');
  const statusIn = document.getElementById('cabin-form-status');
  const obsIn = document.getElementById('cabin-form-observations');
  const titleText = document.getElementById('modal-cabin-title-text');

  // Amenities checkboxes
  const pool = document.getElementById('cabin-amenity-pool');
  const jacuzzi = document.getElementById('cabin-amenity-jacuzzi');
  const ac = document.getElementById('cabin-amenity-ac');
  const parking = document.getElementById('cabin-amenity-parking');
  const wifi = document.getElementById('cabin-amenity-wifi');
  const bbq = document.getElementById('cabin-amenity-bbq');

  if (cabinId) {
    const cab = (state.cabins || []).find(c => c.id === cabinId);
    if (!cab) return;
    idIn.value = cab.id;
    codeIn.value = cab.code || '';
    nameIn.value = cab.name || '';
    descIn.value = cab.description || '';
    baseCapIn.value = cab.baseCapacity || 4;
    maxCapIn.value = cab.maxCapacity || 8;
    rateIn.value = cab.baseNightlyRate || 480000;
    extraIn.value = cab.extraPersonRate ?? 75000;
    const pmIn = document.getElementById('cabin-form-pricing-mode');
    if (pmIn) pmIn.value = cab.pricingMode === 'fixed' ? 'fixed' : 'base_plus_extra';
    roomsIn.value = cab.rooms || 2;
    bathsIn.value = cab.bathrooms || 2;
    petsCheck.checked = !!cab.allowsPets;
    petRateIn.value = cab.petRate ?? 35000;
    petTypeIn.value = cab.petChargeType || 'per_night';
    statusIn.value = cab.status || 'active';
    obsIn.value = cab.observations || '';

    if (pool) pool.checked = !!cab.pool;
    if (jacuzzi) jacuzzi.checked = !!cab.jacuzzi;
    if (ac) ac.checked = !!cab.ac;
    if (parking) parking.checked = !!cab.parking;
    if (wifi) wifi.checked = !!cab.wifi;
    if (bbq) bbq.checked = !!cab.bbq;

    currentEditingCabinPhotos = Array.isArray(cab.photos) ? JSON.parse(JSON.stringify(cab.photos)) : [];
    if (titleText) titleText.textContent = `Editar Cabaña: ${cab.name}`;
  } else {
    // Generate next code
    const nextNum = (state.cabins || []).length + 1;
    const nextCode = 'CAB-' + String(nextNum).padStart(2, '0');

    idIn.value = '';
    codeIn.value = nextCode;
    nameIn.value = '';
    descIn.value = '';
    baseCapIn.value = 4;
    maxCapIn.value = 8;
    rateIn.value = 480000;
    extraIn.value = 75000;
    const pmNew = document.getElementById('cabin-form-pricing-mode');
    if (pmNew) pmNew.value = 'base_plus_extra';
    roomsIn.value = 2;
    bathsIn.value = 2;
    petsCheck.checked = true;
    petRateIn.value = 35000;
    petTypeIn.value = 'per_night';
    statusIn.value = 'active';
    obsIn.value = 'Check-in: 3:00 PM | Check-out: 12:00 M. Se prohíbe música a alto volumen después de las 11:00 PM.';

    if (pool) pool.checked = true;
    if (jacuzzi) jacuzzi.checked = true;
    if (ac) ac.checked = true;
    if (parking) parking.checked = true;
    if (wifi) wifi.checked = true;
    if (bbq) bbq.checked = true;

    currentEditingCabinPhotos = [];
    if (titleText) titleText.textContent = 'Crear Nueva Cabaña';
  }

  toggleCabinFormPetFields();
  renderCabinPhotosPreview();
  modal.classList.remove('hidden');
  updateCabinPricingModeUI();
}

function toggleCabinFormPetFields() {
  const chk = document.getElementById('cabin-form-allows-pets');
  const row = document.getElementById('cabin-form-pets-row');
  if (chk && row) {
    row.classList.toggle('hidden', !chk.checked);
  }
}

async function handleCabinPhotoUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    try {
      const dataUrl = await compressImageFile(files[i], 800, 0.7);
      if (dataUrl) {
        currentEditingCabinPhotos.push({
          id: 'ph-' + Date.now() + '-' + i,
          url: dataUrl,
          isMain: currentEditingCabinPhotos.length === 0,
          caption: files[i].name
        });
      }
    } catch(err) {
      console.error('Error comprimiendo foto:', err);
    }
  }
  event.target.value = '';
  renderCabinPhotosPreview();
}

function renderCabinPhotosPreview() {
  const container = document.getElementById('cabin-photos-preview-grid');
  if (!container) return;

  if (currentEditingCabinPhotos.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-400 dark:text-slate-500">Aún no hay fotos. La primera que subas será la principal.</div>';
    return;
  }

  container.innerHTML = currentEditingCabinPhotos.map((p, idx) => `
    <div class="relative w-20 h-16 rounded-xl overflow-hidden border ${p.isMain ? 'border-2 border-teal-500 shadow-md' : 'border-slate-200 dark:border-slate-700'} group">
      <img src="${p.url}" alt="Foto" onerror="this.onerror=null;this.src='img/cabana-1.svg'" class="w-full h-full object-cover" />
      ${p.isMain ? '<span class="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-600 text-white">Principal</span>' : ''}
      <div class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-around p-1">
        ${!p.isMain ? `
          <button type="button" onclick="setMainCabinPhoto(${idx})" class="p-1 rounded bg-teal-600 text-white text-[10px] font-bold" title="Definir como foto principal del PDF">⭐</button>
        ` : ''}
        <button type="button" onclick="removeCabinPhoto(${idx})" class="p-1 rounded bg-rose-600 text-white text-[10px] font-bold" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');
}

function setMainCabinPhoto(index) {
  currentEditingCabinPhotos.forEach((p, idx) => {
    p.isMain = (idx === index);
  });
  renderCabinPhotosPreview();
}

function removeCabinPhoto(index) {
  currentEditingCabinPhotos.splice(index, 1);
  if (currentEditingCabinPhotos.length > 0 && !currentEditingCabinPhotos.some(p => p.isMain)) {
    currentEditingCabinPhotos[0].isMain = true;
  }
  renderCabinPhotosPreview();
}

function saveCabinFromForm() {
  const id = document.getElementById('cabin-form-id')?.value;
  const code = (document.getElementById('cabin-form-code')?.value || 'CAB-01').trim().toUpperCase();
  const name = (document.getElementById('cabin-form-name')?.value || '').trim();
  const description = (document.getElementById('cabin-form-desc')?.value || '').trim();
  const baseCapacity = Number(document.getElementById('cabin-form-base-cap')?.value) || 4;
  const maxCapacity = Number(document.getElementById('cabin-form-max-cap')?.value) || 8;
  const baseNightlyRate = Number(document.getElementById('cabin-form-nightly-rate')?.value) || 480000;
  const pricingMode = document.getElementById('cabin-form-pricing-mode')?.value === 'fixed' ? 'fixed' : 'base_plus_extra';
  const extraPersonRate = cabinNumOr('cabin-form-extra-rate', 75000);
  const rooms = Number(document.getElementById('cabin-form-rooms')?.value) || 2;
  const bathrooms = Number(document.getElementById('cabin-form-bathrooms')?.value) || 2;
  const allowsPets = document.getElementById('cabin-form-allows-pets')?.checked ?? true;
  const petRate = cabinNumOr('cabin-form-pet-rate', 35000);
  const petChargeType = document.getElementById('cabin-form-pet-charge-type')?.value || 'per_night';
  const status = document.getElementById('cabin-form-status')?.value || 'active';
  const observations = (document.getElementById('cabin-form-observations')?.value || '').trim();

  if (!name) {
    showToast('Ingresa el nombre de la cabaña');
    return;
  }
  if (maxCapacity < baseCapacity) {
    showToast('La capacidad máxima no puede ser menor que la capacidad base');
    return;
  }

  // Amenities
  const pool = document.getElementById('cabin-amenity-pool')?.checked ?? false;
  const jacuzzi = document.getElementById('cabin-amenity-jacuzzi')?.checked ?? false;
  const ac = document.getElementById('cabin-amenity-ac')?.checked ?? false;
  const parking = document.getElementById('cabin-amenity-parking')?.checked ?? false;
  const wifi = document.getElementById('cabin-amenity-wifi')?.checked ?? false;
  const bbq = document.getElementById('cabin-amenity-bbq')?.checked ?? false;

  // Fallback default photo if empty
  if (currentEditingCabinPhotos.length === 0) {
    currentEditingCabinPhotos.push({
      id: 'ph-default',
      url: 'img/cabana-1.svg',
      isMain: true,
      caption: 'Vista Principal'
    });
  }

  state.cabins = state.cabins || [];

  const cabinObj = {
    id: id || ('cab-' + Date.now()),
    code,
    name,
    description,
    baseCapacity,
    maxCapacity,
    baseNightlyRate,
    extraPersonRate,
    pricingMode,
    rooms,
    bathrooms,
    allowsPets,
    petRate: allowsPets ? petRate : 0,
    petChargeType,
    pool,
    jacuzzi,
    ac,
    parking,
    wifi,
    bbq,
    status,
    photos: currentEditingCabinPhotos,
    observations
  };

  if (id) {
    const idx = state.cabins.findIndex(c => c.id === id);
    if (idx !== -1) state.cabins[idx] = cabinObj;
    showToast(`Cabaña ${name} actualizada`);
  } else {
    state.cabins.push(cabinObj);
    showToast(`Cabaña ${name} registrada con éxito`);
  }

  saveState();
  closeModal('modal-cabin-form');
  renderCabinsGrid();
  populateCabinQuotePickers();
}

function toggleCabinStatus(cabinId) {
  const cab = (state.cabins || []).find(c => c.id === cabinId);
  if (!cab) return;
  cab.status = cab.status === 'active' ? 'inactive' : 'active';
  saveState();
  showToast(`Cabaña ${cab.name} ${cab.status === 'active' ? 'activada' : 'inactivada'}`);
  renderCabinsGrid();
  populateCabinQuotePickers();
}

function deleteCabin(cabinId) {
  if (!hasPermission('delete_records')) {
    showToast('Permiso denegado para eliminar cabañas');
    return;
  }
  if (!confirm('¿Estás seguro de eliminar esta cabaña? Las cotizaciones existentes se mantendrán archivadas.')) return;
  state.cabins = (state.cabins || []).filter(c => c.id !== cabinId);
  saveState();
  showToast('Cabaña eliminada');
  renderCabinsGrid();
  populateCabinQuotePickers();
}

// 7. PLANES DE ALIMENTACIÓN CRUD
function renderMealPlansGrid() {
  const container = document.getElementById('meal-plans-cards-grid');
  if (!container) return;

  const plans = state.mealPlans || [];
  const badge = document.getElementById('badge-tab-meals-count');
  if (badge) badge.textContent = plans.length;

  if (plans.length === 0) {
    container.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400">No hay planes de alimentación registrados</div>';
    return;
  }

  container.innerHTML = plans.map(mp => `
    <div class="ag-tilt-card ag-glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xl">🍽️</span>
          <strong class="text-sm font-black text-teal-600 dark:text-teal-400 tabular-nums">
            ${mp.costPerPaxPerNight === 0 ? 'Sin Costo ($0)' : formatCurrency(mp.costPerPaxPerNight) + ' / pax'}
          </strong>
        </div>
        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white mt-2">${mp.name}</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${mp.desc || ''}</p>
        ${mp.observations ? `<p class="text-[10px] text-slate-400 mt-1 italic">Nota: ${mp.observations}</p>` : ''}
      </div>

      <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onclick="openMealPlanModal('${mp.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition">
          Editar
        </button>
        ${hasPermission('delete_records') ? `
          <button type="button" onclick="deleteMealPlan('${mp.id}')" class="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition">
            Eliminar
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function openMealPlanModal(planId = null) {
  if (!hasPermission('manage_catalogs')) {
    showToast('Permiso denegado para editar catálogos');
    return;
  }
  const modal = document.getElementById('modal-meal-plan-form');
  if (!modal) return;

  const idIn = document.getElementById('meal-form-id');
  const nameIn = document.getElementById('meal-form-name');
  const costIn = document.getElementById('meal-form-cost');
  const descIn = document.getElementById('meal-form-desc');
  const obsIn = document.getElementById('meal-form-obs');
  const titleText = document.getElementById('modal-meal-title-text');

  if (planId) {
    const p = (state.mealPlans || []).find(x => x.id === planId);
    if (!p) return;
    idIn.value = p.id;
    nameIn.value = p.name;
    costIn.value = p.costPerPaxPerNight;
    descIn.value = p.desc || '';
    obsIn.value = p.observations || '';
    if (titleText) titleText.textContent = `Editar Plan: ${p.name}`;
  } else {
    idIn.value = '';
    nameIn.value = '';
    costIn.value = 25000;
    descIn.value = '';
    obsIn.value = '';
    if (titleText) titleText.textContent = 'Crear Nuevo Plan de Alimentación';
  }
  modal.classList.remove('hidden');
}

function saveMealPlanFromForm() {
  const id = document.getElementById('meal-form-id')?.value;
  const name = document.getElementById('meal-form-name')?.value.trim();
  const costPerPaxPerNight = Number(document.getElementById('meal-form-cost')?.value) || 0;
  const desc = document.getElementById('meal-form-desc')?.value.trim();
  const observations = document.getElementById('meal-form-obs')?.value.trim();

  if (!name) {
    showToast('Ingresa el nombre del plan');
    return;
  }

  state.mealPlans = state.mealPlans || [];
  const planObj = {
    id: id || ('mp-' + Date.now()),
    name,
    costPerPaxPerNight,
    desc,
    observations
  };

  if (id) {
    const idx = state.mealPlans.findIndex(p => p.id === id);
    if (idx !== -1) state.mealPlans[idx] = planObj;
    showToast(`Plan ${name} actualizado`);
  } else {
    state.mealPlans.push(planObj);
    showToast(`Plan ${name} creado`);
  }

  saveState();
  closeModal('modal-meal-plan-form');
  renderMealPlansGrid();
  populateCabinQuotePickers();
}

function deleteMealPlan(planId) {
  if (!confirm('¿Eliminar este plan de alimentación?')) return;
  state.mealPlans = (state.mealPlans || []).filter(p => p.id !== planId);
  saveState();
  showToast('Plan de alimentación eliminado');
  renderMealPlansGrid();
  populateCabinQuotePickers();
}

// 8. SERVICIOS TURÍSTICOS ADICIONALES CRUD
function renderServiciosView() {
  const grid = document.getElementById('serv-tours-grid');
  const tours = state.tourServices || [];
  const kpi = document.getElementById('serv-kpi-active');
  if (kpi) kpi.textContent = tours.filter(t => (t.status || 'active') === 'active').length;
  const kpiC = document.getElementById('serv-kpi-concepts');
  if (kpiC) kpiC.textContent = (state.eventTypes || []).length;
  if (!grid) return;

  const q = (document.getElementById('serv-search')?.value || '').toLowerCase().trim();
  const st = document.getElementById('serv-filter-status')?.value || '';
  let list = tours.filter(t => (!st || (t.status || 'active') === st) &&
    (!q || (t.name || '').toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q)));

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </div>
        <div class="text-sm font-bold text-slate-700 dark:text-slate-200">${tours.length ? 'Sin resultados' : 'Aún no hay servicios adicionales'}</div>
        <div class="text-xs text-slate-400 mt-1">${tours.length ? 'Prueba con otro texto o filtro.' : 'Crea el primero con el botón «Nuevo Servicio».'}</div>
      </div>`;
    return;
  }

  const types = {
    per_person: { label: 'Por persona', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', tile: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    per_vehicle: { label: 'Por vehículo', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', tile: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400', icon: 'M8 7h8m-8 4h8m-9 8h10a2 2 0 002-2V6a3 3 0 00-3-3H8a3 3 0 00-3 3v11a2 2 0 002 2zm0 0v2m10-2v2M7 15h.01M17 15h.01' },
    fixed: { label: 'Valor fijo', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', tile: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' }
  };
  const canDelete = typeof hasPermission === 'function' ? hasPermission('delete_records') : false;

  grid.innerHTML = list.map(ts => {
    const t = types[ts.chargeType] || types.fixed;
    const active = (ts.status || 'active') === 'active';
    const unit = ts.chargeType === 'per_person' ? ' / persona' : (ts.chargeType === 'per_vehicle' ? ` / vehículo · hasta ${ts.vehicleCapacity || 4} pax` : '');
    return `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/50 p-4 flex flex-col gap-3 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition ${active ? '' : 'opacity-60'}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-9 h-9 rounded-xl ${t.tile} flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${t.icon}"/></svg></span>
            <div class="min-w-0">
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">${ts.name}</h4>
              <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.cls}">${t.label}</span>
            </div>
          </div>
          <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">${active ? 'Activo' : 'Inactivo'}</span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">${ts.desc || 'Sin descripción'}</p>
        <div class="flex items-end justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/70">
          <div>
            <div class="text-base font-black text-teal-600 dark:text-teal-400 tabular-nums">${formatCurrency(ts.rate || 0)}</div>
            <div class="text-[10px] text-slate-400">${unit.replace(' / ', '') || 'Valor global'}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="openTourServiceModal('${ts.id}')" class="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Editar
            </button>
            ${canDelete ? `<button type="button" onclick="deleteTourService('${ts.id}')" class="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 flex items-center justify-center transition cursor-pointer" title="Eliminar" aria-label="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}
window.renderServiciosView = renderServiciosView;

function renderTourServicesGrid() {
  renderServiciosView();
  const container = document.getElementById('tour-services-cards-grid');
  if (!container) return;

  const tours = state.tourServices || [];
  const badge = document.getElementById('badge-tab-tours-count');
  if (badge) badge.textContent = tours.length;

  if (tours.length === 0) {
    container.innerHTML = '<div class="col-span-full py-8 text-center text-slate-400">No hay servicios turísticos registrados</div>';
    return;
  }

  const typeLabels = {
    'per_person': 'Por Persona',
    'per_vehicle': 'Por Vehículo / Grupo',
    'fixed': 'Valor Fijo Global'
  };

  container.innerHTML = tours.map(ts => `
    <div class="ag-tilt-card ag-glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xl">🚐</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            ${typeLabels[ts.chargeType] || 'Servicio'}
          </span>
        </div>
        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white mt-2">${ts.name}</h4>
        <div class="text-sm font-black text-teal-600 dark:text-teal-400 tabular-nums mt-0.5">
          ${formatCurrency(ts.rate)}
          ${ts.chargeType === 'per_person' ? '<span class="text-[10px] font-medium text-slate-400">/ pax</span>' : ''}
          ${ts.chargeType === 'per_vehicle' ? `<span class="text-[10px] font-medium text-slate-400">/ vehículo (hasta ${ts.vehicleCapacity || 4} pax)</span>` : ''}
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${ts.desc || ''}</p>
      </div>

      <div class="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onclick="openTourServiceModal('${ts.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition">
          Editar
        </button>
        ${hasPermission('delete_records') ? `
          <button type="button" onclick="deleteTourService('${ts.id}')" class="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition">
            Eliminar
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function openTourServiceModal(tourId = null) {
  if (!hasPermission('manage_catalogs')) {
    showToast('Permiso denegado para editar catálogos');
    return;
  }
  const modal = document.getElementById('modal-tour-service-form');
  if (!modal) return;

  const idIn = document.getElementById('tour-form-id');
  const nameIn = document.getElementById('tour-form-name');
  const typeIn = document.getElementById('tour-form-charge-type');
  const capIn = document.getElementById('tour-form-vehicle-cap');
  const rateIn = document.getElementById('tour-form-rate');
  const descIn = document.getElementById('tour-form-desc');
  const statusIn = document.getElementById('tour-form-status');
  const titleText = document.getElementById('modal-tour-title-text');

  if (tourId) {
    const t = (state.tourServices || []).find(x => x.id === tourId);
    if (!t) return;
    idIn.value = t.id;
    nameIn.value = t.name;
    typeIn.value = t.chargeType;
    capIn.value = t.vehicleCapacity || 4;
    rateIn.value = t.rate;
    descIn.value = t.desc || '';
    statusIn.value = t.status || 'active';
    if (titleText) titleText.textContent = `Editar Servicio: ${t.name}`;
  } else {
    idIn.value = '';
    nameIn.value = '';
    typeIn.value = 'per_person';
    capIn.value = 4;
    rateIn.value = 50000;
    descIn.value = '';
    statusIn.value = 'active';
    if (titleText) titleText.textContent = 'Crear Nuevo Servicio Turístico';
  }
  toggleTourFormVehicleCapacity();
  modal.classList.remove('hidden');
}

function toggleTourFormVehicleCapacity() {
  const type = document.getElementById('tour-form-charge-type')?.value;
  const row = document.getElementById('tour-form-vehicle-cap-row');
  if (row) {
    row.classList.toggle('hidden', type !== 'per_vehicle');
  }
}

function saveTourServiceFromForm() {
  const id = document.getElementById('tour-form-id')?.value;
  const name = document.getElementById('tour-form-name')?.value.trim();
  const chargeType = document.getElementById('tour-form-charge-type')?.value || 'per_person';
  const vehicleCapacity = chargeType === 'per_vehicle' ? (Number(document.getElementById('tour-form-vehicle-cap')?.value) || 4) : null;
  const rate = Number(document.getElementById('tour-form-rate')?.value) || 0;
  const desc = document.getElementById('tour-form-desc')?.value.trim();
  const status = document.getElementById('tour-form-status')?.value || 'active';

  if (!name) {
    showToast('Ingresa el nombre del servicio turístico');
    return;
  }

  state.tourServices = state.tourServices || [];
  const tourObj = {
    id: id || ('ts-' + Date.now()),
    name,
    chargeType,
    vehicleCapacity,
    rate,
    desc,
    status
  };

  if (id) {
    const idx = state.tourServices.findIndex(t => t.id === id);
    if (idx !== -1) state.tourServices[idx] = tourObj;
    showToast(`Servicio ${name} actualizado`);
  } else {
    state.tourServices.push(tourObj);
    showToast(`Servicio ${name} creado con éxito`);
  }

  saveState();
  closeModal('modal-tour-service-form');
  renderTourServicesGrid();
  populateCabinQuotePickers();
}

function deleteTourService(tourId) {
  if (!confirm('¿Eliminar este servicio turístico?')) return;
  state.tourServices = (state.tourServices || []).filter(t => t.id !== tourId);
  saveState();
  showToast('Servicio turístico eliminado');
  renderTourServicesGrid();
  populateCabinQuotePickers();
}

// Lee un número del formulario: solo usa el valor por defecto si el campo está vacío (permite 0)
function cabinNumOr(id, def) {
  const raw = String(document.getElementById(id)?.value ?? '').trim();
  if (raw === '') return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

// Modo de cobro de la cabaña: tarifa base + persona extra, o tarifa fija hasta la capacidad máxima
function updateCabinPricingModeUI() {
  const fixed = document.getElementById('cabin-form-pricing-mode')?.value === 'fixed';
  const extra = document.getElementById('cabin-form-extra-rate');
  if (extra) extra.disabled = fixed;
  const max = document.getElementById('cabin-form-max-cap')?.value || '';
  const base = document.getElementById('cabin-form-base-cap')?.value || '';
  const hint = document.getElementById('cabin-form-pricing-mode-hint');
  if (hint) hint.textContent = fixed
    ? `La tarifa por noche es la misma para cualquier número de personas. Nunca se cobran personas adicionales.`
    : `De ${base} a ${max} personas solo se cobra la tarifa de la cabaña. Desde la persona ${Number(max) + 1} se cobra el valor de persona adicional.`;
  const nh = document.getElementById('cabin-form-nightly-hint');
  if (nh) nh.textContent = fixed ? 'Igual para cualquier número de personas' : `Incluye de ${base} a ${max} personas`;
}
window.updateCabinPricingModeUI = updateCabinPricingModeUI;
document.addEventListener('input', e => {
  if (e.target && (e.target.id === 'cabin-form-base-cap' || e.target.id === 'cabin-form-max-cap')) updateCabinPricingModeUI();
});
