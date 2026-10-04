export interface RngSample {
  value: number;
  nextState: number;
}

export function nextRng(state: number): RngSample {
  // Numerical Recipes LCG; deterministic and cheap. Replace only with migration/golden updates.
  const nextState = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
  return { value: nextState / 0x100000000, nextState };
}

export function sampleRange(state: number, min: number, max: number): RngSample {
  const sample = nextRng(state);
  return {
    value: min + (max - min) * sample.value,
    nextState: sample.nextState,
  };
}

/** Deterministic Bernoulli roll; consumes exactly one RNG step. */
export function rollChance(state: number, chance: number): { success: boolean; nextState: number } {
  const sample = nextRng(state);
  return { success: sample.value < chance, nextState: sample.nextState };
}

/**
 * Scramble a raw seed (murmur3 fmix32) so small/adjacent seeds do not produce
 * correlated first LCG outputs. Used when creating a battle; nextRng is unchanged.
 */
export function mixSeed(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
