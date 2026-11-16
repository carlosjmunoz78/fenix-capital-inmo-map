import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFact001ReceiptFailureLabV0 as record} from './fact001-receipt-failure-audit-lab.mjs';
const jobId='FACT001-OPERATIVA-P0B-261116-SIGNED-CREATE-01';
const db=()=>{let writes=[];return {get writes(){return writes;},prepare(sql){return {bind(...values){return {async first(){writes.push({sql,values});return {event_id:17};}};}};}};
test('OFF mode creates no audit entries and does not inspect D1',async()=>{
 let calls=0;
 const result=await record({env:{FACT001_RECEIPTS_ENABLED:'false',RECOVERY_DB:{prepare(){calls++;throw Error('UNEXPECTED_IO')}}},
   jobId,result:{status:'NOT_CERTIFIED',reason:'PROVIDER_GET_OR_PERMISSION_FAILURE'}});
 assert.equal(result.status,'SKIPPED');assert.equal(calls,0);
});
test('authorized LAB failing receipt appends only an allowlisted error code, never raw payload',async()=>{
 const d=db();
 const result=await record({env:{FACT001_RECEIPTS_ENABLED:'true',RECOVERY_DB:d},
  jobId,result:{status:'NOT_CERTIFIED',reason:'PROVIDER_GET_OR_PERMISSION_FAILURE',
  token:'SECRET_ABC_NOT_TO_STORE',payload:{customer:'not-to-store'}},now:1794862839509});
 assert.equal(result.status,'DIAGNOSTIC_RECORDED');assert.equal(d.writes.length,1);
 assert.equal(d.writes[0].values[0],jobId);assert.equal(d.writes[0].values[1],'PROVIDER_GET_OR_PERMISSION_FAILURE');
 assert.equal(d.writes[0].values[2],1794862839509);
 const audit=JSON.stringify(d.writes);
 assert.equal(audit.includes('SECRET_ABC_NOT_TO_STORE'),false);
 assert.equal(audit.includes('not-to-store'),false);
 assert.match(d.writes[0].sql,/NOT EXISTS/);
 assert.match(d.writes[0].sql,/state='COMPLETED'/);
});
test('unknown reason is never echoed into D1 and only the sanitized bucket is written',async()=>{
 const d=db();
 await record({env:{FACT001_RECEIPTS_ENABLED:'true',RECOVERY_DB:d},
  jobId,result:{status:'NOT_CERTIFIED',reason:'BEARER supersecret literal'},now:1794862839509});
 assert.equal(d.writes[0].values[1],'UNKNOWN_SANITIZED_FAILURE');
 assert.equal(JSON.stringify(d.writes).includes('supersecret'),false);
});
test('wrong environment/scope, unknown job, successful receipt or invalid time must not write',async()=>{
 const d=db(),env={FACT001_RECEIPTS_ENABLED:'true',RECOVERY_DB:d};
 for(const value of [
  {jobId:'other',result:{status:'NOT_CERTIFIED',reason:'PROVIDER_GET_OR_PERMISSION_FAILURE'}},
  {jobId,result:{status:'DURABLE_LAB_RECEIPT_UNATTESTED'}},
  {jobId,result:{status:'NOT_CERTIFIED'},now:-1},
  {jobId,result:{status:'NOT_CERTIFIED'},now:'garbage'}
 ]){
  assert.equal((await record({env,...value})).status,'SKIPPED');
 }
 assert.equal(d.writes.length,0);
});
