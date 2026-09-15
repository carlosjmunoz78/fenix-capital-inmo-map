const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const num=(v,l)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`${l} must be finite`);return n};
export function evaluateStrategy(input={}){
  const c=input.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');
  for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);
  if(c.engine_id!=='STR-001')throw new Error('context.engine_id must be STR-001');
  if(!['SCAFFOLD','LAB','PREPROD'].includes(c.environment))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});
  if(input.authorized!==true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  const confidence=num(input.confidence,'confidence');if(confidence<0||confidence>1)throw new Error('confidence must be 0..1');
  if(confidence<0.7)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false});
  if(input.prod_write===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});
  const scenarios=Array.isArray(input.scenarios)?input.scenarios:[];if(!scenarios.length)throw new Error('scenarios required');
  const ranked=scenarios.map((s,i)=>{if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('scenario object required');const id=req(s.scenario_id,`scenarios[${i}].scenario_id`);const roi=num(s.roi_score,`scenarios[${i}].roi_score`);const risk=num(s.risk_score,`scenarios[${i}].risk_score`);const cash=num(s.cash_score,`scenarios[${i}].cash_score`);const capacity=num(s.capacity_score,`scenarios[${i}].capacity_score`);for(const [k,v] of Object.entries({roi,risk,cash,capacity}))if(v<0||v>100)throw new Error(`${k} must be 0..100`);const score=Math.round((roi*0.35+cash*0.25+capacity*0.2+(100-risk)*0.2)*100)/100;return Object.freeze({scenario_id:id,score,risk_score:risk});}).sort((a,b)=>b.score-a.score||a.scenario_id.localeCompare(b.scenario_id));
  const top=ranked[0];const human=top.risk_score>=75;
  return Object.freeze({status:human?'HUMAN_REQUIRED':'STRATEGY_PLAN',reason:human?'HIGH_RISK':null,ready:!human,recommended_scenario:top.scenario_id,ranking:Object.freeze(ranked),major_strategy_decision_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,additional_cost_eur:0});
}
