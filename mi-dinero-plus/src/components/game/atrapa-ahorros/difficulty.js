/**
 * Ajuste dinámico de dificultad (DDA).
 */
export class DifficultyManager {
  constructor() {
    this.baseFallSpeed = 130
    this.baseSpawnMs = 850
    this.recentOutcomes = []
    this.elapsedSeconds = 0
  }

  recordOutcome(success) {
    this.recentOutcomes.push(success ? 1 : 0)
    if (this.recentOutcomes.length > 12) this.recentOutcomes.shift()
  }

  get hitRate() {
    if (this.recentOutcomes.length === 0) return 1
    const sum = this.recentOutcomes.reduce((a, b) => a + b, 0)
    return sum / this.recentOutcomes.length
  }

  tick(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds
  }

  get timeFactor() {
    return 1 + Math.min(this.elapsedSeconds / 45, 1.6)
  }

  get reactiveFactor() {
    if (this.hitRate > 0.85) return 1.15
    if (this.hitRate < 0.5) return 0.85
    return 1
  }

  get fallSpeed() {
    return this.baseFallSpeed * this.timeFactor * this.reactiveFactor
  }

  get spawnIntervalMs() {
    const factor = this.timeFactor * this.reactiveFactor
    return Math.max(320, this.baseSpawnMs / factor)
  }
}