export function assignCase(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],case_profile={},workers=[]}=input;
  if(!context.company_id||context.engine_id!=='HR-006'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(workers)||workers.length===0) throw new Error('WORKERS_REQUIRED');
  const eligible=workers.filter(w=>w.active!==false).map((w,i)=>({id:String(w.id??i),load:Math.max(0,Number(w.load??0)),performance:Math.max(0,Math.min(1,Number(w.performance??0))),specialties:Array.isArray(w.specialties)?w.specialties.map(String):[],zones:Array.isArray(w.zones)?w.zones.map(String):[],risk_capacity:Math.max(0,Number(w.risk_capacity??0))}));
  const specialty=String(case_profile.specialty??'');
  const zone=String(case_profile.zone??'');
  const risk=Math.max(0,Number(case_profile.risk??0));
  const scored=eligible.map(w=>{const s=(w.specialties.includes(specialty)?30:0)+(w.zones.includes(zone)?20:0)+(w.performance*30)-Math.min(30,w.load*3)+(w.risk_capacity>=risk?20:-50);return {...w,score:Number(s.toFixed(2))};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const best=scored[0];
  if(!best||best.score<0) return human('LOW_CONFIDENCE');
  return {status:'WORKFORCE_ASSIGNMENT_READY',engine_id:'HR-006',company_id:context.company_id,worker_id:best.id,score:best.score,assignment_execute:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
