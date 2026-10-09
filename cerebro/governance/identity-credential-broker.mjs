import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_IDENTITY_REGISTRY=path.resolve(HERE,'../registry/identity-access-registry.v0.json');
const DEFAULT_CREDENTIAL_REGISTRY=path.resolve(HERE,'../registry/credential-reference-registry.v0.json');
const DEFAULT_CONNECTOR_REGISTRY=path.resolve(HERE,'../registry/connector-auth-registry.v0.json');
const DEFAULT_ENGINE_REGISTRY=path.resolve(HERE,'../registry/engine-registry.seed.json');

const SECRET_VALUE_KEYS=new Set(['value','secret','password','token','api_key','apikey','credential','credential_value','jwt','private_key','refresh_token','access_token']);
const RAW_SECRET_PATTERNS=[/\beyJ[A-Za-z0-9_-]{12,}\./,/\bsb_secret_[A-Za-z0-9_-]{8,}/,/\bAIza[A-Za-z0-9_-]{12,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];

function readJson(file,label){let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){throw new Error(`${label} unreadable:${error.message}`);}if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} invalid`);return value;}
function req(v,label,max=300){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const x=v.trim();if(x.length>max)throw new Error(`${label} too long`);return x;}
function frozen(v){return Object.freeze({...v,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_eur:0});}
function hasRawSecret(value,pathLabel='root'){
  if(value==null)return null;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++){const found=hasRawSecret(value[i],`${pathLabel}[${i}]`);if(found)return found;}return null;}
  if(typeof value==='object'){
    for(const [key,child] of Object.entries(value)){
      if(SECRET_VALUE_KEYS.has(key.toLowerCase()))return `${pathLabel}.${key}`;
      const found=hasRawSecret(child,`${pathLabel}.${key}`);if(found)return found;
    }
    return null;
  }
  if(typeof value==='string'&&RAW_SECRET_PATTERNS.some(re=>re.test(value)))return pathLabel;
  return null;
}
function assertSafety(root,label){
  if(root.company_id!=='fenix'||root.engine_id!=='IAM-001')throw new Error(`${label} identity drift`);
  if(root.prod_authorized!==false||root.prod_write_authorized!==false||root.trading_access!==false||root.multicompany_continuation!==false||Number(root.additional_cost_eur)!==0)throw new Error(`${label} authority/cost drift`);
  const secretPath=hasRawSecret(root);if(secretPath)throw new Error(`${label} contains forbidden secret-value field/material at ${secretPath}`);
}

export function loadIdentityCredentialFoundation({identity_registry_path=DEFAULT_IDENTITY_REGISTRY,credential_registry_path=DEFAULT_CREDENTIAL_REGISTRY,connector_registry_path=DEFAULT_CONNECTOR_REGISTRY,engine_registry_path=DEFAULT_ENGINE_REGISTRY}={}){
  const identity=readJson(identity_registry_path,'identity registry');
  const credentials=readJson(credential_registry_path,'credential registry');
  const connectors=readJson(connector_registry_path,'connector registry');
  const engines=readJson(engine_registry_path,'engine registry');
  if(!Array.isArray(engines.engine_ids)||!engines.engine_ids.includes('IAM-001'))throw new Error('IAM-001 missing from canonical engine registry');
  assertSafety(identity,'identity registry');assertSafety(credentials,'credential registry');assertSafety(connectors,'connector registry');
  if(identity.default_decision!=='DENY_UNREGISTERED_IDENTITY')throw new Error('identity registry default must deny');
  if(credentials.default_decision!=='DENY_UNREGISTERED_CREDENTIAL_REFERENCE')throw new Error('credential registry default must deny');
  if(connectors.default_decision!=='DENY_UNREGISTERED_CONNECTOR_AUTH')throw new Error('connector registry default must deny');
  if(credentials.invariants?.registry_contains_secret_values!==false||credentials.invariants?.runtime_values_never_returned_by_broker_metadata_api!==true)throw new Error('credential registry secret invariants missing');
  if(connectors.invariants?.browser_is_fallback_only!==true||connectors.invariants?.captcha_bypass_allowed!==false||connectors.invariants?.mfa_bypass_allowed!==false)throw new Error('connector browser safety drift');
  const refs=new Map((credentials.references??[]).map(x=>[x.credential_ref_id,x]));
  const ids=new Map((identity.identities??[]).map(x=>[x.identity_id,x]));
  const conns=new Map((connectors.connectors??[]).map(x=>[x.connector_id,x]));
  if(refs.size!==(credentials.references??[]).length||ids.size!==(identity.identities??[]).length||conns.size!==(connectors.connectors??[]).length)throw new Error('duplicate IAM registry id');
  for(const item of identity.identities??[]){for(const ref of item.credential_ref_ids??[]){if(!refs.has(ref))throw new Error(`identity ${item.identity_id} references unknown credential ${ref}`);}}
  for(const item of connectors.connectors??[]){if(!ids.has(item.identity_id))throw new Error(`connector ${item.connector_id} references unknown identity`);for(const ref of item.credential_ref_ids??[]){if(!refs.has(ref))throw new Error(`connector ${item.connector_id} references unknown credential ${ref}`);}}
  return frozen({identity,credentials,connectors,identity_count:ids.size,credential_ref_count:refs.size,connector_count:conns.size});
}

export function credentialReferenceDecision({credential_ref_id,consumer,environment,foundation=null}={}){
  const f=foundation??loadIdentityCredentialFoundation();
  const id=req(credential_ref_id,'credential_ref_id');const who=req(consumer,'consumer');const env=req(environment,'environment');
  const ref=(f.credentials.references??[]).find(x=>x.credential_ref_id===id);
  if(!ref)return frozen({ok:false,decision:'DENY_UNREGISTERED_CREDENTIAL_REFERENCE',credential_ref_id:id,consumer:who,environment:env,human_required:null});
  if(!(ref.allowed_consumers??[]).includes(who))return frozen({ok:false,decision:'DENY_CONSUMER_SCOPE_MISMATCH',credential_ref_id:id,consumer:who,environment:env,human_required:null});
  if(!(ref.allowed_environments??[]).includes(env))return frozen({ok:false,decision:'DENY_ENVIRONMENT_SCOPE_MISMATCH',credential_ref_id:id,consumer:who,environment:env,human_required:null});
  const lifecycleGap=String(ref.audit_state??'').includes('LIFECYCLE_GAP')||String(ref.expiry_state??'').startsWith('POR_AUDITAR')||String(ref.revocation_state??'').startsWith('POR_AUDITAR');
  return frozen({
    ok:true,decision:lifecycleGap?'REFERENCE_REGISTERED_LIFECYCLE_PARTIAL':'REFERENCE_REGISTERED',credential_ref_id:id,provider:ref.provider,credential_class:ref.credential_class,
    secret_store:ref.secret_store,symbolic_name:ref.symbolic_name,consumer:who,environment:env,lifecycle_audit_required:lifecycleGap,
    injection_contract:'RUNTIME_INJECTION_FROM_EXISTING_SECRET_STORE_ONLY',secret_value_returned:false,value_may_be_persisted:false,value_may_be_logged:false,human_required:null
  });
}

export function connectorAuthDecision({connector_id,environment,foundation=null}={}){
  const f=foundation??loadIdentityCredentialFoundation();const id=req(connector_id,'connector_id');const env=req(environment,'environment');
  const c=(f.connectors.connectors??[]).find(x=>x.connector_id===id);
  if(!c)return frozen({ok:false,decision:'DENY_UNREGISTERED_CONNECTOR_AUTH',connector_id:id,environment:env,human_required:null});
  if(!(c.environments??[]).includes(env))return frozen({ok:false,decision:'DENY_CONNECTOR_ENVIRONMENT_MISMATCH',connector_id:id,environment:env,human_required:null});
  if(c.integration_class==='BROWSER_COMPUTER_USE'&&c.real_execution_state!=='EXISTING')return frozen({ok:false,decision:'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT',connector_id:id,environment:env,human_required:null,browser_fallback:true});
  return frozen({ok:true,decision:'CONNECTOR_AUTH_METADATA_RESOLVED',connector_id:id,provider:c.provider,auth_mode:c.auth_mode,identity_id:c.identity_id,credential_ref_ids:Object.freeze([...(c.credential_ref_ids??[])]),integration_class:c.integration_class,browser_fallback:c.browser_fallback===true,secret_values_returned:false,human_required:null});
}

export function identityCredentialAuditSummary({foundation=null}={}){
  const f=foundation??loadIdentityCredentialFoundation();
  const refs=f.credentials.references??[];const ids=f.identity.identities??[];const conns=f.connectors.connectors??[];
  const lifecyclePartial=refs.filter(x=>String(x.audit_state??'').includes('PARTIAL')||String(x.rotation_state??'').startsWith('POR_AUDITAR')||String(x.expiry_state??'').startsWith('POR_AUDITAR')||String(x.revocation_state??'').startsWith('POR_AUDITAR'));
  const browser=conns.find(x=>x.integration_class==='BROWSER_COMPUTER_USE')??null;
  return frozen({
    status:'IAM_FOUNDATION_AUDITED_FAIL_CLOSED',company_id:'fenix',engine_id:'IAM-001',identity_count:ids.length,credential_ref_count:refs.length,connector_count:conns.length,
    lifecycle_partial_ref_ids:Object.freeze(lifecyclePartial.map(x=>x.credential_ref_id).sort()),browser_real_binding_state:browser?.audit_state??'NOT_REGISTERED',
    secret_values_registered:false,new_paid_vault_required:false,storage_strategy:f.credentials.storage_strategy,
    next_gate:'IAM001_LIFECYCLE_AND_REAL_SESSION_BINDING_V0'
  });
}

export const IDENTITY_CREDENTIAL_BROKER_V0_CONTRACT=Object.freeze({
  engine_id:'IAM-001',company_id:'fenix',mode:'METADATA_AND_REFERENCE_BROKER_FOUNDATION',default_unknown:'DENY',runtime_secret_resolution:'EXISTING_SECRET_STORE_INJECTION_ONLY',
  secret_values_in_registry:false,secret_values_returned:false,browser_is_fallback_only:true,captcha_bypass_allowed:false,mfa_bypass_allowed:false,new_paid_vault_required:false,
  prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_continuation:false,additional_cost_target_eur:0,next_gate:'IAM001_LIFECYCLE_AND_REAL_SESSION_BINDING_V0'
});
