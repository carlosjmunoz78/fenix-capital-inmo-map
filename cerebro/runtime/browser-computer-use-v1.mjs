import { evaluateBrowserVisionFallback } from './browser-vision-fallback-v1.mjs';

const POINTER_INTENTS = new Set(['CLICK','DOUBLE_CLICK','MOVE']);

function pointFromTarget(target = {}) {
  const x=Number(target.x);
  const y=Number(target.y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0) return null;
  return Object.freeze({x,y});
}

export function resolveVisionComputerUseAction({intent='CLICK',vision={}}={}) {
  const resolution=evaluateBrowserVisionFallback(vision);
  const base={
    schema_version:'1.0.0',
    vision_resolution:resolution,
    action:null,
    action_authority_created:false,
    status:resolution.status
  };
  if(resolution.status!=='AUTHORIZED_TARGET_ONLY') return Object.freeze(base);
  if(!POINTER_INTENTS.has(intent)) return Object.freeze({...base,status:'HOLD_UNKNOWN_COMPUTER_USE_INTENT'});
  const point=pointFromTarget(resolution.target);
  if(!point) return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE'});
  const type=intent==='CLICK'?'CLICK_POINT':intent==='DOUBLE_CLICK'?'DOUBLE_CLICK_POINT':'MOVE_POINT';
  return Object.freeze({
    ...base,
    status:'AUTHORIZED_TARGET_ACTION',
    action:Object.freeze({type,...point}),
    action_authority_created:false
  });
}

export function getBrowserComputerUseContract(){
  return Object.freeze({
    schema_version:'1.0.0',
    pointer_intents:[...POINTER_INTENTS],
    vision_creates_action_authority:false,
    execution_authority_source:'ORIGIN_ENGINE_POLICY_AND_GOVERNED_ACTION_CONTRACT',
    low_confidence_human_required:'LOW_CONFIDENCE',
    paid_vision_human_required:'MONEY_LIMIT'
  });
}
