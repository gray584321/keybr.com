import { test } from "node:test";
import { equal, isTrue } from "rich-assert";
import { querySentences } from "./data/prose-en.ts";
import { generateProse, setProseLlm } from "./generator.ts";

test("querySentences returns prose containing the target bigrams", () => {
  const result = querySentences(["th", "he"], 3);
  equal(result.length, 3);
  // At least one of the top results should contain "th".
  isTrue(result.some((s) => s.toLowerCase().includes("th")));
});

test("generateProse falls back to bundled corpus when no LLM is set", async () => {
  setProseLlm(null);
  const out = await generateProse(["er", "in", "an"], null);
  isTrue(out.length > 30);
});

test("generateProse uses the installed LLM generator", async () => {
  setProseLlm(async (bigrams, topic) => {
    return `LLM result for [${bigrams.join(",")}] topic=${topic}`;
  });
  const out = await generateProse(["th", "he"], "sports");
  equal(out, "LLM result for [th,he] topic=sports");
  setProseLlm(null);
});

test("generateProse falls back gracefully when LLM throws", async () => {
  setProseLlm(async () => {
    throw new Error("network down");
  });
  const out = await generateProse(["th"], null);
  isTrue(out.length > 30); // fell back to bundled corpus
  setProseLlm(null);
});
