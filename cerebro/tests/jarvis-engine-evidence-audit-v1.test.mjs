import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEngineEvidenceAudit} from '../runtime/jarvis-engine-evidence-audit-v1.mjs';

test('all registered engines receive an evidence classification with no operational overclaim',()=>{const a=buildEngineEvidenceAudit();assert.equal(a.registry_count,177);assert.equal(a.audited_engine_count,177);assert.equal(a.items.length,177);assert.equal(a.operational_claim_count,0);assert.equal(a.prod_authorized,false);assert.equal(a.trading_access,false);assert.equal(new Set(a.items.map(x=>x.engine_id)).size,177);assert.ok(a.items.every(x=>x.operational_claim===false&&x.requires_live_audit===true));});

test('known live-code engines have repository evidence beyond registration',()=>{const a=buildEngineEvidenceAudit();for(const id of ['ORCH-001','JOB-001','IAM-001','ROUTE-001','CONSOLE-001','EVA-001','JDG-001']){const x=a.items.find(v=>v.engine_id===id);assert.ok(x,`missing ${id}`);assert.notEqual(x.evidence_state,'REGISTERED_ONLY',`${id} should have evidence`);assert.ok(x.evidence_count>0,`${id} evidence_count`);}});

test('audit fingerprint is deterministic for the same repository state',()=>{const a=buildEngineEvidenceAudit();const b=buildEngineEvidenceAudit();assert.equal(a.audit_fingerprint,b.audit_fingerprint);});
