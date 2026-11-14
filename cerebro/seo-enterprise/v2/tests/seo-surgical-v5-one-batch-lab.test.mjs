import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifySurgicalV5,bodyParagraphs,mergeOnlyFourParagraphs,auditSurgicalText,V5,M}
 from '../runtime/seo-surgical-v5-one-batch-lab.mjs';
const rootPath='cerebro/seo-enterprise/v2/registry/';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo001-surgical-v5-'));
 for(const f of [M,rootPath+'seo001-autorepair-one-batch-v4-2026-11-08.json',
   rootPath+'seo001-autorepair-one-batch-v4-result-2026-11-08.json']){
  fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});
  fs.copyFileSync(f,path.join(root,f));
 }
 const p=path.join(root,M),m=JSON.parse(fs.readFileSync(p,'utf8'));
 m.workflow_trigger_nonce='TRIGGER_ONCE_20261108_SURGICAL_V5';
 fs.writeFileSync(p,JSON.stringify(m));
 return {root,m};
}
function makeHtml({bad=false}={}){
 const p=(n)=>Array(n).fill('mantenimiento').join(' ');
 const mains=Array.from({length:6},(_,i)=>
  '<h2>Sección práctica '+(i+1)+'</h2>'+Array.from({length:3},(_,j)=>{
   const len=bad&&((i===0&&j===0)||(i===4&&j===2))?58:68;
   return '<p>'+p(len)+'</p>';
  }).join('')).join('');
 const faq='<section class="faq"><h2>Preguntas frecuentes</h2>'+
   Array.from({length:6},(_,i)=>'<div class="faq-item"><h3>¿Pregunta '+i+'?</h3><p>'+
   Array(23).fill('respuesta').join(' ')+'</p></div>').join('')+'</section>';
 return '<h1>Gastos de mantener un piso en Córdoba</h1>'+mains+faq;
}
test('V5 refused until exact single-use trigger and V4 remains sealed',()=>{
 assert.equal(V5,'SEO001-SURGICAL-PATCH-20261108-V5');
 const {root,m}=fixture();
 try{
  const v=verifySurgicalV5({root});
  assert.equal(v.max_real_model_calls,2);
  assert.equal(v.owner_cost_ceiling_eur,0);
  assert.equal(v.allow_wordpress_writes,false);
  assert.equal(v.source_artifact.id,13603825279);
  const f=path.join(root,M);
  for(const mutation of [x=>x.max_real_model_calls=3,x=>x.allow_paid_fallback=true,
    x=>x.allow_wordpress_publication=true,x=>x.external_free_tier_check.plan='Tier 1']){
   const bad=JSON.parse(JSON.stringify(m));mutation(bad);fs.writeFileSync(f,JSON.stringify(bad));
   assert.throws(()=>verifySurgicalV5({root}),/NO_FREE_EXACT_BATCH_OR_PUBLISH_GUARD/);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('exactly two changes preserve every other HTML paragraph and all FAQ',()=>{
 const original=makeHtml({bad:true}),proposal=makeHtml({bad:false});
 const patch=mergeOnlyFourParagraphs({original,proposed:proposal,targets:[[1,1],[5,3]]});
 assert.equal(patch.changes.length,2);
 assert.equal(bodyParagraphs(patch.html).length,18);
 assert.ok(patch.html.includes('<section class="faq">'));
 const old=bodyParagraphs(original),fixed=bodyParagraphs(patch.html);
 for(const p of old){
  const n=fixed.find(x=>x.section===p.section&&x.paragraph===p.paragraph);
  const target=(p.section===1&&p.paragraph===1)||(p.section===5&&p.paragraph===3);
  if(target)assert.equal(n.words,68);
  else assert.equal(n.full,p.full);
 }
});
test('patch refuses wrong numbers, invented HTML and unrelated replacement',()=>{
 const original=makeHtml({bad:true}),proposal=makeHtml({bad:false});
 assert.throws(()=>mergeOnlyFourParagraphs({original,proposed:proposal,targets:[[1,1]]}),/TARGET_COUNT/);
 assert.throws(()=>mergeOnlyFourParagraphs({original,proposed:proposal,targets:[[1,1],[1,1]]}),/TARGET_COUNT/);
 const unrelated=proposal.replace('<p>'+Array(68).fill('mantenimiento').join(' ')+'</p>',
   '<p>'+Array(68).fill('extraterrestre').join(' ')+'</p>');
 assert.throws(()=>mergeOnlyFourParagraphs({original,proposed:unrelated,targets:[[1,1],[5,3]]}),/PATCH_REJECT_LENGTH_MARKUP_OR_DRIFT/);
 const unsafe=proposal.replace('mantenimiento mantenimiento','<script>alert(1)</script>');
 assert.throws(()=>mergeOnlyFourParagraphs({original,proposed:unsafe,targets:[[1,1],[5,3]]}),/HTML_UNSAFE_OR_SIZE/);
});
test('copy gates do not authorize publication even after successful paragraph repair',()=>{
 const {root,m}=fixture();
 try{
  const q=auditSurgicalText(makeHtml(),m.briefs[0]);
  assert.equal(q.publish_allowed,false);
  assert.equal(q.full_quality_certified,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
