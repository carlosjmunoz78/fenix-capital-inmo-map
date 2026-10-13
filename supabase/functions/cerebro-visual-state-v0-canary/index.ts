import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SLUG="cerebro-visual-state-v0-canary";
const PROJECT_REF="cluhljgonannaafpmblx";
const UPSTREAM=`https://${PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-v0`;
const EVIDENCE_SHA="8a2d6b18a7e5f084a1f97390aa4e0094fc223ecc";
const RAW=`https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/${EVIDENCE_SHA}`;
const REGISTRY_URL=`${RAW}/cerebro/registry/engine-registry.v1.json`;
const REALITY_URL=`${RAW}/lab/cerebro-visual/ENGINE_REALITY_RECONCILIATION_V0_2026-10-13.json`;
const ALLOWED_ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);

type Registry={count:number;engine_ids:string[]};
type EvidenceOverride={engine_id:string;state:string;live_connected?:boolean;evidence?:string[]};
type Reality={state_type:string;registry_default_state:string;prod_authorized:boolean;additional_cost_eur:number;evidence_overrides:EvidenceOverride[];verified_dependency_edges:string[][];noncanonical_candidates?:unknown[]};

function cors(origin:string|null){const h:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin","x-cerebro-visual-state":"v0-canary"};if(origin&&ALLOWED_ORIGINS.has(origin))h["access-control-allow-origin"]=origin;return h}
function json(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get("origin"))})}
function authHeaders(req:Request){const h=new Headers();for(const name of ["authorization","apikey","x-client-info","origin"]){const v=req.headers.get(name);if(v)h.set(name,v)}return h}
function suffix(req:Request){const u=new URL(req.url),marker=`/${SLUG}`,i=u.pathname.indexOf(marker);return i>=0?(u.pathname.slice(i+marker.length)||"/"):u.pathname}
async function readJson<T>(url:string):Promise<T>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`SOURCE_UNAVAILABLE:${r.status}`);return await r.json() as T}
async function evidenceSources(){const [registry,reality]=await Promise.all([readJson<Registry>(REGISTRY_URL),readJson<Reality>(REALITY_URL)]);if(registry.count!==179||!Array.isArray(registry.engine_ids)||registry.engine_ids.length!==179)throw new Error("REGISTRY_COUNT_MISMATCH");if(reality.state_type!=="CEREBRO_ENGINE_REALITY_RECONCILIATION_V0"||reality.prod_authorized!==false||Number(reality.additional_cost_eur)!==0)throw new Error("REALITY_CONTRACT_MISMATCH");return{registry,reality}}
async function upstreamHealth(req:Request){const r=await fetch(`${UPSTREAM}/health`,{method:"GET",headers:authHeaders(req),cache:"no-store",redirect:"manual"});const body=await r.json().catch(()=>null);return{ok:r.ok,status:r.status,body}}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin"),path=suffix(req);
  if(req.method==="OPTIONS"){
    if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info","access-control-max-age":"600","vary":"origin"}})
  }
  if(req.method!=="GET")return json(req,405,{ok:false,status:405,error:"READ_ONLY_CANARY"});
  if(path==="/health"||path==="/")return json(req,200,{ok:true,status:200,service:SLUG,environment:"LAB_PREPROD_CANARY",mode:"READ_ONLY_GATEWAY_SIDECAR",traffic_routing:false,main_gateway_mutated:false,registry_source:EVIDENCE_SHA,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
  if(path!=="/visual-state")return json(req,404,{ok:false,status:404,error:"ROUTE_NOT_AVAILABLE",available:["health","visual-state"]});

  const live=await upstreamHealth(req);
  if(!live.ok)return json(req,live.status===401||live.status===403?403:503,{ok:false,status:live.status===401||live.status===403?403:503,error:live.status===401||live.status===403?"OWNER_AUTH_REQUIRED":"UPSTREAM_GATEWAY_UNAVAILABLE",upstream_status:live.status,prod_authorized:false});
  let sources:{registry:Registry;reality:Reality};try{sources=await evidenceSources()}catch(error){return json(req,503,{ok:false,status:503,error:"EVIDENCE_SOURCE_UNAVAILABLE",detail:String(error instanceof Error?error.message:error),prod_authorized:false})}
  const now=new Date().toISOString(),overrides=new Map(sources.reality.evidence_overrides.map(x=>[x.engine_id,x]));
  const engines=sources.registry.engine_ids.map(engine_id=>{const o=overrides.get(engine_id),isGateway=engine_id==="CONSOLE-001";return{
    company_id:"fenix",engine_id,environment:"LAB_PREPROD",version:"visual-state-v0",
    evidence_state:o?.state??sources.reality.registry_default_state??"UNKNOWN_REQUIRES_AUDIT",
    live_connected:o?Boolean(o.live_connected):false,
    live_activity:isGateway,
    health_state:isGateway?"RESPONDING":"NOT_PROVEN",
    current_job:null,current_job_state:"NOT_PROVEN",
    last_event:isGateway?{event_id:`gateway-health:${now}`,event_type:"GATEWAY_HEALTH_OBSERVED",occurred_at:now,truth_class:"REAL_EVIDENCE",evidence_ref:"cerebro-console-gateway-v0/health"}:null,
    artifact_ids:[],artifact_state:"NOT_PROVEN",confidence:null,updated_at:now,prod_authorized:false
  }});
  return json(req,200,{ok:true,status:200,schema_version:"1.0.0",state_type:"CEREBRO_VISUAL_STATE_LIVE_CANARY_V0",snapshot_mode:"LIVE_GATEWAY_HEALTH_PLUS_VERSIONED_REGISTRY",company_id:"fenix",environment:"LAB_PREPROD",version:"visual-state-v0",observed_at:now,canonical_engine_count:engines.length,live_active_engine_count:1,engines,verified_dependency_edges:sources.reality.verified_dependency_edges,noncanonical_candidates:sources.reality.noncanonical_candidates??[],gateway_evidence:{service:String(live.body?.service??"cerebro-console-gateway-v0"),status:String(live.body?.status??"ok"),environment:String(live.body?.environment??"UNKNOWN"),version:String(live.body?.version??"UNKNOWN"),authenticated_transport:Boolean(live.body?.authenticated_transport),direct_model_access:Boolean(live.body?.direct_model_access),prod_execution_enabled:Boolean(live.body?.prod_execution_enabled),live_writes:Boolean(live.body?.live_writes)},truth_contract:{gateway_request_proves_gateway_response_only:true,unknown_is_not_green:true,synthetic_does_not_mark_live:true,missing_job_is_not_idle:true,missing_artifact_is_not_empty_proof:true},prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})
});
