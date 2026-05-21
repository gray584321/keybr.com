import { makeFilter } from "@keybr/math";
import { type Step } from "@keybr/textinput";

/**
 * A bigram (two-character pair) represented by its code points.
 */
export type Bigram = {
  readonly first: number;
  readonly second: number;
};

/**
 * A single timing sample for a bigram.
 */
export type BigramSample = {
  readonly timeToType: number;
  readonly timeStamp: number;
};

/**
 * Statistics for a single bigram.
 */
export type BigramStats = {
  readonly bigram: Bigram;
  readonly samples: readonly BigramSample[];
  readonly timeToType: number | null;
  readonly bestTimeToType: number | null;
  readonly hitCount: number;
  readonly missCount: number;
};

/**
 * A map of bigram statistics, keyed by the two-character bigram string.
 */
export type BigramStatsMap = ReadonlyMap<string, BigramStats>;

function toString(bigram: Bigram): string {
  return String.fromCodePoint(bigram.first, bigram.second);
}

function fromString(s: string): Bigram {
  if (s.length !== 2) {
    throw new Error(`Invalid bigram string: ${s}`);
  }
  return {
    first: s.charCodeAt(0),
    second: s.charCodeAt(1),
  };
}

export function makeBigram(
  first: string | number,
  second: string | number,
): Bigram {
  if (typeof first === "string") {
    first = first.charCodeAt(0);
  }
  if (typeof second === "string") {
    second = second.charCodeAt(0);
  }
  return { first, second };
}

/**
 * Build bigram statistics from a sequence of keystroke steps.
 *
 * Steps must be in original keystroke order; the inter-key interval used as
 * the bigram timing is `step2.timeStamp - step1.timeStamp`.
 */
export function makeBigramStatsMap(steps: readonly Step[]): BigramStatsMap {
  const samples = new Map<string, BigramSample[]>();

  for (let i = 0; i < steps.length - 1; i++) {
    const step1 = steps[i];
    const step2 = steps[i + 1];

    // Only track successful, non-typo steps.
    if (step1.typo || step2.typo) {
      continue;
    }

    // Bigram timing is the IKI between two accepted keystrokes.
    const timeToType = step2.timeStamp - step1.timeStamp;
    // Reject implausibly fast (e.g. WebKit clamped) and implausibly slow values.
    if (timeToType < 15 || timeToType > 12000) {
      continue;
    }

    const bigram: Bigram = {
      first: step1.codePoint,
      second: step2.codePoint,
    };
    const key = toString(bigram);

    let bucket = samples.get(key);
    if (bucket == null) {
      bucket = [];
      samples.set(key, bucket);
    }
    bucket.push({
      timeToType,
      timeStamp: step1.timeStamp,
    });
  }

  const map = new Map<string, BigramStats>();

  for (const [key, bigramSamples] of samples) {
    bigramSamples.sort((a, b) => a.timeStamp - b.timeStamp);

    // One EMA filter per bigram — must not share state across bigrams.
    const filter = makeFilter(0.1);
    let filteredTime: number | null = null;
    let bestTime: number | null = null;

    for (const sample of bigramSamples) {
      filteredTime = filter.add(sample.timeToType);
      if (bestTime == null || sample.timeToType < bestTime) {
        bestTime = sample.timeToType;
      }
    }

    map.set(key, {
      bigram: fromString(key),
      samples: [...bigramSamples],
      timeToType: filteredTime,
      bestTimeToType: bestTime,
      hitCount: bigramSamples.length,
      missCount: 0,
    });
  }

  return map;
}

/**
 * Merge multiple bigram stats maps into one. Samples are concatenated,
 * the filtered timing is recomputed in chronological order, and the best
 * timing is the per-bigram minimum across all input maps.
 */
export function mergeBigramStatsMaps(
  ...maps: readonly (BigramStatsMap | null | undefined)[]
): BigramStatsMap {
  const merged = new Map<string, BigramStats>();

  for (const map of maps) {
    if (!map) continue;

    for (const [key, stats] of map) {
      const existing = merged.get(key);
      if (existing == null) {
        merged.set(key, stats);
      } else {
        const combinedSamples = [...existing.samples, ...stats.samples];
        combinedSamples.sort((a, b) => a.timeStamp - b.timeStamp);

        const filter = makeFilter(0.1);
        let filteredTime: number | null = null;
        for (const sample of combinedSamples) {
          filteredTime = filter.add(sample.timeToType);
        }

        const bestTime = Math.min(
          existing.bestTimeToType ?? Infinity,
          stats.bestTimeToType ?? Infinity,
        );

        merged.set(key, {
          bigram: existing.bigram,
          samples: combinedSamples,
          timeToType: filteredTime,
          bestTimeToType: bestTime === Infinity ? null : bestTime,
          hitCount: existing.hitCount + stats.hitCount,
          missCount: existing.missCount + stats.missCount,
        });
      }
    }
  }

  return merged;
}

/**
 * Filter bigram stats by minimum hit count and / or maximum filtered time.
 */
export function filterBigramStats(
  map: BigramStatsMap,
  options: { minHits?: number; maxTimeToType?: number } = {},
): BigramStatsMap {
  const { minHits = 0, maxTimeToType = Infinity } = options;
  const filtered = new Map<string, BigramStats>();

  for (const [key, stats] of map) {
    if (stats.hitCount < minHits) continue;
    if (stats.timeToType != null && stats.timeToType > maxTimeToType) continue;
    filtered.set(key, stats);
  }

  return filtered;
}

/**
 * Return the slowest bigrams, ranked by `timeToType / bestTimeToType` ratio.
 * Bigrams with no samples or no best-time are excluded.
 */
export function findSlowestBigrams(
  map: BigramStatsMap,
  count: number = 10,
): BigramStats[] {
  return [...map.values()]
    .filter((stats) => stats.bestTimeToType != null && stats.hitCount > 0)
    .map((stats) => ({
      stats,
      ratio:
        stats.timeToType != null
          ? stats.timeToType / stats.bestTimeToType!
          : Infinity,
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, count)
    .map((e) => e.stats);
}

/**
 * Return the fastest bigrams by filtered `timeToType`.
 */
export function findFastestBigrams(
  map: BigramStatsMap,
  count: number = 10,
): BigramStats[] {
  return [...map.values()]
    .filter((stats) => stats.timeToType != null && stats.hitCount > 0)
    .sort((a, b) => (a.timeToType ?? 0) - (b.timeToType ?? 0))
    .slice(0, count);
}
