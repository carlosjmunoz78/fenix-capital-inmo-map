import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFact001ProviderEvidence} from './p0b-fact001-provider-evidence-gate.mjs';
const jobs=[
 ['worker.create_private','c1'],['worker.create_private','c2'],
 ['worker.update_private','u1'],['worker.rollback_private','r1'],
 ['worker.delete_private','d1'],['worker.delete_private','d2']
].map(([operation,id])=>({
 id,company_id:'fenix-capital',environment:'LAB',engine_id:'FACT-001',
 version:'1',request_id:'request-'+id,idempotency_key:'key-'+id,
 state:'COMPLETED',operation
}));
const events=jobs.map(j=>({job_id:j.id,event:'JOB_FINISHED',state:'COMPLETED'}));
const ownedWorkers=['worker-a','worker-b'].map(name=>({
 name,company_id:'fenix-capital',engine_id:'FACT-001',
 environment:'LAB',state:'DELETED'
}));
const input=()=>({jobs:structuredClone(jobs),events:structuredClone(events),
 ownedWorkers:structuredClone(ownedWorkers),providerScriptNames:['other-protected-worker']});
test('historical D1 jobs and final provider absence PASS only as PARTIAL',()=>{
 const result=auditFact001ProviderEvidence(input());
 assert.deepEqual([result.job_count,result.matching_terminal_events,result.deleted_workers_absent],[6,6,2]);
 assert.equal(result.historical_reconciliation,'MATCHED');
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.business_receipt_e2e,false);
 assert.equal(result.provider_job_receipt_verified,false);
 assert.equal(result.canonical_company_mapping_verified,false);
 assert.equal(result.cost_status,'NO_MEDIDO');
});
test('a completed D1 status or matching final state never becomes a provider receipt',()=>{
 const all=input();
 all.jobs.forEach(j=>{j.provider_acknowledged=true;j.receipt_id='untrusted-'+j.id});
 const result=auditFact001ProviderEvidence(all);
 assert.equal(result.business_receipt_e2e,false);
 assert.equal(result.provider_job_receipt_verified,false);
});
test('fail closed on missing provider inventory and no false zero',()=>{
 const o=input();delete o.providerScriptNames;
 const r=auditFact001ProviderEvidence(o);
 assert.equal(r.status,'NOT_CERTIFIED');
 assert.equal(r.job_count,null);
 assert.equal(r.deleted_workers_absent,null);
});
test('wrong company, unknown operation, duplicate request, or missing terminal denies',()=>{
 for(const mutation of [
  x=>{x.jobs[0].company_id='other-company'},
  x=>{x.jobs[0].operation='worker.delete_public'},
  x=>{x.jobs[1].request_id=x.jobs[0].request_id},
  x=>{x.events.pop()},
  x=>{x.events.push({...x.events[0],job_id:'orphan'})}
 ]){
  const x=input();mutation(x);
  assert.equal(auditFact001ProviderEvidence(x).status,'NOT_CERTIFIED');
 }
});
test('deleted resource must be absent in fresh provider inventory',()=>{
 const x=input();x.providerScriptNames.push('worker-b');
 assert.equal(auditFact001ProviderEvidence(x).reason,'DELETED_WORKER_STILL_PRESENT');
});
test('missing scope, duplicated resources and inconsistent events cannot certify',()=>{
 const x=input();x.ownedWorkers[0].company_id='fenix';
 assert.equal(auditFact001ProviderEvidence(x).status,'NOT_CERTIFIED');
 const y=input();y.events[0].state='FAILED';
 assert.equal(auditFact001ProviderEvidence(y).status,'NOT_CERTIFIED');
 const z=input();z.ownedWorkers[1].name=z.ownedWorkers[0].name;
 assert.equal(auditFact001ProviderEvidence(z).status,'NOT_CERTIFIED');
});
