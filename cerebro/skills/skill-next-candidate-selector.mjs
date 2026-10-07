import fs from 'node:fs';
import path from 'node:path';

function processedCandidateIds(registry){
  const ids=new Set();
  for(const item of Object.values(registry?.behavioral_candidates??{})){
    if(item?.candidate_id) ids.add(item.candidate_id);
  }
  const github=registry?.github_preprod_evidence?.candidate_id??registry?.github_prod_readonly_canary_evidence?.candidate_id;
  if(github) ids.add(github);
  return ids;
}

export function selectNextCandidate(valueReport,registry){
  const processed=processedCandidateIds(registry);
  const eligible=(valueReport?.results??[])
    .filter((item)=>['HIGH_VALUE_LAB_BENCHMARK','LAB_BENCHMARK'].includes(item.recommendation))
    .slice()
    .sort((a,b)=>(b.value_score??0)-(a.value_score??0)||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  const skipped=eligible.filter((item)=>processed.has(item.candidate_id)).map((item)=>({candidate_id:item.candidate_id,value_score:item.value_score,recommendation:item.recommendation,reason:'ALREADY_HAS_BEHAVIORAL_OR_LATER_EVIDENCE'}));
  const selected=eligible.find((item)=>!processed.has(item.candidate_id))??null;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'EVIDENCE_BASED_NEXT_CANDIDATE_SELECTION_ONLY',
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
      next_action:'BUILD_CANDIDATE_SPECIFIC_STATIC_LAB_PLAN_NO_EXTERNAL_CODE_EXECUTION'
    }:null,
    processed_candidates:[...processed].sort(),
    skipped_processed:skipped,
    no_candidate_reason:selected?null:'NO_UNPROCESSED_ELIGIBLE_STATIC_CANDIDATE',
    external_code_executed:false,
    adoption_authorized:false,
    prod_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const value=JSON.parse(fs.readFileSync(argValue('--value')??'artifacts/cerebro-skill-value-p0.json','utf8'));
  const registry=JSON.parse(fs.readFileSync(argValue('--registry')??'cerebro/registry/skill-supply-chain-v0.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-next-candidate.json';
  const report=selectNextCandidate(value,registry);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,selected_candidate_id:report.selected_candidate_id,selected_name:report.selected?.declared_name??null,value_score:report.selected?.value_score??null,skipped_processed:report.skipped_processed.length,external_code_executed:false,prod_authorized:false}));
}
