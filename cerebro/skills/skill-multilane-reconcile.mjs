import fs from 'node:fs';
import path from 'node:path';

function clone(v){return JSON.parse(JSON.stringify(v??{}));}
function uniq(v){return [...new Set((v??[]).filter(Boolean))];}
function walkJson(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walkJson(p));
    else if(entry.isFile()&&entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}
function assertSafeResult(r){
  if(r?.prod_authorized===true||r?.prod_write===true||r?.customer_data_used===true||r?.external_skill_code_execution===true||r?.trading_access===true||r?.paid_fallback===true||Number(r?.additional_cost_eur??0)!==0){
    throw new Error(`UNSAFE_MULTILANE_RESULT:${r?.candidate_id??'UNKNOWN'}`);
  }
}
export function initialMultilaneState(){
  return {
    schema_version:'0.1.0',state_type:'CEREBRO_SKILL_MULTILANE_STUDY_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,
    studied_candidate_ids:[],assessments:{},lane_history:{ENGINEERING:[],DEVICE_CONTROL:[],GROWTH:[],CREATION:[],COMPANY:[],FAST_LANE:[]},
    last_plan_run_id:null,last_reconciled_at:null,
    invariants:{prod_authorized:false,prod_write:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_eur:0}
  };
}
export function reconcileMultilaneResults(state,results,{runId=null,now=new Date().toISOString()}={}){
  const out=Object.keys(state??{}).length?clone(state):initialMultilaneState();
  out.studied_candidate_ids=uniq(out.studied_candidate_ids);
  out.assessments=out.assessments??{};
  out.lane_history=out.lane_history??{};
  for(const lane of ['ENGINEERING','DEVICE_CONTROL','GROWTH','CREATION','COMPANY','FAST_LANE']) out.lane_history[lane]=out.lane_history[lane]??[];
  for(const r of results){
    assertSafeResult(r);
    if(!r?.candidate_id||r?.assessment_complete!==true) continue;
    out.studied_candidate_ids=uniq([...out.studied_candidate_ids,r.candidate_id]);
    const record={candidate_id:r.candidate_id,name:r.name??null,human_alias:r.human_alias??null,lane:r.lane??null,work_class:r.work_class??null,value_score:r.value_score??null,static_status:r.static_status??null,rollback_green:r.rollback_green===true,assessment_status:r.assessment_status??null,source_discovery_run_id:r.source_discovery_run_id??null,study_run_id:runId,assessed_at:now,prod_authorized:false,prod_write:false,customer_data_used:false,external_skill_code_execution:false,trading_access:false,paid_fallback:false,additional_cost_eur:0};
    out.assessments[r.candidate_id]=record;
    if(record.lane&&out.lane_history[record.lane]) out.lane_history[record.lane]=[...out.lane_history[record.lane].filter((x)=>x.candidate_id!==r.candidate_id),record].slice(-100);
  }
  out.last_plan_run_id=runId;
  out.last_reconciled_at=now;
  out.invariants={prod_authorized:false,prod_write:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_eur:0};
  return out;
}
function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=argValue('--state');
  const resultsDir=argValue('--results-dir');
  const output=argValue('--output')??'artifacts/multilane/state.after.json';
  const runId=argValue('--run-id');
  if(!resultsDir) throw new Error('REQUIRED: --results-dir');
  const state=statePath&&fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):initialMultilaneState();
  const results=[];
  for(const file of walkJson(resultsDir)){
    try{const x=JSON.parse(fs.readFileSync(file,'utf8'));if(x?.state_type==='CEREBRO_SKILL_MULTILANE_LANE_RESULT') results.push(x);}catch{}
  }
  const out=reconcileMultilaneResults(state,results,{runId:runId?Number(runId):null});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(out,null,2)}\n`,'utf8');
  console.log(JSON.stringify({results_found:results.length,studied_total:out.studied_candidate_ids.length,last_plan_run_id:out.last_plan_run_id,prod_authorized:false,additional_cost_eur:0}));
}
