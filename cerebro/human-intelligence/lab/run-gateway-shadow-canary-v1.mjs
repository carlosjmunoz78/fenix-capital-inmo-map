import fs from 'node:fs';
import path from 'node:path';
import { createRealCerebroActorAdapter, preflightRealCerebroActor } from './real-cerebro-actor-adapter.mjs';
import { createHumanGatewayV1 } from '../integration/human-gateway-v1.mjs';

const BASE='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1';
const OLD='cerebro-human-old-actor-preprod-v0';
const NEW='cerebro-human-new-actor-preprod-v1';
const ROUTE='cerebro-human-route-control-preprod-v1';
const OLD_MODE=new Set(['FROZEN_PROD_V33_SANDBOX']);
const NEW_MODE=new Set(['HUMAN_INTELLIGENCE_NEW_V1_PREPROD']);
function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
async function oidc(audience){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('GATEWAY_PHYSICAL_REHEARSAL_UNAVAILABLE:GITHUB_OIDC_ENV_MISSING');
  const url=new URL(requestUrl);url.searchParams.set('audience',audience);
  const response=await fetch(url,{headers:{authorization:`Bearer ${requestToken}`,'cache-control':'no-store'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.value)throw new Error(`GATEWAY_PHYSICAL_REHEARSAL_UNAVAILABLE:OIDC:${audience}:${response.status}`);
  return String(body.value);
}
function compact(out){return {message:String(out.message??'').slice(0,180),routing_evidence:out.routing_evidence,actor_evidence:{source_mode:out.actor_evidence?.source_mode,environment:out.actor_evidence?.environment,prod_write_authorized:out.actor_evidence?.prod_write_authorized,prod_execution_enabled:out.actor_evidence?.prod_execution_enabled,customer_data:out.actor_evidence?.customer_data,trading_access:out.actor_evidence?.trading_access,additional_cost_eur:out.actor_evidence?.additional_cost_eur}};}
function runKey(label){return `${process.env.GITHUB_RUN_ID??'local'}:${process.env.GITHUB_RUN_ATTEMPT??'0'}:${label}`;}
async function routeRequest(token,suffix,{method='GET',body}={}){
  const response=await fetch(`${BASE}/${ROUTE}/${suffix}`,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','cache-control':'no-store'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw new Error(`ROUTE_CONTROL_${suffix.toUpperCase()}_FAILED:${response.status}:${JSON.stringify(data)}`);
  return data;
}
async function routeState(token){return routeRequest(token,'state');}
async function transition(token,state,mode,canaryPercent,label){
  return routeRequest(token,'transition',{method:'POST',body:{expected_version:Number(state.version),mode,canary_percent:canaryPercent,reason:`Human Intelligence V1 physical ${label} rehearsal`,idempotency_key:runKey(label)}});
}
function gatewayState(persisted){
  if(persisted.mode==='SHADOW_NEW')return {mode:'SHADOW',canary_percent:0};
  if(persisted.mode==='CANARY_NEW')return {mode:'CANARY',canary_percent:Number(persisted.canary_percent)};
  if(persisted.mode==='NEW_100')return {mode:'NEW',canary_percent:100};
  return {mode:'ROLLBACK',canary_percent:0};
}

async function main(){
  const outPath=arg('--out','artifacts/human-intelligence/gateway-shadow-canary.v1.json');
  const [oldToken,newToken,routeToken]=await Promise.all([oidc(OLD),oidc(NEW),oidc(ROUTE)]);
  const [oldPre,newPre]=await Promise.all([
    preflightRealCerebroActor({url:`${BASE}/${OLD}/chat`,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD,allowedSourceModes:OLD_MODE}),
    preflightRealCerebroActor({url:`${BASE}/${NEW}/chat`,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW,allowedSourceModes:NEW_MODE})
  ]);
  const actorOld=createRealCerebroActorAdapter({url:`${BASE}/${OLD}/chat`,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD,allowedSourceModes:OLD_MODE});
  const actorNew=createRealCerebroActorAdapter({url:`${BASE}/${NEW}/chat`,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW,allowedSourceModes:NEW_MODE});

  const routeEvidence={initial:null,recovered_initial:null,shadow_transition:null,canary_transition:null,rollback_transition:null,emergency_rollback:null,final:null};
  const shadow=[],canary=[],rollback=[];let oldCount=0,newCount=0,mainError=null;
  try{
    let current=(await routeState(routeToken)).state;routeEvidence.initial=current;
    if(current.mode!=='OLD_100'||current.canary_percent!==0||current.serve_actor!=='OLD'){
      const recovered=await transition(routeToken,current,'OLD_100',0,'initial-recovery');
      current=recovered.state;routeEvidence.recovered_initial=current;
    }

    let moved=await transition(routeToken,current,'SHADOW_NEW',0,'shadow');current=moved.state;routeEvidence.shadow_transition=current;
    if(current.mode!=='SHADOW_NEW'||current.serve_actor!=='OLD')throw new Error('PERSISTED_SHADOW_STATE_INVALID');
    const shadowGateway=createHumanGatewayV1({actorOld,actorNew,routeState:gatewayState(current)});
    for(let i=0;i<6;i++){
      const sid=`shadow-${i}`;shadowGateway.createSession({session_id:sid,company_id:'fenix'});
      shadow.push(compact(await shadowGateway.chat({session_id:sid,message:'Necesito entender una hipoteca y no quiero que repitas una respuesta genérica.'})));
    }

    moved=await transition(routeToken,current,'CANARY_NEW',50,'canary');current=moved.state;routeEvidence.canary_transition=current;
    if(current.mode!=='CANARY_NEW'||current.canary_percent!==50)throw new Error('PERSISTED_CANARY_STATE_INVALID');
    const canaryGateway=createHumanGatewayV1({actorOld,actorNew,routeState:gatewayState(current)});
    for(let i=0;i<200&&(oldCount<6||newCount<6);i++){
      const sid=`canary-${i}`;const created=canaryGateway.createSession({session_id:sid,company_id:'fenix'});
      if(created.assignment.selected==='OLD'&&oldCount>=6)continue;
      if(created.assignment.selected==='NEW'&&newCount>=6)continue;
      const out=await canaryGateway.chat({session_id:sid,message:'Tengo otra financiación mensual. ¿Qué dato necesitas para valorar bien el caso?'});
      canary.push(compact(out));
      if(out.routing_evidence.served==='OLD')oldCount++;else if(out.routing_evidence.served==='NEW')newCount++;
    }

    moved=await transition(routeToken,current,'OLD_100',0,'rollback');current=moved.state;routeEvidence.rollback_transition=current;
    if(current.mode!=='OLD_100'||current.canary_percent!==0||current.serve_actor!=='OLD')throw new Error('PERSISTED_ROLLBACK_STATE_INVALID');
    const rollbackGateway=createHumanGatewayV1({actorOld,actorNew,routeState:gatewayState(current)});
    for(let i=0;i<3;i++){
      const sid=`rollback-${i}`;rollbackGateway.createSession({session_id:sid,company_id:'fenix'});
      rollback.push(compact(await rollbackGateway.chat({session_id:sid,message:'Sigo perdido, dime qué necesitas saber de mí.'})));
    }
  }catch(error){mainError=String(error?.stack??error);}finally{
    try{
      const live=(await routeState(routeToken)).state;
      if(live.mode!=='OLD_100'||live.canary_percent!==0||live.serve_actor!=='OLD'){
        const recovered=await transition(routeToken,live,'OLD_100',0,'emergency-rollback');routeEvidence.emergency_rollback=recovered.state;
      }
      routeEvidence.final=(await routeState(routeToken)).state;
    }catch(error){mainError=`${mainError??''}\nFINAL_ROLLBACK_FAILURE:${String(error?.stack??error)}`.trim();}
  }

  const final=routeEvidence.final;
  const gates={
    old_preflight:oldPre.ok===true,new_preflight:newPre.ok===true,
    persisted_shadow:routeEvidence.shadow_transition?.mode==='SHADOW_NEW'&&routeEvidence.shadow_transition?.serve_actor==='OLD',
    shadow_primary_old:shadow.length===6&&shadow.every(x=>x.routing_evidence.mode==='SHADOW'&&x.routing_evidence.served==='OLD'),
    shadow_new_observed:shadow.length===6&&shadow.every(x=>x.routing_evidence.shadow?.ok===true),
    persisted_canary:routeEvidence.canary_transition?.mode==='CANARY_NEW'&&routeEvidence.canary_transition?.canary_percent===50,
    canary_both_cohorts:oldCount===6&&newCount===6,
    canary_session_stable:canary.length===12&&canary.every(x=>['OLD','NEW'].includes(x.routing_evidence.assigned)&&x.routing_evidence.assigned===x.routing_evidence.served&&!x.routing_evidence.fallback_triggered),
    persisted_rollback:routeEvidence.rollback_transition?.mode==='OLD_100'&&routeEvidence.rollback_transition?.serve_actor==='OLD',
    rollback_old:rollback.length===3&&rollback.every(x=>x.routing_evidence.served==='OLD'),
    final_fail_closed:final?.mode==='OLD_100'&&final?.canary_percent===0&&final?.serve_actor==='OLD',
    no_prod_authority:[...shadow,...canary,...rollback].every(x=>x.routing_evidence.prod_authorized===false&&x.routing_evidence.prod_write_authorized===false&&x.routing_evidence.trading_access===false&&x.routing_evidence.customer_data===false&&x.routing_evidence.additional_cost_eur===0),
    actor_evidence_safe:[...shadow,...canary,...rollback].every(x=>x.actor_evidence.environment==='PREPROD'&&x.actor_evidence.prod_write_authorized===false&&x.actor_evidence.prod_execution_enabled===false&&x.actor_evidence.customer_data===false&&x.actor_evidence.trading_access===false&&x.actor_evidence.additional_cost_eur===0),
    no_runtime_error:mainError===null
  };
  const green=Object.values(gates).every(Boolean);
  const artifact={state_type:'CEREBRO_HUMAN_GATEWAY_SHADOW_CANARY_V1',status:green?'GREEN':'RED',generated_at:new Date().toISOString(),environment:'PREPROD',route_unit:'SESSION',physical_route_control:true,route_evidence:routeEvidence,shadow,canary:{old_count:oldCount,new_count:newCount,items:canary},rollback,gates,error:mainError,safety:{prod_invoked:false,prod_authorized:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0}};
  fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,shadow:shadow.length,canary_old:oldCount,canary_new:newCount,rollback:rollback.length,final_route:final,gates,error:mainError}));
  if(!green)process.exitCode=1;
}
main().catch(error=>{console.error(String(error?.stack??error));process.exitCode=1;});
