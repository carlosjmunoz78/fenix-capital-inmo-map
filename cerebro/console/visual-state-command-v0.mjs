function req(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim()}
function safeRegistry(registry){if(!registry||!Array.isArray(registry.engine_ids))throw new Error('engine registry required');if(registry.engine_ids.length!==registry.count)throw new Error('engine registry count mismatch');return registry}
function safeReality(reality){if(!reality||reality.state_type!=='CEREBRO_ENGINE_REALITY_RECONCILIATION_V0')throw new Error('reconciliation required');if(reality.prod_authorized!==false||Number(reality.additional_cost_eur)!==0)throw new Error('reconciliation authority mismatch');return reality}
function indexActivity(eventProjection){const map=new Map();if(!eventProjection)return map;if(eventProjection.state_type!=='CEREBRO_LIVE_EVENT_PROJECTION_V0')throw new Error('event projection invalid');for(const e of eventProjection.events??[]){if(e.truth_class!=='REAL_EVIDENCE')continue;const prior=map.get(e.engine_id);if(!prior||String(e.occurred_at??e.observed_at).localeCompare(String(prior.occurred_at??prior.observed_at))>=0)map.set(e.engine_id,e)}return map}

export function buildVisualStateSnapshot({registry,reconciliation,event_projection=null,company_id='fenix',environment='PREPROD',version='0.1.0',observed_at}){
  const reg=safeRegistry(registry),rec=safeReality(reconciliation),cid=req(company_id,'company_id'),env=req(environment,'environment'),ver=req(version,'version');
  if(env!=='PREPROD')throw new Error('visual state snapshot is PREPROD only');
  const at=new Date(req(observed_at,'observed_at'));if(Number.isNaN(at.getTime()))throw new Error('observed_at invalid');
  const overrides=new Map((rec.evidence_overrides??[]).map(x=>[x.engine_id,x]));
  const activity=indexActivity(event_projection);
  const engines=reg.engine_ids.map(engine_id=>{const o=overrides.get(engine_id),ev=activity.get(engine_id);return Object.freeze({
    company_id:cid,engine_id,environment:env,version:ver,
    evidence_state:o?.state??rec.registry_default_state??'UNKNOWN_REQUIRES_AUDIT',
    live_connected:o?Boolean(o.live_connected):false,
    live_activity:Boolean(ev),
    health_state:'NOT_PROVEN',
    current_job:null,
    current_job_state:'NOT_PROVEN',
    last_event:ev?Object.freeze({event_id:ev.event_id,event_type:ev.event_type,occurred_at:ev.occurred_at??ev.observed_at,truth_class:ev.truth_class,evidence_ref:ev.evidence_ref}):null,
    artifact_ids:Object.freeze([]),
    artifact_state:'NOT_PROVEN',
    confidence:null,
    updated_at:at.toISOString(),
    prod_authorized:false
  })});
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_VISUAL_STATE_SNAPSHOT_V0',company_id:cid,environment:env,version:ver,observed_at:at.toISOString(),canonical_engine_count:engines.length,live_active_engine_count:engines.filter(e=>e.live_activity).length,engines:Object.freeze(engines),verified_dependency_edges:Object.freeze((rec.verified_dependency_edges??[]).map(e=>Object.freeze([...e]))),noncanonical_candidates:Object.freeze((rec.noncanonical_candidates??[]).map(x=>Object.freeze({...x}))),truth_contract:Object.freeze({unknown_is_not_green:true,synthetic_does_not_mark_live:true,missing_job_is_not_idle:true,missing_artifact_is_not_empty_proof:true}),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})
}

export function registerVisualStateCommand({gateway,registry,reconciliation,getEventProjection=()=>null,command='visual.snapshot',clock=()=>new Date()}){
  if(!gateway||typeof gateway.registerCommand!=='function')throw new Error('CEREBRO Gateway required');if(typeof getEventProjection!=='function')throw new Error('getEventProjection function required');if(typeof clock!=='function')throw new Error('clock function required');const name=req(command,'command');
  gateway.registerCommand(name,async({context})=>buildVisualStateSnapshot({registry,reconciliation,event_projection:await getEventProjection(context),company_id:context.company_id,environment:context.environment,version:context.version,observed_at:clock().toISOString()}));
  return Object.freeze({status:'REGISTERED',command:name,gateway_required:true,direct_model_access:false,read_only:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})
}

export const VISUAL_STATE_COMMAND_V0_CONTRACT=Object.freeze({command:'visual.snapshot',gateway_required:true,direct_model_access:false,read_only:true,environment:'PREPROD',unknown_is_not_green:true,synthetic_does_not_mark_live:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
