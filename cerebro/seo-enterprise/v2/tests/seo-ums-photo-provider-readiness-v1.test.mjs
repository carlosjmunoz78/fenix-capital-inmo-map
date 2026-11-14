import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/registry/seo001-ums-cloud-photo-provider-readiness-v1.json','utf8'));
test('no unverified provider may dispatch media or spend API funds',()=>{
 assert.equal(p.company_id,'fenix');
 assert.equal(p.engine_id,'UMS-001');
 assert.equal(p.environment,'PREPROD');
 assert.equal(p.credit_balance_known,false);
 assert.equal(p.credit_spend_not_permitted_by_this_file,true);
 assert.equal(p.production_photographic_pipeline_ready,false);
 assert.equal(p.wordpress_upload_authorized,false);
 assert.equal(p.publish_authorized,false);
 assert.equal(p.image_api_requests_executed,0);
 assert.ok(p.candidates.every(x=>x.dispatch_authorized===false));
 assert.ok(p.candidates.every(x=>x.available_as_cerebro_gateway_connector===false));
});
test('existing ChatGPT app connector not misrepresented as a CEREBRO Gateway API credential',()=>{
 const canva=p.candidates.find(x=>x.provider==='CANVA');
 const adobe=p.candidates.find(x=>x.provider==='ADOBE_FIREFLY');
 assert.equal(canva.available_in_chat,true);
 assert.equal(adobe.available_in_chat,true);
 assert.equal(canva.account_plan_verified,false);
 assert.equal(adobe.remaining_quota_verified,false);
 assert.equal(canva.api_credential_ref,null);
 assert.equal(adobe.api_credential_ref,null);
 assert.equal(p.manual_chat_generation_not_equal_to_autonomous_gateway_integration,true);
});
test('gpt-image-1 already retired; new paid image provider remains blocked until quota and spend attestation',()=>{
 const openai=p.candidates.find(x=>x.provider==='OPENAI_IMAGE_API');
 assert.ok(openai.retired_disallowed_models.includes('gpt-image-1'));
 assert.ok(openai.candidate_models.every(x=>/^gpt-image-2\.[56]-(flare|sunburst)$/.test(x)));
 assert.equal(openai.paid_api_request,true);
 assert.equal(openai.dispatch_authorized,false);
 assert.equal(openai.remaining_quota_verified,false);
 assert.equal(p.paid_api_requests_executed,0);
});
