/**
 * Small bundled fallback corpus of public-domain English sentences,
 * chosen for natural prose quality and breadth of bigram coverage.
 * The querySentences() function picks the entries with the highest
 * overlap with the user's target bigrams.
 *
 * Sources: Project Gutenberg (Alice in Wonderland, Pride and Prejudice,
 * The Adventures of Sherlock Holmes), public-domain texts.
 */
export const PROSE_EN: readonly string[] = [
  "The afternoon sun slanted through the window and lit the dust dancing in the air.",
  "She crossed the bridge in silence, her boots making a quiet rhythm on the wet planks.",
  "Pictures of horses lined the corridor, their painted eyes following him as he walked.",
  "We arrived at the station just before midnight and waited for the last train north.",
  "The garden was thick with roses, and the bees made a steady hum among the petals.",
  "He read the letter twice, then folded it carefully and placed it in the drawer.",
  "A small fire burned in the grate, and the kettle whistled on the iron stove.",
  "She wrote her answer in a steady hand, signed it, and sealed the envelope with wax.",
  "The cat watched the falling rain from the windowsill and twitched her tail in protest.",
  "Three travellers stood at the crossroads, debating which path would lead them home soonest.",
  "Outside the city the road climbed gently between fields of wheat and patches of woodland.",
  "His handwriting was small and even, every letter weighed and placed with the same care.",
  "The lamp on the desk threw a circle of yellow light across the open book.",
  "Birds sang above the river and the morning was still cool against her face.",
  "We talked until the candles burned out and the room grew quite dark around us.",
  "He took the keys from his pocket, unlocked the gate, and stepped into the garden.",
  "The children ran ahead, laughing, while the older sister called after them to slow down.",
  "Stars appeared one by one as the last of the evening light faded from the western sky.",
  "She poured the tea and pushed the plate of biscuits toward the visitor without speaking.",
  "On the table lay an old map, a brass compass, and a worn leather notebook.",
  "He shook the snow from his coat and stamped his boots on the threshold.",
  "Words came easily to him in conversation, but writing them down was another matter entirely.",
  "Through the open window she could hear the slow clack of looms and the river beyond.",
  "The dog barked twice, then settled by the hearth with its head on its paws.",
  "Every morning he walked the same path to the bakery and came back with warm bread.",
  "Music drifted from the upper rooms, soft and unhurried, as the dinner guests arrived.",
  "She turned the key and the lock gave way with a small, satisfying click.",
  "The boat rocked gently at the dock while the boy tied his line to a post.",
  "A breeze moved the curtains and brought the scent of wet grass into the room.",
  "He sketched the bridge from memory, working quickly before the light failed entirely.",
];

/**
 * Score a sentence by how many target bigrams it contains. Higher is
 * better — we want sentences that exercise the user's weak transitions.
 */
function scoreSentence(
  sentence: string,
  targetBigrams: ReadonlySet<string>,
): number {
  const lower = sentence.toLowerCase();
  let count = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    const pair = lower.substring(i, i + 2);
    if (targetBigrams.has(pair)) count += 1;
  }
  return count;
}

/**
 * Return up to `limit` sentences from the bundled corpus, ranked by
 * target-bigram density. When `targetBigrams` is empty, returns the
 * first `limit` sentences in their original order.
 */
export function querySentences(
  targetBigrams: readonly string[],
  limit: number,
): string[] {
  const targets = new Set(targetBigrams.map((b) => b.toLowerCase()));
  if (targets.size === 0) {
    return PROSE_EN.slice(0, limit);
  }
  return [...PROSE_EN]
    .map((s) => ({ s, score: scoreSentence(s, targets) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => e.s);
}
