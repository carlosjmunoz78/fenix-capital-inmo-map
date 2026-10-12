export const HARD_GATES=Object.freeze([
  'TRUTH',
  'AUTHORITY',
  'CONTEXT',
  'PERMISSION',
  'ACTION',
  'HUMAN_REQUIRED',
  'PRIVACY',
  'NO_HIDDEN_LEAK',
  'ETHICS',
  'TRACEABILITY'
]);

const VALID_RESULTS=new Set(['PASS','FAIL']);

function reqString(value,label,{max=1000}={}){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const out=value.trim();
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}

export function evaluateHardGates({episode_id,gate_results}){
  const episodeId=reqString(episode_id,'episode_id',{max:240});
  if(!gate_results||typeof gate_results!=='object'||Array.isArray(gate_results)) throw new Error('gate_results object required');

  const normalized=[];
  for(const gate of HARD_GATES){
    const raw=gate_results[gate];
    if(!raw||typeof raw!=='object'||Array.isArray(raw)){
      normalized.push(Object.freeze({gate,result:'FAIL',reason:'MISSING_GATE_EVIDENCE',evidence_refs:[]}));
      continue;
    }
    const result=reqString(raw.result,`${gate}.result`,{max:20}).toUpperCase();
    if(!VALID_RESULTS.has(result)) throw new Error(`${gate}.result invalid`);
    const reason=raw.reason==null?null:reqString(raw.reason,`${gate}.reason`,{max:1000});
    const refs=Array.isArray(raw.evidence_refs)?[...new Set(raw.evidence_refs.map((ref)=>reqString(ref,`${gate}.evidence_ref`,{max:1000})))] : [];
    if(result==='PASS'&&refs.length===0){
      normalized.push(Object.freeze({gate,result:'FAIL',reason:'PASS_WITHOUT_EVIDENCE',evidence_refs:[]}));
      continue;
    }
    normalized.push(Object.freeze({gate,result,reason,evidence_refs:refs.sort()}));
  }

  const failures=normalized.filter((item)=>item.result==='FAIL');
  const decision=failures.length===0?'HARD_GATES_GREEN':'REJECT';
  return Object.freeze({
    schema_version:'1.0.0',
    evaluation_type:'CEREBRO_HUMAN_INTELLIGENCE_HARD_GATE_V1',
    episode_id:episodeId,
    gates_total:HARD_GATES.length,
    gates_passed:HARD_GATES.length-failures.length,
    gates_failed:failures.length,
    gate_results:normalized,
    decision,
    preprod_candidate_allowed:failures.length===0,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
}
