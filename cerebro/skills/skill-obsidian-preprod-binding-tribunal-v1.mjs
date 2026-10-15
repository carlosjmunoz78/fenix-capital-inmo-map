const EXPECTED_ENGINES=Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);

export function tribunalObsidianPreprodBindings({report,judge}={}){
  const blockers=[];
  if(judge?.decision!=='GREEN_FOR_BINDING_TRIBUNAL'||judge?.green!==true) blockers.push('INDEPENDENT_BINDING_JUDGE_NOT_GREEN');
  if(report?.status!=='GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES') blockers.push('PREPROD_BINDINGS_NOT_GREEN');
  if(JSON.stringify((report?.bindings??[]).map((x)=>x.engine_id))!==JSON.stringify(EXPECTED_ENGINES)) blockers.push('CANONICAL_BINDING_SET_DRIFT');
  const unsafe=report?.prod_authorized!==false||report?.prod_write_authorized!==false||report?.trading_access!==false||report?.external_skill_code_execution!==false||report?.live_obsidian_cli_execution!==false||report?.filesystem_write!==false||report?.customer_data_used!==false||report?.canonical_knowledge_replaced!==false||report?.notion_or_rag_migration_authorized!==false||Number(report?.additional_cost_eur??0)!==0;
  if(unsafe) blockers.push('AUTHORITY_PRIVACY_OR_COST_REGRESSION');
  if((report?.bindings??[]).some((x)=>x.rollback_proven!==true||x.rebuild_default_disabled!==true||x.activation_authorized!==false)) blockers.push('BINDING_REVERSIBILITY_OR_AUTHORITY_DRIFT');
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_OBSIDIAN_PREPROD_BINDING_TRIBUNAL',
    alias_es:'Asistente seguro de conocimiento en Obsidian',green,
    decision:green?'GREEN_BINDINGS_FOR_FULL_BUILDOUT':'HOLD',blockers,
    approved_binding_ids:green?[...EXPECTED_ENGINES]:[],
    binding_activation_authorized:false,live_obsidian_cli_execution:false,filesystem_write:false,
    canonical_knowledge_migration_authorized:false,prod_authorized:false,prod_write_authorized:false,
    trading_access:false,additional_cost_eur:0,human_required:null,
    next_gate:green?'CONNECT_OBSERVABILITY_AUDIT_FINOPS_LRN_AND_DURABLE_IDEMPOTENT_BINDING':'FIX_BINDING_EVIDENCE'
  });
}
