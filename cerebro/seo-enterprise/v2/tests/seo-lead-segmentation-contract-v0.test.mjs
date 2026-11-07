import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFenixSeoLanding,prepareSeoFunnelRouting,analyzeLegacyMontillaForms} from '../runtime/seo-lead-segmentation-contract-v0.mjs';

const b2c='https://fenixcapital.es/asesor-hipotecario-montilla/';
const b2b='https://fenixcapital.es/financiacion-compradores-inmobiliarias-montilla/';
const leadmagnet='https://fenixcapital.es/checklist-visitar-piso-cordoba-antes-hipoteca/';

test('same city preserves B2B and B2C profiles, newsletter and resources',()=>{
 const a=classifyFenixSeoLanding({url:b2c}),b=classifyFenixSeoLanding({url:b2b});
 assert.equal(a.ok,true);assert.equal(b.ok,true);
 assert.equal(a.post_id,49114);assert.equal(b.post_id,49128);
 assert.equal(a.city,b.city);
 assert.equal(a.persona,'PARTICULARES');assert.equal(b.persona,'INMOBILIARIAS');
 assert.notEqual(a.source,b.source);assert.notEqual(a.funnel,b.funnel);
 assert.notEqual(a.form_contract,b.form_contract);assert.notEqual(a.resource,b.resource);
 assert.notEqual(a.newsletter_line,b.newsletter_line);
 assert.equal(a.publish_authorized,false);assert.equal(b.publish_authorized,false);
});
test('buyer checklist is B2C and never permits asset delivery before E2E',()=>{
 const v=prepareSeoFunnelRouting({url:leadmagnet,privacy_consent:true,marketing_consent:true});
 assert.equal(v.post_id,52656);assert.equal(v.persona,'PARTICULARES');
 assert.equal(v.newsletter_opt_in_allowed,true);
 assert.equal(v.newsletter_send_authorized,false);
 assert.equal(v.asset_delivery_authorized,false);
 assert.equal(v.lead_send_authorized,false);
});
test('privacy and marketing consent are independent and typed',()=>{
 assert.equal(prepareSeoFunnelRouting({url:b2c,privacy_consent:false,marketing_consent:true}).status,'PRIVACY_CONSENT_REQUIRED');
 const v=prepareSeoFunnelRouting({url:b2c,privacy_consent:true,marketing_consent:false});
 assert.equal(v.status,'PREPROD_ROUTING_ONLY');assert.equal(v.newsletter_opt_in_allowed,false);
 assert.equal(v.newsletter_line,'PARTICULARES');
 assert.throws(()=>prepareSeoFunnelRouting({url:b2c,privacy_consent:'true',marketing_consent:false}),/CONSENT_BOOLEAN_REQUIRED/);
});
test('no PROD, cross-company, staging, off-domain or query PII accepted',()=>{
 for(const obj of [{url:b2c,environment:'PROD'},{url:b2c,company_id:'other'},
   {url:'https://staging.fenixcapital.es/asesor-hipotecario-montilla/'},
   {url:'https://fakefenixcapital.es/asesor-hipotecario-montilla/'},
   {url:b2c+'?email=client@example.org'}]){
   assert.throws(()=>classifyFenixSeoLanding(obj),/DENIED/);
 }
 assert.equal(classifyFenixSeoLanding({url:'https://fenixcapital.es/otras/'}).ok,false);
});
test('frozen WordPress Montilla sample detects legacy resource collision but cannot modify production',()=>{
 const old='[fenix_seo001_city_form city="Montilla" funnel="STUDY"]';
 const r=analyzeLegacyMontillaForms([
   {post_id:49114,url:b2c,shortcode:old},
   {post_id:49128,url:b2b,shortcode:old}
 ]);
 assert.equal(r.legacy_shared_resource,'study_montilla');
 assert.notEqual(r.proposed.b2c.resource,r.proposed.b2b.resource);
 assert.equal(r.physical_crm_segregation_verified,false);
 assert.equal(r.newsletter_delivery_verified,false);
 assert.equal(r.publish_authorized,false);
});
