import { test } from "node:test";
import { type Step } from "@keybr/textinput";
import { deepEqual, equal, isNotNullish } from "rich-assert";
import {
  findSlowestBigrams,
  makeBigramStatsMap,
  mergeBigramStatsMaps,
} from "./bigramstats.ts";

function step(
  timeStamp: number,
  codePoint: number,
  typo: boolean = false,
): Step {
  return { timeStamp, codePoint, timeToType: 0, typo };
}

test("empty input produces empty map", () => {
  const map = makeBigramStatsMap([]);
  equal(map.size, 0);
});

test("typo step excludes the surrounding bigram pair", () => {
  // h-e-l: middle step is a typo, so neither "he" nor "el" should be tracked.
  const steps: Step[] = [step(0, 0x68), step(100, 0x65, true), step(200, 0x6c)];
  const map = makeBigramStatsMap(steps);
  equal(map.size, 0);
});

test("bigram IKI is step2.timeStamp - step1.timeStamp", () => {
  const steps: Step[] = [step(0, 0x68), step(150, 0x65)];
  const map = makeBigramStatsMap(steps);
  const stats = map.get("he");
  isNotNullish(stats);
  equal(stats.hitCount, 1);
  equal(stats.bestTimeToType, 150);
  equal(stats.timeToType, 150);
});

test("implausibly fast (<15ms) and slow (>12000ms) IKIs are filtered out", () => {
  const steps: Step[] = [
    step(0, 0x68),
    step(5, 0x65), // 5ms - too fast (browser clamp)
    step(20000, 0x6c), // ~20s - too slow
  ];
  const map = makeBigramStatsMap(steps);
  equal(map.size, 0);
});

test("EMA filter is per-bigram and does not bleed state between bigrams", () => {
  // Each bigram appears exactly once with a distinct timing. If the EMA
  // filter were shared (the original bug), the second bigram's value would
  // depend on the first bigram's value rather than being 200 exactly.
  const steps: Step[] = [
    step(0, 0x61),
    step(100, 0x62), // "ab" → 100ms
    step(500, 0x63),
    step(700, 0x64), // "cd" → 200ms
  ];
  const map = makeBigramStatsMap(steps);

  const ab = map.get("ab");
  const cd = map.get("cd");
  isNotNullish(ab);
  isNotNullish(cd);
  // With per-bigram filters, the first-sample value of each bigram equals
  // the raw sample. Bleed would produce e.g. 0.1*200 + 0.9*100 = 110 for "cd".
  equal(ab.timeToType, 100);
  equal(cd.timeToType, 200);
});

test("merging maps recomputes filter chronologically", () => {
  const m1 = makeBigramStatsMap([step(0, 0x61), step(100, 0x62)]);
  const m2 = makeBigramStatsMap([step(1000, 0x61), step(1300, 0x62)]);
  const merged = mergeBigramStatsMaps(m1, m2);
  const ab = merged.get("ab");
  isNotNullish(ab);
  equal(ab.hitCount, 2);
  equal(ab.bestTimeToType, 100);
});

test("findSlowestBigrams ranks by timeToType / bestTimeToType ratio", () => {
  // "ab" is consistently 100ms (ratio 1.0)
  // "cd" jumps from 100ms to 400ms (best=100, filtered ~= rising toward 400)
  const steps: Step[] = [
    step(0, 0x61),
    step(100, 0x62),
    step(500, 0x63),
    step(600, 0x64),
    step(1000, 0x61),
    step(1100, 0x62),
    step(1500, 0x63),
    step(1900, 0x64),
  ];
  const map = makeBigramStatsMap(steps);
  const slowest = findSlowestBigrams(map, 2);
  // cd has a 4x ratio after the second sample; ab is flat at 1.0
  equal(slowest.length, 2);
  deepEqual(slowest[0].bigram, { first: 0x63, second: 0x64 });
});
