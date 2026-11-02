import { assertLabContext, assertNonEmptyString, assertPlainObject, assertSafeNumber, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const UPD_001 = deepFreeze({
  engine_id: 'UPD-001',
  version: '0.1.0',
  layer: 'L1',
  capability: 'KNOWLEDGE_CANDIDATE_FOUNDATION',
  publication_enabled: false,
  prod_writes: false,
  additional_cost_eur: 0
});

function probability(value,label){assertSafeNumber(value,label);if(value<0||value>1)throw new RangeError(`${label} must be between 0 and 1`);return value;}

export function buildKnowledgeCandidate(input){
  assertPlainObject(input,'input');
  const context=assertLabContext(input.context);
  const candidate_id=assertNonEmptyString(input.candidate_id,'candidate_id');
  const domain=assertNonEmptyString(input.domain,'domain').toLowerCase();
  assertPlainObject(input.source,'source');
  const source={
    source_id:assertNonEmptyString(input.source.source_id,'source.source_id'),
    provenance:assertNonEmptyString(input.source.provenance,'source.provenance'),
    observed_at:assertNonEmptyString(input.source.observed_at,'source.observed_at'),
    validated:input.source.validated===true
  };
  const confidence=probability(input.confidence,'confidence');
  const min_confidence=probability(input.min_confidence,'min_confidence');
  let status='KNOWLEDGE_CANDIDATE', human_exception_code=null;
  if(input.legal_required===true){status='HUMAN_REQUIRED';human_exception_code='LEGAL_REQUIRED';}
  else if(input.policy_conflict===true){status='HUMAN_REQUIRED';human_exception_code='POLICY_CONFLICT';}
  else if(confidence<min_confidence){status='HUMAN_REQUIRED';human_exception_code='LOW_CONFIDENCE';}
  else if(input.high_risk===true||['legal','fiscal'].includes(domain)){status='HUMAN_REQUIRED';human_exception_code='HIGH_RISK';}
  else if(!source.validated){status='HOLD_SOURCE_UNVALIDATED';}
  return result('UPD-001',{
    status,context,candidate_id,domain,source,confidence,min_confidence,
    payload:clone(input.payload ?? null),human_exception_code,
    publish:false,requires_policy_gate:true
  });
}
