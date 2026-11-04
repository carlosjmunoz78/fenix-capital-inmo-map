import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB6PgJournal} from './jarvis-b6-pg-journal.mjs';
const base={ownerId:'ci-owner',companyId:'fenix',environment:'LAB',missionId:'m-1',
 capability:'GITHUB_FILE_READ',connectorId:'jarvis-b6-allowlisted-github-read',
 idempotencyKey:'same-key',fingerprint:'a'.repeat(64)};
const receipt={owner_id:base.ownerId,company_id:base.companyId,environment:base.environment,
 mission_id:base.missionId,capability:base.capability,connector_id:base.connectorId,
 idempotency_key:base.idempotencyKey,fingerprint:base.fingerprint,
 evidence_hash:'b'.repeat(64),state:'COMPLETED'};
const setup=(statuses=[],candidate=receipt)=>{const calls=[];
 const query=async(sql,values)=>{calls.push({sql,values});
  if(sql.includes('FROM zeus_jarvis_b6_lab.execution_claim'))return[candidate];
  return[{result:statuses.shift()??'DENY'}];
 };
 return{journal:createJarvisB6PgJournal({query}),calls};
};
test('B6 CUT02 requires trusted query adapter',()=>{
 assert.throws(()=>createJarvisB6PgJournal(),/B6_TRUSTED_PARAMETERIZED_QUERY_REQUIRED/);
});
test('B6 CUT02 valid claim calls parameterized SQL exactly once',async()=>{
 const{journal,calls}=setup(['CLAIMED']);const r=await journal.claim(base);
 assert.equal(r.state,'CLAIMED');assert.equal(calls.length,1);
 assert.equal(calls[0].values.length,8);
 assert.equal(calls[0].sql.includes(base.ownerId),false);
});
test('B6 CUT02 in-progress claim cannot trigger another connector read',async()=>{
 assert.equal((await setup(['IN_PROGRESS']).journal.claim(base)).state,'IN_PROGRESS');
});
test('B6 CUT02 conflicting fingerprint triggers fail-closed collision',async()=>{
 assert.equal((await setup(['CONFLICT']).journal.claim(base)).state,'CONFLICT');
});
test('B6 CUT02 completed proof must come from exact journal scope',async()=>{
 const {journal,calls}=setup(['ALREADY_COMPLETED']);
 const r=await journal.claim(base);
 assert.equal(r.state,'ALREADY_COMPLETED');assert.equal(r.evidenceHash,receipt.evidence_hash);
 assert.equal(r.missionId,base.missionId);assert.equal(calls.length,2);
});
test('B6 CUT02 wrong company on completed receipt is rejected',async()=>{
 const {journal}=setup(['ALREADY_COMPLETED'],{...receipt,company_id:'aion'});
 assert.equal((await journal.claim(base)).state,'DENY');
});
test('B6 CUT02 wrong mission or key on completed receipt is rejected',async()=>{
 for(const wrong of [{mission_id:'different'},{idempotency_key:'different'},{connector_id:'wrong'}]){
  const{journal}=setup(['ALREADY_COMPLETED'],{...receipt,...wrong});
  assert.equal((await journal.claim(base)).state,'DENY');
 }
});
test('B6 CUT02 completed journal row without valid SHA256 is rejected',async()=>{
 const {journal}=setup(['ALREADY_COMPLETED'],{...receipt,evidence_hash:'incorrect'});
 assert.equal((await journal.claim(base)).state,'DENY');
});
test('B6 CUT02 failed terminal claim never resets to claimed automatically',async()=>{
 const {journal}=setup(['PREVIOUS_FAILED_NO_AUTORETRY']);
 assert.equal((await journal.claim(base)).state,'DENY');
});
test('B6 CUT02 malformed scope and forged PROD request fail before touching DB',async()=>{
 const{journal,calls}=setup();
 assert.equal((await journal.claim({...base,environment:'PROD'})).state,'DENY');
 assert.equal((await journal.claim({...base,ownerId:{}})).state,'DENY');
 assert.equal((await journal.claim({...base,companyId:'x y'})).state,'DENY');
 assert.equal((await journal.claim({...base,fingerprint:'bad'})).state,'DENY');
 assert.deepEqual(calls,[]);
});
test('B6 CUT02 atomic complete uses evidenceHash and matching claim fingerprint',async()=>{
 const{journal,calls}=setup(['COMPLETED']);
 const ok=await journal.complete({...base,evidenceHash:'c'.repeat(64)});
 assert.equal(ok,true);assert.equal(calls[0].values[8],'c'.repeat(64));
});
test('B6 CUT02 invalid or missing evidence hash blocks complete',async()=>{
 const{journal,calls}=setup();
 assert.equal(await journal.complete({...base,evidenceHash:'bad'}),false);
 assert.equal(await journal.complete(base),false);
 assert.deepEqual(calls,[]);
});
test('B6 CUT02 journal fail accepts only a safe static error code',async()=>{
 const{journal,calls}=setup(['FAILED']);
 assert.equal(await journal.fail({...base,reason:'CONNECTOR_READ_FAILED'}),true);
 assert.equal(calls[0].values[8],'CONNECTOR_READ_FAILED');
});
test('B6 CUT02 journal fail rejects raw exception text before DB',async()=>{
 const{journal,calls}=setup();
 assert.equal(await journal.fail({...base,reason:'error secret=abc'}),false);
 assert.deepEqual(calls,[]);
});
test('B6 CUT02 unexpected status returns DENY not CLAIMED',async()=>{
 const {journal}=setup(['ALREADY_PAID']);
 assert.equal((await journal.claim(base)).state,'DENY');
});
test('B6 CUT02 database outage is not hidden as a successful claim',async()=>{
 const journal=createJarvisB6PgJournal({query:async()=>{throw Error('CONNECTION_DOWN');}});
 await assert.rejects(journal.claim(base),/CONNECTION_DOWN/);
});
