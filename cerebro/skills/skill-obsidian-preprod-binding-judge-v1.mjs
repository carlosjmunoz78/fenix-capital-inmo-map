const EXPECTED_ENGINES=Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);

function unsafe(report){
  return report?.prod_authorized===true||report?.prod_write_authorized===true||report?.trading_access===true||report?.external_skill_code_execution===true||report?.live_obsidian_cli_execution===true||report?.filesystem_write===true||report?.canonical_knowledge_replaced===true||report?.notion_or_rag_migration_authorized===true||report?.customer_data_used===true||Number(report?.additional_cost_eur??0)!==0;
}

export function judgeObsidianPreprodBindings({report}={}){
  const blockers=[];
  if(report?.status!=='GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES') blockers.push('BINDING_REPORT_NOT_GREEN');
  if(report?.binding_count!==EXPECTED_ENGINES.length) blockers.push('BINDING_COUNT_MISMATCH');
  const ids=(report?.bindings??[]).map((item)=>item.engine_id);
  if(JSON.stringify(ids)!==JSON.stringify(EXPECTED_ENGINES)) blockers.push('ENGINE_BINDING_SET_OR_ORDER_DRIFT');
  if(unsafe(report)) blockers.push('REPORT_AUTHORITY_PRIVACY_OR_COST_REGRESSION');
  for(const binding of report?.bindings??[]){
    if(binding.environment!=='PREPROD') blockers.push(`NON_PREPROD:${binding.engine_id}`);
    if(binding.status!=='PREPROD_BINDING_OLD_VS_NEW_GREEN') blockers.push(`BINDING_NOT_GREEN:${binding.engine_id}`);
    if(binding.measurable_non_regressing_improvement!==true) blockers.push(`NO_MEASURED_IMPROVEMENT:${binding.engine_id}`);
    if(binding.rollback_proven!==true||binding.rebuild_default_disabled!==true||binding.after_state!=='DISABLED') blockers.push(`ROLLBACK_REBUILD_NOT_GREEN:${binding.engine_id}`);
    if(binding.activation_authorized!==false) blockers.push(`ACTIVATION_AUTHORITY_DRIFT:${binding.engine_id}`);
    if((binding.evidence??[]).length<2) blockers.push(`INSUFFICIENT_FIXTURE_EVIDENCE:${binding.engine_id}`);
    if((binding.evidence??[]).some((item)=>item.delta<=0||item.hard_gate_green!==true)) blockers.push(`FIXTURE_REGRESSION:${binding.engine_id}`);
  }
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_OBSIDIAN_PREPROD_BINDING_INDEPENDENT_JUDGE',
    alias_es:'Asistente seguro de conocimiento en Obsidian',green,
    decision:green?'GREEN_FOR_BINDING_TRIBUNAL':'HOLD',blockers,
    evaluated_engines:[...EXPECTED_ENGINES],execution_authorized:false,activation_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,human_required:null
  });
}
