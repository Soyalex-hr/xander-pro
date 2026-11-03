# Xander Pro — Plataforma de Gestión Operativa, Cotizaciones y Finanzas para Eventos

Sistema web progresivo (PWA) de nivel empresarial diseñado para empresas de catering, coctelería de autor, banquetes, producción de bodas y eventos sociales. 

Inspirado en los principios de claridad, productividad y rendimiento de herramientas modernas como **Stripe Dashboard, Notion, Linear y Vercel**, Xander Pro permite formular propuestas por volumen de invitados (Pax), controlar inventarios de insumos, auditar la rentabilidad real de cada evento, calendarizar la operación y proyectar el flujo de caja.

---

## 🚀 Principales Módulos y Mejoras de la Versión Actual

### 1. ⚡ Dashboard Operativo Central ("Buenos días, Alexander")
- **Punto de Inicio Ejecutivo:** Saludo dinámico según la hora del día (`Buenos días / Buenas tardes / Buenas noches, Alexander`), fecha colombiana completa y barra de atajos rápidos (+ Nueva Cotización, 📅 Agenda, 👥 Clientes, 💰 Finanzas).
- **6 Indicadores KPI en Vivo:**
  - Cotizaciones Activas (conteo y valor total).
  - Eventos Programados (conteo y total de invitados Pax confirmados).
  - Balance del Mes (ingresos netos menos egresos del mes en curso).
  - Ganancia Estimada (utilidad bruta comercial proyectada).
  - Ganancia Real Liquidada (cierre acumulado de eventos finalizados).
  - Alertas Pendientes (conteo de notificaciones críticas y advertencias).
- **Módulo Central: ACCIONES PENDIENTES:** 7 tarjetas interactivas de resolución inmediata:
  - 🔴 Cotizaciones vencidas o próximas a vencer.
  - 📅 Eventos confirmados para los próximos 7 días.
  - 🏁 Eventos finalizados sin cerrar / liquidar.
  - 🛒 Compras de insumos pendientes por adquirir.
  - 📦 Insumos agotados en inventario (existencia en 0).
  - 💳 Saldos de pago pendientes por recaudar.
- **Widget de Vencimientos:** Filtros rápidos (🔴 Vencen Hoy / Vencidas, 🟡 En 3 Días, 🟢 En 7 Días, Todas) con tabla en PC y tarjetas táctiles en móviles con botón de gestión directa.
- **Agenda Próxima & Movimientos Recientes:** Visualización compacta de los próximos eventos confirmados y los últimos abonos o compras registradas.

---

### 2. 🔔 Centro de Notificaciones y Alertas del Sistema
- **Campana de Alertas en Encabezado:** Contador animado de alertas no leídas.
- **Clasificación Semántica:**
  - 🔴 **Crítico:** Vencen hoy, vencidas, vencen mañana, eventos en 48 horas, insumo agotado en bodega, saldo pendiente urgente.
  - 🟡 **Advertencia:** Vencen en 3 días, eventos en la semana, eventos pasados sin cierre operacional, saldos pendientes.
  - 🟢 **Informativo:** Cotizaciones activas con 7 días de vigencia.
- **Interacción Contextual:** Acciones de *Marcar como leída*, *Marcar todas leídas* e *Ir directamente al documento* (abre el cotizador, el cierre o el almacén según la alerta).
- **Soporte Push Local:** Compatible con notificaciones del navegador y celulares Android / iPhone sin servidores externos.

---

### 3. 👥 Administración Completa de Clientes
- **Directorio Dinámico:** Búsqueda en tiempo real por Nombre, Documento (CC/NIT), Correo, Teléfono y Ciudad.
- **Acciones Rápidas:**
  - ✏️ **Editar Cliente:** Actualización modal de datos de contacto.
  - 🗑️ **Eliminar Cliente:** Confirmación con verificación inteligente de cotizaciones asociadas y protección de historial.
  - 📄 **Nueva Cotización:** Autocompleta automáticamente Nombre, Documento, Teléfono, Correo y Dirección en el cotizador.
  - 📋 **Duplicar Cliente:** Crea una copia con nuevo identificador.
  - 📈 **Ver Historial:** Modal con métricas clave (total cotizaciones, total vendido, total cobrado, última fecha) y tabla de cotizaciones con carga en 1 clic.
- **Tarjetas Móviles Táctiles:** En teléfonos y tablets, la información se presenta en tarjetas táctiles con botones grandes de mínimo 44px.

---

### 4. 🏁 Rentabilidad Real vs. Estimada y Cierre de Eventos
- **Auditoría Post-Evento:** Comparación financiera entre lo presupuestado y lo realmente ejecutado:
  - Venta Cotizada vs. Venta Facturada Real.
  - Costo Estimado vs. Costo Real (incluyendo compras imprevistas y gastos extra).
  - Ganancia Estimada vs. Ganancia Real.
- **Semáforo de Desempeño:**
  - 🟢 **Superior:** Margen $> +3\%$ sobre lo proyectado.
  - 🟡 **Normal:** Variación entre $-5\%$ y $+3\%$.
  - 🔴 **Inferior:** Desviación $< -5\%$ (alerta de fuga de rentabilidad).
- **Bitácora de Cierre:** Registro estructurado de:
  - ¿Qué salió bien?
  - ¿Qué salió mal / desperdicios detectados?
  - Problemas encontrados en ejecución.
  - Recomendaciones para eventos futuros.
- **Exportación CSV:** Historial exportable a Excel con cabeceras UTF-8.

---

### 5. 🛒 Lista Automática de Compras
- **Explosión Automática de Insumos:** Desglosa todos los ingredientes de recetas simples y compuestas según la cantidad de personas (Pax).
- **Cálculo de Inventario:** Determina automáticamente `Requerido`, `En Bodega`, `Faltante a Comprar` y `Costo Estimado`.
- **Checklist Interactivo:** Marcar productos como comprados con guardado persistente por evento.
- **Exportaciones Múltiples:** Descarga en **PDF de alta resolución**, exportación a **Excel (CSV UTF-8 BOM)** e impresión física.

---

### 6. 📅 Agenda Operativa de Eventos
- **Calendario Interactivo:** Vistas de **Mes**, **Semana** y **Día**.
- **Filtros Avanzados:** Por estado comercial (Aprobada, Enviada, Borrador) y por cliente.
- **Fichas de Evento:** Cliente, locación, cantidad de personas (Pax), hora y estado con enlace de acceso directo.

---

### 7. 📈 Flujo de Caja Proyectado
- **Cálculo a Futuro:** Ingresos proyectados (eventos confirmados y cotizados ponderados), costos de recetas estimadas y saldo neto a percibir.
- **Períodos:** Visualización **Semanal** (próximas 6 semanas), **Mensual** (próximos 6 meses) y **Trimestral** (próximos 4 trimestres).
- **Gráficos Ligeros:** Curva financiera renderizada con Chart.js en tonos empresariales.

---

### 8. 💡 Historial de Precios y Sugerencias Comerciales
- **Memoria Comercial:** Registra automáticamente los precios cobrados por cada producto o receta a lo largo del tiempo.
- **Estadísticas en Staging:** Muestra último precio aplicado al cliente, promedio histórico, mínimo y máximo cobrado.
- **Aplicación con 1 Clic:** Sugerencia inteligente de precios al armar la cotización.

---

### 9. 🎨 Paleta Empresarial y Design System Moderno
- **Color Principal:** `#2563EB` (Azul Ejecutivo).
- **Éxito:** `#16A34A` (Verde Esmeralda).
- **Advertencia:** `#F59E0B` (Ámbar).
- **Error / Crítico:** `#DC2626` (Rojo Carmesí).
- **Información:** `#0EA5E9` (Azul Cielo).
- **Fondos:** Claro (`#F8FAFC` / `#FFFFFF`) y Oscuro (`#0F172A` / `#1E293B`).
- **Radios y Sombras:** Bordes redondeados entre `12px` y `16px`, sombras suaves y tipografía `Inter` con cifras tabulares.

---

### 10. 🇨🇴 Formatos Numéricos Colombianos y Codificación UTF-8
- **Moneda:** Formato colombiano estricto: `$ 1.250.000` (con espacio y punto de miles).
- **Cantidades:** Coma para decimales en recetas e insumos: `15,5 kg`, `2,75 L`, `4 oz`.
- **UTF-8 Estricto:** Preservación de tildes (á, é, í, ó, ú), letra eñe (ñ, Ñ) y caracteres especiales en formularios, cuenta de cobro, reportes PDF y CSVs con BOM (`\uFEFF`).

---

### 11. 💾 Persistencia de Alto Rendimiento (IndexedDB + LocalStorage)
- **Motor `XanderDB`:** Almacenamiento asíncrono en IndexedDB para catálogos masivos, recetas y cotizaciones ilimitadas.
- **LocalStorage Sincronizado:** Acceso inmediato a tokens de sesión y preferencias de tema sin retrasos de renderizado.
- **Migración Automática:** Conserva el 100% de los datos previos almacenados en el navegador.

---

## 🔑 Credenciales Iniciales
- **Usuario:** `admin`
- **Contraseña:** `Admin2026*`

---

## 📁 Estructura del Proyecto

```text
├── index.html          # Aplicación SPA Completa (Dashboard, Cotizador, Agenda, Finanzas, Rentabilidad)
├── sw.js               # Service Worker v16 (Offline-first, caché inteligente y soporte PWA)
├── manifest.json       # Manifiesto PWA para instalación en Escritorio, Android e iOS
├── icon-192.svg        # Ícono vectorial para dispositivos móviles (192px)
├── icon-512.svg        # Ícono vectorial de alta resolución (512px)
├── icon-192.png        # Ícono rasterizado optimizado
├── icon-512.png        # Ícono rasterizado para splash screens
├── vercel.json         # Configuración de cabeceras de seguridad CSP, HSTS y URLs limpias
├── Iniciar-PWA.bat     # Lanzador local para entorno de desarrollo Windows
├── server.ps1          # Servidor HTTP local ligero en PowerShell
└── README.md           # Manual de usuario y especificación técnica
```
