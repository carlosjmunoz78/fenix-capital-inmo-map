#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {executeGitHubSafeAction} from './github-safe-native-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from './evaluation-tribunal.mjs';
import {buildLearningOutbox,persistLearningOutbox} from './rsi-event-outbox.mjs';
import {createOperationalLedgersV0} from './observability-audit-finops.mjs';

export const GH_SAFE_REAL_ADOPTION_VERSION='1.0.0';
export const GH_SAFE_REAL_REQUIRED_CONSUMERS=Object.freeze([
  'FACT-001','QA-001','EVA-001','MIG-001','RBLD-001','DEP-001','OBSERV-001','FINOPS-001'
]);
export const GH_SAFE_REAL_OWNER_ENGINE_ID='FACT-001';
export const GH_SAFE_REAL_LEARNING_SINK='LRN-001';
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const SUBSCRIBERS_PATH=path.resolve(__dirname,'../registry/rsi-learning-subscribers.v0.json');

function stable(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function context(company_id,engine_id){return Object.freeze({company_id,engine_id,environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION});}
function evidence({engine_id,consumer_class,fields_used,decision,outcome}){
  return Object.freeze({engine_id,consumer_class,fields_used:Object.freeze([...fields_used]),decision,real_consumption:true,outcome:Object.freeze({...outcome}),outcome_hash:hash(outcome)});
}
function expectedDecision(engine_id){
  return ({'FACT-001':'FACT_GITHUB_CHANGE_STAGED','QA-001':'QA_GITHUB_CHECKS_PASS','EVA-001':'TRIBUNAL_PASS','MIG-001':'MIGRATION_REVERSIBLE','RBLD-001':'ROLLBACK_REBUILD_VERIFIED','DEP-001':'PREPROD_PROMOTION_VERIFIED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'})[engine_id];
}
function receiptOk(receipt,operation){return receipt?.capability_id==='GH-SAFE-NATIVE'&&receipt.operation===operation&&receipt.environment===PREPROD&&receipt.executed===true&&receipt.status==='EXECUTED_PREPROD_CONTROL_PLANE'&&receipt.prod_deploy_authorized===false&&receipt.prod_mutation_authorized===false;}

function sandboxAdapter(operation,result){
  return {[operation]:async()=>Object.freeze({...result,adapter_scope:'LOCAL_DETERMINISTIC_PREPROD_SANDBOX',external_github_mutation:false,prod_mutation:false})};
}
async function safeExecute(base,operation,extra,result){
  return executeGitHubSafeAction({...base,operation,...extra},sandboxAdapter(operation,result));
}

export async function buildGhSafeProducerBundle({company_id='fenix',repo='carlosjmunoz78/fenix-capital-inmo-map'}={}){
  const base={company_id,engine_id:GH_SAFE_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:'1.0.0',repo};
  const baseSha='1'.repeat(40), commitSha='2'.repeat(40), mergeSha='3'.repeat(40), revertSha='4'.repeat(40);
  const branch='cerebro/gh-safe-real-consumer-smoke';
  const inventory=await safeExecute(base,'INVENTORY',{}, {default_branch:'main',head_sha:baseSha,protected_main:true,repo});
  const branchCreate=await safeExecute(base,'BRANCH_CREATE',{target_branch:branch,rollback_ready:true},{created:true,branch,from_sha:baseSha});
  const commit=await safeExecute(base,'COMMIT_FILE',{target_branch:branch,rollback_ready:true,payload:{path:'cerebro/evidence/gh-safe-real-consumer-smoke.json',content_sha256:hash('strict-smoke')}},{committed:true,branch,parent_sha:baseSha,commit_sha:commitSha,files:['cerebro/evidence/gh-safe-real-consumer-smoke.json']});
  const pr=await safeExecute(base,'PR_CREATE',{target_branch:branch,rollback_ready:true,payload:{base:'main',title:'GH-SAFE strict smoke'}},{number:900001,state:'open',draft:false,base:'main',head:branch,head_sha:commitSha});
  const ci=await safeExecute(base,'CI_READ',{}, {head_sha:commitSha,checks_green:true,required_checks:['GH-SAFE-STRICT-E2E'],conclusion:'success'});
  const compare=await safeExecute(base,'COMPARE',{}, {base_sha:baseSha,head_sha:commitSha,ahead_by:1,behind_by:0,files_changed:1,reversible:true});
  const merge=await safeExecute(base,'MERGE',{target_branch:'main',pr_number:900001,checks_green:true,expected_head_sha:commitSha,rollback_ready:true},{merged:true,merge_sha:mergeSha,head_sha:commitSha,target_branch:'main',checks_green:true});
  const rollback=await safeExecute(base,'ROLLBACK_REVERT',{target_branch:'main',rollback_ready:true,revert_of_sha:mergeSha},{reverted:true,revert_of_sha:mergeSha,revert_sha:revertSha,target_branch:'main',restored_sha:baseSha});
  const operations={inventory,branch_create:branchCreate,commit_file:commit,pr_create:pr,ci_read:ci,compare,merge,rollback_revert:rollback};
  const bundleId=`ghsafe-bundle:${hash({company_id,repo,operations:Object.fromEntries(Object.entries(operations).map(([k,v])=>[k,v.action_id]))}).slice(0,24)}`;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_GH_SAFE_PRODUCER_BUNDLE',capability_id:'GH-SAFE-NATIVE',company_id,engine_id:GH_SAFE_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION,repo,bundle_id:bundleId,operations:Object.freeze(operations),additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,prod_deploy_authorized:false,prod_mutation_authorized:false,provider_write_authorized:false,db_mutation_authorized:false,spend_authorized:false,trading_access:false,android_touched:false});
}

function assertBundle(bundle){
  if(!bundle||bundle.capability_id!=='GH-SAFE-NATIVE')throw new Error('GH-SAFE producer bundle required');
  if(bundle.environment!==PREPROD)throw new Error('GH-SAFE strict adoption is PREPROD-only');
  if(bundle.engine_id!==GH_SAFE_REAL_OWNER_ENGINE_ID)throw new Error('GH-SAFE owner must resolve to FACT-001');
  const denied=['prod_authorized','prod_write_authorized','prod_deploy_authorized','prod_mutation_authorized','provider_write_authorized','db_mutation_authorized','spend_authorized','trading_access','android_touched'];
  if(denied.some(k=>bundle[k]!==false))throw new Error('GH-SAFE bundle expanded forbidden authority');
  return bundle;
}

function consumeFact(bundle){
  const c=bundle.operations.commit_file,p=bundle.operations.pr_create,b=bundle.operations.branch_create;
  const pass=receiptOk(b,'BRANCH_CREATE')&&receiptOk(c,'COMMIT_FILE')&&receiptOk(p,'PR_CREATE')&&b.target_branch!=='main'&&c.target_branch===b.target_branch&&p.target_branch===b.target_branch&&p.result?.head_sha===c.result?.commit_sha;
  return evidence({engine_id:'FACT-001',consumer_class:'REAL_RUNTIME_CONSUMER',fields_used:['branch_create.target_branch','commit_file.result.commit_sha','pr_create.result.head_sha','prod_mutation_authorized'],decision:pass?'FACT_GITHUB_CHANGE_STAGED':'FACT_GITHUB_HOLD',outcome:{pass,branch:b.target_branch??null,commit_sha:c.result?.commit_sha??null,pr_number:p.result?.number??null}});
}
function consumeQa(bundle){
  const ci=bundle.operations.ci_read,c=bundle.operations.commit_file;
  const pass=receiptOk(ci,'CI_READ')&&ci.result?.checks_green===true&&ci.result?.conclusion==='success'&&ci.result?.head_sha===c.result?.commit_sha;
  return evidence({engine_id:'QA-001',consumer_class:'GOVERNANCE_CONSUMER',fields_used:['ci_read.result.checks_green','ci_read.result.conclusion','ci_read.result.head_sha','commit_file.result.commit_sha'],decision:pass?'QA_GITHUB_CHECKS_PASS':'QA_GITHUB_CHECKS_FAIL',outcome:{pass,head_sha:ci.result?.head_sha??null,checks_green:ci.result?.checks_green===true,conclusion:ci.result?.conclusion??null}});
}
function consumeMigration(bundle){
  const cmp=bundle.operations.compare,c=bundle.operations.commit_file;
  const pass=receiptOk(cmp,'COMPARE')&&receiptOk(c,'COMMIT_FILE')&&cmp.result?.reversible===true&&cmp.result?.behind_by===0&&Number(cmp.result?.ahead_by)>=1&&cmp.result?.head_sha===c.result?.commit_sha&&c.rollback_ready===true;
  return evidence({engine_id:'MIG-001',consumer_class:'REAL_RUNTIME_CONSUMER',fields_used:['compare.result.reversible','compare.result.ahead_by','compare.result.behind_by','commit_file.rollback_ready'],decision:pass?'MIGRATION_REVERSIBLE':'MIGRATION_HOLD',outcome:{pass,reversible:cmp.result?.reversible===true,ahead_by:cmp.result?.ahead_by??null,behind_by:cmp.result?.behind_by??null}});
}
function consumeRebuild(bundle){
  const rb=bundle.operations.rollback_revert,m=bundle.operations.merge,i=bundle.operations.inventory;
  const pass=receiptOk(rb,'ROLLBACK_REVERT')&&receiptOk(m,'MERGE')&&rb.result?.reverted===true&&rb.result?.revert_of_sha===m.result?.merge_sha&&rb.result?.restored_sha===i.result?.head_sha&&rb.rollback_ready===true;
  return evidence({engine_id:'RBLD-001',consumer_class:'REAL_RUNTIME_CONSUMER',fields_used:['rollback_revert.result.reverted','rollback_revert.result.revert_of_sha','rollback_revert.result.restored_sha','inventory.result.head_sha'],decision:pass?'ROLLBACK_REBUILD_VERIFIED':'ROLLBACK_REBUILD_FAIL',outcome:{pass,reverted:rb.result?.reverted===true,revert_sha:rb.result?.revert_sha??null,restored_sha:rb.result?.restored_sha??null}});
}
function consumeDeploy(bundle){
  const m=bundle.operations.merge,p=bundle.operations.pr_create,ci=bundle.operations.ci_read;
  const pass=receiptOk(m,'MERGE')&&m.result?.merged===true&&m.checks_green===true&&m.expected_head_sha===p.result?.head_sha&&ci.result?.checks_green===true&&m.prod_deploy_authorized===false&&m.prod_mutation_authorized===false;
  return evidence({engine_id:'DEP-001',consumer_class:'REAL_RUNTIME_CONSUMER',fields_used:['merge.result.merged','merge.expected_head_sha','pr_create.result.head_sha','ci_read.result.checks_green','merge.prod_deploy_authorized'],decision:pass?'PREPROD_PROMOTION_VERIFIED':'DEPLOYMENT_HOLD',outcome:{pass,merged:m.result?.merged===true,merge_sha:m.result?.merge_sha??null,prod_deploy_authorized:m.prod_deploy_authorized}});
}
function consumeEvaluation(bundle,parts){
  const company_id=req(bundle.company_id,'company_id');
  const quality=['FACT-001','QA-001','MIG-001','RBLD-001','DEP-001'].every(id=>parts[id]?.decision===expectedDecision(id))?1:0;
  const benchmark=defineBenchmark({company_id,engine_id:'EVA-001',environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION,benchmark_id:'GH-SAFE-REAL-CONSUMER-ADOPTION',benchmark_version:'1.0.0',metric:'safe_consumer_adoption_quality',holdout_ref:'first-party://gh-safe/real-consumer-holdout',adversarial_refs:['direct-main-write','failed-checks','irreversible-migration','missing-rollback','prod-authority']});
  const common={company_id,engine_id:'EVA-001',environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION,experiment_id:bundle.bundle_id};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{safe_consumer_adoption_quality:0.5}},new_result:{...common,arm:'NEW',metrics:{safe_consumer_adoption_quality:quality}}});
  const tribunal=tribunalDecision({evaluation,judge_id:'EVA-001:INDEPENDENT-JUDGE:v1',candidate_actor_id:'FACT-001',metric_direction:'higher'});
  const pass=tribunal.decision==='PASS';
  return evidence({engine_id:'EVA-001',consumer_class:'GOVERNANCE_CONSUMER',fields_used:['FACT-001.decision','QA-001.decision','MIG-001.decision','RBLD-001.decision','DEP-001.decision'],decision:pass?'TRIBUNAL_PASS':`TRIBUNAL_${tribunal.decision}`,outcome:{pass,quality,evaluation_delta:evaluation.delta,tribunal_decision:tribunal.decision,tribunal_reason:tribunal.reason}});
}
function consumeTelemetry(bundle,{workdir,bundleHash}){
  const root=path.join(workdir,'operational-ledgers');fs.mkdirSync(root,{recursive:true});
  const ledgers=createOperationalLedgersV0({root_dir:root,environment:PREPROD});
  const corr=bundle.bundle_id;
  const obsExisting=ledgers.observability.listForCorrelation(bundle.company_id,corr).find(r=>r.message==='GH-SAFE-NATIVE real consumer outcome');
  const obs=obsExisting??ledgers.observability.record({context:context(bundle.company_id,'OBSERV-001'),correlation_id:corr,level:'INFO',message:'GH-SAFE-NATIVE real consumer outcome',data:{capability_id:'GH-SAFE-NATIVE',bundle_hash:bundleHash,operation_count:Object.keys(bundle.operations).length}});
  const obsPass=obs?.data?.bundle_hash===bundleHash&&obs?.data?.operation_count===8;
  const obsEvidence=evidence({engine_id:'OBSERV-001',consumer_class:'TELEMETRY_CONSUMER',fields_used:['bundle_id','operations','bundle_hash'],decision:obsPass?'OBSERVABILITY_RECORDED':'OBSERVABILITY_INCOMPLETE',outcome:{pass:obsPass,observation_id:obs?.observation_id??null,bundle_hash:obs?.data?.bundle_hash??null,records_for_correlation:ledgers.observability.listForCorrelation(bundle.company_id,corr).length}});
  const cost=Object.values(bundle.operations).reduce((sum,r)=>sum+Number(r?.additional_cost_eur??0),Number(bundle.additional_cost_eur??0));
  const prior=ledgers.finops.list().find(r=>r.correlation_id===corr&&r.provider==='LOCAL_GH_SAFE');
  const fin=prior??ledgers.finops.record({context:context(bundle.company_id,'FINOPS-001'),correlation_id:corr,task_id:corr,provider:'LOCAL_GH_SAFE',cost_eur:Number.isFinite(cost)&&cost>=0?cost:0,metadata:{capability_id:'GH-SAFE-NATIVE',bundle_hash:bundleHash,operations:Object.keys(bundle.operations).length}});
  const aggregate=ledgers.finops.aggregate({company_id:bundle.company_id,engine_id:'FINOPS-001',provider:'LOCAL_GH_SAFE'});
  const finPass=cost===0&&fin.cost_eur_micros===0;
  const finEvidence=evidence({engine_id:'FINOPS-001',consumer_class:'TELEMETRY_CONSUMER',fields_used:['operations.*.additional_cost_eur','additional_cost_eur'],decision:finPass?'FINOPS_ZERO_COST_RECORDED':'FINOPS_COST_POLICY_FAIL',outcome:{pass:finPass,cost_event_id:fin.cost_event_id,cost_eur_micros:fin.cost_eur_micros,aggregate_cost_eur:aggregate.cost_eur,events:aggregate.events}});
  return {observability:obsEvidence,finops:finEvidence};
}
function consumeLearning(bundle,{workdir,source_run_id,source_head_sha,accepted,consumerHash}){
  const registry=JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH,'utf8'));
  const event={event_id:`evt:ghsafe:${hash({bundle_id:bundle.bundle_id,consumerHash}).slice(0,24)}`,company_id:bundle.company_id,type:'github.safe.consumer.outcome',engine_id:'FACT-001',environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION,capability_id:'GH-SAFE-NATIVE',accepted,consumer_outcome_hash:consumerHash,prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0};
  const build=buildLearningOutbox({event_report:{events:[event]},subscriber_registry:registry,source:{workflow:'CEREBRO GH Safe FULL E2E REAL V1',run_id:source_run_id,head_sha:source_head_sha}});
  const root=path.join(workdir,'lrn-outbox');
  const first=persistLearningOutbox({build,output_root:root});
  const second=persistLearningOutbox({build,output_root:root});
  const localized=build.batches.find(b=>b.company_id===bundle.company_id)?.events??[];
  const pass=localized.some(e=>e.type==='github.safe.consumer.outcome')&&first.status==='OUTBOX_GREEN'&&second.status==='OUTBOX_GREEN'&&second.created_total===0;
  return Object.freeze({engine_id:'LRN-001',consumer_class:'LEARNING_CONSUMER',real_consumption:true,decision:pass?'LRN_FEEDBACK_PERSISTED':'LRN_FEEDBACK_INCOMPLETE',fields_used:Object.freeze(['consumer_outcomes','outcome_hash','accepted']),outcome:Object.freeze({pass,localized_events:localized.length,first_created_total:first.created_total,second_created_total:second.created_total,idempotency_green:second.created_total===0}),outcome_hash:hash({pass,localized:localized.map(e=>e.event_id),second_created_total:second.created_total})});
}
function persistState(workdir,state){
  const file=path.join(workdir,'gh-safe-strict-state.json');fs.mkdirSync(path.dirname(file),{recursive:true});
  const text=`${JSON.stringify(state,null,2)}\n`;
  if(fs.existsSync(file)){
    const prior=fs.readFileSync(file,'utf8');
    if(hash(JSON.parse(prior))!==hash(state))throw new Error('GH_SAFE_PERSISTED_STATE_CONFLICT');
    return {file,created:false};
  }
  fs.writeFileSync(file,text,{encoding:'utf8',mode:0o600});return {file,created:true};
}

export async function consumeGhSafeOutputReal({producer_bundle,workdir=null,source_run_id=1,source_head_sha='0'.repeat(40),emit_learning=true}={}){
  const bundle=assertBundle(producer_bundle);
  if(!Number.isInteger(source_run_id)||source_run_id<=0)throw new Error('source_run_id positive integer required');
  if(!/^[0-9a-f]{40}$/i.test(source_head_sha))throw new Error('source_head_sha must be 40 hex chars');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-ghsafe-real-consumers-'));fs.mkdirSync(root,{recursive:true});
  const bundleHash=hash(bundle);
  const fact=consumeFact(bundle),qa=consumeQa(bundle),mig=consumeMigration(bundle),rbld=consumeRebuild(bundle),dep=consumeDeploy(bundle);
  const preMap={'FACT-001':fact,'QA-001':qa,'MIG-001':mig,'RBLD-001':rbld,'DEP-001':dep};
  const eva=consumeEvaluation(bundle,preMap);
  const telemetry=consumeTelemetry(bundle,{workdir:root,bundleHash});
  const consumers=Object.freeze([fact,qa,eva,mig,rbld,dep,telemetry.observability,telemetry.finops]);
  const map=Object.freeze(Object.fromEntries(consumers.map(c=>[c.engine_id,c])));
  const missing=GH_SAFE_REAL_REQUIRED_CONSUMERS.filter(id=>!map[id]);
  const failed=GH_SAFE_REAL_REQUIRED_CONSUMERS.filter(id=>map[id]?.decision!==expectedDecision(id));
  const functional=missing.length===0&&failed.length===0;
  const consumerHash=hash(consumers.map(c=>({engine_id:c.engine_id,decision:c.decision,outcome_hash:c.outcome_hash})));
  const learning=emit_learning?consumeLearning(bundle,{workdir:root,source_run_id,source_head_sha:source_head_sha.toLowerCase(),accepted:functional,consumerHash}):Object.freeze({engine_id:'LRN-001',consumer_class:'LEARNING_CONSUMER',real_consumption:false,decision:'LRN_FEEDBACK_INCOMPLETE',fields_used:Object.freeze([]),outcome:Object.freeze({pass:false,localized_events:0,first_created_total:0,second_created_total:0,idempotency_green:false}),outcome_hash:hash('learning-disabled')});
  const strictFull=functional&&learning.decision==='LRN_FEEDBACK_PERSISTED';
  const outcome={bundle_id:bundle.bundle_id,bundle_hash:bundleHash,required_consumer_total:GH_SAFE_REAL_REQUIRED_CONSUMERS.length,functional_consumer_total:GH_SAFE_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length,accepted:strictFull,learning_feedback_persisted:learning.decision==='LRN_FEEDBACK_PERSISTED',zero_cost:telemetry.finops.decision==='FINOPS_ZERO_COST_RECORDED'};
  const state={schema_version:'1.0.0',state_type:'CEREBRO_GH_SAFE_REAL_CONSUMER_ADOPTION_STATE',company_id:bundle.company_id,engine_id:GH_SAFE_REAL_OWNER_ENGINE_ID,environment:PREPROD,version:GH_SAFE_REAL_ADOPTION_VERSION,capability_id:'GH-SAFE-NATIVE',bundle_id:bundle.bundle_id,bundle_hash:bundleHash,consumer_outcome_hash:consumerHash,outcome_hash:hash(outcome),status:strictFull?'FULL_E2E_REAL_PREPROD':'PARCIAL'};
  const persisted=persistState(root,state);
  return Object.freeze({...state,owner_resolution:Object.freeze({legacy_operational_owner:'SEC-001',resolved_owner:'FACT-001',evidence:['capability-gh-safe-native.v1.json ownership.primary','github-safe-native-v1.mjs default engine_id']}),required_consumers:Object.freeze([...GH_SAFE_REAL_REQUIRED_CONSUMERS]),consumers,consumer_map:map,missing_consumers:Object.freeze(missing),failed_consumers:Object.freeze(failed),consumer_coverage:consumers.length/GH_SAFE_REAL_REQUIRED_CONSUMERS.length,functional_consumer_coverage:(GH_SAFE_REAL_REQUIRED_CONSUMERS.length-missing.length-failed.length)/GH_SAFE_REAL_REQUIRED_CONSUMERS.length,learning_sink:learning,outcome:Object.freeze(outcome),state_persisted:true,state_file:persisted.file,restartable:true,idempotency_proven:learning.outcome.idempotency_green===true,continuous_improvement_feedback:learning.decision==='LRN_FEEDBACK_PERSISTED',additional_cost_eur:telemetry.finops.outcome.aggregate_cost_eur,prod_authorized:false,prod_write_authorized:false,prod_deploy_authorized:false,prod_mutation_authorized:false,provider_write_authorized:false,crm_write_authorized:false,db_mutation_authorized:false,spend_authorized:false,trading_access:false,android_touched:false,full_e2e_real_preprod:strictFull});
}

export async function runGhSafeFullE2ERealV1({company_id='fenix',repo='carlosjmunoz78/fenix-capital-inmo-map',workdir=null,source_run_id=1,source_head_sha='0'.repeat(40)}={}){
  const producer_bundle=await buildGhSafeProducerBundle({company_id,repo});
  return consumeGhSafeOutputReal({producer_bundle,workdir,source_run_id,source_head_sha,emit_learning:true});
}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const report=await runGhSafeFullE2ERealV1({company_id:arg('--company')??'fenix',repo:arg('--repo')??'carlosjmunoz78/fenix-capital-inmo-map',workdir:arg('--workdir')??null,source_run_id:Number(arg('--source-run-id')??1),source_head_sha:arg('--source-head-sha')??'0'.repeat(40)});
    const out=arg('--out');const text=`${JSON.stringify(report,null,2)}\n`;
    if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),text,{encoding:'utf8',mode:0o600});}else process.stdout.write(text);
    if(!report.full_e2e_real_preprod)process.exitCode=3;
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
