export function planAgenda(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],tasks=[]}=input;
  if(!context.company_id||context.engine_id!=='AGD-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(tasks)) throw new Error('TASKS_REQUIRED');
  const eligible=tasks.filter(t=>t&&t.available!==false).map((t,i)=>({id:String(t.id??i),priority:Number(t.priority??0),due_ts:Number(t.due_ts??Number.MAX_SAFE_INTEGER),location_group:String(t.location_group??''),duration_min:Number(t.duration_min??30)}));
  eligible.sort((a,b)=>b.priority-a.priority||a.due_ts-b.due_ts||a.location_group.localeCompare(b.location_group)||a.id.localeCompare(b.id));
  return {status:'AGENDA_PLAN_READY',engine_id:'AGD-001',company_id:context.company_id,ordered_tasks:eligible,calendar_write:false,external_execution:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
