import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {routeWork} from '../router/execution-model-router.mjs';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';

const SAFE_FIXTURES=Object.freeze({
  'canonical-json-hash-v0':Object.freeze({task_type:'rule',description:'Canonicalize a fixed JSON object and hash it deterministically.',run:()=>{const value={alpha:1,beta:[2,3],gamma:{ok:true}};const canonical=JSON.stringify(value,Object.keys(value).sort());const digest=crypto.createHash('sha256').update(canonical).digest('hex');return {marker:'ROUTE001_SAFE_FIXTURE_GREEN',digest_prefix:digest.slice(0,16),bytes:Buffer.byteLength(canonical)};}}),
  'bounded-reduction-v0':Object.freeze({task_type:'typescript',description:'Reduce a fixed bounded numeric vector without external I/O.',run:()=>{const values=[3,5,8,13,21];return {marker:'ROUTE001_SAFE_FIXTURE_GREEN',sum:values.reduce((a,b)=>a+b,0),count:values.length};}})
});

function req(v,label,max=500){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function iso(v,label='observed_at'){const x=req(v,label,100);const t=Date.parse(x);if(Number.isNaN(t))throw new Error(`${label} invalid`);return new Date(t).toISOString();}
function safe(v){return Object.freeze({...v,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(`${label} invalid`);return v;}

export function buildSafeRouterTask(discovery,{fixture_id='canonical-json-hash-v0',lifecycle_state=null}={}){
  if(!discovery||discovery.state_type!=='CEREBRO_ROUTE001_REAL_RESOURCE_DISCOVERY')throw new Error('canonical discovery required');
  const fixture=SAFE_FIXTURES[fixture_id];if(!fixture)throw new Error('fixture_id not allowlisted');
  return Object.freeze({company_id:'fenix',environment:discovery.environment,task_type:fixture.task_type,confidence:1,risk:'LOW',contains_customer_data:false,contains_secrets:false,prod_write_requested:false,trading_requested:false,paid_route_requested:false,estimated_paid_cost_eur:0,browser_binding_status:'',available_resources:discovery.resources,lifecycle_state});
}

function learningSignals({observed_at,fixture_id,route,result,duration_ms,source_run_id,source_head_sha}){
  const evidence=[`route001:fixture:${fixture_id}`];
  if(source_run_id!=null)evidence.push(`github-run:${source_run_id}`);
  if(source_head_sha)evidence.push(`git:${source_head_sha}`);
  const base={company_id:'fenix',engine_id:'ROUTE-001',source_environment:'PREPROD',version:'0.1.0',observed_at,confidence:1,risk_class:'LOW',evidence_refs:evidence,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  return [
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:result`,signal_type:'ENGINE_RESULT',severity:'INFO',reason:'Real zero-cost PREPROD route completed an allowlisted synthetic deterministic fixture.',metric:{name:'route_success',direction:'HIGHER',measurement:'ALLOWLISTED_SYNTHETIC_PREPROD_FIXTURE'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,selected_resource_class:route.selected_resource_class,route_status:route.status,fixture_marker:result.marker,duration_ms,zero_cost:true,business_execution:false}},
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:latency`,signal_type:'METRIC_OBSERVATION',severity:'INFO',reason:'Observed duration of the real zero-cost PREPROD fixture route.',metric:{name:'route_fixture_duration_ms',direction:'LOWER',measurement:'MONOTONIC_PROCESS_CLOCK'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,duration_ms}},
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:cost`,signal_type:'COST_OBSERVATION',severity:'INFO',reason:'Observed incremental cost remained zero for the allowlisted PREPROD fixture.',metric:{name:'additional_cost_eur',direction:'LOWER',measurement:'ROUTE_POLICY_AND_PUBLIC_RUNNER_EVIDENCE'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,observed_incremental_cost_eur:0,paid_fallback_used:false}}
  ];
}

export function runSafePreprodLoop({discovery,lifecycle_state=null,fixture_id='canonical-json-hash-v0',now=null}={}){
  if(!discovery||!['LAB','PREPROD'].includes(discovery.environment))throw new Error('safe loop environment denied');
  const fixture=SAFE_FIXTURES[fixture_id];if(!fixture)throw new Error('fixture_id not allowlisted');
  const route=routeWork(buildSafeRouterTask(discovery,{fixture_id,lifecycle_state}));
  if(route.status!=='ROUTED')return safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.1.0',status:'HOLD_NO_SAFE_ROUTE',fixture_id,route,fixture_execution_performed:false,learning_signal_report:null,human_required:route.human_required??null,observed_at:discovery.observed_at});
  if(!['DETERMINISTIC_LOCAL'].includes(route.selected_resource_class))return safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.1.0',status:'HOLD_EXECUTOR_NOT_ALLOWLISTED',fixture_id,route,fixture_execution_performed:false,learning_signal_report:null,human_required:null,observed_at:discovery.observed_at});
  const started=process.hrtime.bigint();const result=fixture.run();const ended=process.hrtime.bigint();const duration_ms=Math.max(0,Number(ended-started)/1e6);
  if(result?.marker!=='ROUTE001_SAFE_FIXTURE_GREEN')throw new Error('safe fixture failed marker');
  const observed_at=now?iso(now):discovery.observed_at;
  const signals=learningSignals({observed_at,fixture_id,route,result,duration_ms,source_run_id:discovery.source_run_id,source_head_sha:discovery.source_head_sha});
  const learning_signal_report=buildUniversalLearningEventReport({signals});
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.1.0',status:'SAFE_PREPROD_LOOP_GREEN',fixture_id,fixture_description:fixture.description,route,fixture_execution_performed:true,fixture_result:result,duration_ms,learning_signals:signals,learning_signal_report,human_required:null,observed_at});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const discovery=readJson(path.resolve(req(arg('--discovery'),'--discovery',1000)),'discovery');
    const lifecyclePath=arg('--lifecycle');const lifecycle=lifecyclePath?readJson(path.resolve(lifecyclePath),'lifecycle state'):null;
    const fixtureId=arg('--fixture')??'canonical-json-hash-v0';const output=path.resolve(req(arg('--output'),'--output',1000));
    const report=runSafePreprodLoop({discovery,lifecycle_state:lifecycle,fixture_id:fixtureId});
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,selected_resource_id:report.route?.selected_resource_id??null,fixture_execution_performed:report.fixture_execution_performed,learning_events:report.learning_signal_report?.events_total??0,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
    if(report.status!=='SAFE_PREPROD_LOOP_GREEN')process.exitCode=3;
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}

export const ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT=Object.freeze({engine_id:'ROUTE-001',company_id:'fenix',environments:['LAB','PREPROD'],fixtures:Object.freeze(Object.keys(SAFE_FIXTURES)),executor_resource_classes:['DETERMINISTIC_LOCAL'],business_execution:false,business_network_write:false,business_repo_write:false,control_plane_state_write:true,learning_dispatch:true,customer_data:false,secrets:false,learning_ingress:'cerebro_learning_signal',prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'ROUTE001_REPEATABLE_AUTONOMOUS_PREPROD_CYCLES_V0'});
