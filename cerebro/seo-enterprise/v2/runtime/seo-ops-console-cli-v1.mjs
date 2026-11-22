#!/usr/bin/env node
/** SEO V2 director console: local governance/testing only, never a PROD command endpoint. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {seoTeamReadiness,SEO_ORDER_TYPES,planSeoDirectorOrder,queueSeoOrderInLab}
 from './seo-director-order-router-v1.mjs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const training=load('seo-specialist-training-and-commands-v1.json');
const marketing=load('seo-marketing-plan-for-owner-approval-v1.json');
const prodKnowledge=load('seo-32-department-live-knowledge-playbooks-v1.json');
const knowledgeByDepartment=new Map(prodKnowledge.departments.map(d=>[d.department_id,d]));
if(knowledgeByDepartment.size!==32)throw Error('SEO_LIVE_KNOWLEDGE_COVERAGE_INVALID');
const args=process.argv.slice(2),cmd=args[0];
function value(flag,def){const i=args.indexOf(flag);return i<0?def:args[i+1]}
const serialize=x=>JSON.stringify(x,null,2)+'\n';
const sha=s=>createHash('sha256').update(s).digest('hex');
function safeRelative(filename){if(!/^SEO-D\d{2}\.json$/.test(filename))throw Error('SEO_TRAINING_PATH_INVALID')}
export function buildSeoTrainingPacks(){
 const packets=new Map();
 for(const d of training.departments){
  const live=knowledgeByDepartment.get(d.department_id);
  if(!live||live.family_id!==d.family_id||live.controls.writes_to_prod!==false)throw Error('SEO_DEPARTMENT_LIVE_KNOWLEDGE_BINDING_REQUIRED');
  const p={
   schema_version:'1.0.0',company_id:training.company_id,engine_id:'SEO-001',
   environment:'LAB',version:'1.0.0',role_template:d.operator.role_template_id,
   family_director_template:d.operator.family_director_role_template_id,
   department_id:d.department_id,name:d.name,mission:d.mission,
   learning_sources:[...new Set([...d.training_unit.study_sources.filter(x=>!x.includes('seo-existing-content-assets-source-registry-v1.json')),
     prodKnowledge.source_registry[0].path,prodKnowledge.source_registry[1].glob])],
   evidence_sources:d.required_sources,
   source_policy:'OWNER_ACCEPTED_FROZEN_PROD_2026_11_05_NO_REAUDIT_NO_STAGING',
   forbidden_source_operations:['WP_RECRAWL','WORDPRESS_REVALIDATION','STAGING_SOURCE'],
   live_wordpress_source:{priority:'OWNER_ACCEPTED_VERSIONED_PROD_CORPUS',
    target_scope:'200_EXISTING_PUBLISHED_URLS',snapshot_only:true,refresh_before_decision:false,
    external_requests_authorized:false},
   specialist_instruction:live.work_item.specialist_action,
   required_source_preflight:live.work_item.source_preflight,
   acceptance_specific:live.work_item.acceptance_specific,
   qa_department:live.training.independent_qa_department,
   training_department:live.training.training_supervisor,
   historical_stage_use_forbidden:true,
   practical_exam:d.training_unit.exercise,required_deliverable:d.training_unit.expected_artifact,
   evaluation:d.training_unit.evaluation,
   mandatory_steps:['RESEARCH_EXISTING_SOURCES','PRODUCE_REPRODUCIBLE_RESULT',
    'INDEPENDENT_QA','TRIBUNAL','RETRAIN_IF_FAILED','LRN_001_MEASURED_OUTCOME'],
   real_training_sessions_completed:0,actual_agent_iam_verified:false,
   certified_for_real_missions:false,permission_grants:[],prod_write:false,
   automatic_authority_granted:false,extra_eur:0
  };
  const filename=d.department_id+'.json';safeRelative(filename);
  if(packets.has(filename))throw Error('SEO_TRAINING_DUPLICATE');
  packets.set(filename,serialize(p));
 }
 if(packets.size!==32)throw Error('SEO_TRAINING_COUNT_DRIFT');
 const index=[...packets.entries()].map(([filename,body])=>({filename,sha256:sha(body)}));
 packets.set('manifest.json',serialize({
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'LAB',version:'1.0.0',department_count:32,
  physical_agents_certified:0,real_training_proven:false,
  curriculum_ready_for_execution:true,files:index
 }));
 return packets;
}
export function saveTrainingPacks({out,packets=buildSeoTrainingPacks()}={}){
 if(typeof out!=='string'||!out.trim())throw Error('SEO_TRAINING_OUT_REQUIRED');
 const root=path.resolve(out);if(root===path.parse(root).root)throw Error('SEO_TRAINING_ROOT_DENIED');
 const pending=[];
 for(const [filename,content] of packets){
  if(filename!=='manifest.json')safeRelative(filename);
  const target=path.resolve(root,filename);
  if(!target.startsWith(root+path.sep))throw Error('SEO_TRAINING_ESCAPE');
  for(let p=target;;p=path.dirname(p)){
   try{if(fs.lstatSync(p).isSymbolicLink())throw Error('SEO_TRAINING_SYMLINK');}
   catch(e){if(e.code!=='ENOENT')throw e;}
   if(p===root)break;
  }
  if(fs.existsSync(target)){
   if(fs.readFileSync(target,'utf8')!==content)throw Error('SEO_TRAINING_FILE_CONFLICT');
  }else pending.push([target,content]);
 }
 for(const [target,body] of pending){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,body,{flag:'wx',mode:0o600});
 }
 return {state:'LAB_COURSEWARE_MATERIALIZED_NOT_AGENTS_TRAINED',
  training_briefs:32,files:packets.size,new_files:pending.length,
  unchanged_files:packets.size-pending.length,prod_agents_activated:0};
}
export async function cli(input=process.argv.slice(2)){
 const action=input[0],flag=(name,def)=>{const i=input.indexOf(name);return i<0?def:input[i+1]};
 switch(action){
  case 'readiness': return seoTeamReadiness();
  case 'types': return {command_types:SEO_ORDER_TYPES,marketing_strategy_approved:false};
  case 'marketing-plan': return marketing;
  case 'training-plan': return {state:'32_SPECIALIST_TRAINING_PACKS_DECLARED',packs:buildSeoTrainingPacks().size,
    actual_agents_certified:0};
  case 'generate-training':return saveTrainingPacks({out:flag('--out',null)});
  case 'route':case 'queue-lab':{
   const order={company_id:flag('--company','fenix'),work_type:flag('--type',null),
    objective:flag('--objective',null),scope:flag('--scope','SITE'),
    territory:flag('--territory','Córdoba'),request_ref:flag('--ref','OWNER_DIRECTIVE_DEMO')};
   if(action==='route')return planSeoDirectorOrder(order);
   return queueSeoOrderInLab({file_path:flag('--journal',null),order});
  }
  default:throw Error('SEO_CLI_USAGE: readiness|types|marketing-plan|training-plan|generate-training --out PATH|route --type TYPE --objective SHORT|queue-lab --journal PATH --type TYPE --objective SHORT');
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
 cli(args).then(x=>process.stdout.write(serialize(x)))
  .catch(e=>{process.stderr.write(serialize({state:'BLOCKED',error:String(e.message).slice(0,130)}));process.exitCode=2;});
}
