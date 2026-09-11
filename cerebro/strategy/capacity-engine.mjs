const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const num=(v,l)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`${l} must be finite`);return n};
export function evaluateCapacity(input={}){
  const c=input.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);if(c.engine_id!=='CAPA-001')throw new Error('context.engine_id must be CAPA-001');
  if(!['SCAFFOLD','LAB','PREPROD'].includes(c.environment))return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});if(input.authorized!==true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  const demand=num(input.forecast_demand,'forecast_demand');const capacity=num(input.current_capacity,'current_capacity');if(demand<0||capacity<0)throw new Error('capacity values must be >=0');
  const utilization=capacity===0?(demand===0?0:Infinity):demand/capacity;let action='KEEP';if(utilization>1)action='ADD_CAPACITY_PLAN';else if(utilization<0.5)action='CONSOLIDATE_OR_REALLOCATE';
  const cost=num(input.additional_cost_eur??0,'additional_cost_eur');if(cost>0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',ready:false,action});
  return Object.freeze({status:'CAPACITY_PLAN',ready:true,utilization:Number.isFinite(utilization)?Math.round(utilization*10000)/10000:null,action,execute_staffing:false,execute_infra_change:false,read_only:true,plan_only:true,executed:false,prod_writes:false,additional_cost_eur:0});
}
