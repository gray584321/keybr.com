/**
 * Measures key dwell time — the interval between keydown and keyup for the
 * same physical key. PubMed 22897644 validated dwell time as a non-invasive
 * proxy for typing force and forearm fatigue: tense, forceful typists hold
 * keys down measurably longer than relaxed ones, even on identical hardware.
 *
 * Modifier keys (Shift, Alt, AltGraph, Dead) are deliberately ignored —
 * they are held intentionally and would dominate the signal.
 */
export class DwellMeter {
  static readonly ringSize = 32;

  readonly #down = new Map<string, number>();
  readonly #ring: number[] = [];
  #ringWriteIndex = 0;
  #baselineMedian: number | null = null;

  onKeyDown(code: string, timeStamp: number, key: string): void {
    if (isModifier(key)) return;
    if (!code) return;
    this.#down.set(code, timeStamp);
  }

  onKeyUp(code: string, timeStamp: number, key: string): void {
    if (isModifier(key)) return;
    if (!code) return;
    const downAt = this.#down.get(code);
    this.#down.delete(code);
    if (downAt == null) return;
    const dwell = timeStamp - downAt;
    // Filter out implausible values (sub-millisecond clamped from browser
    // anti-fingerprinting, or stuck keys held > 2s).
    if (dwell < 5 || dwell > 2000) return;
    if (this.#ring.length < DwellMeter.ringSize) {
      this.#ring.push(dwell);
    } else {
      this.#ring[this.#ringWriteIndex] = dwell;
      this.#ringWriteIndex = (this.#ringWriteIndex + 1) % DwellMeter.ringSize;
    }
  }

  /**
   * Median dwell time over the rolling window, or null when there aren't
   * enough samples to be meaningful yet.
   */
  get currentMedianMs(): number | null {
    if (this.#ring.length < 5) return null;
    const sorted = [...this.#ring].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  /**
   * Personal baseline median established from the first N dwell samples
   * after construction. Used as the comparison point for tension detection.
   */
  get baselineMs(): number | null {
    if (this.#baselineMedian != null) return this.#baselineMedian;
    if (this.#ring.length >= DwellMeter.ringSize) {
      this.#baselineMedian = this.currentMedianMs;
    }
    return this.#baselineMedian;
  }

  /**
   * Ratio of current median to personal baseline. >1 means tighter than
   * usual; <1 means more relaxed. Null when baseline not yet established.
   */
  get tensionRatio(): number | null {
    const current = this.currentMedianMs;
    const baseline = this.baselineMs;
    if (current == null || baseline == null || baseline === 0) return null;
    return current / baseline;
  }

  reset(): void {
    this.#down.clear();
    this.#ring.length = 0;
    this.#ringWriteIndex = 0;
    this.#baselineMedian = null;
  }
}

function isModifier(key: string): boolean {
  return (
    key === "Shift" ||
    key === "Control" ||
    key === "Alt" ||
    key === "AltGraph" ||
    key === "Meta" ||
    key === "Dead"
  );
}
