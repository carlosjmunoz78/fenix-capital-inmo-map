export const FREE_RESOURCE_BROKER_CONTRACT=Object.freeze({
  engine_id:'FREE-001',
  environments:['LAB','PREPROD'],
  additional_cost_target_eur:0,
  deterministic:true,
  priority:['LOCAL','EXISTING_VM','GITHUB_ACTIONS','FREE_TIER','PAID_EXCEPTION'],
  trading_reuse_forbidden:true,
  paid_requires_human:true,
  audit_required:true
});

function req(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function normalizeResource(r={}){
  const kind=req(r.kind,'resource.kind');
  if(!FREE_RESOURCE_BROKER_CONTRACT.priority.includes(kind))throw new Error('resource.kind invalid');
  const cost=Number(r.estimated_additional_cost_eur??0); if(!Number.isFinite(cost)||cost<0)throw new Error('resource cost invalid');
  const quota=Number(r.free_quota_remaining??Number.POSITIVE_INFINITY); if(Number.isNaN(quota)||quota<0)throw new Error('free quota invalid');
  return Object.freeze({id:req(r.id,'resource.id'),kind,cost,quota,available:r.available!==false,classification:String(r.classification||'GENERAL'),supports_sensitive:r.supports_sensitive===true,max_duration_min:Number(r.max_duration_min??Number.POSITIVE_INFINITY)});
}

export function selectZeroCostResource({context,job,resources=[]}={}){
  if(!context||typeof context!=='object'||Array.isArray(context))throw new Error('context required');
  for(const k of ['company_id','engine_id','environment','version'])req(context[k],`context.${k}`);
  if(!FREE_RESOURCE_BROKER_CONTRACT.environments.includes(context.environment))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',detail:'environment_not_allowed',executed:false});
  if(context.engine_id==='LAB-TRD')return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'trading_isolation',executed:false});
  const duration=Number(job?.duration_min??0); if(!Number.isFinite(duration)||duration<0)throw new Error('job.duration_min invalid');
  const sensitive=job?.sensitive===true;
  const normalized=resources.map(normalizeResource);
  const eligible=normalized.filter(r=>r.available&&r.cost===0&&r.quota>0&&r.max_duration_min>=duration&&r.classification!=='TRADING'&&(!sensitive||r.supports_sensitive));
  eligible.sort((a,b)=>FREE_RESOURCE_BROKER_CONTRACT.priority.indexOf(a.kind)-FREE_RESOURCE_BROKER_CONTRACT.priority.indexOf(b.kind)||a.id.localeCompare(b.id));
  if(eligible[0])return Object.freeze({status:'GREEN',decision:'ZERO_COST_RESOURCE_SELECTED',engine_id:'FREE-001',resource:eligible[0],estimated_additional_cost_eur:0,audit_required:true,executed:false});
  const paid=normalized.filter(r=>r.available&&r.cost>0&&r.classification!=='TRADING'&&r.max_duration_min>=duration&&(!sensitive||r.supports_sensitive)).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));
  if(paid[0])return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',detail:'paid_resource_only',candidate:paid[0],executed:false,audit_required:true});
  return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',detail:'no_eligible_resource',executed:false,audit_required:true});
}
