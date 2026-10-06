import fs from 'node:fs';
import path from 'node:path';

const ROUTE_RANK=Object.freeze({deterministic:0,local_model:1,existing_provider:2,free_tier:3,self_hosted:4,cheap_external:5,paid_provider:6});
const HUMAN_REASONS=new Set(['LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT']);

function eligibleRoute(route){
  if(!route||typeof route!=='object') return false;
  if(route.kind!=='MODEL_INFERENCE'||route.behavioral_inference!==true) return false;
  if(route.online!==true||route.own_server_required!==false) return false;
  if(route.additional_cost_eur!==0) return false;
  if(route.availability_state==='RETIRED'||route.availability_state==='UNAVAILABLE') return false;
  if(route.credential_state!=='READY') return false;
  if(route.eligible_for_behavioral_inference!==true) return false;
  if(!Object.hasOwn(ROUTE_RANK,route.route_type)) return false;
  return true;
}

export function auditZeroCostBehavioralRoute(providerEvidence,oldVsNew,{allowSyntheticOnly=true}={}){
  if(!providerEvidence||typeof providerEvidence!=='object') throw new TypeError('providerEvidence required');
  if(!oldVsNew||typeof oldVsNew!=='object') throw new TypeError('oldVsNew required');
  if(typeof allowSyntheticOnly!=='boolean') throw new TypeError('allowSyntheticOnly must be boolean');
  const packages=oldVsNew.packages??[];
  const routes=providerEvidence.routes??[];
  const retired=routes.filter(x=>x.availability_state==='RETIRED').map(x=>x.provider_id);
  const freeCandidates=routes.filter(x=>x.kind==='MODEL_INFERENCE'&&x.additional_cost_eur===0&&x.availability_state!=='RETIRED');
  const ready=freeCandidates.filter(eligibleRoute).sort((a,b)=>(ROUTE_RANK[a.route_type]??99)-(ROUTE_RANK[b.route_type]??99)||a.provider_id.localeCompare(b.provider_id));
  const unbound=freeCandidates.filter(x=>x.credential_state!=='READY').map(x=>({provider_id:x.provider_id,credential_state:x.credential_state,data_policy_state:x.data_policy_state,quota_guard:x.quota_guard??null}));
  const paid=routes.filter(x=>Number(x.additional_cost_eur)>0||x.route_type==='paid_provider');
  let status='READY_ZERO_COST_ROUTE';
  let selected=ready[0]??null;
  let human_required=null;
  let reason='ZERO_COST_ROUTE_VERIFIED';
  if(packages.length===0){status='NO_BEHAVIORAL_PACKAGES';selected=null;reason='NO_STATIC_LAB_GREEN_CANDIDATES';}
  else if(!selected){
    status='BLOCKED_ZERO_COST_ROUTE_NOT_BOUND';
    reason=unbound.length?'ZERO_COST_INFERENCE_EXISTS_BUT_CREDENTIAL_OR_POLICY_BINDING_MISSING':'NO_VERIFIED_ZERO_COST_INFERENCE_ROUTE';
    if(!unbound.length&&paid.length){human_required='MONEY_LIMIT';reason='ONLY_PAID_ROUTE_AVAILABLE';}
  }
  if(human_required&&!HUMAN_REASONS.has(human_required)) throw new Error('unsupported HUMAN_REQUIRED reason');
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'ROUTE_AUDIT_ONLY',
    packages_waiting:packages.length,
    status,
    reason,
    selected_route:selected?{provider_id:selected.provider_id,route_type:selected.route_type,additional_cost_eur:selected.additional_cost_eur,data_policy_state:selected.data_policy_state,quota_guard:selected.quota_guard??null}:null,
    retired_routes:retired,
    unbound_zero_cost_candidates:unbound,
    paid_routes_seen:paid.map(x=>x.provider_id),
    synthetic_only:allowSyntheticOnly,
    own_server_required:false,
    additional_cost_target_eur:0,
    human_required,
    inference_executed:false,
    prod_authorized:false,
    promotion_authorized:false
  });
}

export function bindProviderEvidence(providerEvidence,{provider_id,credential_ready=false,policy_green=false,free_quota_guarded=false}={}){
  if(!provider_id) throw new TypeError('provider_id required');
  for(const label of ['credential_ready','policy_green','free_quota_guarded']) if(typeof ({credential_ready,policy_green,free_quota_guarded})[label]!=='boolean') throw new TypeError(`${label} must be boolean`);
  const clone=structuredClone(providerEvidence);
  const route=(clone.routes??[]).find(x=>x.provider_id===provider_id);
  if(!route) throw new Error('provider not found');
  if(route.availability_state==='RETIRED') throw new Error('retired provider cannot be bound');
  route.credential_state=credential_ready?'READY':'UNBOUND';
  const syntheticSafe=route.data_policy_state==='SYNTHETIC_ONLY_BY_DEFAULT'||route.data_policy_state==='NOT_APPLICABLE'||policy_green;
  const quotaSafe=route.additional_cost_eur===0&&free_quota_guarded;
  route.eligible_for_behavioral_inference=Boolean(credential_ready&&syntheticSafe&&quotaSafe&&route.behavioral_inference===true&&route.online===true&&route.own_server_required===false);
  return clone;
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const providers=JSON.parse(fs.readFileSync(argValue('--providers')??'cerebro/skills/zero-cost-provider-evidence.v0.json','utf8'));
  const oldnew=JSON.parse(fs.readFileSync(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-p0.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-zero-cost-route.json';
  const report=auditZeroCostBehavioralRoute(providers,oldnew);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,reason:report.reason,packages_waiting:report.packages_waiting,selected_route:report.selected_route,unbound_zero_cost_candidates:report.unbound_zero_cost_candidates.map(x=>x.provider_id),retired_routes:report.retired_routes,inference_executed:false,prod_authorized:false}));
}
