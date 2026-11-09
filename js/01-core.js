/* Xander Pro — 01-core (extraído de index.html; scripts clásicos que comparten el ámbito global) */
    // =====================================================
    // GLOBAL MODAL HELPERS & ESCAPE DISMISSAL
    // =====================================================
    function closeModal(modalId) {
      if (!modalId) return;
      const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (el) el.classList.add('hidden');
    }
    window.closeModal = closeModal;

    function openModal(modalId) {
      if (!modalId) return;
      const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (el) el.classList.remove('hidden');
    }
    window.openModal = openModal;

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modalIds = [
          'modal-new-quote-version',
          'modal-quote-versions-history',
          'modal-compare-quote-versions',
          'modal-shopping-list',
          'modal-edit-client',
          'modal-client-history',
          'modal-agenda-event-details',
          'modal-edit-operator',
          'modal-simple-product',
          'modal-recipe-product',
          'modal-cuenta-cobro',
          'modal-pwa-install',
          'modal-email',
          'modal-finance',
          'modal-change-password'
        ];
        modalIds.forEach(id => {
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
          }
        });
      }
    });

    // =====================================================
    // 1. UNIT CONVERSION ENGINE (Litro, Onza, ml, Kg, Gramo, Unidad)
    // =====================================================
    const UNIT_META = {
      und: { label: 'Unidad (und)', dimension: 'count', toBase: 1 },
      srv: { label: 'Servicio (srv)', dimension: 'count', toBase: 1 },
      hr:  { label: 'Hora (hr)', dimension: 'count', toBase: 1 },
      L:   { label: 'Litro (L)', dimension: 'volume', toBase: 1000 },     // base volume = ml
      ml:  { label: 'Mililitro (ml)', dimension: 'volume', toBase: 1 },
      oz:  { label: 'Onza (oz)', dimension: 'volume', toBase: 29.5735 },  // 1 fl oz = 29.5735 ml
      kg:  { label: 'Kilogramo (kg)', dimension: 'mass', toBase: 1000 },  // base mass = g
      g:   { label: 'Gramo (g)', dimension: 'mass', toBase: 1 }
    };

    // Convert quantity from one unit to another (e.g., 2 oz -> L = 0.059147 L)
    function convertUnits(qty, fromUnit, toUnit) {
      if (fromUnit === toUnit) return qty;
      const uFrom = UNIT_META[fromUnit];
      const uTo = UNIT_META[toUnit];
      if (!uFrom || !uTo || uFrom.dimension !== uTo.dimension) {
        return qty;
      }
      const inBase = qty * uFrom.toBase;
      return inBase / uTo.toBase;
    }

    // Totales de una cotización de eventos (un solo cálculo para editor, PDF, guardado y cobros).
    // - Los ítems marcados como opcionales salen en el PDF pero NO suman al total.
    // - Descuento: % sobre el subtotal + valor fijo en pesos (discountAmount), sin pasar del subtotal.
    function xpQuoteTotals(q) {
      const items = (q && Array.isArray(q.items)) ? q.items.filter(it => it && typeof it === 'object') : [];
      const line = it => (Number(it.qty) || 0) * (Number(it.price) || 0);
      const subtotal = items.filter(it => !it.optional).reduce((a, it) => a + line(it), 0);
      const optionalTotal = items.filter(it => it.optional).reduce((a, it) => a + line(it), 0);
      const discPct = Math.min(100, Math.max(0, Number(q && q.discountPct) || 0));
      const discountPctAmount = subtotal * discPct / 100;
      const discountFixed = Math.min(Math.max(0, Number(q && q.discountAmount) || 0), Math.max(0, subtotal - discountPctAmount));
      const discount = discountPctAmount + discountFixed;
      const afterDiscount = subtotal - discount;
      const tax = afterDiscount * (Number(q && q.taxPct) || 0) / 100;
      const total = afterDiscount + tax;
      const deposit = total * (Number(q && q.depositPct) || 0) / 100;
      return { subtotal, optionalTotal, discountPct: discPct, discountPctAmount, discountFixed, discount, afterDiscount, tax, total, deposit, balance: Math.max(0, total - deposit) };
    }
    window.xpQuoteTotals = xpQuoteTotals;

    // Siguiente número de cotización de eventos: COT-AAAA-NNNN (no se repite aunque se borren cotizaciones)
    function xpNextEventQuoteNumber() {
      const year = new Date().getFullYear();
      const nums = [...(state.savedQuotes || []).map(q => q && (q.baseNumber || q.number)), state.activeQuote && (state.activeQuote.baseNumber || state.activeQuote.number)]
        .map(n => String(n || '').match(/^COT-(\d{4})-(\d+)/i)).filter(m => m && Number(m[1]) === year).map(m => Number(m[2]));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      return `COT-${year}-${String(next).padStart(4, '0')}`;
    }
    window.xpNextEventQuoteNumber = xpNextEventQuoteNumber;

    function xpTodayISO(offsetDays = 0) {
      const d = new Date(); d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    window.xpTodayISO = xpTodayISO;

    function formatCurrency(val) {
      const n = Number(val) || 0;
      return '$ ' + Math.round(n).toLocaleString('es-CO');
    }

    function formatQty(val, unit = '') {
      const n = Number(val) || 0;
      const formatted = n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
      return unit ? `${formatted} ${unit}` : formatted;
    }

    // High Performance IndexedDB Storage Engine
    const XanderDB = {
      dbName: 'XanderProDB',
      storeName: 'app_state',
      db: null,
      init() {
        return new Promise((resolve) => {
          if (!window.indexedDB) { resolve(null); return; }
          try {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName);
              }
            };
            req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
            req.onerror = () => resolve(null);
          } catch(e) { resolve(null); }
        });
      },
      async get(key) {
        if (!this.db) await this.init();
        if (!this.db) return null;
        return new Promise((resolve) => {
          try {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const req = tx.objectStore(this.storeName).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch(e) { resolve(null); }
        });
      },
      async set(key, val) {
        if (!this.db) await this.init();
        if (!this.db) return false;
        return new Promise((resolve) => {
          try {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const req = tx.objectStore(this.storeName).put(val, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
          } catch(e) { resolve(false); }
        });
      }
    };

    function formatDateHuman(isoDate) {
      if (!isoDate) return '—';
      const parts = isoDate.split('-');
      if (parts.length !== 3) return isoDate;
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }

    // =====================================================
    // 2. INITIAL STATE (Tailored for Weddings, Birthdays & Events)
    // =====================================================
    function getDefaultState() {
      return {
        auth: {
          enabled: true,
          user: 'admin',
          password: 'Admin2026*',
          sessionTimeoutMins: 15
        },
        eventTypes: [
          { id: 'et-boda', name: 'Boda / Matrimonio', icon: '💍', isDefault: true },
          { id: 'et-cumple', name: 'Cumpleaños', icon: '🎂', isDefault: true },
          { id: 'et-15', name: 'Fiesta de 15 Años', icon: '👑', isDefault: true },
          { id: 'et-cena-rom', name: 'Cena Romántica', icon: '🕯️', isDefault: true },
          { id: 'et-cena', name: 'Cena / Banquete', icon: '🍽️', isDefault: true },
          { id: 'et-corp', name: 'Evento Corporativo', icon: '🏢', isDefault: true },
          { id: 'et-aniv', name: 'Aniversario / Social', icon: '🥂', isDefault: true },
          { id: 'et-brunch', name: 'Brunch / Desayuno', icon: '🥐', isDefault: true },
          { id: 'et-coctel', name: 'Coctel / Barra Libre', icon: '🍸', isDefault: true },
          { id: 'et-picnic', name: 'Picnic / Al Aire Libre', icon: '🧺', isDefault: true },
          { id: 'et-grado', name: 'Grado / Graduación', icon: '🎓', isDefault: true }
        ],
        company: {
          name: 'Aura Eventos & Catering',
          slogan: 'Alta Coctelería, Banquetes y Producción de Bodas & Eventos',
          nit: '901.482.310-9',
          phone: '+57 300 456 7890',
          email: 'contacto@auraeventos.co',
          address: 'El Poblado, Medellín - Colombia',
          logoDataUrl: '',
          bankDetails: 'Bancolombia Ahorros: 412-000981-23\nNequi / Daviplata: 300 456 7890\nTitular: Aura Eventos SAS',
          terms: 'Se reserva la fecha en agenda con el 50% de anticipo y el 50% restante 5 días antes del evento. El número final de invitados puede ajustarse hasta 8 días antes de la celebración.'
        },
        clients: [
          {
            id: 'cl-1',
            name: 'Camila Restrepo & Andrés Mejía',
            doc: '1.037.612.890',
            phone: '+57 310 555 0192',
            email: 'camila.boda@email.com',
            city: 'Medellín, Antioquia'
          },
          {
            id: 'cl-2',
            name: 'Familia Gómez — Cumpleaños 50 Carlos',
            doc: '71.380.421',
            phone: '+57 314 890 1122',
            email: 'carlos.gomez@empresa.co',
            city: 'Envigado, Antioquia'
          },
          {
            id: 'cl-3',
            name: 'Valeria Cano (Quinceaños Sofía)',
            doc: '43.910.221',
            phone: '+57 301 234 9876',
            email: 'valeria.eventos@correo.com',
            city: 'Rionegro, Llanogrande'
          }
        ],
        products: [
          // Insumos base (algunos con stock, otros en 0 porque apenas se cotiza)
          {
            id: 'p-ron',
            name: 'Ron Blanco Añejo (Insumo Licor)',
            type: 'simple',
            unit: 'L',
            trackStock: true,
            stock: 6, // 6 Litros en bodega
            cost: 68000,
            price: 110000,
            desc: 'Botella / Litro de Ron Blanco Añejo para coctelería o venta directa.'
          },
          {
            id: 'p-jarabe',
            name: 'Syrup Artesanal de Maracuyá & Flor de Jamaica',
            type: 'simple',
            unit: 'L',
            trackStock: true,
            stock: 0, // Stock 0! Se prepara/compra al aprobar el evento
            cost: 24000,
            price: 40000,
            desc: 'Extracto natural artesanal por litro.'
          },
          {
            id: 'p-fruta',
            name: 'Garnish Fruta Deshidratada y Hierbabuena',
            type: 'simple',
            unit: 'und',
            trackStock: false, // Sin inventario (perecedero bajo pedido)
            stock: 0,
            cost: 1200,
            price: 2500,
            desc: 'Porción decorativa fresca por cóctel o plato.'
          },
          {
            id: 'p-lomo',
            name: 'Lomo de Res Madurado (Insumo Catering)',
            type: 'simple',
            unit: 'kg',
            trackStock: false, // Bajo pedido para el evento
            stock: 0,
            cost: 52000,
            price: 85000,
            desc: 'Corte seleccionado fresco comprado exclusivamente para cada evento.'
          },
          // Productos Simples / Servicios No Compuestos para cotizar directo
          {
            id: 'p-bartender',
            name: 'Servicio de Bartender Profesional y Barra Móvil Iluminada',
            type: 'simple',
            unit: 'srv',
            trackStock: false,
            stock: 0,
            cost: 280000,
            price: 550000,
            desc: 'Incluye 2 bartenders uniformados, barra móvil capitoneada, transporte y 5 horas de servicio.'
          },
          {
            id: 'p-whisky',
            name: 'Botella Whisky 12 Años (750 ml) — Mesa de Licores',
            type: 'simple',
            unit: 'und',
            trackStock: true,
            stock: 4,
            cost: 135000,
            price: 210000,
            desc: 'Botella sellada de 750 ml con servicio de hielo cristalino y mezcladores.'
          },
          {
            id: 'p-sonido',
            name: 'Alquiler de Sonido Ambiental, Luces Cálidas y DJ',
            type: 'simple',
            unit: 'srv',
            trackStock: false,
            stock: 0,
            cost: 450000,
            price: 850000,
            desc: 'Montaje de sonido profesional para recepción, luces arquitectónicas y DJ por 6 horas.'
          },
          // RECETAS COMPUESTAS ESCALABLES POR CANTIDAD DE PERSONAS (PAX)
          {
            id: 'rec-coctel-pax',
            name: 'Experiencia Coctelería de Autor (2 Cócteles por Persona)',
            type: 'compuesto',
            unit: 'Personas (Pax)',
            basePax: 1,
            trackStock: false,
            stock: 0,
            cost: 15850,
            price: 38000,
            glassware: 'Copa Balón / Vaso Largo',
            waste: '3% - 5%',
            desc: 'Receta por persona: incluye 2 cócteles de autor (4 oz de licor premium, 2 oz de syrup artesanal, garnish fresco y cristalería).',
            ingredients: [
              { productId: 'p-ron', qty: 4, unit: 'oz' },     // 4 oz de Ron por persona
              { productId: 'p-jarabe', qty: 2, unit: 'oz' },  // 2 oz de Syrup por persona
              { productId: 'p-fruta', qty: 2, unit: 'und' }   // 2 Garnish por persona
            ]
          },
          {
            id: 'rec-cena-boda',
            name: 'Plato Fuerte Boda: Medallón de Lomo al Vino & Guarnición',
            type: 'compuesto',
            unit: 'Personas (Pax)',
            basePax: 1,
            trackStock: false,
            stock: 0,
            cost: 14200,
            price: 45000,
            glassware: 'Vajilla de Lujo / Plato Base',
            waste: '2% - 4%',
            desc: 'Menú servido a la mesa por persona (250 g de proteína en crudo, reducción de frutos rojos, vegetales glaseados y vajilla).',
            ingredients: [
              { productId: 'p-lomo', qty: 250, unit: 'g' },
              { productId: 'p-fruta', qty: 1, unit: 'und' }
            ]
          }
        ],
        activeQuote: {
          id: 'q-active',
          number: 'COT-2026-0001',
          eventType: 'Boda',
          status: 'Borrador',
          clientId: 'cl-1',
          eventTitle: 'Boda Camila Restrepo & Andrés Mejía',
          guestsPax: 120,
          eventDate: '2026-12-12',
          eventVenue: 'Hacienda Fizebad, El Retiro',
          issueDate: '2026-11-01',
          validUntil: '2026-11-16',
          discountPct: 0,
          taxPct: 0,
          depositPct: 50,
          observations: '• Incluye montaje de barra móvil 2 horas antes del inicio de la recepción.\n• Se contemplan 10 menús vegetarianos y estación de hidratación sin alcohol para niños.\n• Cristalería y menaje incluidos sin costo adicional de rotura menor (hasta 3 piezas).',
          items: [
            {
              rowId: 'item-1',
              productId: 'rec-coctel-pax',
              name: 'Experiencia Coctelería de Autor (2 Cócteles por Persona)',
              desc: 'Receta por persona: incluye 2 cócteles de autor (4 oz de licor premium, 2 oz de syrup artesanal, garnish fresco y cristalería).',
              isRecipe: true,
              qty: 120,
              unit: 'Personas (Pax)',
              price: 38000
            },
            {
              rowId: 'item-2',
              productId: 'rec-cena-boda',
              name: 'Plato Fuerte Boda: Medallón de Lomo al Vino & Guarnición',
              desc: 'Menú servido a la mesa por persona (250 g de proteína en crudo, reducción de frutos rojos, vegetales glaseados y vajilla).',
              isRecipe: true,
              qty: 120,
              unit: 'Personas (Pax)',
              price: 45000
            },
            {
              rowId: 'item-3',
              productId: 'p-bartender',
              name: 'Servicio de Bartender Profesional y Barra Móvil Iluminada',
              desc: 'Incluye 2 bartenders uniformados, barra móvil capitoneada, transporte y 5 horas de servicio.',
              isRecipe: false,
              qty: 1,
              unit: 'Servicio',
              price: 550000
            }
          ]
        },
        savedQuotes: [
          {
            id: 'sq-1',
            number: 'COT-2026-0001',
            eventType: 'Boda',
            eventTitle: 'Boda Camila Restrepo & Andrés Mejía',
            clientId: 'cl-1',
            guestsPax: 120,
            eventDate: '2026-12-12',
            validUntil: '2026-11-16',
            total: 10510000,
            status: 'Enviada'
          },
          {
            id: 'sq-2',
            number: 'COT-2026-0002',
            eventType: 'Cumpleaños',
            eventTitle: 'Cumpleaños 50 Carlos Gómez',
            clientId: 'cl-2',
            guestsPax: 60,
            eventDate: '2026-11-28',
            validUntil: '2026-11-12',
            total: 3680000,
            status: 'Aprobada'
          }
        ],
        finances: [
          {
            id: 'fin-1',
            type: 'ingreso',
            date: '2026-10-28',
            concept: 'Anticipo 50% — Cumpleaños 50 Carlos Gómez (COT-2026-0002)',
            category: 'Anticipo Evento',
            method: 'Transferencia',
            amount: 1840000
          },
          {
            id: 'fin-2',
            type: 'egreso',
            date: '2026-10-29',
            concept: 'Compra de Licores y Cristalería Evento Carlos Gómez',
            category: 'Compra de Insumos',
            method: 'Transferencia',
            amount: 690000
          },
          {
            id: 'fin-3',
            type: 'egreso',
            date: '2026-10-30',
            concept: 'Pago anticipo Bartenders y Transporte Barra Móvil',
            category: 'Personal y Meseros',
            method: 'Nequi / Billetera',
            amount: 280000
          }
        ],
        cabins: [
          {
            id: 'cab-1',
            code: 'CAB-01',
            name: 'Cabaña El Mirador del Bosque',
            description: 'Hermosa cabaña rústica de dos niveles con vista panorámica, rodeada de naturaleza y tranquilidad absoluta.',
            baseCapacity: 4,
            maxCapacity: 8,
            baseNightlyRate: 480000,
            extraPersonRate: 75000,
            allowsPets: true,
            petRate: 35000,
            petChargeType: 'per_night',
            rooms: 3,
            bathrooms: 2,
            pool: true,
            jacuzzi: true,
            ac: true,
            parking: true,
            wifi: true,
            bbq: true,
            status: 'active',
            photos: [
              { id: 'ph-1', url: 'img/cabana-1.svg', isMain: true, caption: 'Vista Exterior' },
              { id: 'ph-2', url: 'img/cabana-2.svg', isMain: false, caption: 'Sala y Chimenea' }
            ],
            observations: 'Check-in: 3:00 PM | Check-out: 12:00 M. Se prohíbe el uso de bafles de alta potencia después de las 11:00 PM.'
          },
          {
            id: 'cab-2',
            code: 'CAB-02',
            name: 'Cabaña Río Cristalino',
            description: 'Acogedora cabaña campestre frente al arroyo, ideal para parejas y familias pequeñas que buscan desconexión.',
            baseCapacity: 2,
            maxCapacity: 4,
            baseNightlyRate: 320000,
            extraPersonRate: 65000,
            allowsPets: false,
            petRate: 0,
            petChargeType: 'per_stay',
            rooms: 1,
            bathrooms: 1,
            pool: false,
            jacuzzi: true,
            ac: true,
            parking: true,
            wifi: true,
            bbq: true,
            status: 'active',
            photos: [
              { id: 'ph-3', url: 'img/cabana-3.svg', isMain: true, caption: 'Frente al Río' }
            ],
            observations: 'No se admiten mascotas por normatividad de reserva natural. Desayuno incluido opcional.'
          }
        ],
        childPolicies: [
          { id: 'cp-1', range: '0-4', label: '0 a 4 años', rate: 0, countsTowardsMaxCapacity: false, note: 'Gratis en cama compartida' },
          { id: 'cp-2', range: '5-10', label: '5 a 10 años', rate: 40000, countsTowardsMaxCapacity: true, note: 'Tarifa reducida por noche' },
          { id: 'cp-3', range: '11+', label: '11 años en adelante', rate: null, isAdult: true, countsTowardsMaxCapacity: true, note: 'Tarifa completa adulto' }
        ],
        mealPlans: [
          { id: 'mp-1', name: 'Sin Alimentación', costPerPaxPerNight: 0, desc: 'Solo hospedaje. Cocina dotada disponible en cabaña.', observations: 'Uso libre de cocina y zona BBQ.' },
          { id: 'mp-2', name: 'Solo Desayuno', costPerPaxPerNight: 25000, desc: 'Desayuno campestre artesanal o típico servido en cabaña.', observations: 'Servicio entre 7:30 AM y 9:30 AM.' },
          { id: 'mp-3', name: 'Desayuno + Cena', costPerPaxPerNight: 55000, desc: 'Media pensión con desayuno campestre y cena especial del chef.', observations: 'Menú sugerido cada mañana.' },
          { id: 'mp-4', name: 'Pensión Completa', costPerPaxPerNight: 90000, desc: 'Desayuno, almuerzo típico y cena completa por noche.', observations: 'Bebidas no alcohólicas incluidas.' }
        ],
        tourServices: [
          { id: 'ts-1', name: 'Transporte Aeropuerto Compartido', desc: 'Traslado desde el aeropuerto hacia las cabañas en van compartida.', chargeType: 'per_person', vehicleCapacity: null, rate: 45000, status: 'active' },
          { id: 'ts-2', name: 'Servicio Especial Aeropuerto', desc: 'Camioneta privada exclusiva climatizada con capacidad de 1 a 4 personas.', chargeType: 'per_vehicle', vehicleCapacity: 4, rate: 280000, status: 'active' },
          { id: 'ts-3', name: 'Transporte Fluvial Isla Fuerte', desc: 'Lancha rápida ida y regreso con seguro de viaje y chalecos salvavidas.', chargeType: 'per_person', vehicleCapacity: null, rate: 70000, status: 'active' },
          { id: 'ts-4', name: 'Valle de los Micos', desc: 'Caminata ecológica guiada por el sendero nativo y avistamiento de fauna.', chargeType: 'per_person', vehicleCapacity: null, rate: 30000, status: 'active' }
        ],
        cabinQuotes: [
          {
            id: 'cq-demo-1',
            number: 'HOS-2026-0001',
            baseNumber: 'HOS-2026-0001',
            version: 1,
            status: 'Enviada',
            clientId: 'cl-1',
            cabinId: 'cab-1',
            checkInDate: '2026-11-15',
            checkOutDate: '2026-11-18',
            nights: 3,
            adults: 4,
            kids0to4: 1,
            kids5to10: 1,
            pets: 1,
            baseNightlyRate: 480000,
            originalRate: 480000,
            rateModified: false,
            modificationReason: '',
            modifiedBy: '',
            modifiedAt: '',
            mealPlanId: 'mp-2',
            mealPlanPax: 5,
            selectedTourServices: [
              { id: 'ts-3', name: 'Transporte Fluvial Isla Fuerte', quantity: 5, unitRate: 70000, total: 350000, chargeType: 'per_person' }
            ],
            discountAmount: 50000,
            depositPercentage: 50,
            expirationDate: '2026-11-12',
            observations: 'Llegada aproximada a las 4:00 PM. Se solicita cuna adicional para bebé si es posible.',
            pricing: {
              nights: 3,
              nightlyRate: 480000,
              subtotalBase: 1440000,
              extraPaxCount: 0,
              extraPersonRate: 75000,
              subtotalExtraPax: 0,
              kids5to10: 1,
              childRate5to10: 40000,
              subtotalKids: 120000,
              kids0to4: 1,
              pets: 1,
              petRate: 35000,
              petChargeType: 'per_night',
              subtotalPets: 105000,
              mealPlanName: 'Solo Desayuno',
              mealPax: 5,
              mealRate: 25000,
              subtotalMeals: 375000,
              selectedTours: [
                { id: 'ts-3', name: 'Transporte Fluvial Isla Fuerte', quantity: 5, unitRate: 70000, total: 350000, chargeType: 'per_person' }
              ],
              subtotalTours: 350000,
              discount: 50000,
              depositPct: 50,
              total: 2340000,
              deposit: 1170000,
              balance: 1170000
            },
            createdBy: 'Alexander',
            createdAt: '2026-11-06'
          }
        ],
        activeCabinQuote: null,
        users: [
          { id: 'usr-1', username: 'admin', name: 'Alexander (Admin)', role: 'Administrador', password: 'Admin2026*', active: true }
        ]
      };
    }

    let state = getDefaultState();
    let tempRecipeIngredients = [];
    let financeChartInstance = null;

    function loadState() {
      try {
        const raw = localStorage.getItem('xander_pro_state_v1') || localStorage.getItem('eventquote_pro_state_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.company && parsed.products) {
            state = parsed;
          }
        }
        if (!state.auth) {
          state.auth = getDefaultState().auth;
        } else if (!state.auth.password) {
          state.auth.password = 'Admin2026*';
        }
        if (!state.eventTypes || !Array.isArray(state.eventTypes) || state.eventTypes.length === 0) {
          state.eventTypes = getDefaultState().eventTypes;
        }
        // Quote version control schema migration & backwards compatibility
        if (Array.isArray(state.savedQuotes)) {
          state.savedQuotes.forEach(sq => {
            if (!sq.version) sq.version = 1;
            if (!sq.baseNumber) sq.baseNumber = (sq.number || "").replace(/\s*V\d+$/i, "").trim();
            if (!sq.status) sq.status = "Borrador";
            if (!sq.createdBy) sq.createdBy = (typeof getOperatorName === "function") ? getOperatorName() : "Alexander";
            if (!sq.createdAt) sq.createdAt = sq.issueDate || "2026-11-01";
            if (!sq.changeReason) sq.changeReason = "Versi\u00F3n inicial";
            if (sq.fullCopy) {
              if (!sq.fullCopy.version) sq.fullCopy.version = sq.version;
              if (!sq.fullCopy.baseNumber) sq.fullCopy.baseNumber = sq.baseNumber;
              if (!sq.fullCopy.status) sq.fullCopy.status = sq.status;
            }
          });
        }
        if (state.activeQuote) {
          if (!state.activeQuote.version) state.activeQuote.version = 1;
          if (!state.activeQuote.baseNumber) state.activeQuote.baseNumber = (state.activeQuote.number || "").replace(/\s*V\d+$/i, "").trim();
          if (!state.activeQuote.status) state.activeQuote.status = "Borrador";
          if (!state.activeQuote.createdBy) state.activeQuote.createdBy = (typeof getOperatorName === "function") ? getOperatorName() : "Alexander";
          if (!state.activeQuote.createdAt) state.activeQuote.createdAt = state.activeQuote.issueDate || "2026-11-01";
          if (!state.activeQuote.changeReason) state.activeQuote.changeReason = "Versi\u00F3n inicial";
        }
        if (typeof migrateCabanasState === 'function') migrateCabanasState();
      } catch (err) {
        // Ignore storage errors in sandboxed iframes
      }
    }

    function saveState() {
      try {
        localStorage.setItem('xander_pro_state_v1', JSON.stringify(state));
      } catch (err) {}
      if (typeof XanderDB !== 'undefined') {
        XanderDB.set('main_state', state).catch(() => {});
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast-notification');
      const text = document.getElementById('toast-msg');
      if (!toast || !text) return;
      text.textContent = msg;
      toast.classList.remove('hidden');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, 3200);
    }
