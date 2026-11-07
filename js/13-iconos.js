/* Xander Pro — 13-iconos: emojis → íconos de línea (estilo A)
 *
 * Reemplaza en pantalla cada emoji por un ícono SVG del mismo estilo, también
 * en lo que se dibuja después (listas, tarjetas, PDF). No toca datos, textos
 * que se envían por WhatsApp ni campos de texto. En las listas desplegables
 * (<option>) el emoji simplemente se quita, porque ahí no caben íconos.
 */
(function () {
  const P = {
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    dot: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    glass: '<path d="M8 22h8M12 11v11"/><path d="M4 3h16l-8 8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    users: '<path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1"/><circle cx="9.5" cy="8" r="3.5"/><path d="M21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.1A10 10 0 0122 12s-1 2-3 4M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a9.8 9.8 0 005.4-1.6"/>',
    clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a1 1 0 00-1 1v14a1 1 0 001 1h12a1 1 0 001-1V6a1 1 0 00-1-1h-2"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    party: '<path d="M4 20l5-14 9 9z"/><path d="M14 4l.8-2M18 8l2-.8M16.5 5.5l2-2"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    utensils: '<path d="M4 2v7a3 3 0 003 3v10M10 2v7a3 3 0 01-3 3M7 2v6"/><path d="M19 2c-2 0-3 3-3 6s1 4 3 4v10"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    phoneDevice: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    crown: '<path d="M3 18h18M4 8l4 5 4-7 4 7 4-5-1.5 10h-13z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    pin: '<path d="M12 22s7-7 7-12a7 7 0 00-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2A19.8 19.8 0 013 5.2 2 2 0 015 3h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L9 10.6a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.8.3 1.7.6 2.6.7a2 2 0 011.7 2z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    car: '<path d="M3 13l2-6h14l2 6v5H3z"/><path d="M3 13h18M7 18v2M17 18v2"/><path d="M7 15.5h.01M17 15.5h.01"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14s1.3 2 3.5 2 3.5-2 3.5-2M9 9.5h.01M15 9.5h.01"/>',
    waves: '<path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 6c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
    bath: '<path d="M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5z"/><path d="M6 12V5a2 2 0 014 0M7 20l-1 2M17 20l1 2"/>',
    snow: '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9"/>',
    wifi: '<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    door: '<path d="M5 21V3h11v18M3 21h18M13 12h.01"/><path d="M16 7h3v14"/>',
    refresh: '<path d="M21 12a9 9 0 01-15.5 6.4L3 16M3 12a9 9 0 0115.5-6.4L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7 15h10"/>',
    building: '<path d="M4 21V5l8-2v18M12 7l8 2v12M2 21h20M8 9h.01M8 13h.01M8 17h.01M16 13h.01M16 17h.01"/>',
    bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    paw: '<circle cx="5.5" cy="10" r="1.8"/><circle cx="9.5" cy="5.5" r="1.8"/><circle cx="14.5" cy="5.5" r="1.8"/><circle cx="18.5" cy="10" r="1.8"/><path d="M12 11c-3 0-6 3.5-6 6.5 0 1.5 1.2 2.5 2.7 2.5 1.2 0 2-.6 3.3-.6s2.1.6 3.3.6c1.5 0 2.7-1 2.7-2.5 0-3-3-6.5-6-6.5z"/>',
    folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
    rocket: '<path d="M5 15c-2 1-2 5-2 5s4 0 5-2"/><path d="M9 15l-3-3c1-5 5-9 12-10-1 7-5 11-9 13z"/><circle cx="15" cy="9" r="1.5"/>',
    cart: '<path d="M3 3h2l2.5 12h11L21 7H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>',
    ring: '<circle cx="12" cy="15" r="6"/><path d="M9.5 6L12 3l2.5 3L12 9z"/>',
    cake: '<path d="M4 21h16v-8H4z"/><path d="M4 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M12 13V9M12 5.5v.01"/>',
    candle: '<path d="M10 21h4V10h-4zM12 10V7.5"/><path d="M12 3c1 1.2 1 2.4 0 3.5-1-1.1-1-2.3 0-3.5z"/>',
    basket: '<path d="M3 10h18l-2 10H5z"/><path d="M7 10l5-6 5 6M9 14v3M15 14v3"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    pushpin: '<path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    books: '<path d="M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 002 2h13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z"/>',
    fire: '<path d="M12 22a7 7 0 007-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 007 7z"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4M9 14h.01M15 14h.01"/>',
    offline: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M3 3l18 18"/>',
    ruler: '<path d="M3 21L21 3v18z"/><path d="M7 21v-3M11 21v-3M15 21v-3"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
    checkSquare: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><path d="M7.5 7.5h.01"/>',
    leaf: '<path d="M5 21c0-9 5-15 15-16-1 10-7 15-15 16z"/><path d="M5 21l8-8"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="3.5"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1.5S12 8 12 8zm0 0c2-4 6-4 6-1.5S12 8 12 8z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 000-7.8z"/>',
    link: '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
    boat: '<path d="M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M4 17l-1-4h18l-2 4M12 13V3l5 6h-5"/>',
    bed: '<path d="M3 18V6M3 12h18v6M21 18v-3M7 12V9h5v3"/>',
    tree: '<path d="M12 22v-5M12 2L5 12h4l-3 5h12l-3-5h4z"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>', chevR: '<path d="M9 18l6-6-6-6"/>', chevU: '<path d="M18 15l-6-6-6 6"/>', chevD: '<path d="M6 9l6 6 6-6"/>',
    pause: '<path d="M9 5v14M15 5v14"/>', play: '<path d="M7 4l13 8-13 8z"/>'
  };

  // Emoji (sin el selector de variación) → [ícono, color fijo opcional]
  const MAP = {
    '✅': ['checkCircle', '#16A34A'], '✔': ['check'], '✓': ['check'], '☑': ['checkSquare'], '☐': ['square'],
    '❌': ['xCircle', '#DC2626'], '✖': ['xCircle'], '⚠': ['alert', '#D97706'], '🚫': ['ban', '#DC2626'],
    '🔴': ['dot', '#DC2626'], '🟡': ['dot', '#D97706'], '🟢': ['dot', '#16A34A'], '🔵': ['dot', '#2563EB'], '🟠': ['dot', '#EA580C'], '⚪': ['dot', '#94A3B8'], '⚫': ['dot', '#334155'],
    '✏': ['pencil'], '📝': ['pencil'], '🖊': ['pencil'], '🖋': ['pencil'],
    '🏡': ['home'], '🏠': ['home'], '🏘': ['home'], '🛖': ['home'], '🏕': ['tree'], '🌲': ['tree'], '🌳': ['tree'], '🌿': ['leaf'], '🍃': ['leaf'],
    '🍹': ['glass'], '🍸': ['glass'], '🥂': ['glass'], '🍷': ['glass'], '🍾': ['glass'], '🥤': ['glass'], '☕': ['glass'],
    '➕': ['plus'], '➖': ['minus'], '📦': ['box'], '⚡': ['zap'], '🗑': ['trash'],
    '📅': ['calendar'], '📆': ['calendar'], '🗓': ['calendar'],
    '☀': ['sun'], '🌞': ['sun'], '🌅': ['sun'], '🏖': ['sun'], '✨': ['sparkles'], '🌟': ['star'], '⭐': ['star'],
    '🌙': ['moon'], '🌛': ['moon'],
    '👥': ['users'], '👪': ['users'], '👨‍👩‍👧': ['users'], '👤': ['user'], '🙋': ['user'], '🧑': ['user'], '👨': ['user'], '👩': ['user'],
    '👁': ['eye'], '👀': ['eye'], '🙈': ['eyeOff'],
    '📋': ['clipboard'], '🗒': ['clipboard'], '💾': ['save'], '📥': ['download'], '⬇': ['arrowDown'], '⬆': ['arrowUp'], '📤': ['arrowUp'],
    '🎉': ['party'], '🎊': ['party'], '🥳': ['party'], '🎈': ['party'], '🎁': ['gift'],
    '💡': ['bulb'], '🔍': ['search'], '🔎': ['search'],
    '🍽': ['utensils'], '🥩': ['utensils'], '🥐': ['utensils'], '🍎': ['utensils'], '🍳': ['utensils'], '🥗': ['utensils'], '🍲': ['utensils'], '🥘': ['utensils'], '🍰': ['cake'], '🧁': ['cake'], '🎂': ['cake'], '🍔': ['utensils'], '🍕': ['utensils'], '🥞': ['utensils'], '🍞': ['utensils'],
    '🔒': ['lock'], '🔐': ['lock'], '🔓': ['lock'], '🔑': ['key'], '🗝': ['key'],
    '📲': ['phoneDevice'], '📱': ['phoneDevice'], '📴': ['offline'], '📞': ['phone'], '☎': ['phone'],
    '✉': ['mail'], '📧': ['mail'], '📨': ['mail'], '📩': ['mail'],
    '👑': ['crown'], '💵': ['money'], '💸': ['money'], '💰': ['money'], '🪙': ['money'], '💲': ['money'], '🏦': ['bank'], '💳': ['card'],
    '📍': ['pin'], '📌': ['pushpin'], '💼': ['briefcase'],
    '📄': ['file'], '📃': ['file'], '📑': ['file'], '🧾': ['file'], '📜': ['file'],
    '🚐': ['car'], '🚗': ['car'], '🚙': ['car'], '🚌': ['car'], '🚕': ['car'], '🛻': ['car'], '🅿': ['car'], '⛵': ['boat'], '🚤': ['boat'], '🛥': ['boat'],
    '👶': ['smile'], '🧒': ['smile'], '👦': ['smile'], '👧': ['smile'], '😊': ['smile'], '🙂': ['smile'],
    '🏊': ['waves'], '🌊': ['waves'], '🛁': ['bath'], '🚿': ['bath'], '♨': ['bath'], '❄': ['snow'], '🧊': ['snow'], '📶': ['wifi'], '🛜': ['wifi'],
    '🚪': ['door'], '🔄': ['refresh'], '🔁': ['refresh'], '♻': ['refresh'], '🖨': ['printer'], '🧪': ['flask'],
    '🏢': ['building'], '🏬': ['building'], '🏨': ['building'], '🏛': ['bank'], '🌐': ['globe'], '🌎': ['globe'], '🌍': ['globe'],
    '⚙': ['sliders'], '🛠': ['sliders'], '🔧': ['sliders'], '🏁': ['flag'], '🚩': ['flag'],
    '🐾': ['paw'], '🐶': ['paw'], '🐕': ['paw'], '🐈': ['paw'],
    '🗂': ['folder'], '📁': ['folder'], '📂': ['folder'], '🚀': ['rocket'], '🛒': ['cart'], '🛍': ['cart'],
    '💻': ['laptop'], '🖥': ['laptop'], '💍': ['ring'], '💒': ['ring'], '🕯': ['candle'], '🧺': ['basket'], '🎓': ['cap'], '🧮': ['calc'],
    '📈': ['chart'], '📊': ['chart'], '📉': ['chart'], '🛡': ['shield'], '📚': ['books'], '📖': ['books'], '📘': ['books'],
    '🕗': ['clock'], '⏰': ['clock'], '⏱': ['clock'], '⌛': ['clock'], '⏳': ['clock'], '🕐': ['clock'],
    '💬': ['chat'], '🗨': ['chat'], '🔥': ['fire'], '🤖': ['bot'], '📐': ['ruler'], '🔔': ['bell'], '🏷': ['tag'],
    '🎵': ['music'], '🎶': ['music'], '🎤': ['music'], '📷': ['camera'], '📸': ['camera'], '❤': ['heart'], '💖': ['heart'], '🔗': ['link'],
    '🛏': ['bed'], '◀': ['chevL'], '▼': ['chevD'], '▲': ['chevU'], '▶': ['chevR'], '⏸': ['pause'], '⏯': ['play'], '⏹': ['square'], '🛌': ['bed'], '➔': ['arrowRight'], '➡': ['arrowRight'], '👉': ['arrowRight'], '🎯': ['flag'], '🏆': ['star'], '🥇': ['star']
  };

  const RX = /(?:\p{Extended_Pictographic}|[✔✓☑☐➔▼▲])(?:️|‍(?:\p{Extended_Pictographic})️?)*/gu;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'TITLE', 'svg', 'SVG', 'CODE', 'PRE']);

  function svgFor(name, color) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', '16');
    s.setAttribute('height', '16');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', color || 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'xp-ico' + (name === 'dot' ? ' xp-ico-dot' : ''));
    if (color) s.style.color = color;
    s.innerHTML = P[name] || P.sparkles;
    return s;
  }

  function lookup(emoji) {
    const base = emoji.replace(/️/g, '');
    return MAP[emoji] || MAP[base] || MAP[base.split('‍')[0]] || null;
  }

  const KEYCAP = /([0-9#*])\uFE0F?\u20E3/g;
  function processText(node) {
    let text = node.nodeValue;
    if (text && /\u20E3/.test(text) && node.parentNode && node.parentNode.nodeName !== 'OPTION') {
      // 1️⃣ 2️⃣ → número en círculo
      const parent = node.parentNode;
      const frag = document.createDocumentFragment();
      let last = 0;
      text.replace(KEYCAP, (m, d, off) => {
        if (off > last) frag.appendChild(document.createTextNode(text.slice(last, off)));
        const sp = document.createElement('span'); sp.className = 'xp-keycap'; sp.textContent = d; frag.appendChild(sp);
        last = off + m.length; return m;
      });
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      const nodes = Array.from(frag.childNodes);
      parent.replaceChild(frag, node);
      nodes.forEach(n => { if (n.nodeType === 3) processText(n); });
      return;
    }
    if (text && /\u20E3/.test(text)) { node.nodeValue = text.replace(KEYCAP, '$1').trim(); text = node.nodeValue; }
    RX.lastIndex = 0;
    if (!text || !RX.test(text)) return;
    RX.lastIndex = 0;
    const parent = node.parentNode;
    if (!parent) return;
    if (parent.nodeName === 'OPTION') {
      node.nodeValue = text.replace(RX, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
      return;
    }
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(RX, (m, offset) => {
      if (offset > last) frag.appendChild(document.createTextNode(text.slice(last, offset)));
      const hit = lookup(m);
      if (hit) frag.appendChild(svgFor(hit[0], hit[1]));
      else frag.appendChild(svgFor('sparkles'));
      last = offset + m.length;
      return m;
    });
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !SKIP.has(root.parentNode.nodeName) && !root.parentNode.isContentEditable) processText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (SKIP.has(root.nodeName) || root.isContentEditable) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentNode;
        if (!p || SKIP.has(p.nodeName) || p.closest && p.closest('svg, textarea, [contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        RX.lastIndex = 0;
        return (RX.test(n.nodeValue) || /\u20E3/.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const list = [];
    while (tw.nextNode()) list.push(tw.currentNode);
    list.forEach(processText);
  }

  let queued = new Set();
  let scheduled = false;
  function flush() {
    scheduled = false;
    const nodes = queued; queued = new Set();
    nodes.forEach(n => { if (n.isConnected) walk(n); });
  }
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') queued.add(m.target);
      else m.addedNodes.forEach(n => queued.add(n));
    }
    if (!scheduled && queued.size) {
      scheduled = true;
      // microtarea: el reemplazo ocurre antes de que el navegador pinte
      Promise.resolve().then(flush);
    }
  });

  function start() {
    walk(document.body);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  window.xpIcon = (name, color) => svgFor(name, color).outerHTML;
  window.xpIconsRefresh = () => walk(document.body);
})();
