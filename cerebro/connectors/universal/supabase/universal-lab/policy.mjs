// FACT-001 Supabase universal management policy V0. Explicitly locked read-only until verified gates.
export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'});
export const PROJECTS=Object.freeze({
 prod:'cluhljgonannaafpmblx',
 map:'hnqlnvakzaywtafeiybt'
});
export const OWNED_PREFIX=/^cerebro-fact001-managed-edge-lab-[a-z0-9]{4,20}$/;
export const READ_OPERATIONS=Object.freeze(['supabase.project.read_inventory','supabase.edge.read_inventory','supabase.security.read_advisors']);
export const PLANNED_MUTATIONS=Object.freeze(['supabase.edge.create_owned_lab','supabase.edge.update_owned_lab','supabase.edge.rollback_owned_lab','supabase.edge.delete_owned_lab']);
export const WRITE_GATES=Object.freeze({
 inventory_signed_and_current:true,
 independent_management_pat_in_vault:true,
 new_paid_subscription_eur:0,
 source_dependency_mapping_complete:false,
 existing_behavior_regression_pass:false,
 physical_backup_verified:false,
 isolated_rollback_drill_verified:false,
 high_risk_security_findings_reviewed:false,
 autonomous_executor_verified:false
});
export function assertOrder(o){
 if(!o||typeof o!=='object'||Array.isArray(o))throw Error('SUPABASE_SCOPE_DENIED');
 const required=['company_id','engine_id','environment','version','provider','project_id','operation','request_id','idempotency_key','max_cost_eur'];
 if(JSON.stringify(Object.keys(o).sort())!==JSON.stringify(required.sort()))throw Error('SUPABASE_EXTRA_FIELD_DENIED');
 if(Object.entries(SCOPE).some(([k,v])=>o[k]!==v)||o.provider!=='supabase'||o.max_cost_eur!==0||
 !Object.values(PROJECTS).includes(o.project_id)||!/^FACT001-SUPABASE-[A-Z0-9-]{8,80}$/.test(o.request_id)||
 !/^[a-z0-9-]{12,100}$/.test(o.idempotency_key))throw Error('SUPABASE_SCOPE_DENIED');
 if(READ_OPERATIONS.includes(o.operation))return Object.freeze({status:'READ_ONLY_ALLOWED',project_id:o.project_id,operation:o.operation});
 if(PLANNED_MUTATIONS.includes(o.operation))throw Error('SUPABASE_HUMAN_REQUIRED_HIGH_RISK_GATES_RED');
 throw Error('SUPABASE_OPERATION_DENIED');
}
export function assertMutationReady(){throw Error('SUPABASE_HUMAN_REQUIRED_HIGH_RISK_GATES_RED');}
// No network, DDL, SQL, secrets, database or Edge API writes in V0 module.
