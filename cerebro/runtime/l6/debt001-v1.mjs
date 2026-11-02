import { assertNonEmptyString, assertNonNegativeNumber, assertSafeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const DEBT_001=deepFreeze({engine_id:'DEBT-001',version:'0.1.0',layer:'L6',capability:'TECH_DEBT_SCORING_FOUNDATION',issue_creation:false,prod_writes:false,additional_cost_eur:0});
function score(v,label){assertSafeNumber(v,label);if(v<0||v>10)throw new RangeError(`${label} must be 0..10`);return v;}

export function scoreTechnicalDebt(input){
  const debt_id=assertNonEmptyString(input?.debt_id,'debt_id');
  const impact=score(input?.impact,'impact'),risk=score(input?.risk,'risk'),urgency=score(input?.urgency,'urgency'),effort=assertNonNegativeNumber(input?.effort,'effort');
  const raw=(impact*0.4)+(risk*0.35)+(urgency*0.25);
  const priority_score=Number((raw/(1+Math.log1p(effort))).toFixed(6));
  const band=priority_score>=6?'P0':priority_score>=4?'P1':priority_score>=2?'P2':'P3';
  return result('DEBT-001',{debt_id,status:'SCORED',impact,risk,urgency,effort,priority_score,priority_band:band,issue_creation:false});
}
