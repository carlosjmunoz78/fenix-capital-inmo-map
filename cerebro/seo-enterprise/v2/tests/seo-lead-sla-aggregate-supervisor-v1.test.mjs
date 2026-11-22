import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSeoLeadSlaAggregate as audit} from '../runtime/seo-lead-sla-aggregate-supervisor-v1.mjs';
const base={observed_at:'2026-11-15T16:00:00Z',accepted_events:8,linked_events:5,unlinked_events:3,pending_tasks:4,overdue_tasks:3,unread_notifications:2,read_notifications:1};
test('overdue tasks escalate only to human, never contact a client or mutate CRM',()=>{
 const x=audit(base);
 assert.equal(x.review_state,'HUMAN_REVIEW_REQUIRED');
 assert.equal(x.human_exception,'HIGH_RISK');
 assert.ok(x.issues.includes('OVERDUE_HUMAN_FOLLOWUP'));
 assert.ok(x.issues.includes('UNREAD_OVERDUE_ALERT'));
 assert.equal(x.auto_customer_contact,false);
 assert.equal(x.auto_task_creation,false);
 assert.equal(x.auto_task_close,false);
 assert.equal(x.prod_writes,0);
});
test('legacy accepted event without client reference requires reconciliation, not automatic client creation',()=>{
 const x=audit({...base,pending_tasks:0,overdue_tasks:0,unread_notifications:0,read_notifications:0});
 assert.equal(x.review_state,'RECONCILIATION_REQUIRED');
 assert.equal(x.human_exception,null);
 assert.ok(x.issues.includes('UNLINKED_LEGACY_EVENTS_RECONCILIATION'));
 assert.equal(x.commercial_success_verified,false);
});
test('clean aggregate only proves absence of the specified exception, not conversion',()=>{
 const x=audit({...base,unlinked_events:0,linked_events:8,pending_tasks:0,overdue_tasks:0,unread_notifications:0,read_notifications:0});
 assert.equal(x.review_state,'NO_PENDING_EXCEPTION_IN_AGGREGATE');
 assert.equal(x.independently_approved,false);
 assert.equal(x.commercial_success_verified,false);
});
test('reject unknown keys to prevent PII, invalid and inconsistent aggregates',()=>{
 assert.throws(()=>audit({...base,email:'customer@example.com'}),/NO_PII_OR_UNKNOWN_FIELDS/);
 assert.throws(()=>audit({...base,pending_tasks:-1}),/INVALID_METRIC/);
 assert.throws(()=>audit({...base,overdue_tasks:5}),/INCONSISTENT/);
 assert.throws(()=>audit({...base,linked_events:9}),/INCONSISTENT/);
 assert.throws(()=>audit({...base,observed_at:'yesterday'}),/OBSERVATION_TIME_REQUIRED/);
});
