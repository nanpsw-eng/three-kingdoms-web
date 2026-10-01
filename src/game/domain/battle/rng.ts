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
