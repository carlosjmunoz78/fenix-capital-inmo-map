import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {verifyJwtSignedByGithub} from '../runtime/seo-gh-oidc-workload-v1.mjs';
import {loadFrozenSeoCorpus,calculateCorpusEvidence,expectedSeoRoleEvidence,executeSeoCorpusWork,executeSeoCorpusViaGateway,reviewSeoCorpusWork,tribunalSeoCorpusWork} from '../runtime/seo-corpus-job001-work-v1.mjs';
const makeIdentity=(role,id)=>({status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',role,
 github_job_name:({'SEO_CORPUS_WORKER':'seo-corpus-worker','SEO_CORPUS_INDEPENDENT_QA':'seo-corpus-qa','SEO_CORPUS_TRIBUNAL':'seo-corpus-tribunal'})[role],
 oidc_token_sha256:crypto.createHash('sha256').update(String(id)).digest('hex'),
 oidc_subject_sha256:crypto.createHash('sha256').update('test-sub').digest('hex'),
 workload_oidc_verified:true,provider_job_verified:true,github_job_id:id,github_run_id:123,
 individual_agent_iam_verified:false,can_write_prod:false});
const tmp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-corpus-v1-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return path.join(dir,'journal.v8');};
test('frozen canonical corpus is consumed without network, 200 records, 10 nonduplicate chunks',()=>{
 const c=loadFrozenSeoCorpus(),e=calculateCorpusEvidence(c),roles=expectedSeoRoleEvidence(c);
 assert.equal(c.documents.length,200);assert.equal(c.parts.length,10);
 assert.equal(e.source_documents,200);assert.equal(roles.length,141);
 assert.equal(new Set(roles.map(x=>x.role_id)).size,141);
 assert.ok(e.image_tags_found>=0);assert.ok(e.pages_with_extracted_copy>0);
 assert.equal(c.wordpress_reaudited,false);
 assert.equal(roles.filter(x=>x.department_id==='SEO-D29').every(x=>x.claims_about_rankings===null),true);
 assert.equal(roles.filter(x=>x.department_id==='SEO-D30').every(x=>x.source_limitations.length>0),true);
});
test('JOB-001 records 141 real snapshot-derived receipts, distinct Github QA and tribunal recheck',t=>{
 const file=tmp(t),workerId=makeIdentity('SEO_CORPUS_WORKER',101),
 qaId=makeIdentity('SEO_CORPUS_INDEPENDENT_QA',102),
 tribunalId=makeIdentity('SEO_CORPUS_TRIBUNAL',103);
 const w=executeSeoCorpusWork({journal_path:file,identity:workerId});
 assert.equal(w.status,'READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED');
 assert.equal(w.role_work_receipts.length,141);
 assert.equal(w.completed_in_run,141);assert.equal(w.actual_iam_specialists,0);
 assert.equal(w.independent_qa_passed,false);assert.equal(w.web_mutations,0);
 const q=reviewSeoCorpusWork({worker:w,identity:qaId});
 assert.equal(q.rechecked_every_competency,true);
 const j=tribunalSeoCorpusWork({worker:w,qa:q,identity:tribunalId});
 assert.equal(j.status,'CORPUS_REAL_WORK_VERIFIED_NO_PROD_PROMOTION');
 assert.equal(j.role_evidence_accepted,141);assert.equal(j.certified_prod_departments,0);
 const again=executeSeoCorpusWork({journal_path:file,identity:workerId});
 assert.equal(again.newly_queued,0);assert.equal(again.duplicates,141);
 assert.equal(again.completed_in_run,0);
});
test('tampered reports, same-job reviewer, fake agent certifications and wrong scope denied',t=>{
 const w=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',201)});
 const wrong={...w,role_work_receipts:[...w.role_work_receipts]};
 wrong.role_work_receipts[0]={...wrong.role_work_receipts[0],competency:'invented'};
 assert.throws(()=>reviewSeoCorpusWork({worker:wrong,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',202)}),/RECOMPUTE_MISMATCH/);
 assert.throws(()=>reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',201)}),/RECEIPT_INVALID/);
 assert.throws(()=>executeSeoCorpusWork({journal_path:'/tmp/none',identity:makeIdentity('SEO_CORPUS_TRIBUNAL',201)}),/HOST_IDENTITY/);
 const q=reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',202)});
 assert.throws(()=>tribunalSeoCorpusWork({worker:w,qa:q,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',202)}),/TRIBUNAL_IDENTITY/);
});
test('JWT signed with valid asymmetric RSA key required; wrong audience/sha/signature rejected',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const now=Math.floor(Date.now()/1000),env={GITHUB_RUN_ID:'1009',GITHUB_RUN_ATTEMPT:'1',
 GITHUB_SHA:'a'.repeat(40),GITHUB_REF:'refs/pull/22/merge'};
 const payload={iss:'https://token.actions.githubusercontent.com',
 aud:'cerebro-seo-corpus-workload-lab-v1',iat:now,exp:now+480,
 repository:'carlosjmunoz78/fenix-capital-inmo-map',repository_owner:'carlosjmunoz78',
 event_name:'pull_request',workflow:'CEREBRO SEO Corpus Workforce Identity V1',
 run_id:env.GITHUB_RUN_ID,run_attempt:env.GITHUB_RUN_ATTEMPT,sha:env.GITHUB_SHA,ref:env.GITHUB_REF,
 sub:'repo:carlosjmunoz78/fenix-capital-inmo-map:pull_request'};
 const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'unit-test'})).toString('base64url');
 const sign=obj=>{const body=Buffer.from(JSON.stringify(obj)).toString('base64url');
 const content=header+'.'+body;const sig=crypto.sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64url');return content+'.'+sig};
 const jwk={...publicKey.export({format:'jwk'}),kid:'unit-test',use:'sig',alg:'RS256'};
 const good=sign(payload),jwks={keys:[jwk]};
 assert.equal(verifyJwtSignedByGithub({jwt:good,jwks,env,nowSeconds:now}).verified,true);
 assert.throws(()=>verifyJwtSignedByGithub({jwt:sign({...payload,aud:'wrong'}),jwks,env,nowSeconds:now}),/JWT_ISSUER_AUDIENCE/);
 assert.throws(()=>verifyJwtSignedByGithub({jwt:sign({...payload,sha:'b'.repeat(40)}),jwks,env,nowSeconds:now}),/JWT_CLAIMS/);
 const altered=good.slice(0,-3)+'aaa';
 assert.throws(()=>verifyJwtSignedByGithub({jwt:altered,jwks,env,nowSeconds:now}),/JWT_SIGNATURE/);
});

test('signed provider workload passes through existing ACTGW-001 to durable JOB-001, not merely a helper',async t=>{
 const p=makeIdentity('SEO_CORPUS_WORKER',301);
 p.github_run_id=42106140949;
 const result=await executeSeoCorpusViaGateway({journal_path:tmp(t),identity:p});
 assert.equal(result.gateway_receipt.gateway_id,'ACTGW-001');
 assert.equal(result.gateway_receipt.status,'ACTION_EXECUTED');
 assert.equal(result.gateway_receipt.audit_events,1);
 assert.equal(result.completed_in_run,141);
 assert.equal(result.web_mutations,0);
 assert.equal(result.prod_authorized,false);
});
