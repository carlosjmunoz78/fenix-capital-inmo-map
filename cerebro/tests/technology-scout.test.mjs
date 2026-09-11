import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreTechnologyCandidate,rankTechnologyCandidates} from '../technology-scout.mjs';
const context={company_id:'fenix',engine_id:'FACT-001',environment:'SCAFFOLD',version:'0.1.0'};
const candidate={candidate_id:'oss-a',source_ref:'repo://a',observed_at:'2026-09-11T00:00:00Z',version_ref:'1.0.0',license_ref:'MIT',cost_eur_month:0,security_notes:'none',integration_notes:'adapter',fit:90,maintainability:80,security:85,interoperability:90,reversibility:95};
test('scores zero-cost candidate deterministically',()=>{const r=scoreTechnologyCandidate({context,candidate,prod_write:false,trading_access:false});assert.equal(r.status,'SCORED');assert.equal(r.recommendation,'SHORTLIST');assert.equal(r.executed,false);});
test('paid candidate requires MONEY_LIMIT',()=>{const r=scoreTechnologyCandidate({context,candidate:{...candidate,cost_eur_month:1},prod_write:false,trading_access:false});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'MONEY_LIMIT');});
test('prod and trading fail closed',()=>{assert.equal(scoreTechnologyCandidate({context,candidate,prod_write:true,trading_access:false}).reason,'HIGH_RISK');assert.equal(scoreTechnologyCandidate({context,candidate,prod_write:false,trading_access:true}).reason,'POLICY_CONFLICT');});
test('ranking is deterministic',()=>{const b={...candidate,candidate_id:'oss-b',fit:70};const r=rankTechnologyCandidates([{context,candidate:b,prod_write:false,trading_access:false},{context,candidate,prod_write:false,trading_access:false}]);assert.equal(r[0].candidate_id,'oss-a');});
