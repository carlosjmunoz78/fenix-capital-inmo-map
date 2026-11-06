import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const prefix='cerebro/seo-enterprise/v2/';
const registry=JSON.parse(read(prefix+'registry/seo-editorial-first-batch-2026-11-06.json'));
const corpus=JSON.parse(read(prefix+'data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json'));
const existingSlugs=new Set(corpus.documents.map(d=>d.slug));
const knownUrls=new Set(corpus.documents.map(d=>d.url));
const supplementalLinks=new Set(['https://fenixcapital.es/contacto/','https://fenixcapital.es/precio-maximo/',
 'https://fenixcapital.es/gastos-compra/','https://fenixcapital.es/que-piso-te-puedes-permitir/',
 'https://fenixcapital.es/financiacion-servicio-valor-inmobiliaria/']);
test('real corpus baseline, 200 pages, company scope and no WordPress writes',()=>{
 assert.equal(corpus.documents.length,200);assert.equal(registry.company_id,'fenix');
 assert.equal(registry.environment,'LAB');assert.equal(registry.live_wp_writes,0);
 assert.equal(registry.publish_authorized,false);assert.equal(registry.strategy_approved_via_authenticated_gateway,false);
 assert.deepEqual(registry.blocked_plugins,['WPVibe','Make']);
});
test('new draft slugs unique and absent from 200 existing URL snapshot',()=>{
 const slugs=registry.new_drafts.map(d=>d.target_slug);
 assert.equal(slugs.length,2);assert.equal(new Set(slugs).size,2);
 for(const slug of slugs){assert.match(slug,/^[a-z0-9-]{10,100}$/);assert.equal(existingSlugs.has(slug),false)}
});
test('B2C/B2B drafts are substantive and separate, links reference known sites',()=>{
 const personas=new Set();
 for(const draft of registry.new_drafts){
  const html=read(draft.content_path);assert.ok(html.length>3000);
  assert.match(html,/BORRADOR INTERNO, NO PUBLICAR/);
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.ok((html.match(/<h2>/g)||[]).length>=5);
  assert.ok((html.match(/<p>/g)||[]).length>=8);
  assert.equal(/<form\b/i.test(html),false);
  assert.equal(/type=["']?submit/i.test(html),false);
  assert.equal(/\[fenix_seo001_city_form/i.test(html),false);
  const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length>=2);
  for(const url of links){assert.equal(url.startsWith('https://fenixcapital.es/'),true);
   assert.ok(knownUrls.has(url)||supplementalLinks.has(url),'UNSUPPORTED_INTERNAL_LINK '+url);
  }
  assert.equal(draft.consent_marketing_auto_enroll,false);
  assert.equal(draft.regulatory_claims_verified,false);
  assert.match(draft.status,/QA/);
  assert.ok(draft.source_wp_post_ids.length>=3);
  personas.add(draft.persona);
 }
 assert.deepEqual([...personas].sort(),['INMOBILIARIAS','PARTICULARES']);
});
test('no premature publication, no staging link, no privacy data in Git artifacts',()=>{
 const docs=registry.new_drafts.map(x=>read(x.content_path)).join('\n');
 assert.equal(docs.includes('staging.fenixcapital.es'),false);
 assert.equal(/service_role|api-key|private_key|access_token/i.test(docs),false);
 assert.equal(/wp_update_post|wp_publish/i.test(docs),false);
 assert.equal(registry.required_gates.includes('PHYSICAL_BACKUP_AND_ROLLBACK'),true);
 assert.equal(registry.required_gates.includes('OWNER_APPROVAL_EXACT_REVISION'),true);
});
