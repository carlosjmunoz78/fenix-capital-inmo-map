import fs from 'node:fs';
import path from 'node:path';

const SAFE_TARGET='FULL_SAFE_PREPROD';
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function text(v){return typeof v==='string'&&v.trim()?v.trim():null;}
function assert(condition,message){if(!condition) throw new Error(message);}

export function validateSkillFullAdoptionQueue(raw={}){
  assert(raw?.state_type==='CEREBRO_SKILL_FULL_ADOPTION_QUEUE','invalid state_type');
  assert(raw?.environment==='PREPROD','PREPROD-only queue required');
  const p=raw?.policy??{};
  for(const [key,expected] of Object.entries({prod_write:false,prod_mutation:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,permission_expansion:false,autonomous_prod_promotion:false})){
    assert(p[key]===expected,`unsafe policy:${key}`);
  }
  assert(Number(p.additional_cost_budget_eur)===0,'zero-cost budget required');
  const queue=Array.isArray(raw.queue)?raw.queue:[];
  assert(queue.length>0,'queue required');
  const priorities=new Set();
  const candidates=new Set();
  for(const item of queue){
    assert(Number.isInteger(item.priority)&&item.priority>0,'positive integer priority required');
    assert(!priorities.has(item.priority),`duplicate priority:${item.priority}`);priorities.add(item.priority);
    assert(text(item.candidate_id),'candidate_id required');
    assert(!candidates.has(item.candidate_id),`duplicate candidate:${item.candidate_id}`);candidates.add(item.candidate_id);
    assert(text(item.alias_es),`alias_es required:${item.candidate_id}`);
    assert(item.target_status===SAFE_TARGET,`unsafe target status:${item.candidate_id}`);
    if(item.human_required!=null) assert(HUMAN_CODES.has(item.human_required),`invalid HUMAN_REQUIRED:${item.candidate_id}`);
  }
  return {green:true,queue_count:queue.length};
}

function terminal(item){return ['FULL_SAFE_PREPROD','REJECTED','DESCARTAR'].includes(item?.status);}
function autonomous(item){return !terminal(item)&&item?.human_required==null&&item?.autonomous_ceiling===SAFE_TARGET;}

export function selectNextSkillFullAdoption(raw={}){
  validateSkillFullAdoptionQueue(raw);
  const queue=[...raw.queue].sort((a,b)=>a.priority-b.priority||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  const selected=queue.find(autonomous)??null;
  const blocked=queue.filter((item)=>!terminal(item)&&item.human_required!=null).map((item)=>({
    priority:item.priority,candidate_id:item.candidate_id,alias_es:item.alias_es,human_required:item.human_required,next_gate:item.next_gate
  }));
  const incomplete=queue.filter((item)=>!terminal(item));
  const status=selected?'SAFE_WORK_AVAILABLE':incomplete.length===0?'ALL_FULL_OR_TERMINAL':blocked.length===incomplete.length?'HUMAN_REQUIRED_PENDING':'NO_SAFE_WORK_AVAILABLE';
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_FULL_ADOPTION_SELECTION',environment:'PREPROD',status,
    selected:selected?{
      priority:selected.priority,candidate_id:selected.candidate_id,alias_es:selected.alias_es,technical_name:selected.technical_name,
      current_evidence:selected.current_evidence,current_scope:selected.current_scope,target_status:selected.target_status,next_gate:selected.next_gate,
      target_engine_bindings:selected.target_engine_bindings
    }:null,
    blocked,
    incomplete_count:incomplete.length,
    prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,auto_merge_authorized:false,
    customer_data_authorized:false,external_skill_code_execution_authorized:false,trading_access:false,paid_fallback:false,
    permission_expansion_authorized:false,additional_cost_eur:0
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const registry=argValue('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const output=argValue('--output')??'artifacts/skills-full/selection.json';
  const report=selectNextSkillFullAdoption(JSON.parse(fs.readFileSync(registry,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({status:report.status,selected_alias_es:report.selected?.alias_es??null,selected_candidate_id:report.selected?.candidate_id??null,blocked:report.blocked.length,prod_write:false,trading:false,cost_eur:0}));
}
