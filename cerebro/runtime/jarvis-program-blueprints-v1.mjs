import fs from 'node:fs';
import path from 'node:path';
import {buildJarvisDag} from './jarvis-mission-dag-v2.mjs';
import {DeepSeekProviderV0} from './deepseek-provider-v0.mjs';
import {calculateDeepSeekTokenCostUsd} from './deepseek-cost-v0.mjs';

const OUT=path.resolve(process.env.JARVIS_BLUEPRINT_OUT||'artifacts/jarvis-mission-001-blueprints');
const write=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
function parseStrict(text,label){const raw=String(text||'').trim();if(!raw)throw new Error(`EMPTY_BLUEPRINT:${label}`);let value;try{value=JSON.parse(raw);}catch(e){throw new Error(`INVALID_BLUEPRINT_JSON:${label}:${e.message}`);}if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length<2)throw new Error(`INSUFFICIENT_BLUEPRINT:${label}`);return value;}
function loadValid(file){try{const x=JSON.parse(fs.readFileSync(file,'utf8'));const b=x?.blueprint;if(!b||typeof b!=='object'||Array.isArray(b)||Object.prototype.hasOwnProperty.call(b,'raw_text')||Object.keys(b).length<2)return null;return{...x,reused:true};}catch{return null;}}
async function pool(items,limit,fn){const out=new Array(items.length);let n=0;async function w(){for(;;){const i=n++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},w));return out;}
function costOf(r){return calculateDeepSeekTokenCostUsd({model:r.model,inputTokens:r.usage.input_tokens,cachedInputTokens:r.usage.cached_input_tokens,outputTokens:r.usage.output_tokens});}

export async function generateProgramBlueprints(){
 if((process.env.CEREBRO_SUPERVISOR_ENV||'PREPROD')!=='PREPROD')throw new Error('PREPROD_ONLY');
 if(process.env.CEREBRO_PROD_WRITE==='true'||process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('FORBIDDEN_TARGET');
 if(process.env.CEREBRO_ALLOW_PAID_JARVIS_BUILD!=='YES')throw new Error('PAID_BUILD_DISABLED');
 const dag=buildJarvisDag();const provider=new DeepSeekProviderV0();let liveCalls=0;
 const programs=dag.programs.map(p=>({...p,requirements:dag.units.filter(u=>u.kind==='requirement'&&u.program_id===p.id)}));
 const designs=await pool(programs,4,async p=>{
  const file=path.join(OUT,p.id,'design.json');const existing=loadValid(file);if(existing)return existing;
  const input={mission:'MISSION-JARVIS-001',program:{id:p.id,name:p.name},requirements:p.requirements.map(r=>({section:r.master_section,title:r.title})),rules:['PREPROD_ONLY','REUSE_EXISTING_FIRST','NO_PROD_WRITE','NO_TRADING','DEEPSEEK_TEMPORARY']};
  const r=await provider.respond({model:'deepseek-flash',instructions:'Return one valid JSON object only. Required keys: existing_to_reuse,gaps,contracts,implementation_batches,tests,security,observability,rollback,distillation_targets,human_required. Prefer wrappers over rewrites. human_required must be null unless one canonical exception is genuinely required.',input:JSON.stringify(input),maxOutputTokens:3000,reasoningEffort:'none',jsonMode:true},{requestId:`jarvis-design-v2-${p.id}`});
  if(r.status!=='completed')throw new Error(`DEEPSEEK_INCOMPLETE:DESIGN:${p.id}:${r.status}`);liveCalls++;
  const o={program_id:p.id,phase:'DESIGN',model:r.model,status:r.status,usage:r.usage,cost_usd:costOf(r),blueprint:parseStrict(r.output_text,`DESIGN:${p.id}`),reused:false};write(file,o);return o;
 });
 const implementations=await pool(programs,4,async(p,i)=>{
  const file=path.join(OUT,p.id,'implementation.json');const existing=loadValid(file);if(existing)return existing;
  const r=await provider.respond({model:'deepseek-flash',instructions:'Return one valid JSON object only. Required keys: reuse_map,files_to_add,files_to_modify_candidate_only,contracts,tests,rollout_order,rollback,evidence,distillation,human_required. Candidate branch and PREPROD only. Prefer existing CEREBRO capabilities and adapters over rewrites.',input:JSON.stringify({mission:'MISSION-JARVIS-001',program:{id:p.id,name:p.name},design:designs[i].blueprint,requirements:p.requirements.map(x=>({section:x.master_section,title:x.title}))}),maxOutputTokens:3200,reasoningEffort:'none',jsonMode:true},{requestId:`jarvis-implement-v2-${p.id}`});
  if(r.status!=='completed')throw new Error(`DEEPSEEK_INCOMPLETE:IMPLEMENT:${p.id}:${r.status}`);liveCalls++;
  const o={program_id:p.id,phase:'IMPLEMENTATION_BLUEPRINT',model:r.model,status:r.status,usage:r.usage,cost_usd:costOf(r),blueprint:parseStrict(r.output_text,`IMPLEMENT:${p.id}`),reused:false};write(file,o);return o;
 });
 const all=[...designs,...implementations];
 for(const x of all){if(!x.blueprint||Object.prototype.hasOwnProperty.call(x.blueprint,'raw_text')||Object.keys(x.blueprint).length<2)throw new Error(`SEMANTIC_BLUEPRINT_GATE_FAILED:${x.program_id}:${x.phase}`);}
 for(const p of programs)for(const r of p.requirements)for(const phase of ['design','implement'])write(path.join(OUT,'task-evidence',`${r.work_unit_id}.${phase}.json`),{mission_id:'MISSION-JARVIS-001',work_unit_id:`${r.work_unit_id}.${phase}`,program_id:p.id,master_section:r.master_section,phase,state:'PROGRAM_BLUEPRINT_VALIDATED_REUSED',program_blueprint_ref:`${p.id}/${phase==='design'?'design.json':'implementation.json'}`,human_required:null,prod_write:false,trading:false});
 const summary={ok:true,programs:18,valid_blueprints:all.length,deepseek_calls_this_run:liveCalls,reused_blueprints:all.filter(x=>x.reused).length,task_evidence:programs.reduce((s,p)=>s+p.requirements.length*2,0),estimated_cost_usd_this_run:all.filter(x=>!x.reused).reduce((s,x)=>s+Number(x.cost_usd||0),0),human_required:[...new Set(all.map(x=>x.blueprint?.human_required).filter(Boolean))],deepseek_dependency_target:0,semantic_gate:'GREEN',prod_write:false,trading:false};write(path.join(OUT,'summary.json'),summary);console.log(JSON.stringify(summary));return summary;
}
if(import.meta.url===`file://${process.argv[1]}`)generateProgramBlueprints().catch(e=>{console.error(e);process.exitCode=1});
