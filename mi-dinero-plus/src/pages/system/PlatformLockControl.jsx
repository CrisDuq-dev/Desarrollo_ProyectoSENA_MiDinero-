import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPlatformStatus, lockPlatform, unlockPlatform } from '../../services/platformLockApi'
import { LockIcon } from '../../components/common/PlatformLockGate'
import '../../components/common/PlatformLock.css'

/**
 * Tarjeta del administrador: "Bloquear la plataforma Mi Dinero+".
 * Ruta secreta (LOCK_CONTROL_PATH). Sin la clave no hace nada, y la clave solo existe
 * como hash en el servidor: aquí no está guardada en ninguna parte.
 */
export default function PlatformLockControl() {
  const [locked, setLocked] = useState(null) // null = cargando
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const refresh = useCallback(async () => {
    try {
      const s = await getPlatformStatus()
      setLocked(Boolean(s.locked))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    refresh()
    return () => meta.remove()
  }, [refresh])

  const submit = async (e) => {
    e.preventDefault()
    if (busy || locked === null) return
    setError('')
    setDone('')
    if (!password) {
      setError('Escribe la clave.')
      return
    }
    setBusy(true)
    try {
      const wantLock = !locked
      const res = await (wantLock ? lockPlatform(password) : unlockPlatform(password))
      setLocked(Boolean(res.locked))
      setDone(
        res.locked
          ? 'Plataforma bloqueada. Los usuarios verán el bloqueo en unos segundos.'
          : 'Plataforma desbloqueada. Ya vuelve a funcionar para todos.'
      )
    } catch (err) {
      if (err.status === 401) {
        const left = err.data && typeof err.data.attemptsLeft === 'number' ? err.data.attemptsLeft : null
        setError(left === null ? 'Clave incorrecta.' : `Clave incorrecta. Intentos restantes: ${left}.`)
      } else if (err.status === 503) {
        setError('El servidor no tiene configurada la clave de bloqueo (LOCK_PASSWORD_HASH).')
      } else {
        setError(err.message)
      }
    } finally {
      setPassword('') // la clave nunca se queda en pantalla ni en memoria
      setBusy(false)
    }
  }

  const isLocked = locked === true
  const title = isLocked ? 'Desbloquear la plataforma Mi Dinero+' : 'Bloquear la plataforma Mi Dinero+'

  return (
    <div className="pl-overlay pl-overlay--page">
      <form className="pl-card" onSubmit={submit} autoComplete="off" noValidate>
        <div className={`pl-icon ${isLocked ? 'is-locked' : ''}`} aria-hidden="true">
          <LockIcon />
        </div>

        <span className={`pl-chip ${locked === null ? '' : isLocked ? 'is-locked' : 'is-active'}`}>
          {locked === null ? 'Consultando…' : isLocked ? 'Estado: bloqueada' : 'Estado: activa'}
        </span>

        <h1 className="pl-title">{title}</h1>
        <p className="pl-text">
          {isLocked
            ? 'Los usuarios solo pueden cerrar sesión. Escribe la clave para que todo vuelva a funcionar.'
            : 'Ningún usuario podrá usar la plataforma hasta que la desbloquees con la clave. Solo podrán cerrar sesión.'}
        </p>

        <label className="pl-label" htmlFor="pl-key">
          Clave de bloqueo
        </label>
        <div className="pl-field">
          <input
            id="pl-key"
            name="lock-key"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escribe la clave"
            autoComplete="new-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={256}
            disabled={busy || locked === null}
          />
          <button type="button" className="pl-eye" onClick={() => setShow((v) => !v)} tabIndex={-1}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {error ? (
          <p className="pl-msg pl-msg--error" role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="pl-msg pl-msg--ok" role="status">
            {done}
          </p>
        ) : null}

        <button
          type="submit"
          className={`pl-btn ${isLocked ? 'pl-btn--ok' : 'pl-btn--danger'}`}
          disabled={busy || locked === null}
        >
          {busy ? 'Verificando…' : isLocked ? 'Desbloquear plataforma' : 'Bloquear plataforma'}
        </button>

        <Link className="pl-back" to="/">
          Volver al inicio
        </Link>
      </form>
    </div>
  )
}