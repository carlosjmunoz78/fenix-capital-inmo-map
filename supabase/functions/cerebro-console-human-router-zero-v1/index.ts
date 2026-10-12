import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {authorizeOidc,jwtSubjectForRouting} from './auth.ts';
import {LIVE_CANARY_PERCENT,selectRoute} from './router.ts';

const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const PREPROD_PROJECT_REF='hnqlnvakzaywtafeiybt';
const SLUG='cerebro-console-human-router-zero-v1';
const OLD=`https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-v0`;
const NEW=`https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-console-gateway-human-v1-canary`;

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-cerebro-human-router':'zero-v1'}});}
function suffix(req:Request){const u=new URL(req.url),marker=`/${SLUG}`,i=u.pathname.indexOf(marker);return {path:i>=0?(u.pathname.slice(i+marker.length)||'/'):u.pathname,search:u.search};}
function projectRef(req:Request){return new URL(req.url).hostname.split('.')[0]||'';}
function responseHeaders(upstream:Response,route:'OLD'|'NEW'){const h=new Headers(upstream.headers);h.set('cache-control','no-store');h.set('x-cerebro-human-router','zero-v1');h.set('x-cerebro-human-route',route.toLowerCase());return h;}
function cohortKey(req:Request){const explicit=req.headers.get('x-cerebro-session-id')||req.headers.get('idempotency-key');return explicit?explicit.slice(0,240):jwtSubjectForRouting(req);}

Deno.serve(async(req:Request)=>{
  const route=suffix(req),ref=projectRef(req);
  if(route.path==='/router/health'||route.path==='/router/rehearsal'){
    const auth=await authorizeOidc(req);
    if(!auth.ok)return json(403,{ok:false,status:403,error:auth.reason});
    if(req.method==='GET'&&route.path==='/router/health')return json(200,{ok:true,status:200,service:SLUG,project_ref:ref,environment:ref===PROD_PROJECT_REF?'PROD_ROUTER_ZERO_UNROUTED':ref===PREPROD_PROJECT_REF?'PREPROD_ROUTER_ZERO_TEST':'UNKNOWN_PROJECT',stable_authority:'cerebro-console-gateway-v0',candidate_overlay:'cerebro-console-gateway-human-v1-canary',live_canary_percent:LIVE_CANARY_PERCENT,consumer_routing_enabled:false,fail_closed_target:'OLD',live_upstream_called:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
    if(req.method==='POST'&&route.path==='/router/rehearsal'){
      let body:any;try{body=await req.json();}catch{return json(400,{ok:false,status:400,error:'INVALID_JSON'});}
      const requested=Number(body?.requested_percent??0);
      if(!Number.isFinite(requested)||requested<0||requested>25)return json(400,{ok:false,status:400,error:'UNSAFE_REHEARSAL_PERCENT'});
      const keys=Array.isArray(body?.cohort_keys)?body.cohort_keys.slice(0,100).map((x:unknown)=>String(x).slice(0,240)):[];
      const decisions=keys.map((key:string)=>({cohort_key:key,...selectRoute(key,requested)}));
      return json(200,{ok:true,status:200,service:SLUG,project_ref:ref,live_canary_percent:LIVE_CANARY_PERCENT,requested_rehearsal_percent:requested,decisions,safety:{synthetic_only:true,live_upstream_called:false,route_state_mutated:false,consumer_routing_enabled:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}});
    }
    return json(405,{ok:false,status:405,error:'METHOD_NOT_ALLOWED'});
  }

  if(ref!==PROD_PROJECT_REF)return json(503,{ok:false,status:503,error:'PREPROD_NORMAL_ROUTING_DISABLED',fail_closed:true,live_upstream_called:false});
  const decision=selectRoute(cohortKey(req),LIVE_CANARY_PERCENT);
  const targetBase=decision.route==='NEW'?NEW:OLD;
  const target=`${targetBase}${route.path}${route.search}`;
  const headers=new Headers(req.headers);headers.delete('host');
  const body=['GET','HEAD'].includes(req.method)?undefined:await req.arrayBuffer();
  const upstream=await fetch(target,{method:req.method,headers,body});
  const raw=await upstream.arrayBuffer();
  return new Response(raw,{status:upstream.status,headers:responseHeaders(upstream,decision.route)});
});
