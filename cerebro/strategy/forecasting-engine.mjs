const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const num=(v,l)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`${l} must be finite`);return n};
export function evaluateForecast(input={}){
  const c=input.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);if(c.engine_id!=='FRC-001')throw new Error('context.engine_id must be FRC-001');
  if(!['SCAFFOLD','LAB','PREPROD'].includes(c.environment))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});
  if(input.authorized!==true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  const confidence=num(input.confidence,'confidence');if(confidence<0||confidence>1)throw new Error('confidence must be 0..1');if(confidence<0.7)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false});
  const history=Array.isArray(input.history)?input.history:[];if(history.length<2)throw new Error('history requires at least 2 points');
  const vals=history.map((x,i)=>num(x,`history[${i}]`));const deltas=vals.slice(1).map((v,i)=>v-vals[i]);const avgDelta=deltas.reduce((a,b)=>a+b,0)/deltas.length;const horizon=Math.max(1,Math.min(12,Math.trunc(num(input.horizon_periods??1,'horizon_periods'))));
  const forecasts=[];let current=vals.at(-1);for(let i=1;i<=horizon;i++){current+=avgDelta;forecasts.push(Math.round(current*100)/100)}
  return Object.freeze({status:'FORECAST_READY',ready:true,method:'LINEAR_AVERAGE_DELTA',horizon_periods:horizon,forecast:Object.freeze(forecasts),model_training:false,paid_ai_required:false,read_only:true,plan_only:true,executed:false,prod_writes:false,additional_cost_eur:0});
}
