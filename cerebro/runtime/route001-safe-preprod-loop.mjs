import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {routeWork} from '../router/execution-model-router.mjs';
import {buildUniversalLearningEventReport} from './universal-learning-ingress.mjs';

const SAFE_FIXTURES=Object.freeze({
  'canonical-json-hash-v0':Object.freeze({task_type:'rule',description:'Canonicalize a fixed JSON object and hash it deterministically.',runNode:()=>{const value={alpha:1,beta:[2,3],gamma:{ok:true}};const canonical=JSON.stringify(value,Object.keys(value).sort());const digest=crypto.createHash('sha256').update(canonical).digest('hex');return {marker:'ROUTE001_SAFE_FIXTURE_GREEN',digest_prefix:digest.slice(0,16),bytes:Buffer.byteLength(canonical)};}}),
  'bounded-reduction-v0':Object.freeze({task_type:'typescript',description:'Reduce a fixed bounded numeric vector without external I/O.',runNode:()=>{const values=[3,5,8,13,21];return {marker:'ROUTE001_SAFE_FIXTURE_GREEN',sum:values.reduce((a,b)=>a+b,0),count:values.length};}})
});

const PYTHON_FIXED_SCRIPTS=Object.freeze({
  'canonical-json-hash-v0':`import hashlib,json\nvalue={"alpha":1,"beta":[2,3],"gamma":{"ok":True}}\ncanonical=json.dumps(value,separators=(",",":"),sort_keys=True)\ndigest=hashlib.sha256(canonical.encode("utf-8")).hexdigest()\nprint(json.dumps({"marker":"ROUTE001_SAFE_FIXTURE_GREEN","digest_prefix":digest[:16],"bytes":len(canonical.encode("utf-8"))},separators=(",",":")))`,
  'bounded-reduction-v0':`import json\nvalues=[3,5,8,13,21]\nprint(json.dumps({"marker":"ROUTE001_SAFE_FIXTURE_GREEN","sum":sum(values),"count":len(values)},separators=(",",":")))`
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

function runPythonFixture(fixture_id){
  const script=PYTHON_FIXED_SCRIPTS[fixture_id];if(!script)throw new Error('python fixture not allowlisted');
  const out=spawnSync('python',['-c',script],{encoding:'utf8',timeout:5000,maxBuffer:65536,shell:false,windowsHide:true,env:{PATH:process.env.PATH??''}});
  if(out.error)throw new Error(`python safe fixture spawn failed:${out.error.message}`);
  if(out.status!==0)throw new Error(`python safe fixture failed:${String(out.stderr??'').trim().slice(0,300)}`);
  const stdout=String(out.stdout??'').trim();if(!stdout||stdout.includes('\n'))throw new Error('python safe fixture output invalid');
  let parsed;try{parsed=JSON.parse(stdout);}catch{throw new Error('python safe fixture output not JSON');}
  return parsed;
}

export function executeSelectedSafeFixture({selected_resource_id,fixture_id}={}){
  const fixture=SAFE_FIXTURES[fixture_id];if(!fixture)throw new Error('fixture_id not allowlisted');
  if(selected_resource_id==='gha-node-runtime')return Object.freeze({result:fixture.runNode(),execution_provenance:'NODE_IN_PROCESS_FIXED_FIXTURE',actual_runtime:'node'});
  if(selected_resource_id==='gha-python-runtime')return Object.freeze({result:runPythonFixture(fixture_id),execution_provenance:'PYTHON_FIXED_SUBPROCESS_NO_SHELL',actual_runtime:'python'});
  throw new Error(`selected deterministic executor not allowlisted:${selected_resource_id}`);
}

function learningSignals({observed_at,fixture_id,route,result,duration_ms,source_run_id,source_head_sha,execution_provenance,actual_runtime}){
  const evidence=[`route001:fixture:${fixture_id}`,`route001:executor:${execution_provenance}`];
  if(source_run_id!=null)evidence.push(`github-run:${source_run_id}`);
  if(source_head_sha)evidence.push(`git:${source_head_sha}`);
  const base={company_id:'fenix',engine_id:'ROUTE-001',source_environment:'PREPROD',version:'0.2.0',observed_at,confidence:1,risk_class:'LOW',evidence_refs:evidence,contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  return [
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:${actual_runtime}:result`,signal_type:'ENGINE_RESULT',severity:'INFO',reason:'Real zero-cost PREPROD route completed an allowlisted synthetic deterministic fixture on the runtime actually selected by ROUTE-001.',metric:{name:'route_success',direction:'HIGHER',measurement:'ALLOWLISTED_SYNTHETIC_PREPROD_FIXTURE'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,selected_resource_class:route.selected_resource_class,route_status:route.status,fixture_marker:result.marker,duration_ms,zero_cost:true,business_execution:false,execution_provenance,actual_runtime}},
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:${actual_runtime}:latency`,signal_type:'METRIC_OBSERVATION',severity:'INFO',reason:'Observed duration of the real zero-cost PREPROD fixture route.',metric:{name:'route_fixture_duration_ms',direction:'LOWER',measurement:'MONOTONIC_PROCESS_CLOCK'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,duration_ms,execution_provenance,actual_runtime}},
    {...base,signal_id:`route001:${source_run_id??'local'}:${fixture_id}:${actual_runtime}:cost`,signal_type:'COST_OBSERVATION',severity:'INFO',reason:'Observed incremental cost remained zero for the allowlisted PREPROD fixture.',metric:{name:'additional_cost_eur',direction:'LOWER',measurement:'ROUTE_POLICY_AND_PUBLIC_RUNNER_EVIDENCE'},payload:{fixture_id,selected_resource_id:route.selected_resource_id,observed_incremental_cost_eur:0,paid_fallback_used:false,execution_provenance,actual_runtime}}
  ];
}

export function runSafePreprodLoop({discovery,lifecycle_state=null,fixture_id='canonical-json-hash-v0',now=null}={}){
  if(!discovery||!['LAB','PREPROD'].includes(discovery.environment))throw new Error('safe loop environment denied');
  const fixture=SAFE_FIXTURES[fixture_id];if(!fixture)throw new Error('fixture_id not allowlisted');
  const route=routeWork(buildSafeRouterTask(discovery,{fixture_id,lifecycle_state}));
  if(route.status!=='ROUTED')return safe({schema_version:'1.1.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.2.0',status:'HOLD_NO_SAFE_ROUTE',fixture_id,route,fixture_execution_performed:false,learning_signal_report:null,human_required:route.human_required??null,observed_at:discovery.observed_at});
  if(route.selected_resource_class!=='DETERMINISTIC_LOCAL')return safe({schema_version:'1.1.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.2.0',status:'HOLD_EXECUTOR_NOT_ALLOWLISTED',fixture_id,route,fixture_execution_performed:false,learning_signal_report:null,human_required:null,observed_at:discovery.observed_at});
  const started=process.hrtime.bigint();const execution=executeSelectedSafeFixture({selected_resource_id:route.selected_resource_id,fixture_id});const ended=process.hrtime.bigint();const duration_ms=Math.max(0,Number(ended-started)/1e6);const result=execution.result;
  if(result?.marker!=='ROUTE001_SAFE_FIXTURE_GREEN')throw new Error('safe fixture failed marker');
  const observed_at=now?iso(now):discovery.observed_at;
  const signals=learningSignals({observed_at,fixture_id,route,result,duration_ms,source_run_id:discovery.source_run_id,source_head_sha:discovery.source_head_sha,execution_provenance:execution.execution_provenance,actual_runtime:execution.actual_runtime});
  const learning_signal_report=buildUniversalLearningEventReport({signals});
  return safe({schema_version:'1.1.0',state_type:'CEREBRO_ROUTE001_SAFE_PREPROD_LOOP',company_id:'fenix',engine_id:'ROUTE-001',environment:discovery.environment,version:'0.2.0',status:'SAFE_PREPROD_LOOP_GREEN',fixture_id,fixture_description:fixture.description,route,fixture_execution_performed:true,fixture_result:result,duration_ms,execution_provenance:execution.execution_provenance,actual_runtime:execution.actual_runtime,learning_signals:signals,learning_signal_report,human_required:null,observed_at});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const discovery=readJson(path.resolve(req(arg('--discovery'),'--discovery',1000)),'discovery');
    const lifecyclePath=arg('--lifecycle');const lifecycle=lifecyclePath?readJson(path.resolve(lifecyclePath),'lifecycle state'):null;
    const fixtureId=arg('--fixture')??'canonical-json-hash-v0';const output=path.resolve(req(arg('--output'),'--output',1000));
    const report=runSafePreprodLoop({discovery,lifecycle_state:lifecycle,fixture_id:fixtureId});
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,selected_resource_id:report.route?.selected_resource_id??null,actual_runtime:report.actual_runtime??null,execution_provenance:report.execution_provenance??null,fixture_execution_performed:report.fixture_execution_performed,learning_events:report.learning_signal_report?.events_total??0,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
    if(report.status!=='SAFE_PREPROD_LOOP_GREEN')process.exitCode=3;
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}

export const ROUTE001_SAFE_PREPROD_LOOP_V0_CONTRACT=Object.freeze({engine_id:'ROUTE-001',company_id:'fenix',environments:['LAB','PREPROD'],fixtures:Object.freeze(Object.keys(SAFE_FIXTURES)),executor_resource_ids:['gha-node-runtime','gha-python-runtime'],executor_resource_classes:['DETERMINISTIC_LOCAL'],python_execution:'FIXED_SCRIPT_NO_SHELL',business_execution:false,business_network_write:false,business_repo_write:false,control_plane_state_write:true,learning_dispatch:true,customer_data:false,secrets:false,learning_ingress:'cerebro_learning_signal',prod_authorized:false,prod_write_authorized:false,execution_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'ROUTE001_REPEATABLE_AUTONOMOUS_PREPROD_CYCLES_V0'});
