import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {issueSeoRoleProofs,verifyOneSeoRoleProof} from '../runtime/seo-workload-role-lease-v1.mjs';

// Synthetic inputs only. These tests MUST NOT claim an individual agent IAM principal.
const digest='b'.repeat(64);
const host={
 status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',role:'SEO_CORPUS_WORKER',
 company_id:'fenix',engine_id:'SEO-001',workload_oidc_verified:true,
 provider_job_verified:true,individual_agent_iam_verified:false,can_write_prod:false,
 github_job_id:47,github_run_id:48,oidc_token_sha256:'a'.repeat(64)
};
const receipts=Array.from({length:141},(_,i)=>{
 const dept='SEO-D'+String(Math.floor(i/5)+1).padStart(2,'0');
 return {role_id:dept+':SPECIALIST:'+String(i%5+1).padStart(2,'0'),
  department_id:dept,source_snapshot_digest:digest,example:'SYNTHETIC_TEST_ONLY'};
});
const now=1_790_000_000_000;
const bundle=issueSeoRoleProofs({host,role_work_receipts:receipts,corpus_digest:digest,now_ms:now});
const genuine=bundle.role_proofs[0];
const call=(proof=genuine,pem=bundle.public_key_pem,other={})=>
 verifyOneSeoRoleProof({proof,public_key_pem:pem,evidence:receipts[0],
  host_identity:host,corpus_digest:digest,now_ms:now+1000,...other});

function reSign(changes) {
 // Models a compromised signer: an independently valid Ed25519 signature
 // must not override the verifier's explicit no-write policy.
 const keys=crypto.generateKeyPairSync('ed25519');
 const payload={...genuine.payload,...changes};
 return {proof:{payload,signature:crypto.sign(null,Buffer.from(JSON.stringify(payload)),
   keys.privateKey).toString('base64url')},
   pem:keys.publicKey.export({type:'spki',format:'pem'}).toString()};
}
test('valid signed read-only receipt verifies but never creates an IAM principal',()=>{
 const out=call();
 assert.equal(out.decision,'SIGNED_READONLY_WORK_UNIT_PERMITTED');
 assert.equal(out.individual_agent_iam_identity_created,false);
 assert.equal(out.publishing_allowed,false);
});
test('signed escalation, bearer grant, self-impersonation and fabricated IAM are rejected',()=>{
 for(const change of [
  {can_spend:true},{can_publish:true},{can_write_prod:true},
  {grant_is_bearer:true},{can_impersonate_actor:true},
  {authentic_agent_iam_verified:true},{environment:'PROD'},
  {company_id:'other'},{engine_id:'OTHER'},{scope:'seo:publish'},
  {data_access:'PROD_MUTATION'},{kind:'IAM_AGENT_TOKEN'},
  {nonce:'invalid'},{expires_at_ms:now+1000000}
 ]) {
  const rogue=reSign(change);
  assert.throws(()=>call(rogue.proof,rogue.pem),/SEO_ROLE_LEASE_ROLE_CALL_DENIED/);
 }
});
test('wrong actor, corpus, issuer and expired receipts never verify',()=>{
 assert.throws(()=>call(genuine,bundle.public_key_pem,{now_ms:now-1}),/ROLE_CALL_DENIED/);
 assert.throws(()=>call(genuine,bundle.public_key_pem,{now_ms:now+600001}),/ROLE_CALL_DENIED/);
 assert.throws(()=>call(genuine,bundle.public_key_pem,{evidence:{...receipts[0],role_id:'SEO-D01:SPECIALIST:02'}}),/ROLE_CALL_DENIED/);
 assert.throws(()=>call(genuine,bundle.public_key_pem,{host_identity:{...host,github_job_id:99}}),/ROLE_CALL_DENIED/);
 assert.throws(()=>call(genuine,bundle.public_key_pem,{corpus_digest:'c'.repeat(64)}),/ROLE_CALL_DENIED/);
});
test('tampering with a signed payload fails even when flags look acceptable',()=>{
 const altered={...genuine,payload:{...genuine.payload,nonce:'c'.repeat(32)}};
 assert.throws(()=>call(altered),/ROLE_CALL_SIGNATURE/);
 assert.throws(()=>call(genuine,'not a public key'),/ROLE_CALL_SIGNATURE/);
});
