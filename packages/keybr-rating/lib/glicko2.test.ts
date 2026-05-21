import { test } from "node:test";
import { equal, isTrue } from "rich-assert";

function almostEqual(actual: number, expected: number, tolerance: number) {
  isTrue(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}
import {
  DEFAULT_RATING,
  DEFAULT_RD,
  DEFAULT_SIGMA,
  newRating,
  type Outcome,
  type Rating,
  updateRating,
} from "./glicko2.ts";

test("newRating starts at the canonical Glickman defaults", () => {
  const r = newRating();
  equal(r.rating, 1500);
  equal(r.rd, 350);
  equal(r.sigma, 0.06);
});

test("Glickman 2013 worked example reproduces published expected values", () => {
  // From section "Example calculation" of glicko/glicko2.pdf — Glickman's
  // canonical example: player at (1500, 200, 0.06) faces three opponents.
  const prior: Rating = { rating: 1500, rd: 200, sigma: 0.06 };
  const outcomes: Outcome[] = [
    { opponentRating: 1400, opponentRd: 30, score: 1 }, // beat strong player
    { opponentRating: 1550, opponentRd: 100, score: 0 }, // lost to mid player
    { opponentRating: 1700, opponentRd: 300, score: 0 }, // lost to top player
  ];
  const next = updateRating(prior, outcomes, 0.5);
  // Reference values from the paper: rating ≈ 1464.06, rd ≈ 151.52
  almostEqual(next.rating, 1464.06, 0.1);
  almostEqual(next.rd, 151.52, 0.1);
  almostEqual(next.sigma, 0.05999, 0.001);
});

test("a player with an empty rating period only ages RD upward", () => {
  const prior: Rating = { rating: 1500, rd: 200, sigma: 0.06 };
  const next = updateRating(prior, []);
  equal(next.rating, prior.rating);
  isTrue(next.rd > prior.rd);
  equal(next.sigma, prior.sigma);
});

test("RD decreases monotonically over many consistent winning periods", () => {
  // A player who reliably beats one fixed opponent should see their RD
  // converge downward (uncertainty drops as more data accumulates).
  let r: Rating = newRating();
  const opponent = { opponentRating: 1400, opponentRd: 100, score: 1 };
  const rds: number[] = [r.rd];
  for (let i = 0; i < 25; i++) {
    r = updateRating(r, [opponent]);
    rds.push(r.rd);
  }
  // First RD update should drop substantially from 350.
  isTrue(rds[1] < rds[0] - 50);
  // Long-run RD should converge well below the starting 350.
  isTrue(r.rd < 150, `RD did not converge; final ${r.rd}`);
  // Rating should rise (player keeps winning).
  isTrue(r.rating > DEFAULT_RATING);
});

test("losing player rating drifts downward", () => {
  let r: Rating = newRating();
  for (let i = 0; i < 10; i++) {
    r = updateRating(r, [{ opponentRating: 1500, opponentRd: 100, score: 0 }]);
  }
  isTrue(r.rating < DEFAULT_RATING);
});

test("partial scores (e.g. 0.7) move rating less than full wins", () => {
  const opponent = { opponentRating: 1500, opponentRd: 100 };
  const fullWin = updateRating(newRating(), [{ ...opponent, score: 1 }]);
  const partial = updateRating(newRating(), [{ ...opponent, score: 0.7 }]);
  isTrue(partial.rating > DEFAULT_RATING);
  isTrue(partial.rating < fullWin.rating);
});

test("DEFAULT_* constants are exported", () => {
  equal(DEFAULT_RATING, 1500);
  equal(DEFAULT_RD, 350);
  equal(DEFAULT_SIGMA, 0.06);
});
