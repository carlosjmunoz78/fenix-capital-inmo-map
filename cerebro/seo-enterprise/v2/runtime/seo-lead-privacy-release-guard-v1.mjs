/** SEO-001 · Non-authorizing independent release requirements for web lead consent.
 * Never touches WordPress, CRM or Supabase. Does not accept client payloads, credentials or tokens.
 * Returns "READY_FOR_PRIVATE_REVIEW" at most; only the independent tribunal can certify PROD.
 */
const required=Object.freeze([
 'full_private_restore_attested','original_form_inventory_passed',
 'wordpress_privacy_value_e2e','elementor_real_privacy_value_e2e',
 'edge_guard_negative_qa','database_guard_negative_qa',
 'marketing_separate_consent_qa','valid_lead_delivery_shadow_passed',
 'idempotency_and_rate_limit_old_new','private_security_approval',
 'isolated_rollback_proven'
]);
export function evaluateSeo001LeadPrivacyRelease(receipt={}){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)) throw Error('EVIDENCE_OBJECT_REQUIRED');
 for(const k of Object.keys(receipt)){
  if(!required.includes(k)&&k!=='environment'&&k!=='company_id'&&k!=='engine_id')
   throw Error('UNKNOWN_EVIDENCE_FIELD_'+k);
 }
 const missing=required.filter(k=>receipt[k]!==true);
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  evidence_gates_required:required.length,checks_passed:required.length-missing.length,
  pending_evidence:missing,release_decision:missing.length?'HOLD':'READY_FOR_PRIVATE_REVIEW',
  wordpress_prod_writes_allowed:false,crm_prod_writes_allowed:false,
  self_approval_allowed:false,customer_contact_allowed:false,
  synthetic_client_data_in_production_allowed:false,
  independently_certified:false
 });
}
export const requirements=required;
