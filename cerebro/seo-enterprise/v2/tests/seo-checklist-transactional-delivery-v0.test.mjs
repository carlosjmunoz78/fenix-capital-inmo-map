import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 CHECKLIST_DELIVERY_V0,validateServerVerifiedRequest,validateSourcePdf,
 createTransactionalEmail,sendChecklistPreprodTest
} from '../runtime/seo-checklist-transactional-delivery-v0.mjs';

const D=CHECKLIST_DELIVERY_V0;
const JOB=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'v0',
 asset_id:D.asset_id,source_post_id:D.source_post_id,source_url:D.source_url,
 persona:'PARTICULARES',origin:'FENIX_WEB_LEAD_VERIFIED_EVENT',
 server_verified:true,lead_event_id:'00000000-0000-4000-a000-000000000001',
 request_id:'00000000-0000-4000-a000-000000000002',
 email:'test-owner@example.net',consent_privacy:true,consent_marketing:false,
 consent_privacy_at:'2026-11-06T08:00:00.000+01:00',
 privacy_notice_version:'fenix-privacy-2026-11'
});
const fakePdf=Buffer.alloc(D.expected_bytes,32);
fakePdf.write('%PDF-1.4',0,'ascii');
fakePdf.write('%%EOF',fakePdf.length-6,'ascii');
const fixtureVerifier=()=>({sha256:D.expected_sha256,bytes:D.expected_bytes,filename:D.filename});
test('strict tenant+asset+verified form consent and independent marketing flag',()=>{
 const a=validateServerVerifiedRequest(JOB);
 assert.equal(a.newsletter_subscription_authorized,false);
 assert.equal(a.consent_marketing,false);assert.equal(a.source_post_id,52656);
 for(const [key,bad] of [
  ['company_id','other'],['engine_id','SOC-001'],['environment','PROD'],
  ['version','v1'],['asset_id','wrong'],['source_post_id',1],
  ['source_url','https://staging.fenixcapital.es/'],['persona','INMOBILIARIAS'],
  ['origin','PUBLIC_BROWSER'],['server_verified',false],
  ['consent_privacy',false],['consent_marketing','yes'],
  ['lead_event_id','bad'],['request_id','not-a-uuid'],
  ['privacy_notice_version','unknown'],['consent_privacy_at','yesterday']
 ])assert.throws(()=>validateServerVerifiedRequest({...JOB,[key]:bad}));
 const yes=validateServerVerifiedRequest({...JOB,consent_marketing:true});
 assert.equal(yes.consent_marketing,true);
 assert.equal(yes.newsletter_subscription_authorized,false);
});
test('PDF only accepted on real byte length, valid signature, footer and exact SHA256',()=>{
 assert.equal(D.expected_sha256.length,64);
 const x=Buffer.from(fakePdf);
 assert.equal(validateSourcePdf(x,{expected_sha256:createHash('sha256').update(x).digest('hex'),expected_bytes:x.length}).bytes,D.expected_bytes);
 assert.throws(()=>validateSourcePdf(x),/PDF_SHA256_MISMATCH/);
 const short=Buffer.from('%PDF-1.4%%EOF');assert.throws(()=>validateSourcePdf(short),/PDF_SIZE_MISMATCH/);
 const bogus=Buffer.from(x);bogus[0]=0;assert.throws(()=>validateSourcePdf(bogus),/PDF_MAGIC_INVALID/);
 const broken=Buffer.from(x);broken.fill(32,broken.length-256);assert.throws(()=>validateSourcePdf(broken),/PDF_EOF_INVALID/);
});
test('Brevo payload is transactional with actual PDF attachment, no newsletter API or public URL',()=>{
 const a=createTransactionalEmail({request:JOB,pdfBytes:fakePdf,assetVerifier:fixtureVerifier});
 const b=a.brevo_request;
 assert.equal(b.to.length,1);
 assert.equal(b.to[0].email,JOB.email);
 assert.equal(b.sender.email,'hipotecas@fenixcapital.es');
 assert.equal(b.attachment[0].name,D.filename);
 assert.equal(b.attachment[0].content, fakePdf.toString('base64'));
 assert.ok(!JSON.stringify(b).includes('/v3/contacts'));
 assert.ok(!JSON.stringify(b).includes('seo-preprod-assets'));
 assert.equal(a.receipt.newsletter_subscription_authorized,false);
 assert.equal(a.receipt.publish_authorized,false);
 assert.equal(a.receipt.recipient_sha256.length,64);
 assert.equal(a.receipt.idempotency_key.length,48);
});
test('DRY_RUN never calls Brevo and never leaks recipient in sanitized receipt',async()=>{
 let calls=0;
 const a=await sendChecklistPreprodTest({request:JOB,pdfBytes:fakePdf,assetVerifier:fixtureVerifier,
   fetch_impl:async()=>{calls++;throw Error('NO_EXTERNAL_EMAIL');}});
 assert.equal(a.status,'DRY_RUN_ONLY_NO_EMAIL_SENT');
 assert.equal(calls,0);
 assert.equal(a.newsletter_subscription_authorized,false);
 assert.ok(!JSON.stringify(a).includes(JOB.email));
});
test('live PREPROD rejects fixture verifier bypass and never contacts Brevo',async()=>{
 let calls=0;
 const stub=async()=>{calls++;throw Error('NO_CALLS_EXPECTED');};
 await assert.rejects(()=>sendChecklistPreprodTest({request:JOB,pdfBytes:fakePdf,
   assetVerifier:fixtureVerifier,explicitTestSend:true,fetch_impl:stub,
   testRecipient:JOB.email,apiKey:'12345678901234'}),/LIVE_TEST_REQUIRES_CANONICAL_PDF_VERIFIER/);
 await assert.rejects(()=>sendChecklistPreprodTest({request:JOB,pdfBytes:fakePdf,
   explicitTestSend:true,fetch_impl:stub,
   testRecipient:JOB.email,apiKey:'12345678901234'}),/PDF_SHA256_MISMATCH/);
 assert.equal(calls,0);
});
test('no automatic marketing opt-in even for consent_marketing true',()=>{
 const a=createTransactionalEmail({request:{...JOB,consent_marketing:true},pdfBytes:fakePdf,assetVerifier:fixtureVerifier});
 assert.equal(a.receipt.marketing_consent_stored,true);
 assert.equal(a.receipt.newsletter_subscription_authorized,false);
 assert.equal(a.brevo_request.to.length,1);
});
