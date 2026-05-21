import { test } from "node:test";
import { deepEqual, equal } from "rich-assert";
import { emit, setTelemetrySink, type TelemetryEvent } from "./telemetry.ts";

test("emits events through the registered sink", () => {
  const captured: TelemetryEvent[] = [];
  setTelemetrySink((e) => captured.push(e));
  emit({
    type: "drill_complete",
    sessionMinutes: 5,
  });
  setTelemetrySink(null);
  deepEqual(captured, [{ type: "drill_complete", sessionMinutes: 5 }]);
});

test("a throwing sink does not propagate to the caller", () => {
  setTelemetrySink(() => {
    throw new Error("ignored");
  });
  // No try/catch around emit — would fail the test if the throw escaped.
  emit({ type: "letter_unlocked", alphabetSize: 7, accuracyAtUnlock: 0.95 });
  setTelemetrySink(null);
});

test("setTelemetrySink(null) restores no-op behaviour", () => {
  const captured: TelemetryEvent[] = [];
  setTelemetrySink((e) => captured.push(e));
  emit({ type: "sfb_heatmap_viewed", sfbCount: 3 });
  setTelemetrySink(null);
  emit({ type: "sfb_heatmap_viewed", sfbCount: 99 });
  // Only the first event reached the captured array.
  equal(captured.length, 1);
});
