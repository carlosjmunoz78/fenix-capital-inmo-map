const PREPROD='PREPROD';
export const STRICT_TERMINAL_STATES=Object.freeze(['FULL_REAL','ABSORBED','REJECTED','BLOCKED_EXTERNAL','HUMAN_REQUIRED']);

function authorityGreen(v={}){return v.prod_authorized===false&&v.prod_write_authorized===false&&v.prod_mutation_authorized!==true&&v.permission_expansion_authorized!==true&&v.external_skill_code_execution!==true&&v.customer_data_used!==true&&v.paid_fallback!==true&&v.spend_authorized!==true&&v.trading_access===false&&Number(v.additional_cost_eur??0)===0;}
function safeAuthority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}
function bindingReport(result){return result?.binding_report&&typeof result.binding_report==='object'?result.binding_report:result;}
function semanticBindingsGreen(report){const rows=report?.semantic_bindings;return Array.isArray(rows)&&rows.length>0&&rows.every((row)=>row?.status==='PASS'&&row?.real_consumption===true&&row?.meaningful_change===true&&row?.old_vs_new?.decision==='PASS'&&Number(row?.candidate_coverage)===1&&Number(row?.baseline_coverage)<1&&(!row?.physical_evidence_required||row?.physical_evidence===true));}

export function proveFullReal(result={}){
  const report=bindingReport(result);
  const checks=Object.freeze({
    full_safe_preprod:report?.status==='FULL_SAFE_PREPROD'&&report?.full_safe_preprod===true,
    exact_preprod:report?.environment===PREPROD,
    authority_boundary:authorityGreen(report),
    semantic_bindings:semanticBindingsGreen(report),
    old_vs_new:report?.per_binding_old_vs_new_pass===true,
    independent_tribunal:report?.independent_tribunal?.decision==='PASS',
    learning_green:report?.learning_sink?.decision==='LRN_FEEDBACK_PERSISTED'&&report?.learning_sink?.learning_outcome==='UNIVERSAL_SKILL_REAL_BINDINGS_GREEN',
    observability_green:report?.observability_green===true,
    finops_green:report?.finops_green===true&&Number(report?.cost_eur??0)===0,
    audit_green:report?.audit_green===true,
    rollback_rebuild:report?.backup_rollback_rebuild?.backup_ready===true&&report?.backup_rollback_rebuild?.rollback_green===true&&report?.backup_rollback_rebuild?.rebuild_green===true,
    persisted_restartable:report?.state_persisted===true&&report?.restartable===true,
    idempotency_proven:report?.idempotency_proven===true,
    physical_debt_zero:Array.isArray(report?.missing_physical_bindings)&&report.missing_physical_bindings.length===0
  });
  return Object.freeze({pass:Object.values(checks).every(Boolean),checks});
}

export function strictTerminalView(result={}){
  const internal_status=String(result?.status??'UNKNOWN');
  if(['ABSORBED','REJECTED','BLOCKED_EXTERNAL','HUMAN_REQUIRED'].includes(internal_status))return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_STRICT_TERMINAL_VIEW_V1',environment:result?.environment??PREPROD,internal_status,terminal_status:internal_status,terminal:true,full_real_proven:false,evidence_checks:Object.freeze({}),human_required:Object.freeze(Array.isArray(result?.human_required)?result.human_required:[]),blockers:Object.freeze(Array.isArray(result?.blockers)?result.blockers:[]),...safeAuthority()});
  if(internal_status==='FULL_SAFE_PREPROD'){
    const proof=proveFullReal(result);
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_STRICT_TERMINAL_VIEW_V1',environment:bindingReport(result)?.environment??PREPROD,internal_status,terminal_status:proof.pass?'FULL_REAL':null,terminal:proof.pass,full_real_proven:proof.pass,evidence_checks:proof.checks,human_required:Object.freeze([]),blockers:Object.freeze(proof.pass?[]:['FULL_REAL_EVIDENCE_INCOMPLETE']),...safeAuthority()});
  }
  const debt=internal_status==='ENGINEERING_TASK_REQUIRED'?'ENGINEERING_DEBT_REMAINS':'NON_TERMINAL_INTERNAL_STATE';
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_STRICT_TERMINAL_VIEW_V1',environment:result?.environment??PREPROD,internal_status,terminal_status:null,terminal:false,full_real_proven:false,evidence_checks:Object.freeze({}),human_required:Object.freeze(Array.isArray(result?.human_required)?result.human_required:[]),blockers:Object.freeze([...(Array.isArray(result?.blockers)?result.blockers:[]),debt]),...safeAuthority()});
}

export function strictTerminalBatchView(results=[]){if(!Array.isArray(results))throw new TypeError('results must be an array');const rows=Object.freeze(results.map((result)=>strictTerminalView(result)));const counts=Object.fromEntries(STRICT_TERMINAL_STATES.map((state)=>[state,rows.filter((row)=>row.terminal_status===state).length]));const non_terminal=rows.filter((row)=>!row.terminal).length;return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_STRICT_TERMINAL_BATCH_VIEW_V1',environment:PREPROD,total:rows.length,terminal_total:rows.length-non_terminal,non_terminal_total:non_terminal,terminal_counts:Object.freeze(counts),rows,...safeAuthority()});}
