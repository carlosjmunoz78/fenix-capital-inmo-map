export const PROD_ROUTER_ZERO_CONTRACT=Object.freeze({
  state_type:'CEREBRO_HUMAN_INTELLIGENCE_PROD_ROUTER_ZERO_V1',
  company_id:'fenix',engine_id:'CHAT-001',environment:'PROD',version:'1.0.0',
  stable_authority:'cerebro-console-gateway-v0',
  candidate_overlay:'cerebro-console-gateway-human-v1-canary',
  live_canary_percent:0,
  consumer_routing_enabled:false,
  fail_closed_target:'OLD',
  prod_write_authorized:false,
  trading_access:false,
  additional_cost_eur:0
});

export function stableBucket(value){
  const text=String(value??'');
  let hash=2166136261;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,16777619)>>>0;
  }
  return hash%10000;
}

export function selectHumanRoute({cohortKey,canaryPercent=0}={}){
  const percent=Number(canaryPercent);
  if(!Number.isFinite(percent)||percent<0||percent>25)throw new Error('unsafe_canary_percent');
  if(percent===0)return Object.freeze({route:'OLD',bucket:null,canary_percent:0,reason:'ZERO_FAIL_CLOSED'});
  const key=String(cohortKey??'').trim();
  if(!key)return Object.freeze({route:'OLD',bucket:null,canary_percent:percent,reason:'MISSING_STABLE_COHORT_KEY'});
  const bucket=stableBucket(key);
  const threshold=Math.floor(percent*100);
  return Object.freeze({route:bucket<threshold?'NEW':'OLD',bucket,canary_percent:percent,reason:'DETERMINISTIC_COHORT'});
}
