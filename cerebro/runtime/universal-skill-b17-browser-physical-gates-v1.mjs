import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateBrowserAttestation} from '../governance/identity-session-lifecycle.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REGISTRY=path.resolve(HERE,'../registry');
const MAX_ACTION_AGE_SECONDS=900;
const ALLOWED_ACTION_KEYS=new Set([
  'environment','route_class','operation_kind','success','bounded','fail_closed',
  'kill_switch_observed','prod_mutation','public_mutation','trading_access',
  'customer_data_used','incremental_cost_eur','observed_at','binding_status'
]);

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function safeAuthority(){return Object.freeze({
  prod_authorized:false,prod_write_authorized:false,public_deploy_authorized:false,
  auto_merge_authorized:false,arbitrary_shell_authorized:false,customer_data_authorized:false,
  trading_access:false,external_dependency_install_authorized:false,additional_cost_eur:0
});}
function iso(value){
  const t=Date.parse(value);
  if(Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}
function ageSeconds(observedAt,now){
  const a=Date.parse(observedAt);const b=Date.parse(now);
  if(Number.isNaN(a)||Number.isNaN(b)) return null;
  return Math.floor((b-a)/1000);
}
function configTruth(){
  const browserPolicy=readJson(path.join(REGISTRY,'browser-transversal-autonomy-policy.v1.json'));
  const deviceProfile=readJson(path.join(REGISTRY,'authorized-execution-device-profile.v1.json'));
  const physicalAudit=readJson(path.join(REGISTRY,'physical-adapter-audit-v1.json'));
  const item43=deviceProfile.items?.['43'];
  const item48=deviceProfile.items?.['48'];
  const physicalDomain=(physicalAudit.domains??[]).find(x=>x.id==='IAM_BROWSER_VAULT_PHYSICAL');
  const checks={
    browser_is_transversal_tool:browserPolicy.browser_is_tool_not_authority===true,
    browser_policy_not_prod_authority:(browserPolicy.browser_never_grants??[]).includes('PROD_WRITE_BY_ITSELF'),
    fresh_attestation_required:browserPolicy.physical_resource_policy?.fresh_binding_attestation_required_at_execution_time===true,
    kill_switch_required:browserPolicy.physical_resource_policy?.kill_switch_required===true,
    browser_bridge_not_falsely_full:item43?.status==='PARCIAL',
    android_worker_not_falsely_full:item48?.status==='DEFINIDO',
    historical_audit_keeps_physical_gate_open:physicalDomain?.state==='PARCIAL_PHYSICAL_ATTESTATION_REQUIRED' && (physicalDomain?.open_gates??[]).includes('FRESH_AUTHORIZED_BROWSER_BRIDGE_ATTESTATION'),
    duplicate_browser_provider_not_required:deviceProfile.profile_kind==='TRANSVERSAL_POLICY_PROFILE_NOT_NEW_ENGINE'
  };
  return {checks,green:Object.values(checks).every(Boolean)};
}
function evaluateActionObservation(observation,{now}){
  const base={valid:false,status:'MISSING_PHYSICAL_ACTION_OBSERVATION',age_seconds:null,observed_at:null};
  if(!observation) return base;
  if(typeof observation!=='object'||Array.isArray(observation)) return {...base,status:'INVALID_PHYSICAL_ACTION_OBSERVATION'};
  const extra=Object.keys(observation).filter(k=>!ALLOWED_ACTION_KEYS.has(k));
  if(extra.length) return {...base,status:'UNSUPPORTED_OR_SENSITIVE_ACTION_EVIDENCE_FIELDS',unsupported_fields:extra.sort()};
  const observedAt=iso(observation.observed_at);
  const age=observedAt?ageSeconds(observedAt,now):null;
  const environment=String(observation.environment??'').toUpperCase();
  const operation=String(observation.operation_kind??'').toUpperCase();
  const cost=Number(observation.incremental_cost_eur??0);
  const valid=
    ['LAB','PREPROD'].includes(environment)&&
    observation.route_class==='BROWSER_BRIDGE'&&
    ['OBSERVE','AUTHENTICATED_OBSERVE'].includes(operation)&&
    observation.success===true&&observation.bounded===true&&observation.fail_closed===true&&
    observation.kill_switch_observed===true&&observation.prod_mutation===false&&
    observation.public_mutation===false&&observation.trading_access===false&&
    observation.customer_data_used===false&&cost===0&&
    observation.binding_status==='BROWSER_SESSION_BINDING_HEALTHY'&&
    age!==null&&age>=0&&age<=MAX_ACTION_AGE_SECONDS;
  return {
    valid,
    status:valid?'PHYSICAL_ACTION_OBSERVATION_HEALTHY':'PHYSICAL_ACTION_OBSERVATION_NOT_ACCEPTABLE',
    environment,operation_kind:operation,age_seconds:age,observed_at:observedAt
  };
}

export function evaluateB17BrowserPhysicalGates({browser_attestation=null,action_observation=null}={}, {now=new Date().toISOString()}={}){
  const config=configTruth();
  const attestation=evaluateBrowserAttestation(browser_attestation,{now});
  const action=evaluateActionObservation(action_observation,{now});
  const physicalBinding=attestation.status==='BROWSER_SESSION_BINDING_HEALTHY';
  const full=config.green&&physicalBinding&&action.valid;
  const residuals=[];
  if(!config.green) residuals.push('B17_CONFIG_CONTRACT_DRIFT');
  if(!physicalBinding) residuals.push('FRESH_AUTHORIZED_BROWSER_BRIDGE_ATTESTATION');
  if(!action.valid) residuals.push('BOUNDED_BROWSER_BRIDGE_ACTION_OBSERVATION');
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_B17_BROWSER_PHYSICAL_GATES_V1',
    company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'v1',
    configuration_gate:config.green?'HECHO':'DRIFT',configuration_checks:Object.freeze(config.checks),
    browser_binding_status:attestation.status,browser_binding_fresh:physicalBinding,
    action_observation_status:action.status,action_observation_valid:action.valid,
    terminal_state:full?'FULL_REAL':'BLOCKED_EXTERNAL',
    activation_state:full?'FULL_SAFE_PREPROD':'PHYSICAL_EVIDENCE_PENDING',
    physical_evidence_current:full,human_required:null,
    residuals:Object.freeze([...new Set(residuals)]),
    no_duplicate_browser_provider:true,config_only_proof_forbidden:true,
    authority:safeAuthority()
  });
}

export function loadB17EvidenceFile(file){
  if(!file) return {browser_attestation:null,action_observation:null,evidence_source:'NONE'};
  const resolved=path.resolve(file);
  const parsed=readJson(resolved);
  return {browser_attestation:parsed.browser_attestation??null,action_observation:parsed.action_observation??null,evidence_source:resolved};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const evidence=loadB17EvidenceFile(process.env.CEREBRO_B17_EVIDENCE_PATH??null);
  const report=evaluateB17BrowserPhysicalGates(evidence,{now:process.env.CEREBRO_B17_NOW??new Date().toISOString()});
  process.stdout.write(`${JSON.stringify({...report,evidence_source:evidence.evidence_source},null,2)}\n`);
}
