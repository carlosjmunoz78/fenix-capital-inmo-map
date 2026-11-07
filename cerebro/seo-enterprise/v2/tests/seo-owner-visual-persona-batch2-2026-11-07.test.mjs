import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/training-pilots/SEO_D32_OWNER_VISUAL_PERSONA_BATCH2_2026-11-07.json','utf8'));
test('owner learns buyer-persona headline, not robot taxonomy title',()=>{
 assert.equal(policy.status,'TRAINING_EXAMPLE_AND_GATE_CONTRACT_ONLY_NOT_ROLLED_OUT_TO_PROD_AGENTS');
 assert.equal(policy.owner_lesson.find(x=>x.id==='H1_VISITOR_FIRST').accepted,'¿Tu comprador necesita hipoteca? Así coordinas la operación con claridad');
 assert.ok(policy.target_roles.includes('SEO-D03_BUYER_PERSONA'));
 assert.ok(policy.target_roles.includes('SEO-D32_LEARNING'));
});
test('batch2 contains four real drafts but images and page templates fail closed',()=>{
 assert.deepEqual(policy.batch2_drafts.map(x=>x.id),[52713,52714,52715,52716]);
 assert.deepEqual(policy.batch2_drafts.map(x=>x.type),['post','post','page','page']);
 assert.ok(policy.batch2_drafts.every(x=>x.media==='PENDING_UMS_OPENAI'));
 assert.equal(policy.batch2_drafts.filter(x=>x.template_qa==='BLOCKED_SINGLE_SERVICES_ACTUAL_PREVIEW').length,2);
 assert.equal(policy.policy.paid_image_request_executed,false);
 assert.equal(policy.policy.wordpress_publish,false);
});
test('producer briefs are unique and cannot masquerade as generated media',()=>{
 assert.equal(policy.media_briefs.length,4);
 assert.equal(new Set(policy.media_briefs.map(x=>x.id)).size,4);
 assert.equal(new Set(policy.media_briefs.map(x=>x.post_id)).size,4);
 assert.ok(policy.media_briefs.every(x=>x.prompt.length>120));
 assert.ok(policy.release_gates.includes('DISTINCT_ORIGINAL_UMS_OPENAI_RECEIPT_FOR_EACH_URL'));
 assert.ok(policy.release_gates.includes('TEMPLATE_RENDER_ACTUAL_PREVIEW_NO_SINGLE_SERVICES'));
 assert.ok(policy.policy.provider_automation_verified===false);
});
