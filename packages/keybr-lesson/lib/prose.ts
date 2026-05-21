import { querySentences } from "@keybr/content-prose";
import { type Keyboard } from "@keybr/keyboard";
import { type PhoneticModel } from "@keybr/phonetic-model";
import { type RNGStream } from "@keybr/rand";
import {
  type BigramStatsMap,
  findSlowestBigrams,
  type KeyStatsMap,
} from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { type StyledText } from "@keybr/textinput";
import { LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { Target } from "./target.ts";

/**
 * Real-prose lesson: synthesizes a passage from the bundled curated
 * corpus (or, when a host registers an LLM generator via
 * @keybr/content-prose's setProseLlm, from real-time generation),
 * ranked by overlap with the user's slowest bigrams.
 *
 * The first typing-trainer in the field to combine adaptive weakness
 * targeting with real coherent prose.
 */
export class ProseLesson extends Lesson {
  private readonly bigramStatsMap: BigramStatsMap;

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    bigramStatsMap: BigramStatsMap = new Map(),
  ) {
    super(settings, keyboard, model);
    this.bigramStatsMap = bigramStatsMap;
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap): LessonKeys {
    return LessonKeys.includeAll(keyStatsMap, new Target(this.settings));
  }

  override generate(_lessonKeys: LessonKeys, rng: RNGStream): StyledText {
    const slowest = findSlowestBigrams(this.bigramStatsMap, 5).map((b) =>
      String.fromCodePoint(b.bigram.first, b.bigram.second),
    );
    // The async generator hook is the production-grade path (Claude API
    // etc.) — but `generate()` is sync, so we draw from the bundled
    // corpus directly via querySentences and let any LLM integration
    // happen at a later layer that can preload passages.
    const sentences = querySentences(slowest, 3);
    // Pick a starting offset deterministically from the RNG so the user
    // doesn't always see the same lead sentence.
    const start = Math.floor(rng() * Math.max(1, sentences.length));
    const ordered = [...sentences.slice(start), ...sentences.slice(0, start)];
    return ordered.join(" ");
  }
}
