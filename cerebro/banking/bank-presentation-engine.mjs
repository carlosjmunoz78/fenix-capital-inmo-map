export function prepareBankPresentation(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],bank='',case_ref='',documents=[],template_ref='',message_template_ref=''}=input;
  if (!context.company_id || context.engine_id!=='BNK-004' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!bank || !case_ref || !template_ref || !message_template_ref) throw new Error('PRESENTATION_INPUT_REQUIRED');
  const ordered=[...documents].map(d=>({name:String(d.name??''),type:String(d.type??'OTHER'),ref:String(d.ref??'')})).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
  const package_name=`${context.company_id}_${case_ref}_${bank}`.replace(/[^a-zA-Z0-9_-]/g,'_');
  return {status:'BANK_PRESENTATION_PLAN_READY',engine_id:'BNK-004',company_id:context.company_id,bank,case_ref,package_name,template_ref,message_template_ref,documents:ordered,document_count:ordered.length,read_only:true,plan_only:true,executed:false,prod_writes:false,source_of_truth_preserved:true,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
