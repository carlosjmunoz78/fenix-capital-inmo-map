import { CerebroGatewayV0 } from '../../console/gateway.mjs';

const MODES=new Set(['OLD','NEW','SHADOW','CANARY','ROLLBACK']);

function required(value,label){if(typeof value!=='string'||!value.trim())throw new TypeError(`${label} must be a non-empty string`);return value.trim();}
function stableBucket(input){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%100;}
function normalizeRouteState(raw={}){
  const mode=String(raw.mode??'OLD').toUpperCase();
  if(!MODES.has(mode))throw new Error('INVALID_HUMAN_GATEWAY_MODE');
  const canaryPercent=Number(raw.canary_percent??0);
  if(!Number.isInteger(canaryPercent)||canaryPercent<0||canaryPercent>100)throw new Error('INVALID_CANARY_PERCENT');
  return Object.freeze({
    mode,
    canary_percent:canaryPercent,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    customer_data:false,
    additional_cost_eur:0
  });
}
function selectRoute({state,sessionId,companyId}){
  const bucket=stableBucket(`${companyId}:${sessionId}`);
  if(state.mode==='NEW')return {selected:'NEW',bucket};
  if(state.mode==='CANARY')return {selected:bucket<state.canary_percent?'NEW':'OLD',bucket};
  if(state.mode==='ROLLBACK')return {selected:'OLD',bucket};
  return {selected:'OLD',bucket};
}
function assertActorResult(result,label){
  if(!result||typeof result!=='object'||typeof result.text!=='string'||!result.text.trim())throw new Error(`${label}_ACTOR_EMPTY`);
  const evidence=result.actor_evidence;
  if(!evidence||evidence.real_cerebro_actor!==true||evidence.environment!=='PREPROD'||evidence.prod_write_authorized!==false||evidence.prod_execution_enabled!==false||evidence.customer_data!==false||evidence.trading_access!==false||Number(evidence.additional_cost_eur)!==0)throw new Error(`${label}_ACTOR_EVIDENCE_INVALID`);
  return result;
}

export class CerebroHumanGatewayV1 {
  #actorOld;
  #actorNew;
  #routeState;
  #sessions=new Map();
  #audit=[];

  constructor({actorOld,actorNew,routeState={mode:'OLD'},environment='PREPROD',version='human-v1'}={}){
    if(environment!=='PREPROD')throw new Error('HUMAN_GATEWAY_PREPROD_ONLY');
    if(typeof actorOld!=='function'||typeof actorNew!=='function')throw new TypeError('actorOld and actorNew must be functions');
    this.#actorOld=actorOld;this.#actorNew=actorNew;this.#routeState=normalizeRouteState(routeState);this.version=version;
  }

  get routeState(){return structuredClone(this.#routeState);}

  createSession({session_id,company_id,context={}}){
    const sid=required(session_id,'session_id');const cid=required(company_id,'company_id');
    if(this.#sessions.has(sid))throw new Error('session already exists');
    const assignment=selectRoute({state:this.#routeState,sessionId:sid,companyId:cid});
    const gateway=new CerebroGatewayV0({environment:'PREPROD',version:this.version});
    const transcript=[];
    gateway.createSession({session_id:sid,company_id:cid,context});
    gateway.setChatAdapter(async ({context:operationContext,message})=>{
      const input={
        human_message:message,
        history:transcript.slice(-10),
        scenario_id:`GATEWAY:${sid}`,
        turn:transcript.length+1,
        seed:`${cid}:${sid}`,
        prod_write_authorized:false,
        trading_access:false,
        customer_data:false
      };
      const primaryLabel=assignment.selected;
      const primaryActor=primaryLabel==='NEW'?this.#actorNew:this.#actorOld;
      let primary;
      let fallbackTriggered=false;
      try{primary=assertActorResult(await primaryActor(input),primaryLabel);}catch(error){
        if(primaryLabel!=='NEW')throw error;
        fallbackTriggered=true;
        primary=assertActorResult(await this.#actorOld(input),'OLD_FALLBACK');
      }
      let shadow=null;
      if(this.#routeState.mode==='SHADOW'){
        try{const candidate=assertActorResult(await this.#actorNew(input),'NEW_SHADOW');shadow={ok:true,actor_status:candidate.actor_status??'OK',actor_intent:candidate.actor_intent??null,source_mode:candidate.actor_evidence?.source_mode??null};}
        catch(error){shadow={ok:false,error:String(error?.message??error)};}
      }
      transcript.push({human:message,actor:primary.text});
      const routing_evidence={
        environment:'PREPROD',mode:this.#routeState.mode,session_id:sid,company_id:cid,bucket:assignment.bucket,
        assigned:assignment.selected,served:fallbackTriggered?'OLD':primaryLabel,fallback_triggered:fallbackTriggered,
        canary_percent:this.#routeState.canary_percent,shadow,
        prod_authorized:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0
      };
      this.#audit.push({type:'HUMAN_GATEWAY_CHAT',routing_evidence,context:operationContext});
      return {status:'OK',message:primary.text,actor_status:primary.actor_status??'OK',actor_intent:primary.actor_intent??null,actor_evidence:primary.actor_evidence,routing_evidence};
    });
    this.#sessions.set(sid,{gateway,assignment,transcript});
    this.#audit.push({type:'HUMAN_GATEWAY_SESSION_CREATED',session_id:sid,company_id:cid,assignment,route_state:this.#routeState});
    return {session_id:sid,company_id:cid,assignment,route_state:this.routeState};
  }

  async chat({session_id,message}){
    const sid=required(session_id,'session_id');const record=this.#sessions.get(sid);if(!record)throw new Error('session not found');
    return record.gateway.chat({session_id:sid,message:required(message,'message')});
  }

  inspectSession(session_id){const sid=required(session_id,'session_id');const record=this.#sessions.get(sid);if(!record)throw new Error('session not found');return {gateway:record.gateway.inspectSession(sid),assignment:structuredClone(record.assignment),transcript:structuredClone(record.transcript)};}
  auditLog(){return structuredClone(this.#audit);}
  contract(){return {state_type:'CEREBRO_HUMAN_GATEWAY_V1',environment:'PREPROD',gateway_required:true,direct_model_access:false,stable_session_assignment:true,modes:[...MODES],prod_authorized:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0};}
}

export function createHumanGatewayV1(options){return new CerebroHumanGatewayV1(options);}
export const HUMAN_GATEWAY_V1_CONTRACT=Object.freeze({state_type:'CEREBRO_HUMAN_GATEWAY_V1',environment:'PREPROD',stable_session_assignment:true,shadow_primary:'OLD',canary_unit:'SESSION',rollback_target:'OLD',prod_authorized:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0});
