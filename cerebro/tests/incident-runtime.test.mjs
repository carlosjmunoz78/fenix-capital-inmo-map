import test from 'node:test';import assert from 'node:assert/strict';import {classifyIncident} from '../supervisor/incident-runtime.mjs';
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
test('INC-001 preserves canonical incident reason',()=>{const r=classifyIncident({context,incident_id:'inc1',severity:'HIGH',reason:'POLICY_CONFLICT'});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');assert.equal(r.prod_write_allowed,false);assert.equal(r.trading_mutation_allowed,false)});
test('INC-001 maps critical unknown incident to security incident',()=>{const r=classifyIncident({context,incident_id:'inc1',severity:'CRITICAL',reason:'UNKNOWN'});assert.equal(r.reason,'SECURITY_INCIDENT')});
test('INC-001 maps noncritical unknown incident to high risk',()=>{const r=classifyIncident({context,incident_id:'inc1',severity:'MEDIUM'});assert.equal(r.reason,'HIGH_RISK')});
test('INC-001 blocks PROD',()=>{const r=classifyIncident({context:{...context,environment:'PROD'},incident_id:'inc1',severity:'HIGH'});assert.equal(r.reason,'HIGH_RISK')});
