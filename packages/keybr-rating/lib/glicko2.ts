/**
 * Glicko-2 rating system, per Glickman (2013) — single-period update.
 *
 * The algorithm tracks three values per player:
 *
 *   mu     — skill rating (mean of the player's true skill distribution)
 *   phi    — rating deviation (uncertainty around mu); decreases with
 *            more outcomes, increases during inactivity
 *   sigma  — rating volatility (how erratically skill changes over time)
 *
 * Reference: http://www.glicko.net/glicko/glicko2.pdf
 *
 * In keybr the "player" is the learner and the "opponents" are individual
 * keys / bigrams whose difficulty is also rated; each lesson result is one
 * rating period. An outcome is a number in [0, 1] where 1 = met the speed
 * target on this trial, 0 = far below it.
 */

/** Glicko-2 algorithm "system constant" — bounds how much sigma may move. */
export const TAU = 0.5;

/**
 * Newton's-method convergence tolerance for the volatility update step.
 * Standard reference value from the Glickman paper.
 */
const CONVERGENCE_TOLERANCE = 1e-6;

/**
 * Scale factor between the public Glicko (rating around 1500) scale and
 * the internal Glicko-2 (mu around 0) scale.
 */
const SCALE = 173.7178;

export type Rating = {
  /** Skill rating on the Glicko (1500-centered) scale. */
  readonly rating: number;
  /** Rating deviation on the Glicko scale. */
  readonly rd: number;
  /** Rating volatility (Glicko-2 internal scale). */
  readonly sigma: number;
};

export type Outcome = {
  /** Opponent's rating on the Glicko (1500-centered) scale. */
  readonly opponentRating: number;
  /** Opponent's rating deviation on the Glicko scale. */
  readonly opponentRd: number;
  /** Score in [0, 1]. 1 = decisive win, 0 = decisive loss. */
  readonly score: number;
};

/** Default starting rating for an unrated player (Glickman convention). */
export const DEFAULT_RATING = 1500;

/** Default starting rating deviation for an unrated player. */
export const DEFAULT_RD = 350;

/** Default starting volatility (Glickman recommends 0.06 as a sensible base). */
export const DEFAULT_SIGMA = 0.06;

/** Create a fresh rating for a player who has never been observed. */
export function newRating(): Rating {
  return {
    rating: DEFAULT_RATING,
    rd: DEFAULT_RD,
    sigma: DEFAULT_SIGMA,
  };
}

/**
 * Update a player's rating given a batch of outcomes within a single
 * rating period.
 *
 * When `outcomes` is empty, only the RD ages (per step 6 of the paper).
 */
export function updateRating(
  prior: Rating,
  outcomes: readonly Outcome[],
  tau: number = TAU,
): Rating {
  const mu = toMu(prior.rating);
  const phi = toPhi(prior.rd);

  if (outcomes.length === 0) {
    // Step 6: no observations this period — only RD inflates by sigma.
    const newPhi = Math.sqrt(phi * phi + prior.sigma * prior.sigma);
    return {
      rating: prior.rating,
      rd: fromPhi(newPhi),
      sigma: prior.sigma,
    };
  }

  // Step 2: convert opponents to Glicko-2 scale and pre-compute g(), E().
  const players = outcomes.map((o) => {
    const muJ = toMu(o.opponentRating);
    const phiJ = toPhi(o.opponentRd);
    return {
      muJ,
      phiJ,
      score: o.score,
      g: g(phiJ),
      E: E(mu, muJ, phiJ),
    };
  });

  // Step 3: v = variance estimate.
  let vInv = 0;
  for (const p of players) {
    vInv += p.g * p.g * p.E * (1 - p.E);
  }
  const v = 1 / vInv;

  // Step 4: delta = direction/magnitude of skill change.
  let deltaSum = 0;
  for (const p of players) {
    deltaSum += p.g * (p.score - p.E);
  }
  const delta = v * deltaSum;

  // Step 5: iterate to find the new volatility (Illinois method).
  const newSigma = updateSigma(prior.sigma, phi, v, delta, tau);

  // Step 6: pre-period RD inflated by new volatility.
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

  // Step 7: updated RD and rating.
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: fromMu(newMu),
    rd: fromPhi(newPhi),
    sigma: newSigma,
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function toMu(rating: number): number {
  return (rating - DEFAULT_RATING) / SCALE;
}

function fromMu(mu: number): number {
  return mu * SCALE + DEFAULT_RATING;
}

function toPhi(rd: number): number {
  return rd / SCALE;
}

function fromPhi(phi: number): number {
  return phi * SCALE;
}

/**
 * Step 5 of the Glicko-2 paper: solve for the new volatility via the
 * Illinois variant of regula-falsi.
 */
function updateSigma(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
  tau: number,
): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * (phi * phi + v + ex) ** 2;
    return num / den - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > CONVERGENCE_TOLERANCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}
