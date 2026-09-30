export const LOGOUT_MIN_MS = 2200

// Duración del desvanecimiento final.
export const LOGOUT_LEAVE_MS = 450

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

export function pickLogoutPhrase() {
  return LOGOUT_PHRASES[Math.floor(Math.random() * LOGOUT_PHRASES.length)]
}
