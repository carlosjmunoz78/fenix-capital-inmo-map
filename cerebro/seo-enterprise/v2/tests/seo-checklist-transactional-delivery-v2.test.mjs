import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {V2,canonicalSignedEvent,verifyV2ServerEvent,validateV2Pdf} from '../runtime/seo-checklist-transactional-delivery-v2.mjs';
import {CHECKLIST_DELIVERY_V0} from '../runtime/seo-checklist-transactional-delivery-v0.mjs';
const secret='non-production-32byte-secret-for-tests-1234';
const event=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'v2',
 asset_id:V2.asset_id,source_post_id:52656,source_url:V2.source_url,
 persona:'PARTICULARES',origin:'FENIX_WEB_LEAD_SERVER',
 lead_event_id:'00000000-0000-4000-a000-000000000011',
 request_id:'00000000-0000-4000-a000-000000000012',
 email:'test-only@example.invalid',consent_privacy:true,
 consent_privacy_at:'2026-11-06T08:00:00.000Z',
 privacy_notice_version:'fenix-privacy-2026-11',consent_marketing:false,
 issued_at:'2026-11-06T08:01:00.000Z'
});
const now=Date.parse('2026-11-06T08:02:00.000Z');
const signed=e=>createHmac('sha256',secret).update(canonicalSignedEvent(e)).digest('hex');
test('V1 contract conserved, V2 scoped separately',()=>{
 assert.equal(CHECKLIST_DELIVERY_V0.asset_id,'SEO-MAGNET-52656-CHECKLIST-V1');
 assert.equal(CHECKLIST_DELIVERY_V0.expected_bytes,99419);
 assert.equal(V2.asset_id,'SEO-MAGNET-52656-CHECKLIST-V2');
 assert.equal(V2.bytes,113703);assert.notEqual(V2.sha256,CHECKLIST_DELIVERY_V0.expected_sha256);
 assert.equal(V2.ledger_table,'cerebro_seo_checklist_delivery_v2');
});
test('valid server HMAC in PREPROD and separate consent',()=>{
 const a=verifyV2ServerEvent({event,signature:signed(event),serverSecret:secret,now});
 assert.equal(a.consent_privacy,true);assert.equal(a.consent_marketing,false);
 const withMarketing={...event,consent_marketing:true};
 assert.equal(verifyV2ServerEvent({event:withMarketing,signature:signed(withMarketing),serverSecret:secret,now}).consent_marketing,true);
 assert.equal(V2.newsletter_subscription_authorized,false);
});
test('browser boolean and unauthenticated submissions rejected',()=>{
 for(const forged of [{...event,server_verified:true},{...event,origin:'PUBLIC_BROWSER'},{...event,environment:'PROD'},{...event,persona:'INMOBILIARIAS'},
   {...event,consent_privacy:false},{...event,consent_marketing:'yes'},{...event,asset_id:'SEO-MAGNET-52656-CHECKLIST-V1'}])
  assert.throws(()=>verifyV2ServerEvent({event:forged,signature:signed(event),serverSecret:secret,now}));
 assert.throws(()=>verifyV2ServerEvent({event,signature:'0'.repeat(64),serverSecret:secret,now}),/SIGNATURE/);
 assert.throws(()=>verifyV2ServerEvent({event,signature:signed(event),serverSecret:'weak',now}),/SECRET/);
});
test('expired, future, and tampered events fail closed',()=>{
 assert.throws(()=>verifyV2ServerEvent({event,signature:signed(event),serverSecret:secret,now:now+11*60000}),/EXPIRED/);
 const tampered={...event,email:'attacker@example.invalid'};
 assert.throws(()=>verifyV2ServerEvent({event:tampered,signature:signed(event),serverSecret:secret,now}),/SIGNATURE/);
});
test('PDF exact byte constraints refuse synthetic and V1 length',()=>{
 const f=Buffer.alloc(V2.bytes,32);f.write('%PDF-',0,'ascii');f.write('%%EOF',f.length-6,'ascii');
 assert.throws(()=>validateV2Pdf(f),/SHA256/);
 assert.throws(()=>validateV2Pdf(Buffer.alloc(99419)),/SIZE/);
 assert.throws(()=>validateV2Pdf(Buffer.alloc(V2.bytes)),/MAGIC/);
});
