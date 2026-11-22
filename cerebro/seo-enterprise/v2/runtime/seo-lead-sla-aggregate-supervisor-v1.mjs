/** SEO-001 · Privacy-safe commercial follow-up detection from aggregate-only facts.
 * No SQL, network, emails, customer records or production write paths.
 * Escalation is a human exception, not consent to contact a customer.
 */
const fields=['observed_at','accepted_events','linked_events','unlinked_events','pending_tasks','overdue_tasks','unread_notifications','read_notifications'];
const metricFields=fields.slice(1);
const reject=code=>{throw new Error('SEO_LEAD_SLA_'+code)};
export function evaluateSeoLeadSlaAggregate(observation){
 if(!observation||typeof observation!=='object'||Array.isArray(observation))reject('AGGREGATE_OBJECT_REQUIRED');
 const extra=Object.keys(observation).filter(k=>!fields.includes(k));
 if(extra.length)reject('NO_PII_OR_UNKNOWN_FIELDS');
 if(fields.some(k=>!Object.hasOwn(observation,k)))reject('REQUIRED_FIELDS_MISSING');
 const time=observation.observed_at;
 if(typeof time!=='string'||!(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(time))||Number.isNaN(Date.parse(time)))
  reject('OBSERVATION_TIME_REQUIRED');
 for(const k of metricFields)if(!Number.isSafeInteger(observation[k])||observation[k]<0)reject('INVALID_METRIC_'+k);
 const m=observation;
 if(m.linked_events+m.unlinked_events>m.accepted_events||m.overdue_tasks>m.pending_tasks)
  reject('INCONSISTENT_GRAIN_OR_TOTALS');
 const issues=[];
 if(m.overdue_tasks>0)issues.push('OVERDUE_HUMAN_FOLLOWUP');
 if(m.unread_notifications>0&&m.overdue_tasks>0)issues.push('UNREAD_OVERDUE_ALERT');
 if(m.unlinked_events>0)issues.push('UNLINKED_LEGACY_EVENTS_RECONCILIATION');
 const human=m.overdue_tasks>0;
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  evidence_type:'PRIVATE_READONLY_AGGREGATE',
  observed_at:time,
  review_state:human?'HUMAN_REVIEW_REQUIRED':issues.length?'RECONCILIATION_REQUIRED':'NO_PENDING_EXCEPTION_IN_AGGREGATE',
  human_exception:human?'HIGH_RISK':null,
  issues,issue_count:issues.length,
  commercial_success_verified:false,manual_contact_verified:false,
  auto_customer_contact:false,auto_task_close:false,auto_task_creation:false,
  customer_data_read:false,credential_access:false,
  prod_writes:0,subscription_cost_eur:0,
  independently_approved:false
 });
}
