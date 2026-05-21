import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { newRating } from "@keybr/rating";
import { Histogram } from "@keybr/textinput";
import { deepEqual, isTrue } from "rich-assert";
import { ResultFaker } from "./fake.tsx";
import { type KeyStats, MutableKeyStatsMap } from "./keystats.ts";

// Strip the Glicko-2 rating field for equality assertions on the rest of
// the KeyStats shape; rating is tested separately.
function withoutRating(s: KeyStats) {
  const { rating: _, ...rest } = s;
  return rest;
}

test("compute key stats", () => {
  const faker = new ResultFaker();
  const l1 = new Letter(0x0061, 1, "A");
  const l2 = new Letter(0x0062, 1, "B");
  const r1 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
      },
    ]),
  });
  const r2 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l2.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
      },
    ]),
  });
  const r3 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
      },
    ]),
  });

  const keyStatsMap = new MutableKeyStatsMap([l1, l2]);

  deepEqual(withoutRating(keyStatsMap.copy().get(l1)), {
    letter: l1,
    samples: [],
    timeToType: null,
    bestTimeToType: null,
  });

  keyStatsMap.append(r1);

  deepEqual(withoutRating(keyStatsMap.copy().get(l1)), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
    ],
    timeToType: 500,
    bestTimeToType: 500,
  });

  keyStatsMap.append(r2);
  keyStatsMap.append(r3);

  deepEqual(withoutRating(keyStatsMap.copy().get(l1)), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
      {
        index: 2,
        timeStamp: r3.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
        filteredTimeToType: 460,
      },
    ],
    timeToType: 460,
    bestTimeToType: 460,
  });

  deepEqual(withoutRating(keyStatsMap.copy().get(l2)), {
    letter: l2,
    samples: [
      {
        index: 1,
        timeStamp: r2.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
        filteredTimeToType: 200,
      },
    ],
    timeToType: 200,
    bestTimeToType: 200,
  });
});

test("Glicko rating is updated each time a key has data", () => {
  const faker = new ResultFaker();
  const l1 = new Letter(0x0061, 1, "A");
  const keyStatsMap = new MutableKeyStatsMap([l1]);
  const base = newRating();

  // Fresh map → key starts at default rating.
  deepEqual(keyStatsMap.copy().get(l1).rating, base);

  // One slow result should drop the rating below 1500 and tighten RD.
  keyStatsMap.append(
    faker.nextResult({
      histogram: new Histogram([
        { codePoint: l1.codePoint, hitCount: 1, missCount: 0, timeToType: 800 },
      ]),
    }),
  );
  const afterSlow = keyStatsMap.copy().get(l1).rating;
  isTrue(afterSlow.rd < base.rd);

  // A fast result then should raise the rating above the slow-only one.
  keyStatsMap.append(
    faker.nextResult({
      histogram: new Histogram([
        { codePoint: l1.codePoint, hitCount: 1, missCount: 0, timeToType: 200 },
      ]),
    }),
  );
  const afterFast = keyStatsMap.copy().get(l1).rating;
  isTrue(afterFast.rating > afterSlow.rating);
});
