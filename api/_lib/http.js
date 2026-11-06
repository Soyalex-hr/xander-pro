// Utilidades HTTP comunes para las funciones de /api

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function fail(res, status, message, extra = {}) {
  send(res, status, { ok: false, error: message, ...extra });
}

export function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  fail(res, 405, 'Método no permitido');
  return false;
}

// Vercel ya entrega req.body como objeto para JSON; en pruebas puede llegar como texto.
export function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return {}; }
  }
  return b;
}

export function text(v, max = 200) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Ejecuta el manejador y convierte errores inesperados en 500 sin filtrar detalles internos.
export function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[api]', req.method, req.url, err);
      if (!res.headersSent) fail(res, 500, 'Error interno del servidor');
    }
  };
}
