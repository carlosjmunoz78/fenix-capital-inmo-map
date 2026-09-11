export function analyzeCadastre(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],cadastre_ref='',cadastre_area_sqm=0,registry_area_sqm=0,use='',parcel_ref='',max_area_diff_pct=10}=input;
  if (!context.company_id || context.engine_id!=='CAT-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!cadastre_ref || !parcel_ref || !(cadastre_area_sqm>0)) throw new Error('CADASTRE_INPUT_REQUIRED');
  let areaDiffPct=null;
  if (registry_area_sqm>0) areaDiffPct=Math.abs(cadastre_area_sqm-registry_area_sqm)/Math.max(cadastre_area_sqm,registry_area_sqm)*100;
  const coherent=areaDiffPct===null ? null : areaDiffPct<=Number(max_area_diff_pct);
  return {status:coherent===false?'HUMAN_REQUIRED':'CADASTRE_ANALYSIS_READY',reason:coherent===false?'HIGH_RISK':null,engine_id:'CAT-001',company_id:context.company_id,cadastre_ref,parcel_ref,use,cadastre_area_sqm:Number(cadastre_area_sqm),registry_area_sqm:Number(registry_area_sqm||0),area_diff_pct:areaDiffPct===null?null:Number(areaDiffPct.toFixed(2)),coherent_with_registry:coherent,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
