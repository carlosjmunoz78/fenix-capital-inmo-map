import test from 'node:test';
import assert from 'node:assert/strict';
import {triageComplaint} from '../customer/complaints-engine.mjs';
const context={company_id:'fenix',engine_id:'CMP-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,customer_requests_human:false,security_incident:false,legal_risk:false,confidence:0.95,source_refs:['complaint:1'],severity:4,category:'SERVICE'};
test('CMP-001 prepares priority complaint triage',()=>{const r=triageComplaint(base);assert.equal(r.status,'COMPLAINT_TRIAGE_READY');assert.equal(r.priority,'P1');assert.ok(r.actions.includes('PRIORITY_REVIEW'));assert.ok(r.actions.includes('PREPARE_REMEDIATION_PLAN'));assert.equal(r.executed,false);});
test('CMP-001 honors human and legal/security escalation',()=>{assert.equal(triageComplaint({...base,customer_requests_human:true}).reason,'CUSTOMER_HUMAN_REQUEST');assert.equal(triageComplaint({...base,security_incident:true}).reason,'SECURITY_INCIDENT');assert.equal(triageComplaint({...base,legal_risk:true}).reason,'LEGAL_REQUIRED');});
test('CMP-001 gates writes authorization and confidence',()=>{assert.equal(triageComplaint({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(triageComplaint({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(triageComplaint({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('CMP-001 rejects missing evidence and invalid severity',()=>{assert.throws(()=>triageComplaint({...base,source_refs:[]}));assert.throws(()=>triageComplaint({...base,severity:6}));});
