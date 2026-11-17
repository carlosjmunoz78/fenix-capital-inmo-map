import test from 'node:test';
import assert from 'node:assert/strict';
import {signFact001LabReceiptV0,verifyFact001LabReceiptV0} from './fact001-receipt-signature-lab.mjs';
const signingKey=Uint8Array.from({length:32},(_,i)=>i+1); // Test-only; never a deployment key.
const receipt=()=>({
 receipt_id:'fact001-p0b-receipt-261116',run_id:'fact001-p0b-run-261116',
 job_id:'fact001-p0b-job-261116',request_id:'FACT001-P0B-261116-CREATE-001',
 idempotency_key:'fact001-p0b-idem-261116',company_id:'fenix-capital',
 engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 operation:'worker.create_private',resource_name:'cerebro-fact001-managed-lab-rproof261116',
 policy_version:'FACT001-LAB-POLICY-V1',provider:'CLOUDFLARE_WORKERS',
 provider_version_id:'ac121573-2b78-4e54-91f5-23c6fa2bcac9',
 readback_status:'READBACK_MATCHED_UNATTESTED',
 observed_at_ms:1794855052917,signer_key_id:'fact001-lab-key-v1'
});
test('LAB receipt signs and verifies canonical full-scope HMAC without revealing key',async()=>{
 const a=await signFact001LabReceiptV0({receipt:receipt(),signingKey});
 const b=await signFact001LabReceiptV0({receipt:receipt(),signingKey});
 assert.deepEqual(a,b);
 assert.equal(a.signature_is_provider_native,false);
 assert.equal(a.message_digest.length,64);
 assert.equal(await verifyFact001LabReceiptV0({envelope:a,signingKey}),true);
 assert.equal(await verifyFact001LabReceiptV0({envelope:a,signingKey:Uint8Array.from({length:32},(_,i)=>i+2)}),false);
});
test('different signed identifiers, company, environment, timestamps or versions cannot replay',async()=>{
 const a=await signFact001LabReceiptV0({receipt:receipt(),signingKey});
 for(const [field,value] of [['job_id','other-job'],['request_id','FACT001-P0B-DIFFERENT'],['company_id','fenix'],
 ['environment','PROD'],['provider_version_id','new-version'],['receipt_id','new-receipt'],
 ['idempotency_key','other-idem'],['observed_at_ms',1794855052918]]){
   assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,receipt:{...a.receipt,[field]:value}},signingKey}),false,field);
 }
});
test('forged digest, signature, scheme, provider flag and unknown receipt field rejected',async()=>{
 const a=await signFact001LabReceiptV0({receipt:receipt(),signingKey});
 assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,message_digest:'b'.repeat(64)},signingKey}),false);
 assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,signature_hex:'c'.repeat(64)},signingKey}),false);
 assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,signature_is_provider_native:true},signingKey}),false);
 assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,signature_scheme:'NONE'},signingKey}),false);
 assert.equal(await verifyFact001LabReceiptV0({envelope:{...a,receipt:{...a.receipt,admin:true}},signingKey}),false);
});
test('signing refuses weak key, PROD scope and arbitrary targets',async()=>{
 await assert.rejects(()=>signFact001LabReceiptV0({receipt:receipt(),signingKey:new Uint8Array(12)}),/SIGNING_KEY_INVALID/);
 await assert.rejects(()=>signFact001LabReceiptV0({receipt:{...receipt(),environment:'PROD'},signingKey}),/SCOPE_INVALID/);
 await assert.rejects(()=>signFact001LabReceiptV0({receipt:{...receipt(),resource_name:'cerebro-jarvis-lab-eu'},signingKey}),/SCOPE_INVALID/);
});
