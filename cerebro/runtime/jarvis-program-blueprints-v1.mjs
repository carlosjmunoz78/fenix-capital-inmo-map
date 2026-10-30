import fs from 'node:fs';
import path from 'node:path';
import {buildJarvisDag} from './jarvis-mission-dag-v2.mjs';
import {DeepSeekProviderV0} from './deepseek-provider-v0.mjs';
import {calculateDeepSeekTokenCostUsd} from './deepseek-cost-v0.mjs';

const OUT=path.resolve(process.env.JARVIS_BLUEPRINT_OUT||'artifacts/jarvis-mission-001-blueprints');
const write=(f,v)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n');};
const json=text=>{try{return JSON.parse(text);}catch{return{raw_text:String(text)}}};
async function pool(items,limit,fn){const out=new Array(items.length);let n=0;async function w(){for(;;){const i=n++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},w));return out;}

export async function generateProgramBlueprints(){
 if((process.env.CEREBRO_SUPERVISOR_ENV||'PREPROD')!=='PREPROD')throw new Error('PREPROD_ONLY');
 if(process.env.CEREBRO_PROD_WRITE==='true'||process.env.CEREBRO_TRADING_ACCESS==='true')throw new Error('FORBIDDEN_TARGET');
 if(process.env.CEREBRO_ALLOW_PAID_JARVIS_BUILD!=='YES')throw new Error('PAID_BUILD_DISABLED');
 const dag=buildJarvisDag();const provider=new DeepSeekProviderV0();
 const programs=dag.programs.map(p=>({...p,requirements:dag.units.filter(u=>u.kind==='requirement'&&u.program_id===p.id)}));
 const designs=await pool(programs,4,async p=>{
  const input={mission:'MISSION-JARVIS-001',program:p,requirements:p.requirements.map(r=>({section:r.master_section,title:r.title})),rules:['PREPROD_ONLY','REUSE_EXISTING_FIRST','NO_PROD_WRITE','NO_TRADING','DEEPSEEK_TEMPORARY']};
  const r=await provider.respond({model:'deepseek-flash',instructions:'Return JSON only with existing_to_reuse,gaps,contracts,implementation_batches,tests,security,observability,rollback,distillation_targets,human_required. Prefer wrappers over rewrites.',input:JSON.stringify(input),maxOutputTokens:1800},{requestId:`jarvis-design-${p.id}`});
  const o={program_id:p.id,phase:'DESIGN',model:r.model,usage:r.usage,cost_usd:calculateDeepSeekTokenCostUsd({model:r.model,inputTokens:r.usage.input_tokens,cachedInputTokens:r.usage.cached_input_tokens,outputTokens:r.usage.output_tokens}),blueprint:json(r.output_text)};write(path.join(OUT,p.id,'design.json'),o);return o;
 });
 const implementations=await pool(programs,4,async(p,i)=>{
  const r=await provider.respond({model:'deepseek-flash',instructions:'Return JSON only with reuse_map,files_to_add,files_to_modify_candidate_only,contracts,tests,rollout_order,rollback,evidence,distillation,human_required. Candidate branch and PREPROD only.',input:JSON.stringify({mission:'MISSION-JARVIS-001',program:p.id,design:designs[i].blueprint,requirements:p.requirements.map(x=>({section:x.master_section,title:x.title}))}),maxOutputTokens:2000},{requestId:`jarvis-implement-${p.id}`});
  const o={program_id:p.id,phase:'IMPLEMENTATION_BLUEPRINT',model:r.model,usage:r.usage,cost_usd:calculateDeepSeekTokenCostUsd({model:r.model,inputTokens:r.usage.input_tokens,cachedInputTokens:r.usage.cached_input_tokens,outputTokens:r.usage.output_tokens}),blueprint:json(r.output_text)};write(path.join(OUT,p.id,'implementation.json'),o);return o;
 });
 for(const p of programs)for(const r of p.requirements)for(const phase of ['design','implement'])write(path.join(OUT,'task-evidence',`${r.work_unit_id}.${phase}.json`),{mission_id:'MISSION-JARVIS-001',work_unit_id:`${r.work_unit_id}.${phase}`,program_id:p.id,master_section:r.master_section,phase,state:'PROGRAM_BLUEPRINT_REUSED',program_blueprint_ref:`${p.id}/${phase==='design'?'design.json':'implementation.json'}`,human_required:null,prod_write:false,trading:false});
 const all=[...designs,...implementations];const summary={ok:true,programs:18,deepseek_calls:all.length,task_evidence:programs.reduce((s,p)=>s+p.requirements.length*2,0),estimated_cost_usd:all.reduce((s,x)=>s+x.cost_usd,0),human_required:[...new Set(all.map(x=>x.blueprint?.human_required).filter(Boolean))],deepseek_dependency_target:0,prod_write:false,trading:false};write(path.join(OUT,'summary.json'),summary);console.log(JSON.stringify(summary));return summary;
}
if(import.meta.url===`file://${process.argv[1]}`)generateProgramBlueprints().catch(e=>{console.error(e);process.exitCode=1});
