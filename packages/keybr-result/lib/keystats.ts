import { type Filter, makeFilter } from "@keybr/math";
import { type Letter } from "@keybr/phonetic-model";
import { newRating, type Rating, updateRating } from "@keybr/rating";
import { type Result } from "./result.ts";

// Target inter-key-interval for the synthetic Glicko "opponent" representing
// the user's target speed. Set to 240 CPM (≈48 WPM at 5 chars/word) — an
// intermediate target. The score we feed in is target_time / actual_time
// clamped to [0, 1], so the absolute opponent rating matters less than the
// shape of the relative comparison.
const TARGET_OPPONENT_RATING = 1500;
const TARGET_OPPONENT_RD = 80;
const TARGET_TIME_MS = 250;

export function makeKeyStatsMap(
  letters: readonly Letter[],
  results: readonly Result[],
): KeyStatsMap {
  const map = new MutableKeyStatsMap(letters);
  for (const result of results) {
    map.append(result);
  }
  return map.copy();
}

export type KeyStatsMap<T extends KeyStats = KeyStats> = {
  readonly letters: readonly Letter[];
  readonly results: readonly Result[];
  get(letter: Letter): T;
} & Iterable<T>;

export type KeyStats = {
  readonly letter: Letter;
  readonly samples: readonly KeySample[];
  readonly timeToType: number | null;
  readonly bestTimeToType: number | null;
  /**
   * Glicko-2 rating that tracks both estimated skill (rating) and
   * uncertainty (rd) per key. Computed incrementally alongside the
   * existing EWMA so consumers can opt in to either metric.
   * Always non-null — defaults to newRating() until any sample arrives.
   */
  readonly rating: Rating;
};

export type KeySample = {
  readonly index: number;
  readonly timeStamp: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly timeToType: number;
  readonly filteredTimeToType: number;
};

export class MutableKeyStatsMap implements KeyStatsMap<MutableKeyStats> {
  readonly #letters: Letter[];
  readonly #results: Result[];
  readonly #map: Map<Letter, MutableKeyStats>;

  constructor(letters: readonly Letter[]) {
    this.#letters = [...letters];
    this.#results = [];
    this.#map = new Map();
    for (const letter of letters) {
      this.#map.set(letter, new MutableKeyStats(letter));
    }
  }

  get letters(): readonly Letter[] {
    return this.#letters;
  }

  get results(): readonly Result[] {
    return this.#results;
  }

  get(letter: Letter): MutableKeyStats {
    return this.#map.get(letter)!;
  }

  [Symbol.iterator](): IterableIterator<MutableKeyStats> {
    return this.#map.values();
  }

  append(result: Result) {
    this.#results.push(result);
    for (const item of this.#map.values()) {
      item.append(result);
    }
  }

  copy(): KeyStatsMap {
    const letters = [...this.#letters];
    const results = [...this.#results];
    const map = new Map(
      [...this.#map].map(([key, value]) => [key, value.copy()]),
    );
    return {
      get letters(): readonly Letter[] {
        return letters;
      },
      get results(): readonly Result[] {
        return results;
      },
      get(letter): KeyStats {
        return map.get(letter)!;
      },
      [Symbol.iterator](): IterableIterator<KeyStats> {
        return map.values();
      },
    };
  }
}

export class MutableKeyStats implements KeyStats {
  readonly #letter: Letter;
  readonly #samples: KeySample[];
  readonly #filter: Filter;
  #index: number;
  #timeToType: number | null;
  #bestTimeToType: number | null;
  #rating: Rating;

  constructor(letter: Letter) {
    this.#letter = letter;
    this.#samples = [];
    this.#filter = makeFilter(0.1);
    this.#index = 0;
    this.#timeToType = null;
    this.#bestTimeToType = null;
    this.#rating = newRating();
  }

  get letter(): Letter {
    return this.#letter;
  }

  get samples(): readonly KeySample[] {
    return this.#samples;
  }

  get timeToType(): number | null {
    return this.#timeToType;
  }

  get bestTimeToType(): number | null {
    return this.#bestTimeToType;
  }

  get rating(): Rating {
    return this.#rating;
  }

  append(result: Result) {
    const { timeStamp, histogram } = result;
    const sample = histogram.get(this.#letter.codePoint);
    if (sample != null) {
      const { hitCount, missCount, timeToType } = sample;
      if (timeToType > 0) {
        const filteredTimeToType = this.#filter.add(timeToType);
        this.#samples.push({
          index: this.#index,
          timeStamp,
          hitCount,
          missCount,
          timeToType,
          filteredTimeToType,
        });
        this.#timeToType = filteredTimeToType;
        this.#bestTimeToType = Math.min(
          this.#bestTimeToType ?? Infinity,
          filteredTimeToType,
        );
        // Map this lesson's outcome to a Glicko "match" against the
        // synthetic target opponent. score in [0, 1]: 1 = hit target time,
        // 0 = much slower. Use raw timeToType (not filtered) so the rating
        // sees the actual per-lesson result rather than the smoothed view.
        const score = Math.min(1, TARGET_TIME_MS / timeToType);
        this.#rating = updateRating(this.#rating, [
          {
            opponentRating: TARGET_OPPONENT_RATING,
            opponentRd: TARGET_OPPONENT_RD,
            score,
          },
        ]);
      }
    }
    this.#index += 1;
    return this;
  }

  copy(): KeyStats {
    return {
      letter: this.#letter,
      samples: [...this.#samples],
      timeToType: this.#timeToType,
      bestTimeToType: this.#bestTimeToType,
      rating: this.#rating,
    };
  }
}
