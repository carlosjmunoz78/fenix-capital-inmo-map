import { assertPlainObject, assertSafeNumber, deepFreeze, result } from './shared-v1.mjs';
export const DEC_001 = deepFreeze({ engine_id:'DEC-001', version:'0.1.0', layer:'L0', mode:'DETERMINISTIC_SCORING', prod_writes:false, additional_cost_eur:0 });
export function rankCandidates({ candidates, weights }) {
  if (!Array.isArray(candidates) || candidates.length===0) throw new TypeError('candidates must be a non-empty array');
  assertPlainObject(weights,'weights');
  const entries=Object.entries(weights); if (!entries.length) throw new TypeError('weights must not be empty');
  for (const [k,w] of entries) assertSafeNumber(w,`weights.${k}`);
  const ranked=candidates.map(c=>{
    assertPlainObject(c,'candidate');
    const id=String(c.id ?? ''); if(!id) throw new TypeError('candidate.id required');
    assertPlainObject(c.metrics,'candidate.metrics');
    const contributions={}; let score=0;
    for(const [k,w] of entries){ const v=assertSafeNumber(c.metrics[k] ?? 0,`candidate.metrics.${k}`); contributions[k]=v*w; score+=contributions[k]; }
    return {id,score,contributions};
  }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return result('DEC-001',{status:'OK',winner:ranked[0],ranked});
}
