/** Jaén P0 certificate repair planner: PURE; never writes to WordPress.
 * Tested on current FAQ structure, but actual patch must pass QA, rollback and owner gates.
 */
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function plain(s){
 return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}
export function prepareJaenSchemaRepair({post,expected_content_sha256}={}){
 if(!post||post.ID!==52200||post.status!=='publish'||post.type!=='page'||
    post.slug!=='asesor-hipotecario-jaen')throw Error('JAEN_CERT_POST_SCOPE');
 const original=post.content;
 if(typeof original!=='string'||original.length<1000)throw Error('JAEN_CERT_SOURCE_INVALID');
 if(typeof expected_content_sha256!=='string'||hash(original)!==expected_content_sha256)
  throw Error('JAEN_CERT_SOURCE_VERSION_MISMATCH');
 if(original.includes('data-fenix-guard-schema="seo001"')||original.includes('"@type":"FAQPage"'))
  throw Error('JAEN_CERT_PARTIAL_REPAIR_REQUIRES_REAUDIT');
 if(!original.includes('"@type":"Service"'))throw Error('JAEN_CERT_SERVICE_SCHEMA_MISSING');
 const marker='<div class="wrap faq">';
 const anchor='<h2>Preguntas frecuentes sobre hipotecas en Jaén</h2>';
 if(original.split(marker).length!==2||original.split(anchor).length!==2)
  throw Error('JAEN_CERT_FAQ_STRUCTURE_CHANGED');
 const i=original.indexOf(marker),stop=original.indexOf('</div>',i);
 if(stop<0||stop-i>12000)throw Error('JAEN_CERT_FAQ_STRUCTURE_INVALID');
 const block=original.slice(i,stop);
 const matches=[...block.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi)];
 if(matches.length<3||matches.length>12)throw Error('JAEN_CERT_FAQ_ITEM_COUNT');
 const questions=matches.map(m=>({name:plain(m[1]),text:plain(m[2])}));
 if(questions.some(x=>x.name.length<12||x.text.length<20||x.name.length>220||x.text.length>1000))
  throw Error('JAEN_CERT_FAQ_CONTENT_QUALITY');
 if(new Set(questions.map(q=>q.name)).size!==questions.length)
  throw Error('JAEN_CERT_DUPLICATE_FAQ');
 const structured={
  '@context':'https://schema.org','@type':'FAQPage',
  mainEntity:questions.map(x=>({'@type':'Question',name:x.name,
   acceptedAnswer:{'@type':'Answer',text:x.text}}))
 };
 const jsonld=JSON.stringify(structured).replace(/</g,'\\u003c');
 const marked=original.replace(marker,'<div class="wrap faq" data-fenix-guard-schema="seo001">');
 const script='<script type="application/ld+json" data-cerebro-cert-repair="jaen-v0">'+jsonld+'</script>';
 const endMarker='</div>\n</section>';
 const suffixIndex=marked.indexOf(endMarker,i);
 if(suffixIndex<0||suffixIndex-i>12000)throw Error('JAEN_CERT_FAQ_END_NOT_FOUND');
 const candidate=marked.slice(0,suffixIndex+endMarker.length)+script+marked.slice(suffixIndex+endMarker.length);
 if(!candidate.includes('data-fenix-guard-schema="seo001"')||!candidate.includes('"@type":"FAQPage"'))
  throw Error('JAEN_CERT_REPAIR_INTERNAL_ERROR');
 return Object.freeze({
  status:'LAB_CHANGE_CANDIDATE_NOT_APPLIED',
  post_id:52200,original_sha256:hash(original),candidate_sha256:hash(candidate),
  original_content_bytes:Buffer.byteLength(original),
  candidate_content_bytes:Buffer.byteLength(candidate),
  faq_questions_from_live_content:questions.length,
  marker_insertions:1,schema_insertions:1,
  proposed_html: candidate,
  wordpress_write_performed:false,publication_status_changed:false,
  required_gates:['RESTORED_BASELINE_SNAPSHOT_175','INDEPENDENT_QA',
   'MARKERS_LIVE_E2E','CURRENT_SOURCE_SHA_MATCH','PROTECTED_WP_WRITE_GATE',
   'BACKUP_RESTORE','ROLLBACK_PROVED','OWNER_POLICY']
 });
}
