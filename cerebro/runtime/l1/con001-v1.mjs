import { assertLabContext, assertNonEmptyString, assertSafeNumber, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const CON_001=deepFreeze({
  engine_id:'CON-001',version:'0.1.0',layer:'L1',capability:'STRUCTURED_CONVERSATION_INGESTION_FOUNDATION',
  semantic_extraction:'NOT_IMPLEMENTED_IN_FOUNDATION',prod_writes:false,additional_cost_eur:0
});
const KINDS=new Set(['COMMITMENT','TASK','RISK','DECISION','FACT']);
function prob(v,l){assertSafeNumber(v,l);if(v<0||v>1)throw new RangeError(`${l} must be between 0 and 1`);return v;}

export function normalizeConversationKnowledge(input){
  const context=assertLabContext(input?.context);
  const conversation_id=assertNonEmptyString(input?.conversation_id,'conversation_id');
  const min_confidence=prob(input?.min_confidence,'min_confidence');
  if(!Array.isArray(input?.items))throw new TypeError('items must be an array');
  const items=input.items.map((x,i)=>{
    const kind=assertNonEmptyString(x?.kind,`items[${i}].kind`).toUpperCase();
    if(!KINDS.has(kind))throw new TypeError(`items[${i}].kind is not canonical`);
    const text=assertNonEmptyString(x?.text,`items[${i}].text`);
    const confidence=prob(x?.confidence,`items[${i}].confidence`);
    const sensitive=x?.sensitive===true;
    const human_exception_code=confidence<min_confidence?'LOW_CONFIDENCE':sensitive?'HIGH_RISK':null;
    return {kind,text,confidence,sensitive,status:human_exception_code?'HUMAN_REQUIRED':'CANDIDATE',human_exception_code,metadata:clone(x?.metadata ?? {})};
  });
  return result('CON-001',{
    status:items.some(x=>x.human_exception_code)?'REVIEW_REQUIRED':'STRUCTURED_CANDIDATES',
    context,conversation_id,items,min_confidence,publish:false,
    extraction_mode:'STRUCTURED_INPUT_ONLY'
  });
}
