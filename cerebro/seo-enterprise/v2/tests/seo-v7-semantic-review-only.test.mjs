import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root='cerebro/seo-enterprise/v2/';
const manifest=JSON.parse(fs.readFileSync(root+'registry/seo001-semantic-v7-review-only-2026-11-08.json','utf8'));
const hash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const html={
 B2C:fs.readFileSync(root+'drafts/v7-semantic-review-only/compradores-V7-REVIEW-ONLY.html','utf8'),
 B2B:fs.readFileSync(root+'drafts/v7-semantic-review-only/inmobiliarias-V7-REVIEW-ONLY.html','utf8')};
function mainSections(s){
 const faq=s.search(/<section\b[^>]*class=["']faq["']/i);
 assert.ok(faq>0);
 const head=s.slice(0,faq),sections=[...head.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)];
 return {sections,tail:s.slice(faq)};
}
for(const persona of ['B2C','B2B']){
 test(persona+' exact immutable V7 output SHA and 6×3 paragraph ranges',()=>{
  const s=html[persona],m=manifest.reviews[persona],f=mainSections(s);
  assert.equal(hash(s),m.sha256);
  assert.equal((s.match(/<h1\b/gi)||[]).length,1);
  assert.equal(f.sections.length,6);
  for(const sec of f.sections){
   const paras=[...sec[0].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
   assert.equal(paras.length,3);
   for(const p of paras){
    const count=p[1].replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(Boolean).length;
    assert.ok(count>=60&&count<=85,'out-of-range paragraph '+count);
   }
  }
  assert.equal((f.tail.match(/class=["']faq-item["']/gi)||[]).length,6);
  assert.equal((f.tail.match(/<h3\b/gi)||[]).length,6);
  assert.equal((s.match(/<a\b/gi)||[]).length,3);
  assert.equal(/<(script|iframe|form|input|img)\b/i.test(s),false);
 });
}
test('V7 includes source-backed caveats and useful buyer/agency guidance',()=>{
 assert.match(html.B2C,/artículo 17\.11 de la Ley de Propiedad Horizontal/);
 assert.match(html.B2C,/pólizas alternativas con prestaciones equivalentes/);
 assert.match(html.B2C,/No existe una cantidad universal/);
 assert.match(html.B2B,/La tasación sigue pendiente de cita/);
 assert.match(html.B2B,/La visita consta realizada/);
 assert.match(html.B2B,/Nos han indicado que está pendiente/);
 assert.doesNotMatch(html.B2B,/un retraso tasación inmobiliaria Córdoba/);
 assert.doesNotMatch(html.B2B,/debe limitarse estrictamente/);
});
test('V7 remains LAB only with financial, production and legal gates closed',()=>{
 assert.equal(manifest.batch_id,'SEO001-SEMANTIC-EDITORIAL-V7-20261108');
 assert.equal(manifest.status,'SEMANTIC_REVIEW_ONLY_HOLD');
 assert.equal(manifest.environment,'LAB');
 assert.equal(manifest.company_id,'fenix');
 assert.equal(manifest.limits.model_calls,0);
 for(const [key,value] of Object.entries(manifest.limits))
  if(key.startsWith('allow_'))assert.equal(value,false,key);
 assert.ok(manifest.unverified.includes('INDEPENDENT_PROFESSIONAL_LEGAL_REVIEW'));
 assert.ok(manifest.unverified.includes('POSITIVE_B2B_FORM_CRM_E2E'));
});
