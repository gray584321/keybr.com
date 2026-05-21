import { test } from "node:test";
import { ResultFaker } from "@keybr/result";
import { deepEqual } from "rich-assert";
import { MicroBreakEvents } from "./event-source-micro-break.ts";
import { type LessonEvent } from "./event-types.ts";

test("fires after each interval of accumulated typing time", () => {
  const source = new MicroBreakEvents(60_000); // 1-minute interval for the test
  const faker = new ResultFaker();
  const events: LessonEvent[] = [];
  const listener = (e: LessonEvent) => events.push(e);

  // 30s lesson — under interval, no event.
  source.append(faker.nextResult({ time: 30_000 }), listener);
  deepEqual(events, []);

  // Another 30s — total 60s, crosses threshold once.
  source.append(faker.nextResult({ time: 30_000 }), listener);
  deepEqual(events, [{ type: "micro-break", sessionMinutes: 1 }]);

  // 20s more — total 80s, still inside first post-break window.
  source.append(faker.nextResult({ time: 20_000 }), listener);
  deepEqual(events, [{ type: "micro-break", sessionMinutes: 1 }]);

  // Another 40s — total 120s = 2 minutes, crosses threshold a second time.
  source.append(faker.nextResult({ time: 40_000 }), listener);
  deepEqual(events, [
    { type: "micro-break", sessionMinutes: 1 },
    { type: "micro-break", sessionMinutes: 2 },
  ]);
});

test("does not double-fire on a single long lesson", () => {
  // Even if a single result.time is greater than the interval, fire only
  // once (not floor(time / interval) times) — long lessons probably mean
  // the user is in the zone, give them one nudge.
  const source = new MicroBreakEvents(60_000);
  const faker = new ResultFaker();
  const events: LessonEvent[] = [];
  source.append(faker.nextResult({ time: 250_000 }), (e) => events.push(e));
  deepEqual(events, [{ type: "micro-break", sessionMinutes: 4 }]);
});
