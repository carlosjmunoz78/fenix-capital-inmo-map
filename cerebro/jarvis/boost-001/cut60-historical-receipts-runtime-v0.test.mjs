import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateHistoricalReceipts,runCut60HistoricalCanary} from './cut60-historical-receipts-runtime-v0.mjs';

const fixture=path.join(path.dirname(fileURLToPath(import.meta.url)),'cut60-upstream-historical-receipts-20261107.json');
const read=()=>JSON.parse(fs.readFileSync(fixture,'utf8'));
const corrupt=fn=>{const obj=read();fn(obj);return obj;};
const rejects=(fn,code)=>assert.throws(()=>validateHistoricalReceipts(corrupt(fn)),new RegExp(code));

test('historical immutable receipts validate exact 3 upstream refs and their DB state hashes',()=>{
 const r=validateHistoricalReceipts(read());
 assert.equal(Object.keys(r).length,3);
 assert.deepEqual(Object.keys(r).sort(),['KBOOT-001','SEOBOOT-001','SOCBOOT-001']);
 assert.match(r['SEOBOOT-001'].evidence_sha256,/^[0-9a-f]{64}$/);
});
test('actually invokes existing JS runtime twice using historical references, with new mock content',()=>{
 const bytes=fs.readFileSync(fixture);
 const a=runCut60HistoricalCanary(JSON.parse(bytes),bytes);
 const b=runCut60HistoricalCanary(JSON.parse(bytes),bytes);
 assert.deepEqual(a,b);
 assert.equal(a.upstream_db_receipts_matched,3);
 assert.equal(a.output_count,2);
 assert.deepEqual(a.outputs.map(x=>x.engine_id),['MKTBOOT-001','CRMBOOT-001']);
 assert.equal(a.outputs[0].source_count,3);
 assert.equal(a.outputs[1].source_count,1);
 assert.equal(a.outputs[0].source_refs.length,3);
 assert.equal(a.outputs[1].source_refs.length,1);
 assert.match(a.historical_upstream_receipt_bytes_sha256,/^[a-f0-9]{64}$/);
 for(const row of a.outputs){
   assert.equal(row.in_process_existing_runtime_executed,true);
   assert.equal(row.safe_to_send_to_record_preprod,false);
   assert.equal(row.official_green,false);
   assert.equal(row.output_kind,'SYNTHETIC_PLAN_ONLY');
 }
});
test('no production or historical state is claimed changed or certified by the read-only run',()=>{
 const o=runCut60HistoricalCanary(read());
 for(const field of [
 'actual_upstream_payloads_read','actual_upstream_runtime_reruns',
 'actual_prod_mkt_crm_physical_runs','actual_crm_data_read','actual_crm_writes',
 'actual_publications','actual_paid_calls','backend_record_rpc_calls',
 'official_engine_state_changes'
 ])assert.equal(o[field],0,field);
 assert.equal(o.prod_authorized,false);
 assert.equal(o.source_current_physical_proof,false);
 assert.equal(o.writer_authorized,false);
 assert.equal(o.independent_tribunal_pass,false);
});
test('cross-project, forged payload proof and authority fail closed',()=>{
 rejects(x=>{x.source_project_ref='cluhljgonannaafpmblx';},'INVALID_HISTORY_AND_AUTHORITY_SCOPE');
 rejects(x=>{x.company_id='other';},'INVALID_HISTORY_AND_AUTHORITY_SCOPE');
 rejects(x=>{x.live_upstream_reexecution_verified=true;},'INVALID_HISTORY_AND_AUTHORITY_SCOPE');
 rejects(x=>{x.source_payload_bytes_verified=true;},'INVALID_HISTORY_AND_AUTHORITY_SCOPE');
 rejects(x=>{x.prod_authorized=true;},'INVALID_HISTORY_AND_AUTHORITY_SCOPE');
});
test('tampering with any of the three true receipt hashes fails closed',()=>{
 for(const id of ['KBOOT-001','SEOBOOT-001','SOCBOOT-001']){
  rejects(x=>{x.receipts.find(r=>r.engine_id===id).evidence_sha256='0'.repeat(64);},'RECEIPT_MISMATCH');
  rejects(x=>{x.receipts.find(r=>r.engine_id===id).engine_evidence='f'.repeat(64);},'RECEIPT_MISMATCH');
 }
});
test('receipt idempotency, count, state, time, cost, and grant tampering rejected',()=>{
 rejects(x=>{x.receipts.pop();},'BAD_RECEIPT_COUNT');
 rejects(x=>{x.receipts[0].engine_id=x.receipts[1].engine_id;},'UNEXPECTED_OR_DUPLICATE_ENGINE');
 rejects(x=>{x.receipts[1].item_count=0;},'RECEIPT_MISMATCH');
 rejects(x=>{x.receipts[1].state='READY';},'RECEIPT_MISMATCH');
 rejects(x=>{x.receipts[1].cost='5.00';},'RECEIPT_MISMATCH');
 rejects(x=>{x.receipts[1].trading_access=true;},'RECEIPT_MISMATCH');
 rejects(x=>{x.receipts[1].evidence_at='2026-11-07 00:00:00+00';},'RECEIPT_MISMATCH');
 rejects(x=>{x.receipts[1].bootstrap_idempotency_key='not-proven';},'RECEIPT_MISMATCH');
});
