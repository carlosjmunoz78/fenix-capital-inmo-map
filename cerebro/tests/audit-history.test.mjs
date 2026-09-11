import test from 'node:test';import assert from 'node:assert/strict';import {buildAuditRecord} from '../audit/audit-history.mjs';
const base={context:{company_id:'fenix',environment:'SCAFFOLD',version:'0.1.0'},request_id:'r1',actor_id:'cerebro',action:'engine.query',decision:'ALLOW',evidence_ref:'run://1',secret_payload_included:false};
test('builds append-only audit record',()=>{const r=buildAuditRecord(base);assert.equal(r.status,'AUDIT_RECORD_READY');assert.equal(r.append_only,true);assert.equal(r.mutable,false)});
test('blocks secret payload in audit',()=>{assert.equal(buildAuditRecord({...base,secret_payload_included:true}).reason,'SECURITY_INCIDENT')});
