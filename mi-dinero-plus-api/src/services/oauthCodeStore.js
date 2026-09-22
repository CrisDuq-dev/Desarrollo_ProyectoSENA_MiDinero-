/**
 * Almacén en memoria de códigos de un solo uso para el intercambio OAuth Google.
 * TTL corto (60s). En producción con múltiples instancias usar Redis o tabla MySQL.
 * No persiste entre reinicios del servidor (aceptable para local / single-instance).
 */
const codes = new Map();

const CODE_TTL_MS = 60 * 1000;

function createCode(payload) {
  const code = require('crypto').randomBytes(32).toString('hex');
  codes.set(code, {
    payload,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  // Limpieza oportunista
  if (codes.size > 500) {
    const now = Date.now();
    for (const [k, v] of codes) {
      if (v.expiresAt < now) codes.delete(k);
    }
  }
  return code;
}

/**
 * Consume el código (un solo uso). Devuelve payload o null.
 */
function consumeCode(code) {
  if (!code || typeof code !== 'string') return null;
  const entry = codes.get(code);
  codes.delete(code);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry.payload;
}

module.exports = { createCode, consumeCode };
