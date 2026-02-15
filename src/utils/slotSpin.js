const TIER_WEIGHTS = {
  Common: 70,
  Spicy: 25,
  Legendary: 5,
};

const DEV = import.meta.env.DEV;

const getWeightForMode = (mode, tierCounts) => {
  const tierWeight = TIER_WEIGHTS[mode.tier] ?? 0;
  const count = tierCounts[mode.tier] ?? 1;
  return tierWeight / count;
};

const selectWeightedMode = (modes) => {
  if (!Array.isArray(modes) || modes.length === 0) {
    throw new Error('pickModeWeighted requires a non-empty modes array.');
  }

  const tierCounts = modes.reduce((acc, mode) => {
    const tier = mode.tier ?? 'Common';
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  const weightedModes = modes.map((mode) => ({
    mode,
    weight: getWeightForMode(mode, tierCounts),
  }));

  const total = weightedModes.reduce((sum, entry) => sum + entry.weight, 0);
  let r = Math.random() * total;
  const randomValue = r;

  let selected = weightedModes[weightedModes.length - 1]?.mode;
  for (const entry of weightedModes) {
    r -= entry.weight;
    if (r <= 0) {
      selected = entry.mode;
      break;
    }
  }

  return {
    selected,
    randomValue,
    total,
    weightedModes,
  };
};

export const pickModeWeighted = (modes) => {
  const { selected } = selectWeightedMode(modes);
  return selected;
};

export const pickModeWeightedDebug = (modes) => selectWeightedMode(modes);

export const simulateModeDistribution = (modes, iterations = 10000) => {
  if (!Array.isArray(modes) || modes.length === 0) {
    throw new Error('simulateModeDistribution requires a non-empty modes array.');
  }

  const tierCounts = {};
  const modeCounts = {};

  for (let i = 0; i < iterations; i += 1) {
    const mode = pickModeWeighted(modes);
    tierCounts[mode.tier] = (tierCounts[mode.tier] ?? 0) + 1;
    modeCounts[mode.name] = (modeCounts[mode.name] ?? 0) + 1;
  }

  const tierDistribution = Object.entries(tierCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tier, count]) => ({
      tier,
      count,
      percent: Number(((count / iterations) * 100).toFixed(2)),
    }));

  const topModes = Object.entries(modeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      percent: Number(((count / iterations) * 100).toFixed(2)),
    }));

  if (DEV) {
    console.log('[slot-sim] iterations:', iterations);
    console.table(tierDistribution);
    console.table(topModes);
  }

  return {
    iterations,
    tierDistribution,
    topModes,
  };
};

export const attachSimulationToWindow = (modes) => {
  if (!DEV || typeof window === 'undefined') {
    return;
  }

  window.simulateModeDistribution = (iterations = 10000) =>
    simulateModeDistribution(modes, iterations);
};
