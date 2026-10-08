import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export function detectRepeatedFailurePattern({company_id,environment='LAB',version='0.1.0',error_class,engine_ids,occurrences,evidence_refs}){
  const context={company_id,engine_id:'FACT-001',environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid factory context:${check.errors.join(',')}`);
  if(!error_class) throw new Error('error_class required');
  const uniqueEngines=[...new Set(engine_ids??[])];
  if(uniqueEngines.length<2) throw new Error('cross-engine evidence required');
  if(!Number.isInteger(occurrences)||occurrences<2) throw new Error('repetition required');
  const evidence=[...new Set(evidence_refs??[])];
  if(evidence.length<2) throw new Error('evidence required');
  return Object.freeze({
    pattern_id:stableIdempotencyKey({...context,error_class,engine_ids:[...uniqueEngines].sort(),occurrences,evidence_refs:[...evidence].sort()}),
    ...context,error_class,engine_ids:uniqueEngines,occurrences,evidence_refs:evidence,state:'VALIDATED_PATTERN',prod_authorized:false
  });
}

export function proposeFactoryVnext({pattern,current_scaffold_version,candidate_scaffold_version,new_contract_test,fixture_engine_ids,rollback_ref,rebuild_ref}){
  if(!pattern?.pattern_id||pattern.engine_id!=='FACT-001') throw new Error('validated FACT-001 pattern required');
  if(!current_scaffold_version||!candidate_scaffold_version||current_scaffold_version===candidate_scaffold_version) throw new Error('versioned scaffold required');
  if(!new_contract_test) throw new Error('contract test required');
  const fixtures=[...new Set(fixture_engine_ids??[])];
  if(fixtures.length===0) throw new Error('fixture engines required');
  if(!rollback_ref||!rebuild_ref) throw new Error('rollback and rebuild required');
  return Object.freeze({
    candidate_id:stableIdempotencyKey({pattern:pattern.pattern_id,current_scaffold_version,candidate_scaffold_version,new_contract_test,fixtures:[...fixtures].sort()}),
    company_id:pattern.company_id,engine_id:'FACT-001',environment:pattern.environment,version:pattern.version,
    pattern_id:pattern.pattern_id,current_scaffold_version,candidate_scaffold_version,new_contract_test,fixture_engine_ids:fixtures,
    rollback_ref,rebuild_ref,mutate_existing_engines:false,state:'FACTORY_CANDIDATE',next_gate:'OLD_VS_NEW_FIXTURE_EVALUATION',
    prod_authorized:false,prod_write_authorized:false,additional_cost_budget_eur:0
  });
}

export class ImprovementSupervisor{
  #ledger=new Map();

  open({candidate_id,evidence_ref,max_attempts=3}){
    if(!candidate_id||!evidence_ref) throw new Error('candidate/evidence required');
    if(!Number.isInteger(max_attempts)||max_attempts<1||max_attempts>3) throw new Error('max_attempts 1..3');
    if(this.#ledger.has(candidate_id)) return Object.freeze({accepted:false,duplicate:true,...this.#ledger.get(candidate_id)});
    const item={candidate_id,evidence_ref,max_attempts,attempts:0,state:'OPEN',eligible_for_external_promotion:false,rollback_ref:null,rebuild_ref:null,prod_authorized:false};
    this.#ledger.set(candidate_id,item);
    return Object.freeze({accepted:true,duplicate:false,...item});
  }

  attempt(candidate_id){
    const item=this.#ledger.get(candidate_id);
    if(!item) throw new Error('unknown candidate');
    if(item.attempts>=item.max_attempts) return Object.freeze({...item,state:'EXHAUSTED',human_required:null});
    item.attempts+=1;
    item.state='TESTING';
    return Object.freeze({...item,backoff_seconds:[30,120,600][item.attempts-1]??600,human_required:null});
  }

  markJudged(candidate_id,{pass,rollback_ref,rebuild_ref,independent_judge=false}){
    const item=this.#ledger.get(candidate_id);
    if(!item) throw new Error('unknown candidate');
    if(pass&&!independent_judge) throw new Error('independent judge required');
    if(pass&&(!rollback_ref||!rebuild_ref)) throw new Error('rollback and rebuild required before promotion review');
    item.state=pass?'JUDGED_PASS':'JUDGED_FAIL';
    item.rollback_ref=rollback_ref??null;
    item.rebuild_ref=rebuild_ref??null;
    item.eligible_for_external_promotion=Boolean(pass);
    return Object.freeze({...item,next_gate:pass?'CURRENT_FACTORY_PROMOTION_AUTHORITY_REQUIRED':'HOLD',prod_authorized:false});
  }

  markPromoted(){
    throw new Error('RSI supervisor cannot promote FACT-001; current promotion authority required');
  }
}
