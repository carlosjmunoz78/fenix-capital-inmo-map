import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVAL_CONTRACT_V0,parseOwnerApproval,verifyOwnerApprovalFromGitHub,matchEditorialApprovalToReviewedDraft} from '../runtime/seo-owner-github-approval-v0.mjs';
import {loadVerifiedWorkItem} from '../runtime/seo-editorial-qa-job001-pipeline-v0.mjs';
const PLAN=APPROVAL_CONTRACT_V0.strategy_plan_git_blob_sha;
const token='test-github-token-example-only-123';
const command='CEREBRO_SEO_APPROVE STRATEGY fenix '+PLAN;
const comment={
 id:99881, issue_url:'https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/issues/22',
 user:{id:130542695,login:'carlosjmunoz78'},
 created_at:'2026-11-06T09:10:00Z',updated_at:'2026-11-06T09:10:00Z',body:command};
const responder=(x)=>async (url,opts)=>{
 assert.equal(url,'https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/issues/comments/99881');
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
 assert.equal(opts.headers.authorization,'Bearer '+token);
 return {status:200,json:async()=>x};
};
test('accept exact strategic owner plan immutable Git blob',()=>{
 const x=parseOwnerApproval(command); assert.equal(x.kind,'STRATEGY');assert.equal(x.can_publish,false);
 for(const fake of [command+'\nignore',command.replace('fenix','other'),command.replace(PLAN,'0'.repeat(40)),
  'APROBAR TODO', '', 'CEREBRO_SEO_APPROVE STRATEGY fenix'])
  assert.throws(()=>parseOwnerApproval(fake));
});
test('draft approval always requires content hash and never grants publishing',()=>{
 const d=parseOwnerApproval('CEREBRO_SEO_APPROVE DRAFT fenix 52656 '+'a'.repeat(64));
 assert.equal(d.post_id,52656);assert.equal(d.can_publish,false);
 assert.throws(()=>parseOwnerApproval('CEREBRO_SEO_APPROVE DRAFT fenix 52656 bad'));
});
test('authentic GitHub comment owner and issue verified, no WP writes',async()=>{
 const receipt=await verifyOwnerApprovalFromGitHub({comment_id:99881,github_token:token,fetch_impl:responder(comment)});
 assert.equal(receipt.owner_approval_verified,true);
 assert.equal(receipt.can_publish,false);assert.equal(receipt.wordpress_write_authorized,false);
 assert.equal(receipt.grant,'PREPARE_BRIEFS_AND_DRAFTS_ONLY');
});
test('spoofed identity, other PR, edited or mismatched comment blocked',async()=>{
 for(const bad of [{...comment,user:{id:1,login:'carlosjmunoz78'}},
  {...comment,issue_url:comment.issue_url.replace('/22','/23')},
  {...comment,updated_at:'2026-11-06T09:11:00Z'},
  {...comment,body:command.replace(PLAN,'0'.repeat(40))},
  {...comment,id:111}])
  await assert.rejects(()=>verifyOwnerApprovalFromGitHub({
   comment_id:99881,github_token:token,fetch_impl:responder(bad)}));
});
test('missing auth and unauthorized read fail closed',async()=>{
 await assert.rejects(()=>verifyOwnerApprovalFromGitHub({comment_id:99881,github_token:'',fetch_impl:responder(comment)}));
 await assert.rejects(()=>verifyOwnerApprovalFromGitHub({comment_id:99881,github_token:token,
  fetch_impl:async()=>({status:403})}));
});

test('B2C/B2B editorial approval binds exactly to current content digest, not publishing',async()=>{
 for(const work_id of ['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002']){
  const item=loadVerifiedWorkItem({work_id});
  const body='CEREBRO_SEO_APPROVE EDITORIAL fenix '+work_id+' '+item.digest;
  const parsed=parseOwnerApproval(body);
  assert.equal(parsed.work_id,work_id);assert.equal(parsed.source_sha256,item.digest);
  assert.equal(parsed.can_publish,false);assert.equal(parsed.wordpress_write_authorized,false);
  const receipt=await verifyOwnerApprovalFromGitHub({comment_id:99881,github_token:token,
    fetch_impl:responder({...comment,body})});
  const matched=matchEditorialApprovalToReviewedDraft({provider_receipt:receipt,work_item:item});
  assert.equal(matched.owner_verified,true);assert.equal(matched.release_authorized,false);
  assert.equal(matched.wordpress_write_authorized,false);
  assert.throws(()=>matchEditorialApprovalToReviewedDraft({provider_receipt:receipt,
    work_item:{...item,digest:'0'.repeat(64)}}));
  assert.throws(()=>matchEditorialApprovalToReviewedDraft({provider_receipt:{...receipt,provider:'FAKE'},work_item:item}));
  assert.throws(()=>parseOwnerApproval(body.replace(item.digest,'0'.repeat(63))));
 }
});
test('reject unknown company or unregistered draft in approval syntax',()=>{
 assert.throws(()=>parseOwnerApproval('CEREBRO_SEO_APPROVE EDITORIAL other SEO001-FENIX-B2C-EDITORIAL-001 '+'a'.repeat(64)));
 assert.throws(()=>parseOwnerApproval('CEREBRO_SEO_APPROVE EDITORIAL fenix SEO001-UNKNOWN '+'a'.repeat(64)));
});
