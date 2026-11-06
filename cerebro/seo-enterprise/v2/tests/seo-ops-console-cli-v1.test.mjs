import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildSeoTrainingPacks,saveTrainingPacks,cli} from '../runtime/seo-ops-console-cli-v1.mjs';
const tmp=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'seo-team-training-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d};
test('FACT-001 logical specialist courseware physically generates 32 distinct training packets and index',()=>{
 const packets=buildSeoTrainingPacks();
 assert.equal(packets.size,33);
 const index=JSON.parse(packets.get('manifest.json'));
 assert.equal(index.department_count,32);
 assert.equal(index.files.length,32);
 assert.equal(index.real_training_proven,false);
 assert.equal(index.physical_agents_certified,0);
 const exercises=new Set();
 for(let i=1;i<=32;i++){
  const id='SEO-D'+String(i).padStart(2,'0');
  const p=JSON.parse(packets.get(id+'.json'));
  assert.equal(p.department_id,id);
  assert.equal(p.company_id,'fenix');
  assert.equal(p.engine_id,'SEO-001');
  assert.equal(p.environment,'LAB');
  assert.equal(p.certified_for_real_missions,false);
  assert.equal(p.actual_agent_iam_verified,false);
  assert.equal(p.prod_write,false);
  assert.equal(p.permission_grants.length,0);
  assert.equal(p.source_policy,'OWNER_ACCEPTED_FROZEN_PROD_2026_11_05_NO_REAUDIT_NO_STAGING');
  assert.equal(p.live_wordpress_source.refresh_before_decision,false);
  assert.equal(p.live_wordpress_source.external_requests_authorized,false);
  assert.ok(p.learning_sources.some(x=>x.endsWith('fenix-prod-wp-url-media-inventory-2026-11-05-v1.json')));
  assert.ok(p.learning_sources.some(x=>x.includes('live-copy-chunk-')));
  assert.equal(p.learning_sources.some(x=>x.includes('seo-existing-content-assets-source-registry')),false);
  assert.ok(p.practical_exam.length>30);
  assert.ok(p.required_deliverable.length>25);
  assert.ok(p.evidence_sources.length>0);
  assert.ok(p.mandatory_steps.includes('INDEPENDENT_QA'));
  assert.ok(p.mandatory_steps.includes('TRIBUNAL'));
  assert.ok(!exercises.has(p.practical_exam));
  exercises.add(p.practical_exam);
 }
});
test('training pack write is idempotent, existing files are preserved and conflicts denied',t=>{
 const out=tmp(t),packets=buildSeoTrainingPacks();
 const before=fs.writeFileSync(path.join(out,'not-managed.txt'),'keep this');
 const first=saveTrainingPacks({out,packets});
 assert.equal(first.training_briefs,32);
 assert.equal(first.new_files,33);
 assert.equal(first.prod_agents_activated,0);
 const second=saveTrainingPacks({out,packets});
 assert.equal(second.new_files,0);
 assert.equal(second.unchanged_files,33);
 assert.equal(fs.readFileSync(path.join(out,'not-managed.txt'),'utf8'),'keep this');
 const edited=path.join(out,'SEO-D05.json');
 fs.writeFileSync(edited,'EXTERNAL_MANUAL_CHANGE');
 assert.throws(()=>saveTrainingPacks({out,packets}),/FILE_CONFLICT/);
 assert.equal(fs.readFileSync(edited,'utf8'),'EXTERNAL_MANUAL_CHANGE');
});
test('reject root destination and symlink hierarchy rather than rewriting unrelated files',t=>{
 const packets=buildSeoTrainingPacks();
 assert.throws(()=>saveTrainingPacks({out:'/',packets}),/ROOT_DENIED/);
 const root=tmp(t),other=tmp(t);
 const symlink=path.join(root,'pack');
 fs.symlinkSync(other,symlink,'dir');
 assert.throws(()=>saveTrainingPacks({out:symlink,packets}),/SYMLINK/);
});
test('CLI exposes owner marketing approval proposal without authorizing spend or publishing',async()=>{
 const status=await cli(['readiness']);
 assert.equal(status.logical_departments_defined,32);
 assert.equal(status.courseware_prepared,32);
 assert.equal(status.physical_agents_IAM_verified,0);
 const kinds=await cli(['types']);assert.equal(kinds.command_types.length,12);
 const p=await cli(['marketing-plan']);
 assert.equal(p.approval_state,'PENDING_OWNER_STRATEGIC_APPROVAL');
 assert.equal(p.publication_or_spend_permission_granted,false);
 assert.equal(p.segments.length,4);
 const routed=await cli(['route','--type','MARKETING_PLAN','--objective','Preparar estrategia local de captación sin gasto nuevo']);
 assert.equal(routed.lead_department,'SEO-D01');
 assert.equal(routed.state,'STRATEGY_PROPOSAL_PENDING_OWNER_APPROVAL');
 assert.equal(routed.only_proposal,true);
 assert.equal(routed.auto_publish,false);
});
test('CLI persists LAB-only proposed order and returns same job on duplicate request',async t=>{
 const journal=path.join(tmp(t),'jobs.v8');
 const opts=['--type','TOWN_TEMPLATE_NORMALIZATION','--scope','VILLAGE',
 '--objective','Proponer la armonización de una landing de pueblo con la estructura de ciudad',
 '--ref','TOWN_VISUAL_CANDIDATE_001'];
 const x=await cli(['queue-lab','--journal',journal,...opts]);
 const y=await cli(['queue-lab','--journal',journal,...opts]);
 assert.equal(x.newly_queued,true);
 assert.equal(y.duplicate,true);
 assert.equal(y.job_id,x.job_id);
 assert.equal(x.external_writes,0);
 assert.equal(x.publish_authorized,false);
});
