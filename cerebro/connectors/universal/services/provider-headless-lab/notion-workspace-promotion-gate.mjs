// FACT-001 Notion full-workspace recovery and promotion policy.
// Deterministic, synchronous, side-effect-free. A scoped Wiki backup is not a
// workspace-complete backup. Empty or unbounded inventory never grants PROD.
const REQUIRED=Object.freeze([
 'scope_authorized','company_scope_verified','workspace_roots_enumerated',
 'full_page_graph_exported','database_and_data_sources_exported',
 'blocks_and_properties_exported','external_files_manifested',
 'archived_and_trash_covered','encrypted_private_offsite_archive',
 'checksum_and_counts_verified','restoration_on_isolated_lab',
 'restored_content_parity','policy_and_permissions_approved',
 'audit_logs_and_observability_verified','cost_guard_zero_eur',
 'rollback_of_broker_worker_d1_verified','human_exception_rules_applied'
]);
export const NOTION_PROMOTION_REQUIRED_GATES=REQUIRED;
const isInteger=x=>Number.isSafeInteger(x)&&x>=0;
export function evaluateNotionWorkspacePromotion(evidence={}){
 const failures=[];
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return {
  status:'BLOCKED',environment:'LAB',all_verified:false,failed_gates:REQUIRED.slice(),reason:'INVALID_EVIDENCE'};
 for(const gate of REQUIRED)if(evidence[gate]!==true)failures.push(gate);
 const counts=evidence.inventory;
 if(!counts||typeof counts!=='object'||Array.isArray(counts)||
    !isInteger(counts.workspace_roots)||counts.workspace_roots===0||
    !isInteger(counts.exported_roots)||!isInteger(counts.pages)||
    !isInteger(counts.exported_pages)||!isInteger(counts.databases)||
    !isInteger(counts.exported_databases)||!isInteger(counts.missing_permissions)||
    counts.exported_roots!==counts.workspace_roots||
    counts.exported_pages!==counts.pages||counts.exported_databases!==counts.databases||
    counts.missing_permissions!==0)failures.push('INVENTORY_PARITY');
 if(evidence.backup_kind!=='FULL_NOTION_WORKSPACE'||
    typeof evidence.backup_sha256!=='string'||!/^[a-f0-9]{64}$/.test(evidence.backup_sha256)||
    typeof evidence.restore_evidence_ref!=='string'||!/^FACT001-LAB-RESTORE-[A-Z0-9-]{8,80}$/.test(evidence.restore_evidence_ref))failures.push('FULL_RESTORE_PROVENANCE');
 if(evidence.multi_company_boundaries!==true||evidence.trading_isolated!==true||
   evidence.prod_authorized!==true)failures.push('POLICY_APPROVAL');
 const ok=failures.length===0;
 return {status:ok?'ELIGIBLE_FOR_GRADUAL_PROMOTION_REVIEW':'BLOCKED',environment:'LAB',
  all_verified:ok,failed_gates:failures,prod_deployed:false,
  requires_gradual_promotion:ok,provider_writes_performed:0};
}
