#!/usr/bin/env node
import fs from 'node:fs';
const state=JSON.parse(fs.readFileSync('cerebro/governance/remaining-10-progress-2026-11-03.json','utf8'));
const engines=['RUNTIME-001','KNW-001','TRN-001','FINOPS-001','DOC-001','DOC-002','DOC-003','DOC-004'];
if(state.baseline.registry_total!==179||state.baseline.readiness_certified!==169)throw Error('BASELINE_MISMATCH');
if(state.safety.prod_writes!==false||state.safety.trading_touched!==false||state.safety.additional_cost_eur!==0)throw Error('SAFETY_MISMATCH');
const results=engines.map(engine_id=>{
 const p=state.progress[engine_id];
 if(!p||p.structural_contract!=='GREEN'||p.batch_verified!==true)throw Error('STRUCTURAL_EVIDENCE_MISSING:'+engine_id);
 const missing=p.remaining??[];
 if(!Array.isArray(missing))throw Error('INVALID_REMAINING:'+engine_id);
 const blockers=missing.map(x=>String(x));
 const physicalAcceptance=p.live_acceptance?.all_12_gates_verified===true&&p.live_acceptance?.persistent_target_smoke===true&&p.live_acceptance?.rollback_rebuild_tested===true&&p.live_acceptance?.approved_for_prod===true;
 const ready=physicalAcceptance&&blockers.length===0;
 return {engine_id,structural_green:true,live_readiness:ready?'PROMOTABLE_GOVERNED':'BLOCKED_LIVE_ACCEPTANCE',missing_evidence:blockers,prod_authorized:false};
});
const result={schema_version:'1.0.0',mission:'CEREBRO_EIGHT_PHYSICAL_PROD_PREFLIGHT',status:results.every(x=>x.live_readiness==='PROMOTABLE_GOVERNED')?'AWAITING_SEPARATE_PROMOTION':'BLOCKED_SAFE',registry_total:179,historical_readiness_certified:169,engines:results,prod_promotion_performed:false,prod_writes:false,trading_touched:false,additional_cost_eur:0,human_required:[]};
const out=process.env.CEREBRO_EVIDENCE_OUT||'/tmp/cerebro-eight-prod-preflight';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/SUMMARY.json',JSON.stringify(result,null,2)+'\n');
console.log('EIGHT_PROD_PREFLIGHT='+JSON.stringify(result));
