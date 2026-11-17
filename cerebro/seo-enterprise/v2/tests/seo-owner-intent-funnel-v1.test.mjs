import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFrozenSeoCorpus} from '../runtime/seo-corpus-job001-work-v1.mjs';
import {buildSeoOwnerIntentFunnel,independentValidateOwnerIntentFunnel} from '../runtime/seo-owner-intent-funnel-v1.mjs';
import {makeSeoAudiovisualOrder,validateSeoAudiovisualOrder} from '../runtime/seo-audiovisual-brief-v1.mjs';

test('entire accepted 200 URL inventory receives individual owner, buyer persona and funnel without fresh crawl',()=>{
 const corpus=loadFrozenSeoCorpus(),m=buildSeoOwnerIntentFunnel({corpus});
 assert.equal(m.total_existing_urls,200);
 assert.equal(m.url_ownership.length,200);
 assert.equal(new Set(m.url_ownership.map(x=>x.url)).size,200);
 assert.equal(new Set(m.url_ownership.map(x=>x.post_id)).size,200);
 assert.equal(m.no_new_audit,true);
 assert.equal(m.source_digest,corpus.corpus_digest);
 assert.equal(m.authority.can_publish,false);
 assert.equal(m.authority.can_delete_url,false);
 assert.equal(m.authority.can_redirect,false);
 assert.equal(m.authority.can_create_new_url,false);
 assert.equal(m.uncertainty.google_cannibalization_verified,false);
 assert.equal(m.uncertainty.actual_forms_and_lead_magnets_connected_verified,false);
 assert.equal(m.url_ownership.every(x=>x.existing_url_preserved&&!x.page_mutation_authorized),true);
 assert.ok(m.funnel_contracts.length>4);
 assert.ok(m.funnel_contracts.every(x=>x.status==='DEFINED_NOT_VERIFIED_CONNECTED'));
 assert.equal(independentValidateOwnerIntentFunnel({proposed:m,corpus}).urls,200);
});

test('home and /inicio/ exact keyword conflict recognized but neither URL is deleted or redirected',()=>{
 const m=buildSeoOwnerIntentFunnel({corpus:loadFrozenSeoCorpus()});
 const home=m.url_ownership.find(x=>x.url==='https://fenixcapital.es/');
 const inicio=m.url_ownership.find(x=>x.url==='https://fenixcapital.es/inicio/');
 assert.ok(home&&inicio);
 assert.equal(home.focus_keyword_normalized,'hipotecas en cordoba');
 assert.equal(inicio.focus_keyword_normalized,home.focus_keyword_normalized);
 const collision=m.keyword_overlap_candidates.find(x=>x.keyword==='hipotecas en cordoba');
 assert.ok(collision);
 assert.equal(collision.primary_candidate_url,home.url);
 assert.equal(collision.candidate_existing_urls.length,2);
 assert.equal(collision.delete_url,false);
 assert.equal(collision.publish_or_redirect,false);
 assert.equal(collision.primary_url_choice_provisional,true);
});

test('same city B2C vs B2B routes preserved, forms and newsletter separated',()=>{
 const m=buildSeoOwnerIntentFunnel({corpus:loadFrozenSeoCorpus()});
 const b2c=m.url_ownership.find(x=>x.url==='https://fenixcapital.es/asesor-hipotecario-cordoba/');
 const b2b=m.url_ownership.find(x=>x.url==='https://fenixcapital.es/financiacion-compradores-inmobiliarias-cordoba/');
 assert.ok(b2c&&b2b);
 assert.equal(b2c.persona,'PARTICULAR_HIPOTECA');
 assert.equal(b2b.persona,'INMOBILIARIA_COLABORADORA');
 assert.equal(b2c.newsletter_line,'PARTICULARES');
 assert.equal(b2b.newsletter_line,'INMOBILIARIAS');
 assert.notEqual(b2c.form_contract,b2b.form_contract);
 assert.ok(m.cross_persona_pairs_to_preserve.some(x=>x.individual_url===b2c.url&&x.b2b_partner_url===b2b.url));
});

test('no invented metrics or existing opt-in implementation claims, no links to unapproved/new URLs',()=>{
 const m=buildSeoOwnerIntentFunnel({corpus:loadFrozenSeoCorpus()});
 const urls=new Set(m.url_ownership.map(x=>x.url));
 for(const r of m.url_ownership){
  assert.ok(r.proposed_supporting_links.every(x=>urls.has(x)&&x!==r.url));
  assert.equal(r.form_implemented_verified,false);
  assert.equal(r.lead_magnet_implemented_verified,false);
  assert.equal(r.newsletter_subscription_implemented_verified,false);
  assert.equal(r.tracking_ga4_verified,false);
  assert.equal(r.crm_integration_verified,false);
 }
 assert.equal(m.uncertainty.search_console_performance_verified,false);
 assert.ok(m.no_focus_keyword_in_snapshot.length>0);
});

test('independent QA rejects modified URL ownership, false publishing permission and fake funnel connections',()=>{
 const corpus=loadFrozenSeoCorpus(),m=buildSeoOwnerIntentFunnel({corpus});
 let changed=structuredClone(m);changed.url_ownership[0].page_mutation_authorized=true;
 assert.throws(()=>independentValidateOwnerIntentFunnel({proposed:changed,corpus}),/SOURCE_OR_INTENT_MISMATCH/);
 changed=structuredClone(m);changed.funnel_contracts[0].status='CONFIRMED_CONNECTED';
 assert.throws(()=>independentValidateOwnerIntentFunnel({proposed:changed,corpus}),/SOURCE_OR_INTENT_MISMATCH/);
 changed=structuredClone(m);changed.authority.can_redirect=true;
 assert.throws(()=>independentValidateOwnerIntentFunnel({proposed:changed,corpus}),/SOURCE_OR_INTENT_MISMATCH/);
});

test('existing creative producer receives full Fénix brand/rights/SEO instruction pack, no publishing',()=>{
 const corpus=loadFrozenSeoCorpus(),owner=buildSeoOwnerIntentFunnel({corpus});
 const c=makeSeoAudiovisualOrder({owner,corpus,post_id:960});
 assert.equal(c.source_existing_page,'https://fenixcapital.es/hipoteca-autonomos-cordoba-requisitos-documentacion/');
 assert.equal(c.producer_id,'CREATIVE-PROGRAMMATIC-RENDER-V1');
 assert.equal(c.studio,'UMS-001');
 assert.equal(c.brand_profile.magenta,'#870064');
 assert.equal(c.brand_profile.yellow,'#FFB71B');
 assert.equal(c.brand_profile.orange,'#FF5F00');
 assert.equal(c.brand_profile.background,'#222222');
 assert.equal(c.brand_profile.typography,'Montserrat');
 assert.equal(c.format,'SEO_IMAGE');
 assert.equal(c.width,1200);assert.equal(c.height,630);
 assert.equal(c.request_payload.publish_requested,false);
 assert.equal(c.request_payload.expected_cost_eur,0);
 assert.equal(c.request_payload.max_attempts,1);
 assert.equal(c.wordPress_page_modified,false);
 assert.equal(c.creative_brief.exact_source.stored_images_referenced,0);
 assert.equal(c.creative_brief.exact_source.rendered_page_image_absence_verified,false);
 assert.equal(c.creative_brief.constraints.new_url_forbidden,true);
 assert.equal(validateSeoAudiovisualOrder({order:c,corpus,owner}).can_enqueue_existing_producer,true);
 const modified=structuredClone(c);modified.request_payload.publish_requested=true;
 assert.throws(()=>validateSeoAudiovisualOrder({order:modified,corpus,owner}),/QA_ORDER_TAMPERING/);
});

test('creative request denied for unsupported article, unverified source and cross company',()=>{
 const corpus=loadFrozenSeoCorpus(),owner=buildSeoOwnerIntentFunnel({corpus});
 assert.throws(()=>makeSeoAudiovisualOrder({owner,corpus,post_id:1}),/PILOT_POST_ID_FROZEN/);
 const wrong=structuredClone(owner);wrong.authority.can_publish=true;
 assert.throws(()=>makeSeoAudiovisualOrder({owner:wrong,corpus}),/FROZEN_STRATEGY_REQUIRED/);
});
