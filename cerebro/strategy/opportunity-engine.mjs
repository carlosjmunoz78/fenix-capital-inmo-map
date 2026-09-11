const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const num=(v,l)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`${l} must be finite`);return n};
export function evaluateOpportunity(input={}){
  const c=input.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);if(c.engine_id!=='OPP-001')throw new Error('context.engine_id must be OPP-001');
  if(!['SCAFFOLD','LAB','PREPROD'].includes(c.environment))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});if(input.authorized!==true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  const confidence=num(input.confidence,'confidence');if(confidence<0||confidence>1)throw new Error('confidence must be 0..1');if(confidence<0.65)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false});
  const roi=num(input.roi_score,'roi_score'),risk=num(input.risk_score,'risk_score'),cost=num(input.mvp_cost_eur??0,'mvp_cost_eur');for(const [k,v] of Object.entries({roi,risk}))if(v<0||v>100)throw new Error(`${k} must be 0..100`);if(cost<0)throw new Error('mvp_cost_eur must be >=0');
  if(risk>=75)return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});if(cost>Number(input.preauthorized_budget_eur??0))return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',ready:false});
  const decision=roi>=70&&risk<=40?'MVP_RECOMMENDED':roi>=50?'RESEARCH_MORE':'DISCARD';
  return Object.freeze({status:'OPPORTUNITY_PLAN',ready:true,decision,metric_required:true,scale_only_after_evidence:true,mvp_execute:false,spend_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,additional_cost_eur:0});
}
