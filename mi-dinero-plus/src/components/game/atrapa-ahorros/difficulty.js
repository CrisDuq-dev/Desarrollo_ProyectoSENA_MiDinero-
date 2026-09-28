/**
 * Ajuste dinámico de dificultad (DDA).
 * Ritmo calmado al inicio; sube con el tiempo y si el jugador acierta mucho.
 * Si falla seguido, se suaviza un poco.
 */
export class DifficultyManager {
  constructor() {
    /** px/s base — más bajo = partidas más largas */
    this.baseFallSpeed = 105
    /** ms entre spawns — más alto = menos agobio */
    this.baseSpawnMs = 1100
    this.recentOutcomes = []
    this.elapsedSeconds = 0
  }

  recordOutcome(success) {
    this.recentOutcomes.push(success ? 1 : 0)
    if (this.recentOutcomes.length > 12) this.recentOutcomes.shift()
  }

  get hitRate() {
    if (this.recentOutcomes.length === 0) return 0.7
    const sum = this.recentOutcomes.reduce((a, b) => a + b, 0)
    return sum / this.recentOutcomes.length
  }

  tick(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return
    this.elapsedSeconds += deltaSeconds
  }

  /** Sube despacio: a los ~60s llega a +~1.0, tope 1.45 */
  get timeFactor() {
    return 1 + Math.min(this.elapsedSeconds / 60, 1.45)
  }

  /** Si acierta mucho → un poco más exigente; si falla → más fácil */
  get reactiveFactor() {
    if (this.hitRate > 0.85) return 1.12
    if (this.hitRate < 0.45) return 0.88
    return 1
  }

  get fallSpeed() {
    const speed = this.baseFallSpeed * this.timeFactor * this.reactiveFactor
    return Math.min(200, Math.max(90, speed))
  }

  get spawnIntervalMs() {
    const factor = this.timeFactor * this.reactiveFactor
    const ms = this.baseSpawnMs / factor
    return Math.min(1400, Math.max(480, ms))
  }
}