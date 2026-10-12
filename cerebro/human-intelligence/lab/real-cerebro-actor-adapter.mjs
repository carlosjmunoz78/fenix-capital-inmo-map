const PREPROD_PROJECT_REF='hnqlnvakzaywtafeiybt';
const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const DEFAULT_FUNCTION='cerebro-human-old-actor-preprod-v0';

export class RealCerebroActorUnavailable extends Error {
  constructor(reason,detail={}) {
    super(`REAL_CEREBRO_ACTOR_UNAVAILABLE:${reason}`);
    this.name='RealCerebroActorUnavailable';
    this.code='REAL_CEREBRO_ACTOR_UNAVAILABLE';
    this.reason=reason;
    this.detail=detail;
  }
}

export function validateRealActorTarget(rawUrl,{expectedFunction=DEFAULT_FUNCTION}={}) {
  let url;
  try { url=new URL(rawUrl); } catch { throw new RealCerebroActorUnavailable('INVALID_URL'); }
  if(url.protocol!=='https:') throw new RealCerebroActorUnavailable('HTTPS_REQUIRED');
  const host=url.hostname.toLowerCase();
  if(host.includes(PROD_PROJECT_REF)) throw new RealCerebroActorUnavailable('PROD_TARGET_FORBIDDEN');
  if(host!==`${PREPROD_PROJECT_REF}.supabase.co`) throw new RealCerebroActorUnavailable('PREPROD_TARGET_REQUIRED',{host});
  const expectedPath=`/functions/v1/${expectedFunction}/chat`;
  if(url.pathname.replace(/\/$/,'')!==expectedPath) throw new RealCerebroActorUnavailable('UNEXPECTED_ACTOR_ROUTE',{path:url.pathname,expectedPath});
  return url.toString().replace(/\/$/,'');
}

function assertSafeActorInput(input) {
  if(!input||typeof input!=='object') throw new RealCerebroActorUnavailable('INVALID_ACTOR_INPUT');
  if(input.prod_write_authorized!==false) throw new RealCerebroActorUnavailable('PROD_WRITE_FLAG_NOT_FALSE');
  if(input.trading_access!==false) throw new RealCerebroActorUnavailable('TRADING_FLAG_NOT_FALSE');
  const serialized=JSON.stringify(input);
  for(const forbidden of ['private_state','private_goal','hidden_facts','misbeliefs','reveal_rules','internal_state']) {
    if(serialized.includes(forbidden)) throw new RealCerebroActorUnavailable('PRIVATE_STATE_LEAK',{forbidden});
  }
}

export function verifyRealActorEvidence(evidence) {
  if(!evidence||typeof evidence!=='object') return false;
  if(evidence.real_cerebro_actor!==true) return false;
  if(evidence.environment!=='PREPROD') return false;
  if(evidence.project_ref!==PREPROD_PROJECT_REF) return false;
  if(evidence.prod_write_authorized!==false||evidence.prod_execution_enabled!==false) return false;
  if(evidence.customer_data!==false||evidence.trading_access!==false) return false;
  if(evidence.additional_cost_eur!==0) return false;
  if(typeof evidence.source_version!=='string'||!evidence.source_version) return false;
  if(typeof evidence.source_sha256!=='string'||!/^[a-f0-9]{64}$/i.test(evidence.source_sha256)) return false;
  return true;
}

export async function preflightRealCerebroActor({url,accessToken,anonKey,fetchImpl=globalThis.fetch,expectedFunction=DEFAULT_FUNCTION}={}) {
  const target=validateRealActorTarget(url,{expectedFunction});
  if(!accessToken) throw new RealCerebroActorUnavailable('ACCESS_TOKEN_MISSING');
  if(!anonKey) throw new RealCerebroActorUnavailable('ANON_KEY_MISSING');
  if(typeof fetchImpl!=='function') throw new RealCerebroActorUnavailable('FETCH_UNAVAILABLE');
  const healthUrl=target.replace(/\/chat$/,'/health');
  let response;
  try {
    response=await fetchImpl(healthUrl,{method:'GET',headers:{authorization:`Bearer ${accessToken}`,apikey:anonKey,'cache-control':'no-store'}});
  } catch(error) {
    throw new RealCerebroActorUnavailable('NETWORK_ERROR',{message:String(error?.message??error)});
  }
  const body=await response.json().catch(()=>null);
  if(!response.ok) throw new RealCerebroActorUnavailable('PREFLIGHT_HTTP_ERROR',{status:response.status});
  if(!verifyRealActorEvidence(body?.actor_evidence)) throw new RealCerebroActorUnavailable('UNVERIFIED_ACTOR_EVIDENCE');
  return {ok:true,target,actor_evidence:body.actor_evidence};
}

export function createRealCerebroActorAdapter({url,accessToken,anonKey,fetchImpl=globalThis.fetch,expectedFunction=DEFAULT_FUNCTION}={}) {
  const target=validateRealActorTarget(url,{expectedFunction});
  if(!accessToken) throw new RealCerebroActorUnavailable('ACCESS_TOKEN_MISSING');
  if(!anonKey) throw new RealCerebroActorUnavailable('ANON_KEY_MISSING');
  if(typeof fetchImpl!=='function') throw new RealCerebroActorUnavailable('FETCH_UNAVAILABLE');

  return async function realCerebroActor(input) {
    assertSafeActorInput(input);
    const payload={
      message:String(input.human_message??'').slice(0,2000),
      conversation_context:(Array.isArray(input.history)?input.history:[]).slice(-10).flatMap(turn=>[
        turn?.human?{role:'user',text:String(turn.human).slice(0,1200)}:null,
        turn?.actor?{role:'cerebro',text:String(turn.actor).slice(0,1200)}:null
      ]).filter(Boolean),
      lab_context:{
        scenario_id:String(input.scenario_id??'SYNTHETIC'),
        turn:Number(input.turn??0),
        seed:String(input.seed??''),
        company_id:'fenix',engine_id:'SIM-001',environment:'LAB',version:'v1',
        prod_write_authorized:false,trading_access:false,customer_data:false
      }
    };
    let response;
    try {
      response=await fetchImpl(target,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${accessToken}`,apikey:anonKey,'cache-control':'no-store'},body:JSON.stringify(payload)});
    } catch(error) {
      throw new RealCerebroActorUnavailable('NETWORK_ERROR',{message:String(error?.message??error)});
    }
    const body=await response.json().catch(()=>null);
    if(!response.ok) throw new RealCerebroActorUnavailable('ACTOR_HTTP_ERROR',{status:response.status,reason:body?.reason??body?.error??null});
    if(!verifyRealActorEvidence(body?.actor_evidence)) throw new RealCerebroActorUnavailable('UNVERIFIED_ACTOR_EVIDENCE');
    const text=String(body?.message??body?.text??'').trim();
    if(!text) throw new RealCerebroActorUnavailable('EMPTY_ACTOR_RESPONSE');
    return {text,actor_evidence:body.actor_evidence,actor_status:String(body?.status??'OK'),actor_intent:body?.intent??null};
  };
}

export const REAL_CEREBRO_ACTOR_CONTRACT_V1=Object.freeze({
  actor:'CEREBRO_OLD',
  target_project_ref:PREPROD_PROJECT_REF,
  forbidden_project_ref:PROD_PROJECT_REF,
  function_slug:DEFAULT_FUNCTION,
  environment:'PREPROD',
  gym_environment:'LAB',
  prod_write_authorized:false,
  prod_execution_enabled:false,
  customer_data:false,
  trading_access:false,
  additional_cost_eur:0,
  fail_closed_code:'REAL_CEREBRO_ACTOR_UNAVAILABLE'
});
