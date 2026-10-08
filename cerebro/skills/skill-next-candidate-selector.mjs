import fs from 'node:fs';
import path from 'node:path';

function addCandidateId(ids,value){
  if(typeof value==='string'&&value.trim()) ids.add(value.trim());
  else if(value&&typeof value==='object'&&typeof value.candidate_id==='string'&&value.candidate_id.trim()) ids.add(value.candidate_id.trim());
}

function registryProcessedCandidateIds(registry){
  const ids=new Set();
  for(const item of Object.values(registry?.behavioral_candidates??{})) addCandidateId(ids,item);
  for(const key of [
    'github_preprod_evidence',
    'github_prod_readonly_canary_evidence',
    'skill_creator_preprod_evidence',
    'skill_creator_prod_readonly_canary_evidence'
  ]) addCandidateId(ids,registry?.[key]);
  return ids;
}

export function autoloopStateCandidateIds(state){
  const ids=new Set();
  for(const value of state?.processed_candidate_ids??[]) addCandidateId(ids,value);
  for(const bucket of ['in_flight','waiting_human','waiting_safe_handler','completed','terminal_hold']){
    for(const [key,value] of Object.entries(state?.[bucket]??{})){
      addCandidateId(ids,key);
      addCandidateId(ids,value);
    }
  }
  return ids;
}

function processedCandidateIds(registry,state){
  const ids=registryProcessedCandidateIds(registry);
  for(const id of autoloopStateCandidateIds(state)) ids.add(id);
  return ids;
}

export function selectNextCandidate(valueReport,registry,state={}){
  const processed=processedCandidateIds(registry,state);
  const eligible=(valueReport?.results??[])
    .filter((item)=>['HIGH_VALUE_LAB_BENCHMARK','LAB_BENCHMARK'].includes(item.recommendation))
    .slice()
    .sort((a,b)=>(b.value_score??0)-(a.value_score??0)||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  const skipped=eligible.filter((item)=>processed.has(item.candidate_id)).map((item)=>({candidate_id:item.candidate_id,value_score:item.value_score,recommendation:item.recommendation,reason:'ALREADY_HAS_EVIDENCE_OR_AUTOLOOP_STATE'}));
  const selected=eligible.find((item)=>!processed.has(item.candidate_id))??null;
  return Object.freeze({
    schema_version:'0.2.0',
    execution_mode:'EVIDENCE_BASED_NEXT_CANDIDATE_SELECTION_WITH_PERSISTENT_ANTI_LOOP',
    selected_candidate_id:selected?.candidate_id??null,
    selected:selected?{
      candidate_id:selected.candidate_id,
      wrapper_id:selected.wrapper_id??null,
      declared_name:selected.declared_name??null,
      declared_description:selected.declared_description??null,
      domain:selected.domain??null,
      engine_bindings:[...(selected.engine_bindings??[])],
      value_score:selected.value_score,
      recommendation:selected.recommendation,
      evidence_refs:selected.evidence_refs??null,
      next_action:'SAFE_STATIC_LANE_THEN_CANDIDATE_HANDLER_OR_HUMAN_EXCEPTION'
    }:null,
    processed_candidates:[...processed].sort(),
    skipped_processed:skipped,
    autoloop_state_applied:Object.keys(state??{}).length>0,
    no_candidate_reason:selected?null:'NO_UNPROCESSED_ELIGIBLE_STATIC_CANDIDATE',
    external_code_executed:false,
    adoption_authorized:false,
    prod_authorized:false,
    autonomous_prod_promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const value=JSON.parse(fs.readFileSync(argValue('--value')??'artifacts/cerebro-skill-value-p0.json','utf8'));
  const registry=JSON.parse(fs.readFileSync(argValue('--registry')??'cerebro/registry/skill-supply-chain-v0.json','utf8'));
  const statePath=argValue('--state');
  const state=statePath&&fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};
  const output=argValue('--output')??'artifacts/cerebro-skill-next-candidate.json';
  const report=selectNextCandidate(value,registry,state);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,selected_candidate_id:report.selected_candidate_id,selected_name:report.selected?.declared_name??null,value_score:report.selected?.value_score??null,skipped_processed:report.skipped_processed.length,autoloop_state_applied:report.autoloop_state_applied,external_code_executed:false,prod_authorized:false}));
}
