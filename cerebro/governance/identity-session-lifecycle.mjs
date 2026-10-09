import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadIdentityCredentialFoundation} from './identity-credential-broker.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH=path.resolve(HERE,'../registry/credential-lifecycle-policy.v0.json');
const SECRET_KEYS=new Set(['value','secret','password','token','jwt','api_key','apikey','access_token','refresh_token','private_key']);
const JWT_RE=/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/;
function readJson(file,label){let v;try{v=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){throw new Error(`${label} unreadable:${e.message}`);}return v;}
function hash(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function secretPath(v,p='root'){if(v==null)return null;if(Array.isArray(v)){for(let i=0;i<v.length;i++){const f=secretPath(v[i],`${p}[${i}]`);if(f)return f;}return null;}if(typeof v==='object'){for(const [k,x] of Object.entries(v)){if(SECRET_KEYS.has(k.toLowerCase()))return `${p}.${k}`;const f=secretPath(x,`${p}.${k}`);if(f)return f;}return null;}return typeof v==='string'&&JWT_RE.test(v)?p:null;}
function safe(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function bool(v){return v===true;}
function iso(v){const t=Date.parse(v);if(Number.isNaN(t))throw new Error('observed_at invalid');return new Date(t).toISOString();}

export function loadLifecyclePolicy(){
  const p=readJson(POLICY_PATH,'lifecycle policy');
  if(p.company_id!=='fenix'||p.engine_id!=='IAM-001'||p.contains_secret_values!==false||p.prod_authorized!==false||p.prod_write_authorized!==false||p.trading_access!==false||p.multicompany_continuation!==false||Number(p.additional_cost_eur)!==0) throw new Error('lifecycle policy safety drift');
  return p;
}

export function evaluateCredentialLifecycle(observations,{now=new Date().toISOString(),foundation=null,policy=null}={}){
  const f=foundation??loadIdentityCredentialFoundation();const p=policy??loadLifecyclePolicy();const at=iso(observations?.observed_at??now);const nowSec=Math.floor(Date.parse(now)/1000);
  const forbidden=secretPath(observations);if(forbidden)throw new Error(`raw credential material forbidden:${forbidden}`);
  const rows={};
  for(const rule of p.policies){
    const ref=(f.credentials.references??[]).find(x=>x.credential_ref_id===rule.credential_ref_id);if(!ref)throw new Error(`unknown lifecycle credential:${rule.credential_ref_id}`);
    const o=observations?.credential_refs?.[rule.credential_ref_id]??{};let status='HOLD_NO_OBSERVATION',usable=false,expires_at=null,ttl_seconds=null;
    if(rule.health_mode==='PROVIDER_MANAGED_EPHEMERAL'){status='HEALTHY_PROVIDER_MANAGED';usable=true;}
    else if(!bool(o.present)){status='HOLD_MISSING_REFERENCE';}
    else if(rule.health_mode==='PRESENCE_ONLY'){status='PRESENT_LIFECYCLE_PARTIAL';usable=true;}
    else if(rule.health_mode==='JWT_EXPIRY_METADATA'){
      const exp=Number(o.exp_unix);
      if(!Number.isInteger(exp)||exp<=0){status='HOLD_INVALID_EXPIRY_METADATA';}
      else {ttl_seconds=exp-nowSec;expires_at=new Date(exp*1000).toISOString();if(ttl_seconds<=0)status='HOLD_EXPIRED';else if(ttl_seconds<=Number(p.near_expiry_seconds)) {status='DEGRADED_NEAR_EXPIRY';usable=true;} else {status='HEALTHY_VALID_UNTIL';usable=true;}}
    }
    rows[rule.credential_ref_id]={credential_ref_id:rule.credential_ref_id,criticality:rule.criticality,health_mode:rule.health_mode,status,usable,observed_at:at,expires_at,ttl_seconds,secret_value_observed:false};
  }
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_IAM001_CREDENTIAL_LIFECYCLE_REPORT',company_id:'fenix',engine_id:'IAM-001',observed_at:at,credential_health:rows,holds:Object.values(rows).filter(x=>x.status.startsWith('HOLD_')).map(x=>x.credential_ref_id),human_required:null});
}

export function evaluateBrowserAttestation(attestation,{now=new Date().toISOString(),policy=null}={}){
  const p=policy??loadLifecyclePolicy();const cfg=p.browser_attestation;const base={status:cfg.missing_or_stale_decision,environment:'PREPROD',device_id_hash:null,profile_id_hash:null,paired:false,online:false,kill_switch_enabled:true,cloud_transport_status:'UNKNOWN',chrome_running:false,attested_at:null,human_required:null};
  if(!attestation)return safe(base);
  const forbidden=secretPath(attestation);if(forbidden)throw new Error(`raw credential material forbidden:${forbidden}`);
  if(!cfg.allowed_environments.includes(attestation.environment))return safe({...base,status:'HOLD_BROWSER_ENVIRONMENT_DENIED',environment:String(attestation.environment??'UNKNOWN')});
  const attestedAt=iso(attestation.attested_at);const age=Math.floor((Date.parse(now)-Date.parse(attestedAt))/1000);
  const good=age>=0&&age<=cfg.max_attestation_age_seconds&&bool(attestation.paired)&&bool(attestation.online)&&bool(attestation.kill_switch_enabled)&&attestation.cloud_transport_status==='ONLINE'&&bool(attestation.chrome_running);
  return safe({status:good?'BROWSER_SESSION_BINDING_HEALTHY':cfg.missing_or_stale_decision,environment:attestation.environment,device_id_hash:attestation.device_id?hash(attestation.device_id):null,profile_id_hash:attestation.profile_id?hash(attestation.profile_id):null,paired:bool(attestation.paired),online:bool(attestation.online),kill_switch_enabled:bool(attestation.kill_switch_enabled),cloud_transport_status:String(attestation.cloud_transport_status??'UNKNOWN'),chrome_running:bool(attestation.chrome_running),attested_at:attestedAt,age_seconds:age,human_required:null});
}

export function buildLifecycleState({previous_state,observations,browser_attestation=null,source_run_id=null,now=new Date().toISOString()}={}){
  const prev=previous_state??{};if(prev.prod_authorized===true||prev.prod_write_authorized===true||prev.trading_access===true||prev.multicompany_continuation===true)throw new Error('previous lifecycle state authority drift');
  const credentials=evaluateCredentialLifecycle(observations,{now});const browser=evaluateBrowserAttestation(browser_attestation,{now});
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_IAM001_LIFECYCLE_STATE',company_id:'fenix',engine_id:'IAM-001',environment:'CONTROL_PLANE',version:'0.1.0',updated_at:new Date(now).toISOString(),last_source_run_id:Number.isInteger(Number(source_run_id))?Number(source_run_id):null,credential_health:credentials.credential_health,browser_session_binding:browser,disabled_credential_refs:Array.isArray(prev.disabled_credential_refs)?prev.disabled_credential_refs:[],disabled_connector_ids:Array.isArray(prev.disabled_connector_ids)?prev.disabled_connector_ids:[],disabled_identity_ids:Array.isArray(prev.disabled_identity_ids)?prev.disabled_identity_ids:[],contains_secret_values:false});
}

export function lifecycleUseDecision({credential_ref_id,state}={}){
  if((state?.disabled_credential_refs??[]).includes(credential_ref_id))return safe({ok:false,decision:'DENY_KILL_SWITCH_DISABLED',credential_ref_id,human_required:null});
  const h=state?.credential_health?.[credential_ref_id];if(!h)return safe({ok:false,decision:'HOLD_NO_LIFECYCLE_EVIDENCE',credential_ref_id,human_required:null});
  if(!h.usable)return safe({ok:false,decision:h.status,credential_ref_id,human_required:null});
  return safe({ok:true,decision:h.status==='DEGRADED_NEAR_EXPIRY'?'ALLOW_CURRENT_USE_ROTATION_DUE':'ALLOW_REGISTERED_REFERENCE_USE',credential_ref_id,health_status:h.status,human_required:null});
}

export const IAM001_LIFECYCLE_CONTRACT=Object.freeze({engine_id:'IAM-001',state_branch:'cerebro-iam001-lifecycle-state-v0',secret_values_allowed:false,expired_or_missing:'HOLD_CONSUMER_LOCAL',human_notification:false,browser_real_binding_requires_fresh_attestation:true,browser_environments:['LAB','PREPROD'],captcha_bypass:false,mfa_bypass:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'EXECUTION_MODEL_ROUTER_ZERO_COST_V0'});
