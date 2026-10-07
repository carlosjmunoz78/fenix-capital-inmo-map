import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applySupabaseCerebroWrapper,CEREBRO_SUPABASE_WRAPPER} from './skill-cerebro-supabase-wrapper.mjs';
import {applyAgentBrowserCerebroWrapper,CEREBRO_AGENT_BROWSER_WRAPPER} from './skill-cerebro-agent-browser-wrapper.mjs';

const CONFIRM='RUN_PROD_READONLY_CANARY';
const APP_URL='https://app.fenixcapital.es/';
const GATEWAY_HEALTH_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/health';
const ALLOWED_URLS=new Set([APP_URL,GATEWAY_HEALTH_URL]);

function sha256(value){return createHash('sha256').update(String(value??'')).digest('hex');}
function assert(condition,message){if(!condition) throw new Error(message);}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

function safeHeaders(headers={}){
  const out={};
  for(const [k,v] of Object.entries(headers)){
    const key=String(k).toLowerCase();
    if(key==='authorization'||key==='apikey'||key.includes('secret')||key.includes('token')) continue;
    out[key]=String(v);
  }
  return out;
}

async function readonlyRequest({url,headers={},fetchImpl=globalThis.fetch}){
  assert(typeof fetchImpl==='function','fetch implementation required');
  assert(ALLOWED_URLS.has(url),`PROD_CANARY_URL_NOT_ALLOWED:${url}`);
  const response=await fetchImpl(url,{method:'GET',headers,redirect:'follow'});
  const text=await response.text();
  assert(text.length<=256000,'PROD_CANARY_RESPONSE_TOO_LARGE');
  return Object.freeze({
    url,
    status:response.status,
    ok:response.ok,
    body_sha256:sha256(text),
    body_preview:text.slice(0,500),
    response_headers:safeHeaders(Object.fromEntries(response.headers?.entries?.()??[]))
  });
}

function writeBinding(file,state){
  const value={schema_version:'0.1.0',state,prod_write:false,customer_data:false,external_skill_code:false,trading_access:false,additional_cost_eur:0};
  writeJson(file,value);return value;
}

function runWrapperProbes(){
  const supabaseFixture={fixture_id:'query-review',expected_constraints:['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']};
  const supabase=applySupabaseCerebroWrapper({
    rawOutput:'Review the query plan and keep company_id scope explicit. Do not apply changes.',
    fixture:supabaseFixture,
    domain:CEREBRO_SUPABASE_WRAPPER.domain,
    arm:'CANDIDATE_SKILL_PROXY'
  });
  const browserFixture={fixture_id:'read-only-navigation',expected_constraints:['NO_SUBMIT','NO_CREDENTIALS','NO_ANTIBOT_BYPASS']};
  const browser=applyAgentBrowserCerebroWrapper({
    rawOutput:'Inspect the public page read-only and record DOM evidence. Do not authenticate or trigger actions.',
    fixture:browserFixture,
    domain:CEREBRO_AGENT_BROWSER_WRAPPER.domain,
    arm:'CANDIDATE_SKILL_PROXY'
  });
  assert(supabase.applied===true&&!supabase.policy_conflict,'SUPABASE_CANARY_WRAPPER_NOT_GREEN');
  assert(browser.applied===true&&!browser.policy_conflict,'AGENT_BROWSER_CANARY_WRAPPER_NOT_GREEN');
  assert(supabase.prod_authorized===false&&browser.prod_authorized===false,'WRAPPER_PROD_AUTH_MUST_REMAIN_FALSE');
  return {
    supabase:{wrapper_id:supabase.wrapper_id,output_sha256:supabase.output_sha256,policy_conflict:supabase.policy_conflict},
    agent_browser:{wrapper_id:browser.wrapper_id,output_sha256:browser.output_sha256,policy_conflict:browser.policy_conflict}
  };
}

export async function runProdReadonlyCanary({
  confirm,
  prodPublishableKey='',
  fetchImpl=globalThis.fetch,
  stateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-prod-canary-')),
  observedAt=new Date().toISOString()
}={}){
  assert(confirm===CONFIRM,'EXPLICIT_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED');
  assert(typeof prodPublishableKey==='string'&&prodPublishableKey.startsWith('sb_publishable_'),'VALID_PROD_PUBLISHABLE_KEY_REQUIRED');
  const bindingFile=path.join(stateRoot,'binding','skill-prod-canary-binding.json');
  const auditFile=path.join(stateRoot,'audit','skill-prod-canary-audit.json');
  const before=writeBinding(bindingFile,'DISABLED');
  const enabled=writeBinding(bindingFile,'PROD_READONLY_CANARY_ENABLED');
  const events=[];
  try{
    const app=await readonlyRequest({url:APP_URL,fetchImpl});
    assert(app.status===200,'APP_PROD_CANARY_HTTP_NOT_200');
    assert(/<!doctype html/i.test(app.body_preview),'APP_PROD_CANARY_NOT_HTML');
    events.push({target:'APP_PUBLIC_ROOT',method:'GET',status:app.status,body_sha256:app.body_sha256});

    const gateway=await readonlyRequest({url:GATEWAY_HEALTH_URL,headers:{apikey:prodPublishableKey},fetchImpl});
    assert(gateway.status===200,'GATEWAY_PROD_CANARY_HTTP_NOT_200');
    let health={};
    try{health=JSON.parse(gateway.body_preview);}catch{}
    assert(health?.ok===true,'GATEWAY_PROD_CANARY_NOT_OK');
    assert(health?.env==='PROD','GATEWAY_PROD_CANARY_ENV_NOT_PROD');
    assert(health?.service==='fenix-app-gateway','GATEWAY_PROD_CANARY_SERVICE_MISMATCH');
    events.push({target:'FENIX_APP_GATEWAY_HEALTH',method:'GET',status:gateway.status,body_sha256:gateway.body_sha256,env:health.env,service:health.service});

    const wrappers=runWrapperProbes();
    const disabled=writeBinding(bindingFile,'DISABLED');
    const report={
      schema_version:'0.1.0',
      observed_at:observedAt,
      status:'GREEN_PROD_READONLY_CANARY',
      execution_mode:'ISOLATED_PROD_READONLY_OBSERVATION_CANARY',
      company_id:'GLOBAL',
      engine_id:'FACT-001',
      environment:'PROD_CANARY',
      version:'0.1.0',
      authorization_basis:'explicit_user_high_risk_authorization',
      prod_surfaces_observed:true,
      live_requests:events.length,
      methods_used:['GET'],
      app_deploy_performed:false,
      prod_write:false,
      customer_data_used:false,
      credentials_exposed:false,
      external_skill_code_executed:false,
      trading_access:false,
      additional_cost_eur:0,
      paid_fallback:false,
      wrappers_remain_prod_authorized_false:true,
      binding_before:before.state,
      binding_enabled:enabled.state,
      binding_after:disabled.state,
      rollback_proven:disabled.state==='DISABLED',
      events,
      wrappers
    };
    writeJson(auditFile,report);
    return Object.freeze(report);
  }catch(error){
    const disabled=writeBinding(bindingFile,'DISABLED');
    const report={schema_version:'0.1.0',observed_at:observedAt,status:'HOLD_PROD_READONLY_CANARY',error:String(error?.message??error),prod_write:false,customer_data_used:false,external_skill_code_executed:false,trading_access:false,additional_cost_eur:0,binding_after:disabled.state,rollback_proven:disabled.state==='DISABLED'};
    writeJson(auditFile,report);
    const failure=new Error(report.error);failure.report=report;throw failure;
  }
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=arg('--output')??'artifacts/cerebro-skill-prod-readonly-canary.json';
  try{
    const report=await runProdReadonlyCanary({confirm:process.env.CEREBRO_PROD_CANARY_CONFIRM,prodPublishableKey:process.env.PROD_SUPABASE_PUBLISHABLE_KEY??''});
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,live_requests:report.live_requests,rollback_proven:report.rollback_proven,prod_write:false,cost_eur:0}));
  }catch(error){
    const report=error?.report??{status:'HOLD_PROD_READONLY_CANARY',error:String(error?.message??error)};
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.error(JSON.stringify({status:report.status,error:report.error,rollback_proven:report.rollback_proven??false,prod_write:false}));
    process.exitCode=1;
  }
}
