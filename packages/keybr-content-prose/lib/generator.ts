import { querySentences } from "./data/prose-en.ts";

/**
 * Function that, given the user's slowest bigrams and an optional topic,
 * returns a passage of natural prose containing those bigrams at elevated
 * density. Hosts can install an LLM-backed generator via setProseLlm()
 * to call Claude / GPT / etc.; the default falls back to a bundled
 * curated corpus indexed by bigram density.
 */
export type ProseGenerator = (
  targetBigrams: readonly string[],
  topic: string | null,
) => Promise<string>;

let activeGenerator: ProseGenerator = defaultGenerator;

/**
 * Override the default prose generator. Pass null to revert to the
 * bundled-corpus fallback. Hosts install this once at startup if they
 * have an LLM API key configured.
 */
export function setProseLlm(gen: ProseGenerator | null): void {
  activeGenerator = gen ?? defaultGenerator;
}

/**
 * Generate a prose passage. Always non-empty: even with no LLM and no
 * target bigrams, the bundled corpus has 30 sentences to draw from.
 */
export async function generateProse(
  targetBigrams: readonly string[],
  topic: string | null = null,
): Promise<string> {
  try {
    return await activeGenerator(targetBigrams, topic);
  } catch {
    return defaultGenerator(targetBigrams, topic);
  }
}

async function defaultGenerator(
  targetBigrams: readonly string[],
  _topic: string | null,
): Promise<string> {
  const sentences = querySentences(targetBigrams, 3);
  return sentences.join(" ");
}
