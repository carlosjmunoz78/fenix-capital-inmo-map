import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankDraftForRepair,runSelfRepairItem} from '../runtime/seo-d13-quality-self-repair-v0.mjs';
const p='cerebro/seo-enterprise/v2/registry/seo001-v3-real-attempts-replay-ledger-2026-11-08.json';
const l=JSON.parse(fs.readFileSync(p,'utf8'));
function reconstructedIssues(a){
 const all=[...a.generic_issues];
 for(let i=0;i<a.paragraph_issues;i++){
   const sec=String(Math.floor(i/3)+1).padStart(2,'0');
   const para=String(i%3+1).padStart(2,'0');
   all.push('SECTION_'+sec+'_PARAGRAPH_'+para+'_WORDS_45_NEEDS_60_TO_85');
 }
 for(let i=0;i<a.section_total_issues;i++){
   const sec=String(i+1).padStart(2,'0');
   all.push('SECTION_'+sec+'_TOTAL_140_WORDS_BELOW_180');
 }
 return all;
}
test('source ledger is a sealed V3 real receipt, no invented green',()=>{
 assert.equal(l.source_workflow_run_id,42443875772);
 assert.equal(l.source_artifact_id,13602568494);
 assert.equal(l.released,false);
 assert.equal(l.wp_writes,0);
 assert.equal(l.attempts.PARTICULARES.length,3);
 assert.equal(l.attempts.INMOBILIARIAS.length,3);
});
for(const [persona,rows] of Object.entries(l.attempts)){
 test('replay actual recorded issue COUNT and CLASSES: '+persona,()=>{
  for(const row of rows){
   const q={technical_copy_precheck:'HOLD',full_quality_certified:false,publish_allowed:false,
    copy_issues:reconstructedIssues(row)};
   assert.equal(rankDraftForRepair(q),row.expected_penalty,JSON.stringify({persona,attempt:row.attempt}));
  }
  const best=rows.reduce((a,b)=>b.expected_penalty<a.expected_penalty?b:a,rows[0]);
  assert.equal(best.attempt,l.expected_best_attempt[persona]);
 });
 test('real self-repair selector uses recorded V3 scores, not last attempt: '+persona,async()=>{
  let idx=0; const seen=[];
  const result=await runSelfRepairItem({brief:{
    company_id:'fenix',engine_id:'SEO-001',environment:'LAB',persona,
    work_id:'SEO001-REAL-V3-REPLAY-'+persona
   },maxAttempts:3,budget:3,
   generate:async({attempt,previous_html})=>{
    idx++;
    const html='<h1>Ensayo reproducible '+persona+'</h1><p>'+
       ('historical-attempt-'+attempt+' ').repeat(95)+'</p>';
    seen.push({attempt,previous_html});
    return {html,request_count:1,status:'REAL_CLOUD_DRAFT_STYLE_HOLD'};
   },
   review:({writer})=>{
    const i=Number(writer.html.match(/historical-attempt-(\d+)/)?.[1]||0);
    assert.ok(i>=1&&i<=3);
    return {technical_copy_precheck:'HOLD',full_quality_certified:false,
      publish_allowed:false,copy_issues:reconstructedIssues(rows[i-1])};
   }
  });
  assert.equal(result.requests,3);
  assert.equal(result.selected_best_attempt,l.expected_best_attempt[persona]);
  assert.equal(result.selected_relative_quality_penalty,Math.min(...rows.map(x=>x.expected_penalty)));
  assert.equal(result.publish_allowed,false);
  assert.equal(result.full_quality_certified,false);
  assert.ok(result.content.includes('historical-attempt-'+l.expected_best_attempt[persona]));
  assert.equal(seen.length,3);
 });
}
