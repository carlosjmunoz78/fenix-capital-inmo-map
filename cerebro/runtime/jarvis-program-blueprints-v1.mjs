import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {buildJarvisDag} from './jarvis-mission-dag-v2.mjs';
import {DeepSeekProviderV0} from './deepseek-provider-v0.mjs';
import {calculateDeepSeekTokenCostUsd} from './deepseek-cost-v0.mjs';

const OUT=path.resolve(process.env.JARVIS_BLUEPRINT_OUT||'artifacts/jarvis-mission-001-blueprints');
const RECOVERY_SEED=path.resolve('cerebro/jarvis/mission-001/recovered-designs-run41012453063.json.gz.b64');
const write=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
function parseStrict(text,label){const raw=String(text||'').trim();if(!raw)throw new Error(`EMPTY_BLUEPRINT:${label}`);let value;try{value=JSON.parse(raw);}catch(e){throw new Error(`INVALID_BLUEPRINT_JSON:${label}:${e.message}`);}if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length<2)throw new Error(`INSUFFICIENT_BLUEPRINT:${label}`);return value;}
function isValidRecord(x){const b=x?.blueprint;return Boolean(b&&typeof b==='object'&&!Array.isArray(b)&&!Object.prototype.hasOwnProperty.call(b,'raw_text')&&Object.keys(b).length>=2);}
function loadValid(file){try{const x=JSON.parse(fs.readFileSync(file,'utf8'));return isValidRecord(x)?{...x,reused:true}:null;}catch{return null;}}
function loadRecovered(){try{const packed=fs.readFileSync(RECOVERY_SEED,'utf8').trim();const x=JSON.parse(zlib.gunzipSync(Buffer.from(packed,'base64')).toString('utf8'));return x?.designs&&typeof x.designs==='object'?x.designs:{};}catch{return {};}}
async function pool(items,limit,fn){const out=new Array(items.length);let n=0;async function w(){for(;;){const i=n++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},w));return out;}
function costOf(r){return calculateDeepSeekTokenCostUsd({model:r.model,inputTokens:r.usage.input_tokens,cachedInputTokens:r.usage.cached_input_tokens,outputTokens:r.usage.output_tokens});}

export async function generateProgramBlueprints(){
 if((process.env.CEREBRO_SUPERVISOR_ENV||'PREPROD')!=='PREPROD')throw new Error('PREPROD_ONLY');
 if(process.env.CEREBRO_PROD_WRITE==='true'||process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('FORBIDDEN_TARGET');
 if(process.env.CEREBRO_ALLOW_PAID_JARVIS_BUILD!=='YES')throw new Error('PAID_BUILD_DISABLED');
 const dag=buildJarvisDag();const provider=new DeepSeekProviderV0();const recovered=loadRecovered();let liveCalls=0;let liveCostUsd=0;const recovery=[];
 async function semanticCall({label,requestId,input,instructions,firstMax=3000,retryMax=8000}){
  for(let i=0;i<2;i++){
   const max=i===0?firstMax:retryMax;
   const r=await provider.respond({model:'deepseek-flash',instructions,input:JSON.stringify(input),maxOutputTokens:max,reasoningEffort:'none',jsonMode:true},{requestId:`${requestId}-a${i+1}`});
   liveCalls++;liveCostUsd+=costOf(r);
   if(r.status==='completed'){
    try{return{response:r,blueprint:parseStrict(r.output_text,label),attempts:i+1};}catch(error){recovery.push({label,attempt:i+1,reason:'INVALID_OR_EMPTY_JSON'});if(i===1)throw error;continue;}
   }
   const reason=r.incomplete_reason||'unknown';recovery.push({label,attempt:i+1,reason,status:r.status});
   if(reason==='content_filter')throw new Error(`DEEPSEEK_CONTENT_FILTER:${label}`);
   if(i===1)throw new Error(`DEEPSEEK_INCOMPLETE:${label}:${r.status}:${reason}`);
  }
  throw new Error(`DEEPSEEK_NO_RESULT:${label}`);
 }
 const programs=dag.programs.map(p=>({...p,requirements:dag.units.filter(u=>u.kind==='requirement'&&u.program_id===p.id)}));
 let recoveredCount=0;
 const designs=await pool(programs,4,async p=>{
  const file=path.join(OUT,p.id,'design.json');const existing=loadValid(file);if(existing)return existing;
  const seed=recovered[p.id];if(isValidRecord(seed)){const restored={...seed,reused:true,recovered_from_run:41012453063};write(file,restored);recoveredCount++;return restored;}
  const input={mission:'MISSION-JARVIS-001',program:{id:p.id,name:p.name},requirements:p.requirements.map(r=>({section:r.master_section,title:r.title})),rules:['PREPROD_ONLY','REUSE_EXISTING_FIRST','NO_PROD_WRITE','NO_TRADING','DEEPSEEK_TEMPORARY','CONCISE_BLUEPRINT_MAX_12_ITEMS_PER_LIST']};
  const x=await semanticCall({label:`DESIGN:${p.id}`,requestId:`jarvis-design-v3-${p.id}`,input,instructions:'Return one concise valid JSON object only. Required keys: existing_to_reuse,gaps,contracts,implementation_batches,tests,security,observability,rollback,distillation_targets,human_required. Maximum 12 items per list. Prefer wrappers over rewrites. human_required must be null unless one canonical exception is genuinely required.',firstMax:3000,retryMax:8000});
  const r=x.response;const o={program_id:p.id,phase:'DESIGN',model:r.model,status:r.status,incomplete_reason:r.incomplete_reason,attempts:x.attempts,usage:r.usage,cost_usd:costOf(r),blueprint:x.blueprint,reused:false};write(file,o);return o;
 });
 const implementations=await pool(programs,4,async(p,i)=>{
  const file=path.join(OUT,p.id,'implementation.json');const existing=loadValid(file);if(existing)return existing;
  const input={mission:'MISSION-JARVIS-001',program:{id:p.id,name:p.name},design:designs[i].blueprint,requirements:p.requirements.map(x=>({section:x.master_section,title:x.title})),constraints:['candidate_branch_only','PREPROD_ONLY','REUSE_EXISTING_FIRST','NO_PROD_WRITE','NO_TRADING','MAX_12_ITEMS_PER_LIST']};
  const x=await semanticCall({label:`IMPLEMENT:${p.id}`,requestId:`jarvis-implement-v3-${p.id}`,input,instructions:'Return one concise valid JSON object only. Required keys: reuse_map,files_to_add,files_to_modify_candidate_only,contracts,tests,rollout_order,rollback,evidence,distillation,human_required. Maximum 12 items per list. Candidate branch and PREPROD only. Prefer existing CEREBRO capabilities and adapters over rewrites.',firstMax:3200,retryMax:8000});
  const r=x.response;const o={program_id:p.id,phase:'IMPLEMENTATION_BLUEPRINT',model:r.model,status:r.status,incomplete_reason:r.incomplete_reason,attempts:x.attempts,usage:r.usage,cost_usd:costOf(r),blueprint:x.blueprint,reused:false};write(file,o);return o;
 });
 const all=[...designs,...implementations];
 for(const x of all)if(!isValidRecord(x))throw new Error(`SEMANTIC_BLUEPRINT_GATE_FAILED:${x.program_id}:${x.phase}`);
 for(const p of programs)for(const r of p.requirements)for(const phase of ['design','implement'])write(path.join(OUT,'task-evidence',`${r.work_unit_id}.${phase}.json`),{mission_id:'MISSION-JARVIS-001',work_unit_id:`${r.work_unit_id}.${phase}`,program_id:p.id,master_section:r.master_section,phase,state:'PROGRAM_BLUEPRINT_VALIDATED_REUSED',program_blueprint_ref:`${p.id}/${phase==='design'?'design.json':'implementation.json'}`,human_required:null,prod_write:false,trading:false});
 const summary={ok:true,programs:18,valid_blueprints:all.length,deepseek_calls_this_run:liveCalls,reused_blueprints:all.filter(x=>x.reused).length,recovered_designs:recoveredCount,retry_events:recovery,task_evidence:programs.reduce((s,p)=>s+p.requirements.length*2,0),estimated_cost_usd_this_run:Math.round(liveCostUsd*1e9)/1e9,human_required:[...new Set(all.map(x=>x.blueprint?.human_required).filter(Boolean))],deepseek_dependency_target:0,semantic_gate:'GREEN',prod_write:false,trading:false};write(path.join(OUT,'summary.json'),summary);console.log(JSON.stringify(summary));return summary;
}
if(import.meta.url===`file://${process.argv[1]}`)generateProgramBlueprints().catch(e=>{console.error(e);process.exitCode=1});
