// Cliente SMTP mínimo (solo módulos de Node, sin dependencias externas).
// Soporta TLS directo (puerto 465) y STARTTLS (587/25), AUTH PLAIN/LOGIN,
// varios destinatarios, cuerpo texto + HTML y archivos adjuntos (PDF).
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const CRLF = '\r\n';
const TIMEOUT_MS = 20000;

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const wrap76 = s => s.replace(/.{1,76}/g, m => m + CRLF);
const needsEncoding = s => /[^\x20-\x7E]/.test(s);
const encodeWord = s => (needsEncoding(s) ? `=?UTF-8?B?${b64(s)}?=` : s);
const cleanHeader = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();

export function validEmail(e) {
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(String(e || '').trim());
}

function address(name, email) {
  const n = cleanHeader(name).replace(/"/g, "'");
  return n ? `${needsEncoding(n) ? encodeWord(n) : `"${n}"`} <${email}>` : `<${email}>`;
}

export function buildMessage({ fromName, fromEmail, to, cc = [], replyTo, subject, text, html, attachments = [] }) {
  const domain = String(fromEmail).split('@')[1] || 'localhost';
  const mixed = 'mix_' + crypto.randomBytes(12).toString('hex');
  const alt = 'alt_' + crypto.randomBytes(12).toString('hex');
  const headers = [
    `From: ${address(fromName, fromEmail)}`,
    `To: ${to.map(e => `<${e}>`).join(', ')}`,
    cc.length ? `Cc: ${cc.map(e => `<${e}>`).join(', ')}` : null,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${encodeWord(cleanHeader(subject))}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`
  ].filter(Boolean);
  const parts = [];
  parts.push(`--${mixed}${CRLF}Content-Type: multipart/alternative; boundary="${alt}"${CRLF}${CRLF}` +
    `--${alt}${CRLF}Content-Type: text/plain; charset=UTF-8${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${wrap76(b64(text || ''))}` +
    (html ? `--${alt}${CRLF}Content-Type: text/html; charset=UTF-8${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${wrap76(b64(html))}` : '') +
    `--${alt}--${CRLF}`);
  attachments.forEach(a => {
    const name = cleanHeader(a.filename || 'adjunto.pdf').replace(/"/g, '');
    parts.push(`--${mixed}${CRLF}Content-Type: ${a.contentType || 'application/octet-stream'}; name="${encodeWord(name)}"${CRLF}` +
      `Content-Disposition: attachment; filename="${encodeWord(name)}"${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}` +
      wrap76(String(a.base64 || '').replace(/\s+/g, '')));
  });
  return headers.join(CRLF) + CRLF + CRLF + parts.join('') + `--${mixed}--${CRLF}`;
}

// Error con mensaje claro para el usuario
export class SmtpError extends Error {
  constructor(message, code) { super(message); this.userMessage = message; this.smtpCode = code; }
}

function friendly(err) {
  if (err instanceof SmtpError) return err;
  const c = err && err.code;
  if (c === 'ENOTFOUND' || c === 'EAI_AGAIN') return new SmtpError('No se encontró el servidor SMTP. Revisa el nombre del servidor.');
  if (c === 'ECONNREFUSED') return new SmtpError('El servidor SMTP rechazó la conexión. Revisa el puerto.');
  if (c === 'ETIMEDOUT' || c === 'ESOCKETTIMEDOUT' || c === 'TIMEOUT') return new SmtpError('El servidor SMTP no respondió a tiempo. Revisa el servidor y el puerto (465 o 587).');
  if (String(err && err.message).includes('wrong version number')) return new SmtpError('Error de cifrado: con el puerto 587 desactiva "Conexión segura (SSL)"; con el puerto 465 actívala.');
  if (c && String(c).startsWith('ERR_TLS') || c === 'CERT_HAS_EXPIRED' || c === 'DEPTH_ZERO_SELF_SIGNED_CERT') return new SmtpError('El certificado de seguridad del servidor SMTP no es válido.');
  return new SmtpError('No se pudo enviar el correo: ' + ((err && err.message) || 'error desconocido'));
}

class Conn {
  constructor(socket) { this.attach(socket); }
  attach(socket) {
    this.socket = socket;
    this.buf = '';
    this.waiter = null;
    this.error = null;
    socket.setEncoding('utf8');
    socket.setTimeout(TIMEOUT_MS, () => { const e = new Error('timeout'); e.code = 'TIMEOUT'; this.fail(e); socket.destroy(); });
    socket.on('data', d => { this.buf += d; this.pump(); });
    socket.on('error', e => this.fail(e));
    socket.on('close', () => this.fail(Object.assign(new Error('La conexión con el servidor SMTP se cerró'), { code: 'CLOSED' })));
  }
  fail(e) { if (!this.error) this.error = e; if (this.waiter) { const w = this.waiter; this.waiter = null; w.reject(e); } }
  pump() {
    if (!this.waiter) return;
    const lines = this.buf.split(CRLF);
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
        const block = lines.slice(0, i + 1);
        this.buf = lines.slice(i + 1).join(CRLF);
        const w = this.waiter; this.waiter = null;
        w.resolve({ code: Number(block[i].slice(0, 3)), text: block.map(l => l.slice(4)).join('\n') });
        return;
      }
    }
  }
  read() {
    return new Promise((resolve, reject) => {
      if (this.error) return reject(this.error);
      this.waiter = { resolve, reject };
      this.pump();
    });
  }
  async cmd(line, expect, hideInError) {
    if (line !== null) this.socket.write(line + CRLF);
    const r = await this.read();
    const ok = Array.isArray(expect) ? expect.includes(r.code) : r.code === expect;
    if (!ok) {
      if (r.code === 535 || r.code === 534) throw new SmtpError('Usuario o contraseña SMTP incorrectos. Si usas Gmail u Outlook, crea una "contraseña de aplicación" y úsala aquí.', r.code);
      if (r.code === 550 || r.code === 553 || r.code === 501) throw new SmtpError(`El servidor rechazó una dirección de correo (${r.code}): ${r.text.slice(0, 160)}`, r.code);
      if (r.code === 552) throw new SmtpError('El mensaje es demasiado grande para el servidor de correo.', r.code);
      throw new SmtpError(`El servidor SMTP respondió ${r.code}${hideInError ? '' : ': ' + r.text.slice(0, 160)}`, r.code);
    }
    return r;
  }
}

function connect(host, port, secure) {
  return new Promise((resolve, reject) => {
    const s = secure
      ? tls.connect({ host, port, servername: host, rejectUnauthorized: !globalThis.__XP_TEST_SMTP_INSECURE__ })
      : net.connect({ host, port });
    const onErr = e => reject(e);
    s.once('error', onErr);
    s.setTimeout(TIMEOUT_MS, () => { const e = new Error('timeout'); e.code = 'TIMEOUT'; s.destroy(); reject(e); });
    s.once(secure ? 'secureConnect' : 'connect', () => { s.removeListener('error', onErr); s.setTimeout(0); resolve(s); });
  });
}

function upgrade(socket, host) {
  return new Promise((resolve, reject) => {
    socket.removeAllListeners('data'); socket.removeAllListeners('error'); socket.removeAllListeners('close'); socket.setTimeout(0);
    const t = tls.connect({ socket, servername: host, rejectUnauthorized: !globalThis.__XP_TEST_SMTP_INSECURE__ });
    t.once('error', reject);
    t.once('secureConnect', () => { t.removeListener('error', reject); resolve(t); });
  });
}

/**
 * cfg: { host, port, secure, user, pass, fromName, fromEmail, replyTo }
 * msg: { to:[], cc:[], subject, text, html, attachments:[{filename, contentType, base64}] }
 */
export async function sendMail(cfg, msg) {
  const host = String(cfg.host || '').trim();
  const port = Number(cfg.port) || (cfg.secure ? 465 : 587);
  const secure = cfg.secure === true || port === 465;
  if (!host) throw new SmtpError('Falta el servidor SMTP en la configuración de correo.');
  let conn;
  try {
    conn = new Conn(await connect(host, port, secure));
    await conn.cmd(null, 220);
    const ehloName = 'xanderpro.app';
    let ehlo = await conn.cmd(`EHLO ${ehloName}`, 250);
    let isTls = secure;
    if (!secure && /STARTTLS/i.test(ehlo.text)) {
      await conn.cmd('STARTTLS', 220);
      conn.attach(await upgrade(conn.socket, host));
      isTls = true;
      ehlo = await conn.cmd(`EHLO ${ehloName}`, 250);
    }
    if (cfg.user) {
      if (!isTls) throw new SmtpError('El servidor no ofrece conexión cifrada; por seguridad no se envía la contraseña. Usa el puerto 465 o 587.');
      const authLine = (ehlo.text.match(/AUTH[ =]([^\n]*)/i) || [])[1] || '';
      if (/\bPLAIN\b/i.test(authLine) || !/\bLOGIN\b/i.test(authLine)) {
        await conn.cmd('AUTH PLAIN ' + Buffer.from(`\u0000${cfg.user}\u0000${cfg.pass || ''}`, 'utf8').toString('base64'), 235, true);
      } else {
        await conn.cmd('AUTH LOGIN', 334);
        await conn.cmd(b64(cfg.user), 334, true);
        await conn.cmd(b64(cfg.pass || ''), 235, true);
      }
    }
    const from = cfg.fromEmail || cfg.user;
    await conn.cmd(`MAIL FROM:<${from}>`, 250);
    for (const r of [...msg.to, ...(msg.cc || [])]) await conn.cmd(`RCPT TO:<${r}>`, [250, 251]);
    await conn.cmd('DATA', 354);
    const data = buildMessage({ fromName: cfg.fromName, fromEmail: from, to: msg.to, cc: msg.cc || [], replyTo: cfg.replyTo, subject: msg.subject, text: msg.text, html: msg.html, attachments: msg.attachments || [] })
      .split(CRLF).map(l => (l.startsWith('.') ? '.' + l : l)).join(CRLF);
    conn.socket.write(data + '.' + CRLF);
    await conn.cmd(null, 250);
    try { conn.socket.write('QUIT' + CRLF); } catch { /* */ }
    return { ok: true };
  } catch (e) {
    throw friendly(e);
  } finally {
    try { conn && conn.socket.end(); } catch { /* */ }
  }
}
