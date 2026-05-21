import { test } from "node:test";
import { equal, isNull, isTrue } from "rich-assert";
import { DwellMeter } from "./dwellmeter.ts";

test("returns null until enough samples accumulate", () => {
  const m = new DwellMeter();
  m.onKeyDown("KeyA", 0, "a");
  m.onKeyUp("KeyA", 80, "a");
  m.onKeyDown("KeyB", 100, "b");
  m.onKeyUp("KeyB", 180, "b");
  // Only 2 samples — below the 5-sample minimum.
  isNull(m.currentMedianMs);
});

test("median is the middle of the rolling window", () => {
  const m = new DwellMeter();
  for (let i = 0; i < 5; i++) {
    m.onKeyDown(`Key${i}`, i * 100, "x");
    m.onKeyUp(`Key${i}`, i * 100 + 100, "x");
  }
  // All five samples were exactly 100ms.
  equal(m.currentMedianMs, 100);
});

test("modifier keys are excluded", () => {
  const m = new DwellMeter();
  // 5 character samples at 80ms.
  for (let i = 0; i < 5; i++) {
    m.onKeyDown(`Char${i}`, i * 200, "x");
    m.onKeyUp(`Char${i}`, i * 200 + 80, "x");
  }
  // A shift held for 5s would dominate if not filtered.
  m.onKeyDown("ShiftLeft", 9000, "Shift");
  m.onKeyUp("ShiftLeft", 14000, "Shift");
  equal(m.currentMedianMs, 80);
});

test("implausible dwell values are filtered", () => {
  const m = new DwellMeter();
  // 5 valid samples at 80ms.
  for (let i = 0; i < 5; i++) {
    m.onKeyDown(`Key${i}`, i * 200, "x");
    m.onKeyUp(`Key${i}`, i * 200 + 80, "x");
  }
  // A 3-second held key (probably a stuck/forgotten release).
  m.onKeyDown("KeyZ", 9000, "z");
  m.onKeyUp("KeyZ", 12000, "z");
  // A sub-5ms clamped value from anti-fingerprinting.
  m.onKeyDown("KeyY", 13000, "y");
  m.onKeyUp("KeyY", 13002, "y");
  equal(m.currentMedianMs, 80);
});

test("tensionRatio is null until baseline established", () => {
  const m = new DwellMeter();
  for (let i = 0; i < 5; i++) {
    m.onKeyDown(`Key${i}`, i * 100, "x");
    m.onKeyUp(`Key${i}`, i * 100 + 80, "x");
  }
  // Have current median but baseline needs a full ring (32 samples).
  isNull(m.tensionRatio);
});

test("tensionRatio rises when dwell extends above baseline", () => {
  const m = new DwellMeter();
  // Fill the ring with 50ms baseline samples to lock in baselineMs.
  for (let i = 0; i < DwellMeter.ringSize; i++) {
    m.onKeyDown(`Base${i}`, i * 100, "x");
    m.onKeyUp(`Base${i}`, i * 100 + 50, "x");
  }
  const baseline = m.baselineMs!;
  equal(baseline, 50);
  // Now push longer-dwell samples and observe the ratio climb.
  for (let i = 0; i < DwellMeter.ringSize; i++) {
    m.onKeyDown(`Tight${i}`, 10000 + i * 100, "x");
    m.onKeyUp(`Tight${i}`, 10000 + i * 100 + 100, "x");
  }
  // Current median now 100, baseline still 50 → ratio 2.0.
  isTrue((m.tensionRatio ?? 0) > 1.5);
});

test("reset clears all state", () => {
  const m = new DwellMeter();
  for (let i = 0; i < 10; i++) {
    m.onKeyDown(`Key${i}`, i * 100, "x");
    m.onKeyUp(`Key${i}`, i * 100 + 100, "x");
  }
  isTrue(m.currentMedianMs != null);
  m.reset();
  isNull(m.currentMedianMs);
});
