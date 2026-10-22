'use strict'
/**
 * Genera el HASH de la clave de bloqueo. La clave NO se guarda en ningún lado.
 *
 *   node scripts/generate-lock-hash.js
 *
 * Copia la línea que imprime (LOCK_PASSWORD_HASH=...) a tu .env local y a las
 * variables de entorno del servidor. Nunca la subas a Git.
 */
const readline = require('readline')
const crypto = require('crypto')

// Independiente: no importa nada de tu proyecto, así que puede vivir en cualquier carpeta.
// Los parámetros deben coincidir con los de platformLock.js.
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 }

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16)
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem }, (err, key) => {
      if (err) return reject(err)
      resolve(['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join(':'))
    })
  })
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      if (rl.stdoutMuted && !s.includes('\n') && !s.includes('\r')) return rl.output.write('*')
      rl.output.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
    rl.stdoutMuted = true
  })
}

;(async () => {
  const interactive = process.stdin.isTTY
  const pwd = interactive ? await askHidden('Escribe la clave de bloqueo: ') : await new Promise((r) => {
    let d = ''
    process.stdin.on('data', (c) => (d += c))
    process.stdin.on('end', () => r(d.replace(/\r?\n$/, '')))
  })
  if (pwd.length < 12) {
    console.error('La clave debe tener al menos 12 caracteres (mejor una frase larga).')
    process.exit(1)
  }
  if (interactive) {
    const again = await askHidden('Repite la clave: ')
    if (again !== pwd) {
      console.error('Las claves no coinciden.')
      process.exit(1)
    }
  }
  const hash = await hashPassword(pwd)
  console.log('\nAgrega esta línea a tu .env y a las variables del servidor (NO a Git):\n')
  console.log(`LOCK_PASSWORD_HASH=${hash}\n`)
})()