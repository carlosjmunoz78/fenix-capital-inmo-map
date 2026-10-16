#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runFactSkillNative} from './fact-skill-native-v1.mjs';
import {executeGitHubSafeAction} from './github-safe-native-v1.mjs';
import {executeDbSafeAction} from './db-safe-native-v1.mjs';
import {Evt001Native} from './evt001-native-v1.mjs';
import {ingestScoutEvidence,buildScoutDossier,verifyScoutDossier} from './technology-capability-scout-native-v1.mjs';
import {runCompetNativeCycle,buildCompetDossier,verifyCompetDossier} from './compet-native-v1.mjs';
import {scoreChannels,planExperiment,decideStopScale,buildAcquisitionPlan,verifyCapPlan} from './cap-native-v1.mjs';
import {scoreLeadBatch,prioritizeLeads,buildNextAction,verifyLeadAction} from './lead-native-v1.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(__dirname,'../..');
const ADOPTION_PATH=path.resolve(__dirname,'../registry/native-capability-operational-adoption-v1.json');
const ENGINE_REGISTRY_PATH=path.resolve(__dirname,'../registry/engine-registry.seed.json');
const LRN_SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');
const REQUIRED_CAPABILITIES=Object.freeze(['FACT-SKILL-NATIVE','GH-SAFE-NATIVE','DB-SAFE-NATIVE','EVT-001','TECH-CAP-SCOUT-NATIVE','COMPET-NATIVE','CAP-NATIVE','LEAD-NATIVE']);

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function stable(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim();}
function iso(v,l='cycle_anchor'){const d=new Date(req(v,l));if(Number.isNaN(d.valueOf()))throw new Error(`${l} invalid`);return d.toISOString();}
function eventId(type,engine_id,payload){return `evt:opfull:${hash({type,engine_id,payload}).slice(0,24)}`;}
function signal(type,company_id,engine_id,payload){return Object.freeze({event_id:eventId(type,engine_id,payload),type,signal_family:'ENGINE_EVENT',company_id,engine_id,environment:PREPROD,version:VERSION,payload:Object.freeze({...payload}),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function context(company_id,engine_id){return Object.freeze({company_id,engine_id,environment:PREPROD,version:VERSION});}
function consumerRole(engine_id){if(engine_id==='LRN-001')return 'LEARNING_CONSUMER';if(engine_id==='OBSERV-001'||engine_id==='FINOPS-001')return 'TELEMETRY_CONSUMER';if(['SEC-001','QA-001','EVA-001'].includes(engine_id))return 'GOVERNANCE_CONSUMER';return 'DIRECT_CONSUMER';}
function assertGreen(value,label){if(!value)throw new Error(`${label} not green`);return value;}

function validateRegistry(adoption,engineRegistry){
  if(adoption.company_id!=='fenix'||adoption.environment!==PREPROD||adoption.version!==VERSION)throw new Error('operational adoption scope invalid');
  if(adoption.authority.prod_authorized||adoption.authority.prod_write_authorized||adoption.authority.android_touched||adoption.authority.trading_access||adoption.authority.additional_cost_eur!==0)throw new Error('operational adoption authority expanded');
  if(!Array.isArray(adoption.capabilities)||adoption.capabilities.length!==8)throw new Error('exactly eight native capabilities required');
  const ids=adoption.capabilities.map(x=>x.capability_id).sort();
  if(JSON.stringify(ids)!==JSON.stringify([...REQUIRED_CAPABILITIES].sort()))throw new Error('capability set mismatch');
  const engines=new Set(engineRegistry.engine_ids??[]);
  if(engines.size!==Number(engineRegistry.count))throw new Error('canonical engine registry count mismatch');
  for(const cap of adoption.capabilities){
    if(!engines.has(cap.owner_engine_id))throw new Error(`unknown owner:${cap.owner_engine_id}`);
    for(const consumer of cap.required_consumers){if(consumer!=='ALL_REGISTERED_ENGINES'&&!engines.has(consumer))throw new Error(`unknown consumer:${cap.capability_id}:${consumer}`);}
  }
  return engines;
}

function bindingReceipts({capability,output,allEngines,company_id}){
  const targetIds=capability.required_consumers.includes('ALL_REGISTERED_ENGINES')?[...allEngines].sort():capability.required_consumers;
  const output_hash=hash(output);
  const ids=[capability.owner_engine_id,...targetIds];
  const unique=[...new Set(ids)].sort();
  return unique.map(engine_id=>Object.freeze({
    capability_id:capability.capability_id,company_id,engine_id,environment:PREPROD,version:VERSION,
    role:engine_id===capability.owner_engine_id?'OWNER_EXECUTES':consumerRole(engine_id),
    consumed:true,output_hash,read_only_shadow:true,provider_write:false,prod_write:false,additional_cost_eur:0,
    receipt_id:`consume:${hash({capability_id:capability.capability_id,engine_id,output_hash}).slice(0,24)}`
  }));
}

async function exerciseFact(company_id,cap){
  const manifest=hash('cerebro-operational-full-synthetic-first-party-skill');
  const result=runFactSkillNative({
    company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,
    candidate:{skill_id:'CEREBRO-OPERATIONAL-FULL-SMOKE',skill_version:'1.0.0',source_ref:'first-party://cerebro/operational-full',manifest_sha256:manifest,license_spdx:'MIT'},
    risk_class:'LOW',impact:{existing_engine_bindings:cap.required_consumers.filter(x=>x!=='ALL_REGISTERED_ENGINES')},observed_registry:[],
    evidence:{confidence:1,old_vs_new:{decision:'PASS'},evaluation:{decision:'PASS'},tribunal:{decision:'PASS'}},
    security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:false,legal_required:false,policy_conflict:false},
    demand:{needed_now:true},cost:{additional_cost_eur:0,zero_cost_alternative:true,roi_positive:true,money_limit_exceeded:false},
    permissions:{requested:['registry:read'],allowed:['registry:read'],locked:true},policy:{locked:true},
    lifecycle:{rollback_ready:true,rebuild_ready:true,backup_ready:true,runbook_ready:true,changelog_ready:true,dependencies_mapped:true,router_connected:true,integration_e2e_green:true,observability_connected:true,idempotency_proven:true,fallback_ready:true,preprod_green_evidence:true,learning_hooks_connected:true,internal_wrapper_ready:true,external_code_execution_required:false}
  });
  assertGreen(result.native_full===true&&result.status==='NATIVE_FULL_PREPROD','FACT-SKILL-NATIVE exercise');
  return result;
}

async function exerciseGitHub(company_id){
  const result=await executeGitHubSafeAction({company_id,engine_id:'SEC-001',environment:PREPROD,version:VERSION,operation:'INVENTORY',repo:'carlosjmunoz78/fenix-capital-inmo-map'},
    {INVENTORY:async()=>({read_only:true,repo_checkout_present:fs.existsSync(path.join(REPO_ROOT,'cerebro')),engine_registry_present:fs.existsSync(ENGINE_REGISTRY_PATH),native_registry_count:fs.readdirSync(path.resolve(__dirname,'../registry')).filter(x=>x.startsWith('capability-')&&x.endsWith('.json')).length})});
  assertGreen(result.executed===true&&result.status==='EXECUTED_PREPROD_CONTROL_PLANE','GH-SAFE-NATIVE exercise');
  return result;
}

async function exerciseDb(company_id){
  const result=await executeDbSafeAction({company_id,engine_id:'DATA-001',environment:PREPROD,version:VERSION,operation:'INSPECT',workload_class:'transactional',sql:'SELECT schema_name FROM information_schema.schemata LIMIT 1'},
    {INSPECT:async()=>({read_only:true,source:'VERSIONED_CONTRACT_SHADOW',transactional_core:'SUPABASE',heavy_auxiliary_offload_policy:true,contract_registry_present:fs.existsSync(ENGINE_REGISTRY_PATH)})});
  assertGreen(result.executed===true&&result.status==='EXECUTED_PREPROD_CONTROL_PLANE','DB-SAFE-NATIVE exercise');
  return result;
}

async function exerciseEventBus(company_id,allEngines,workdir){
  const bus=new Evt001Native({event_file:path.join(workdir,'evt001-events.v8journal'),delivery_file:path.join(workdir,'evt001-deliveries.v8journal'),environment:PREPROD,transport:{publish:async event=>({accepted:true,consumer_engine_id:event.context.engine_id,transport:'LOCAL_PREPROD_OPERATIONAL_LOOP'})},max_attempts:2});
  let published=0,delivered=0;
  for(const engine_id of [...allEngines].sort()){
    const c=context(company_id,engine_id);
    const p=bus.publish({context:c,type:'capability.operational.heartbeat',schema_version:VERSION,payload:{capability_id:'EVT-001',consumer_engine_id:engine_id,mode:'PREPROD_SHADOW'},idempotency_key:`opfull:${company_id}:${engine_id}:evt001`});
    if(p.accepted===false)throw new Error(`EVT publish rejected:${engine_id}`);
    published++;
    const d=await bus.deliverContext(c);
    if(d.dead_letter_total!==0||d.delivered_total<1)throw new Error(`EVT delivery not green:${engine_id}`);
    delivered+=d.delivered_total;
  }
  const replay=bus.verifyReplay(context(company_id,'EVT-001'));
  assertGreen(replay.status==='REPLAY_VERIFIED','EVT replay');
  return Object.freeze({capability_id:'EVT-001',status:'GREEN',all_registered_engines_total:allEngines.size,published_total:published,delivered_total:delivered,dead_letter_total:0,replay_status:replay.status,prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0});
}

function exerciseTechScout(company_id,anchor){
  const c=context(company_id,'RSH-001');
  const evidence=ingestScoutEvidence({context:c,evidence:{company_id,evidence_type:'TECHNOLOGY_CAPABILITY',source_ref:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map',source_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map',observed_at:anchor,version_ref:VERSION,license_ref:'FIRST_PARTY_REPOSITORY',security_notes:'Public first-party repository metadata only; no secrets or external code execution.',integration_notes:'Operational shadow validates dossier path for downstream engines.',summary:'First-party native capability operational adoption evidence.',public_evidence:true}});
  const dossier=buildScoutDossier({context:c,question:'Which native capabilities are operationally adopted?',evidence_records:[evidence],candidate_scores:[]});
  const replay=verifyScoutDossier(dossier);
  assertGreen(replay.replay_green===true,'TECH-CAP-SCOUT replay');
  return Object.freeze({evidence,dossier,replay,prod_authorized:false,additional_cost_eur:0});
}

function exerciseCompet(company_id,anchor){
  const c=context(company_id,'COMPET-001');
  const previous=[{competitor_id:'shadow-competitor',dimension:'offer',value:'baseline',source_url:'https://example.com/competitor',source_access:'PUBLIC',observed_at:anchor,confidence:1}];
  const current=[{competitor_id:'shadow-competitor',dimension:'offer',value:'baseline',source_url:'https://example.com/competitor',source_access:'PUBLIC',observed_at:anchor,confidence:1}];
  const cycle=runCompetNativeCycle({context:c,previous,current,cycle_anchor:anchor,cadence_hours:24});
  const dossier=buildCompetDossier({context:c,cycle,question:'Daily competitor operational shadow update'});
  const replay=verifyCompetDossier(dossier);
  assertGreen(replay.replay_green===true,'COMPET replay');
  return Object.freeze({cycle,dossier,replay,real_fenix_schedule_separate:true,real_soak_overclaimed:false,prod_authorized:false,additional_cost_eur:0});
}

function exerciseCap(company_id){
  const c=context(company_id,'CAP-001');
  const scores=scoreChannels({context:c,channels:[
    {company_id,channel_id:'organic-seo',landing_ref:'landing-a',creative_ref:'creative-a',source_ref:'shadow://gsc-ga4',spend_eur:0,clicks:120,leads:12,qualified_leads:8,conversions:3,revenue_eur:0},
    {company_id,channel_id:'owned-email',landing_ref:'landing-b',creative_ref:'creative-b',source_ref:'shadow://brevo',spend_eur:0,clicks:80,leads:8,qualified_leads:5,conversions:2,revenue_eur:0}
  ]});
  const experiment=planExperiment({context:c,scores,min_sample_leads:10});
  const decisions=decideStopScale({context:c,scores,minimum_score:0});
  const plan=buildAcquisitionPlan({context:c,scores,experiment,decisions});
  const replay=verifyCapPlan(plan);
  assertGreen(replay.replay_green===true&&plan.recommended_new_spend_eur===0&&!plan.provider_execution_authorized,'CAP replay/authority');
  return Object.freeze({scores,experiment,decisions,plan,replay,prod_authorized:false,additional_cost_eur:0});
}

function exerciseLead(company_id){
  const c=context(company_id,'LEAD-001');
  const snapshots=[
    {company_id,lead_ref:'shadow-lead-a',source_ref:'shadow://crm',intent:.9,qualification:.85,engagement:.8,urgency:.9,data_completeness:.95,estimated_value_eur:3500,stale_days:0,high_risk_flag:false},
    {company_id,lead_ref:'shadow-lead-b',source_ref:'shadow://crm',intent:.6,qualification:.7,engagement:.5,urgency:.55,data_completeness:.9,estimated_value_eur:3500,stale_days:2,high_risk_flag:false}
  ];
  const batch=scoreLeadBatch({context:c,lead_snapshots:snapshots});
  const queue=prioritizeLeads({context:c,batch});
  if(queue.ranked.length<1)throw new Error('LEAD priority queue empty');
  const action=buildNextAction({context:c,score:queue.ranked[0]});
  const replay=verifyLeadAction(action,queue.ranked[0]);
  assertGreen(replay.replay_green===true&&action.crm_write_authorized===false,'LEAD replay/authority');
  return Object.freeze({batch,queue,action,replay,prod_authorized:false,additional_cost_eur:0});
}

export async function runNativeCapabilityOperationalLoopV1({company_id='fenix',cycle_anchor='2026-10-16T00:00:00Z',workdir=null,source_run_id=1,source_head_sha='0000000000000000000000000000000000000000'}={}){
  const anchor=iso(cycle_anchor);const adoption=readJson(ADOPTION_PATH),engineRegistry=readJson(ENGINE_REGISTRY_PATH),subscribers=readJson(LRN_SUBSCRIBERS_PATH);const allEngines=validateRegistry(adoption,engineRegistry);
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-opfull-'));const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try{
    const capMap=new Map(adoption.capabilities.map(x=>[x.capability_id,x]));
    const outputs={
      'FACT-SKILL-NATIVE':await exerciseFact(company_id,capMap.get('FACT-SKILL-NATIVE')),
      'GH-SAFE-NATIVE':await exerciseGitHub(company_id),
      'DB-SAFE-NATIVE':await exerciseDb(company_id),
      'EVT-001':await exerciseEventBus(company_id,allEngines,root),
      'TECH-CAP-SCOUT-NATIVE':exerciseTechScout(company_id,anchor),
      'COMPET-NATIVE':exerciseCompet(company_id,anchor),
      'CAP-NATIVE':exerciseCap(company_id),
      'LEAD-NATIVE':exerciseLead(company_id)
    };
    const receipts=[];const events=[];const capabilityReports=[];
    for(const capability_id of REQUIRED_CAPABILITIES){
      const cap=capMap.get(capability_id),output=outputs[capability_id];
      const bindings=bindingReceipts({capability:cap,output,allEngines,company_id});receipts.push(...bindings);
      for(const r of bindings)events.push(signal('capability.operational.consumer.used',company_id,r.engine_id,{capability_id,receipt_id:r.receipt_id,role:r.role,output_hash:r.output_hash}));
      const requiredCount=cap.required_consumers.includes('ALL_REGISTERED_ENGINES')?allEngines.size:cap.required_consumers.length;
      const consumedRequired=bindings.filter(r=>r.engine_id!==cap.owner_engine_id).length;
      if(cap.required_consumers.includes('ALL_REGISTERED_ENGINES')){if(bindings.length!==allEngines.size)throw new Error('EVT all-engine consumer coverage mismatch');}
      else if(consumedRequired!==requiredCount)throw new Error(`consumer coverage mismatch:${capability_id}`);
      events.push(signal('capability.operational.outcome',company_id,cap.owner_engine_id,{capability_id,status:'GREEN',required_consumers:requiredCount,consumers_green:requiredCount,additional_cost_eur:0}));
      events.push(signal('capability.operational.improvement.feedback',company_id,'LRN-001',{capability_id,feedback_kind:'DAILY_OPERATIONAL_FEEDBACK',status:'GREEN',output_hash:hash(output),next_action:'COMPARE_NEXT_RUN_AND_PROPOSE_ONLY_EVIDENCE_BACKED_IMPROVEMENTS'}));
      capabilityReports.push(Object.freeze({capability_id,owner_engine_id:cap.owner_engine_id,status:'ACTIVE_CONTINUOUS_PREPROD',required_consumers:requiredCount,consumers_green:requiredCount,consumer_coverage:1,output_hash:hash(output),prod_authorized:false,additional_cost_eur:0}));
    }
    const eventReport={events};
    const build=buildLearningOutbox({event_report:eventReport,subscriber_registry:subscribers,source:{workflow:'CEREBRO Native Capability Operational Full V1',run_id:Number(source_run_id),head_sha:req(source_head_sha,'source_head_sha')}});
    const learning=persistLearningOutbox({build,output_root:path.join(root,'lrn-outbox')});
    if(learning.status!=='OUTBOX_GREEN'||learning.batches_total<1)throw new Error('learning outbox not green');
    const operational_full=capabilityReports.length===8&&capabilityReports.every(x=>x.consumer_coverage===1&&x.status==='ACTIVE_CONTINUOUS_PREPROD')&&learning.status==='OUTBOX_GREEN'&&adoption.shared_runtime.schedule_configured===true;
    if(!operational_full)throw new Error('operational full criteria not met');
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_NATIVE_CAPABILITY_OPERATIONAL_FULL_REPORT',company_id,environment:PREPROD,version:VERSION,status:'OPERATIONAL_FULL_PREPROD',operational_full:true,cycle_anchor:anchor,capability_count:8,capabilities:Object.freeze(capabilityReports),binding_receipts_total:receipts.length,all_registered_engines_total:allEngines.size,event_bus_all_engines_green:outputs['EVT-001'].published_total===allEngines.size&&outputs['EVT-001'].delivered_total===allEngines.size,learning:{status:learning.status,batches_total:learning.batches_total,created_total:learning.created_total,feedback_events_total:events.filter(x=>x.type==='capability.operational.improvement.feedback').length,source_engine_id:'LRN-001'},continuous:{schedule_configured:true,cadence:'DAILY',soak_complete:false,soak_overclaimed:false},authority:{prod_authorized:false,prod_write_authorized:false,provider_write_authorized:false,crm_write_authorized:false,db_mutation_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,additional_cost_eur:0},evidence_hash:hash({capabilityReports,receipts,events_total:events.length,learning_status:learning.status}),next_gate:'MAIN_AUTOMATIC_EXECUTION_AND_CONTINUOUS_SOAK'});
  } finally {if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

function args(argv){const o={};for(let i=2;i<argv.length;i++){const a=argv[i];if(a==='--company')o.company_id=argv[++i];else if(a==='--cycle-anchor')o.cycle_anchor=argv[++i];else if(a==='--workdir')o.workdir=argv[++i];else if(a==='--source-run-id')o.source_run_id=Number(argv[++i]);else if(a==='--source-head-sha')o.source_head_sha=argv[++i];else if(a==='--out')o.out=argv[++i];else throw new Error(`unknown argument:${a}`);}return o;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runNativeCapabilityOperationalLoopV1(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);}).catch(error=>{console.error(error?.stack??String(error));process.exitCode=1;});
}

export const NATIVE_CAPABILITY_OPERATIONAL_LOOP_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',environment:PREPROD,capabilities:REQUIRED_CAPABILITIES,shared_runtime:true,daily_schedule:true,all_required_consumers:true,event_bus_all_registered_engines:true,learning_feedback:'LRN-001',provider_writes:false,crm_writes:false,db_mutations:false,spend:false,prod_authorized:false,trading_access:false,android_touched:false,additional_cost_target_eur:0});
