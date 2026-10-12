import { coverageSignature, generateSyntheticHuman } from './synthetic-human-population.mjs';

function scoreCandidate(profile, ledger = {}) {
  const key = coverageSignature(profile);
  const cell = ledger[key] ?? {};
  const visits = Number(cell.visits ?? 0);
  const failures = Number(cell.failures ?? 0);
  const regressions = Number(cell.regressions ?? 0);
  const oldNewVariance = Number(cell.old_new_variance ?? 0);
  const evaluatorUncertainty = Number(cell.evaluator_uncertainty ?? 0);
  const critical = Boolean(cell.critical_cross_pair ?? false);

  const lowCoverage = 1 / (1 + visits);
  const recentFailure = Math.min(1, failures / Math.max(1, visits));
  const regressionPressure = Math.min(1, regressions / Math.max(1, visits));

  const score =
    lowCoverage * 0.35 +
    recentFailure * 0.20 +
    Math.min(1, oldNewVariance) * 0.15 +
    regressionPressure * 0.15 +
    Math.min(1, evaluatorUncertainty) * 0.10 +
    (critical ? 0.05 : 0);

  return { key, score: Number(score.toFixed(6)) };
}

export function rankPopulationSeeds({ seeds, ledger = {}, strategy = 'COVERAGE' }) {
  if (!Array.isArray(seeds) || seeds.length === 0) throw new Error('seeds_required');
  return seeds
    .map(seed => {
      const profile = generateSyntheticHuman(seed, { strategy });
      return { seed: String(seed), profile, ...scoreCandidate(profile, ledger) };
    })
    .sort((a, b) => b.score - a.score || a.seed.localeCompare(b.seed));
}

export function selectNextPopulationEpisode({ seeds, ledger = {}, strategy = 'COVERAGE' }) {
  return rankPopulationSeeds({ seeds, ledger, strategy })[0];
}

export function updateCoverageLedger(ledger = {}, profile, evaluation = {}) {
  const next = structuredClone(ledger);
  const key = coverageSignature(profile);
  const previous = next[key] ?? {
    visits: 0,
    failures: 0,
    regressions: 0,
    old_new_variance: 0,
    evaluator_uncertainty: 0,
    critical_cross_pair: false
  };

  const visits = previous.visits + 1;
  const currentVariance = Number(evaluation.old_new_variance ?? 0);
  const currentUncertainty = Number(evaluation.evaluator_uncertainty ?? 0);

  next[key] = {
    visits,
    failures: previous.failures + (evaluation.failed ? 1 : 0),
    regressions: previous.regressions + (evaluation.regression ? 1 : 0),
    old_new_variance: Number((((previous.old_new_variance * previous.visits) + currentVariance) / visits).toFixed(6)),
    evaluator_uncertainty: Number((((previous.evaluator_uncertainty * previous.visits) + currentUncertainty) / visits).toFixed(6)),
    critical_cross_pair: Boolean(previous.critical_cross_pair || evaluation.critical_cross_pair)
  };

  return next;
}
