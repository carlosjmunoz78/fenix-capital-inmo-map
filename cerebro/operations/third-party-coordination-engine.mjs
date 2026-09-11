export function coordinateThirdParties(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],parties=[]}=input;
  if(!context.company_id||context.engine_id!=='3RD-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(parties)) throw new Error('PARTIES_REQUIRED');
  const normalized=parties.map((p,i)=>({id:String(p.id??i),type:String(p.type??'OTHER'),blocked:Boolean(p.blocked),sla_breached:Boolean(p.sla_breached),severity:Math.max(1,Math.min(5,Number(p.severity)||1)),depends_on:Array.isArray(p.depends_on)?p.depends_on.map(String):[]}));
  const blockers=normalized.filter(p=>p.blocked||p.sla_breached).sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
  if(blockers.some(p=>p.severity>=5)) return human('HIGH_RISK');
  const actions=blockers.map(p=>({party_id:p.id,action:p.sla_breached?'TRIGGER_FOLLOWUP':'RESOLVE_BLOCKER',cadence:p.severity>=4?'URGENT':'NORMAL'}));
  return {status:actions.length?'THIRD_PARTY_COORDINATION_REQUIRED':'THIRD_PARTY_COORDINATION_CLEAR',engine_id:'3RD-001',company_id:context.company_id,blockers,actions,communication_send:false,calendar_write:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
