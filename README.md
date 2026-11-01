# Xander Pro — Sistema de Cotizaciones para Eventos

Sistema web integral y moderno diseñado para empresas de catering, coctelería, bodas y eventos sociales. Permite cotizar por volumen de invitados (Pax), formular recetas compuestas con conversión automática de unidades (ml, oz, L, g, kg), gestionar inventario de insumos, simular costos y márgenes en pantalla completa, generar propuestas comerciales en PDF de alta resolución y controlar el flujo de caja.

---

## 🎨 Nuevas Funcionalidades y Mejoras Recientes

1. **📲 Aplicación Instalable (PWA - Progressive Web App)**:
   - Botón directo **"📲 Instalar App"** en la barra superior y en el menú de usuario.
   - Cuenta con Service Worker (`sw.js`), manifiesto (`manifest.json`) e iconos vectoriales (`icon-192.svg`, `icon-512.svg`).
   - Funciona como aplicación independiente de escritorio (Windows, Mac) y móvil (Android, iPhone / iPad) con soporte fuera de línea (offline).

2. **🌓 Modo Oscuro / Modo Claro (Negro y Blanco)**:
   - Alternador rápido con un clic (☀️ / 🌙) en la barra de navegación y en el menú de usuario.
   - Paleta oscura moderna de alto contraste para trabajar de noche o en eventos con poca luz.
   - **Garantía en PDF**: El documento de cotización (`#pdf-document-sheet`) siempre conserva su hoja blanca con tipografía nítida para clientes e impresión física.

3. **✨ Pantalla de Inicio de Sesión Animada**:
   - Fondo dinámico con orbes flotantes de luz y efecto glassmorphism.
   - Autenticación directa y fluida (sin tecnicismos de hashes criptográficos en pantalla).
   - Credenciales iniciales: Usuario `admin` | Contraseña `Admin2026*`.

4. **✏️ Gestión Total de Conceptos en el Cotizador (Crear, Modificar y Eliminar)**:
   - Directamente desde la sección de datos del evento, sin salir del cotizador:
     - **`➕ Nuevo`**: Crea un nuevo concepto y le asigna un emoji temático en tiempo real.
     - **`✏️ Modificar`**: Renombra el concepto seleccionado y actualiza la cotización y el PDF al instante.
     - **`🗑️ Eliminar`**: Elimina del catálogo cualquier concepto que ya no utilices.

5. **🧪 Pantalla Dedicada: Simulador de Recetas y Escalamiento de Pax**:
   - Pestaña independiente en el menú principal (`🧪 Simulador de Recetas`).
   - Selector de recetas con botones rápidos de Pax (30, 50, 80, 100, 150, 200, 300, 500 invitados).
   - Control deslizante de margen de ganancia comercial (20% a 85%).
   - 4 tarjetas de métricas en vivo: Costo unitario, Costo total de insumos, Precio de venta sugerido y Utilidad bruta estimada.
   - Tabla de explosión de insumos con verificación de stock en bodega (suficiente vs. faltante).
   - Botón directo para enviar la receta simulada a la cotización activa.
   - Botón para imprimir la ficha técnica de compras para la cocina/barra.

6. **🌐 Interfaz Limpia y Portable**:
   - Se removió cualquier mención a marcas de hosting externas dentro de la aplicación.
   - Compatible para desplegar en cualquier servidor, hosting web o usar en local.

---

## 🔑 Credenciales Iniciales:
- **Usuario:** `admin`
- **Contraseña:** `Admin2026*`
> 💡 *Puedes modificar tu contraseña en cualquier momento con un clic en tu avatar en la esquina superior derecha.*

---

## 📁 Estructura del Proyecto

```text
├── index.html          # Punto de entrada principal (SPA con Cotizador, Simulador y Modo Oscuro)
├── sw.js               # Service Worker para funcionamiento offline y PWA
├── manifest.json       # Manifiesto PWA para instalación en PC y móviles
├── icon-192.svg        # Ícono vectorial de alta resolución (192px)
├── icon-512.svg        # Ícono vectorial de alta resolución (512px)
├── vercel.json         # Cabeceras de seguridad CSP, HSTS y URLs limpias
├── .gitignore          # Filtro de archivos para control de versiones
└── README.md           # Documentación y manual de uso
```
