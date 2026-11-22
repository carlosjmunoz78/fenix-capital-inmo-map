import {readFileSync} from 'node:fs';

const contract=JSON.parse(readFileSync(new URL('../enterprise-family-staging.contract.json',import.meta.url),'utf8'));
const REQUIRED=Object.freeze([...contract.required_staging_to_prod_gates]);
const ARTIFACTS=Object.freeze(['inventory_ref','dependency_map_ref','staging_snapshot_ref','prod_readonly_baseline_ref','old_vs_new_ref','rollback_drill_ref','independent_verdict_ref','change_manifest_ref','canary_monitoring_plan_ref']);
const SAFE_REF=/^[a-zA-Z0-9][a-zA-Z0-9._:|\/-]{5,400}$/;

export function evaluateSeoReleaseCandidate(raw={}){
  const failures=[];
  const context=raw?.context??{};
  if(!context.company_id||!String(context.company_id).trim())failures.push('COMPANY_ID_REQUIRED');
  if(context.engine_id!=='SEO-001')failures.push('WRONG_ENGINE');
  if(context.environment!=='STAGING')failures.push('SOURCE_MUST_BE_STAGING');
  if(context.target_environment!=='PROD')failures.push('TARGET_MUST_BE_PROD');
  if(context.staging_host!=='staging.fenixcapital.es')failures.push('STAGING_HOST_MISMATCH');
  if(context.production_host!=='fenixcapital.es')failures.push('PROD_HOST_MISMATCH');
  if(raw?.additional_cost_eur!==0)failures.push('ZERO_ADDITIONAL_COST_NOT_CONFIRMED');
  if(raw?.side_effect_already_executed===true)failures.push('PREMATURE_SIDE_EFFECT');
  for(const key of ARTIFACTS){
    if(!SAFE_REF.test(String(raw?.evidence?.[key]??'')))failures.push('MISSING_OR_INVALID_EVIDENCE:'+key);
  }
  for(const gate of REQUIRED){
    const result=raw?.checks?.[gate];
    if(result?.status!=='PASS'||!SAFE_REF.test(String(result?.proof_ref??'')))failures.push('GATE_UNPROVEN:'+gate);
  }
  if(raw?.independent_review?.status!=='PASS'||raw?.independent_review?.self_certified!==false)failures.push('INDEPENDENT_REVIEW_UNPROVEN');
  if(raw?.policy?.prod_write_authorized===true)failures.push('UNEXPECTED_PROD_AUTHORITY');
  const allEvidencePresent=failures.length===0;
  return Object.freeze({
    contract_id:contract.contract_id,
    engine_id:'SEO-001',
    result:allEvidencePresent?'ELIGIBLE_FOR_SEPARATE_GOVERNED_RELEASE_REVIEW':'BLOCKED',
    failure_count:failures.length,
    failures:Object.freeze(failures),
    proof_is_physically_independent_verified:false,
    grants_prod_write:false,
    executes_wordpress_mutation:false,
    creates_release:false,
    requires_separate_live_evidence_validation:true,
    additional_cost_eur:0
  });
}
