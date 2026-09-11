export function forecastTreasury(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],opening_cents=0,inflows=[],outflows=[]}=input;
  if(!context.company_id||context.engine_id!=='TRE-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const sum=a=>a.reduce((s,x)=>{const v=Number(x.amount_cents); if(!Number.isInteger(v)||v<0) throw new Error('CENT_VALUES_REQUIRED'); return s+v;},0);
  const opening=Number(opening_cents); if(!Number.isInteger(opening)) throw new Error('CENT_VALUES_REQUIRED');
  const inC=sum(inflows), outC=sum(outflows), projected=opening+inC-outC;
  return {status:'TREASURY_FORECAST_READY',engine_id:'TRE-001',company_id:context.company_id,opening_cents:opening,inflow_cents:inC,outflow_cents:outC,projected_closing_cents:projected,liquidity_risk:projected<0,action:projected<0?'PLAN_LIQUIDITY_REVIEW':'MONITOR',bank_write:false,payment_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
