import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUP_001,INC_001,SEC_002,RED_001,QAB_001,REG_001,DR_001,BCP_001,CRS_001,
  evaluateHealth,classifyIncident,buildSecretInventoryEntry,assessSecretRotation,evaluateAdversarialCase,
  evaluateProcessQuality,evaluateGoldenSuite,buildBackupManifest,assess321Coverage,recordRestoreProof,
  selectContinuityPlan,classifyCrisis
} from '../runtime/l2/index-v1.mjs';

const contracts=[SUP_001,INC_001,SEC_002,RED_001,QAB_001,REG_001,DR_001,BCP_001,CRS_001];
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};

test('L2 Wave1 implements exactly nine previously scaffold-only engines',()=>{
  assert.deepEqual(contracts.map(x=>x.engine_id),['SUP-001','INC-001','SEC-002','RED-001','QAB-001','REG-001','DR-001','BCP-001','CRS-001']);
  assert.ok(contracts.every(x=>x.layer==='L2'&&x.prod_writes===false&&x.additional_cost_eur===0));
});

test('SUP-001 plans recovery but does not execute it',()=>{
  const healthy=evaluateHealth({context,checks:[{id:'db',status:'GREEN',severity:'LOW',known:true}]});
  assert.equal(healthy.status,'HEALTHY');assert.equal(healthy.recovery_execution,false);
  const critical=evaluateHealth({context,checks:[{id:'core',status:'RED',severity:'CRITICAL',known:false}]});
  assert.equal(critical.human_exception_code,'HIGH_RISK');
  const security=evaluateHealth({context,checks:[{id:'iam',status:'RED',severity:'HIGH',known:false,security_incident:true}]});
  assert.equal(security.human_exception_code,'SECURITY_INCIDENT');
});

test('INC-001 classifies known, critical, security and legal incidents canonically',()=>{
  assert.equal(classifyIncident({context,incident_id:'i1',type:'provider',severity:'MEDIUM',known:true}).status,'RUNBOOK_CANDIDATE');
  assert.equal(classifyIncident({context,incident_id:'i2',type:'failure',severity:'CRITICAL',known:false}).human_exception_code,'HIGH_RISK');
  assert.equal(classifyIncident({context,incident_id:'i3',type:'security',severity:'HIGH',security_incident:true}).human_exception_code,'SECURITY_INCIDENT');
  assert.equal(classifyIncident({context,incident_id:'i4',type:'legal',severity:'MEDIUM',legal_required:true}).human_exception_code,'LEGAL_REQUIRED');
});

test('SEC-002 stores metadata only and evaluates rotation without exposing values',()=>{
  const entry=buildSecretInventoryEntry({secret_id:'s1',provider:'vault',location_ref:'vault://s1',owner:'security',access_scopes:['engine:x'],rotation_interval_ms:1000,last_rotated_at:'2026-11-02T10:00:00Z'});
  assert.equal(entry.contains_secret_value,false);assert.equal(entry.rotation_execution,false);
  assert.equal(assessSecretRotation(entry,'2026-11-02T10:00:00.500Z').status,'CURRENT');
  assert.equal(assessSecretRotation(entry,'2026-11-02T10:00:02Z').status,'ROTATION_DUE');
  assert.throws(()=>buildSecretInventoryEntry({secret_id:'s2',provider:'x',location_ref:'x',owner:'x',rotation_interval_ms:1,last_rotated_at:'2026-11-02T10:00:00Z',token:'forbidden'}),/secret value field is forbidden/);
});

test('RED-001 accepts only synthetic non-PROD cases and never executes payloads',()=>{
  const r=evaluateAdversarialCase({context,case_id:'r1',category:'PROMPT_INJECTION',synthetic:true,expected_blocked:true,observed_blocked:true});
  assert.equal(r.status,'PASS');assert.equal(r.destructive_execution,false);assert.equal(r.prod_write,false);
  assert.throws(()=>evaluateAdversarialCase({context,case_id:'r2',category:'TOOL_ABUSE',synthetic:false,expected_blocked:true,observed_blocked:false}),/synthetic cases only/);
  assert.throws(()=>evaluateAdversarialCase({context:{company_id:'fenix',environment:'PROD',version:'0.1.0'},case_id:'r3',category:'DATA_LEAK',synthetic:true,expected_blocked:true,observed_blocked:true}),/outside LAB\/PREPROD/);
});

test('QAB-001 emits explicit process nonconformities without hidden rules',()=>{
  const r=evaluateProcessQuality({case_id:'q1',gates:[{id:'g1',required:true,passed:false}],slas:[{id:'sla1',actual_ms:200,max_ms:100}],documents:[{id:'d1',required:true,present:false}],followups:[{id:'f1',required:true,done:false}]});
  assert.equal(r.status,'NON_CONFORMING');assert.equal(r.nonconformities.length,4);assert.equal(r.automatic_correction,false);
  assert.equal(evaluateProcessQuality({case_id:'q2'}).status,'CONFORMING');
});

test('REG-001 compares golden cases deterministically and never promotes',()=>{
  const green=evaluateGoldenSuite({suite_id:'g1',cases:[{case_id:'c1',expected:{b:2,a:1},actual:{a:1,b:2}}]});
  assert.equal(green.status,'GREEN');assert.equal(green.promotion_candidate,true);assert.equal(green.promotion_execution,false);
  const red=evaluateGoldenSuite({suite_id:'g2',cases:[{case_id:'c2',expected:{x:1},actual:{x:2}}]});
  assert.equal(red.status,'FAIL');assert.equal(red.failed,1);
});

test('DR-001 validates metadata-only backup manifest, 3-2-1 coverage and restore proof',()=>{
  const hash='a'.repeat(64);
  const manifest=buildBackupManifest({backup_id:'b1',created_at:'2026-11-02T10:00:00Z',items:[{item_id:'registry',sha256:hash,size_bytes:123,copies:[{location_id:'local-a',media_type:'disk',offsite:false},{location_id:'local-b',media_type:'disk',offsite:false},{location_id:'remote-a',media_type:'object',offsite:true}]}]});
  assert.equal(assess321Coverage(manifest).status,'GREEN');assert.equal(manifest.backup_execution,false);
  assert.equal(recordRestoreProof({manifest_id:'b1',tested_at:'2026-11-02T11:00:00Z',success:true,checksum_verified:true}).status,'GREEN');
  const gap=buildBackupManifest({backup_id:'b2',created_at:'2026-11-02T10:00:00Z',items:[{item_id:'x',sha256:hash,size_bytes:1,copies:[{location_id:'a',media_type:'disk',offsite:false}]}]});
  assert.equal(assess321Coverage(gap).status,'GAP');
  assert.throws(()=>buildBackupManifest({backup_id:'b3',created_at:'2026-11-02T10:00:00Z',items:[{item_id:'x',sha256:'bad',size_bytes:1,copies:[{location_id:'a',media_type:'disk',offsite:false}]}]}),/sha256/);
});

test('BCP-001 chooses safe zero-cost plan and escalates money or safety limits',()=>{
  const selected=selectContinuityPlan({service_id:'svc',money_limit_eur:0,options:[{id:'B',priority:2,available:true,safe:true,additional_cost_eur:0,degradation_mode:'READ_ONLY'},{id:'A',priority:1,available:true,safe:true,additional_cost_eur:0,degradation_mode:'CACHE'}]});
  assert.equal(selected.plan.id,'A');assert.equal(selected.execution,false);
  assert.equal(selectContinuityPlan({service_id:'svc',money_limit_eur:0,options:[{id:'P',priority:1,available:true,safe:true,additional_cost_eur:5}]}).human_exception_code,'MONEY_LIMIT');
  assert.equal(selectContinuityPlan({service_id:'svc',money_limit_eur:0,options:[{id:'U',priority:1,available:false,safe:true,additional_cost_eur:0}]}).human_exception_code,'HIGH_RISK');
});

test('CRS-001 uses canonical crisis escalation and never sends communications',()=>{
  assert.equal(classifyCrisis({context,crisis_id:'c1',type:'web_down',severity:'LOW'}).status,'PLAYBOOK_CANDIDATE');
  assert.equal(classifyCrisis({context,crisis_id:'c2',type:'leak',severity:'HIGH',security_incident:true}).human_exception_code,'SECURITY_INCIDENT');
  assert.equal(classifyCrisis({context,crisis_id:'c3',type:'legal',severity:'MEDIUM',legal_required:true}).human_exception_code,'LEGAL_REQUIRED');
  assert.equal(classifyCrisis({context,crisis_id:'c4',type:'customer',severity:'LOW',customer_human_request:true}).human_exception_code,'CUSTOMER_HUMAN_REQUEST');
  const high=classifyCrisis({context,crisis_id:'c5',type:'mass_failure',severity:'CRITICAL'});assert.equal(high.human_exception_code,'HIGH_RISK');assert.equal(high.communications_execution,false);
});

test('L2 foundation contains no network clients, destructive process execution or credential env names',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url)),dir=path.resolve(here,'../runtime/l2');
  const files=fs.readdirSync(dir).filter(x=>x.endsWith('.mjs'));
  for(const file of files){const s=fs.readFileSync(path.join(dir,file),'utf8');assert.doesNotMatch(s,/\b(fetch|axios|got|child_process|execSync|spawnSync)\b/);assert.doesNotMatch(s,/SUPABASE_SERVICE_KEY|GITHUB_TOKEN|OPENAI_API_KEY/);}
});
