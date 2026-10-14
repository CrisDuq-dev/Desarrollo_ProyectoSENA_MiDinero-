export const LOGOUT_MIN_MS = 2200
export const LOGIN_MIN_MS = 2200

export const LOGOUT_LEAVE_MS = 450
export const LOGIN_LEAVE_MS = 450

export const LOGOUT_PHRASES = [
  'Cada peso que cuidas hoy es una decisión que tu yo del futuro te va a agradecer.',
  'Ahorrar no es renunciar: es elegir lo que de verdad importa.',
  'La constancia pesa más que la prisa.',
  'Un hábito pequeño, repetido cada día, construye las metas más grandes.',
  'Conocer tus números es el primer paso para ser libre con ellos.',
  'El dinero es una herramienta; tú decides qué construir con ella.',
  'Todo error es información. Vuelve con lo aprendido.',
  'Descansa: la disciplina también necesita pausas.',
  'Las metas se alcanzan paso a paso, no de golpe.',
  'La tranquilidad financiera se construye en silencio, día tras día.',
  'Gastar con intención también es una forma de ahorrar.',
  'Hoy avanzaste. Mañana seguimos.',
]

export const LOGIN_PHRASES = [
  'Hoy es un buen día para ordenar tus números.',
  'Cada registro te acerca un poco más a tus metas.',
  'La claridad financiera empieza en cuanto entras.',
  'Practica con calma: aquí no hay dinero real en riesgo.',
  'Tu mapa financiero te espera; vamos paso a paso.',
  'Pequeñas decisiones de hoy construyen el mañana.',
  'Bienvenido de nuevo a tu espacio de práctica.',
  'Observa, registra y decide con más criterio.',
  'El hábito se forma con constancia, no con prisa.',
  'Aquí aprendes equivocándote sin miedo.',
  'Tu progreso se construye un movimiento a la vez.',
  'Listo para retomar el control de tu simulación.',
]

export function pickLogoutPhrase() {
  return LOGOUT_PHRASES[Math.floor(Math.random() * LOGOUT_PHRASES.length)]
}

export function pickLoginPhrase() {
  return LOGIN_PHRASES[Math.floor(Math.random() * LOGIN_PHRASES.length)]
}
