export function chooseNextBestAction(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],candidates=[]}=input;
  if(!context.company_id||context.engine_id!=='NBA-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(candidates)||candidates.length===0) throw new Error('CANDIDATES_REQUIRED');
  const normalized=candidates.map((c,i)=>({id:String(c.id??i),blocked:Boolean(c.blocked),risk:Number(c.risk??0),sla_urgency:Number(c.sla_urgency??0),value:Number(c.value??0),dependency_ready:c.dependency_ready!==false}));
  const eligible=normalized.filter(c=>!c.blocked&&c.dependency_ready);
  if(eligible.length===0) return {status:'NO_ELIGIBLE_ACTION',engine_id:'NBA-001',company_id:context.company_id,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
  eligible.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  const best=eligible[0];
  if(best.risk>=5) return human('HIGH_RISK');
  return {status:'NEXT_BEST_ACTION_READY',engine_id:'NBA-001',company_id:context.company_id,action_id:best.id,score:score(best),reason:{risk:best.risk,sla_urgency:best.sla_urgency,value:best.value,dependency_ready:best.dependency_ready},source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function score(c){return Math.round((c.sla_urgency*4+c.value*3-Math.max(0,c.risk)*2)*100)/100;}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
