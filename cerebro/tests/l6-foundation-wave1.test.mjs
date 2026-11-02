import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API_001,ARCH_001,DEBT_001,FF_001,CAN_001,LOCAL_001,AIBUD_001,DOCS_001,INT_001,STOROFF_001,
  buildIntegrationRequest,analyzeArchitecture,scoreTechnicalDebt,evaluateFeatureFlag,evaluateCanaryStage,
  selectProcessingPath,evaluateAiBudget,assessChangeDocumentation,buildIntegrationInventoryEntry,assessIntegrationHealth,planStoragePlacement
} from '../runtime/l6/index-v1.mjs';

const contracts=[API_001,ARCH_001,DEBT_001,FF_001,CAN_001,LOCAL_001,AIBUD_001,DOCS_001,INT_001,STOROFF_001];
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};

test('L6 Wave1 implements exactly ten previously scaffold-only engines',()=>{
  assert.deepEqual(contracts.map(x=>x.engine_id),['API-001','ARCH-001','DEBT-001','FF-001','CAN-001','LOCAL-001','AIBUD-001','DOCS-001','INT-001','STOROFF-001']);
  assert.ok(contracts.every(x=>x.layer==='L6'&&x.prod_writes===false&&x.additional_cost_eur===0));
});

test('API-001 builds auditable request plans without network execution',()=>{
  const r=buildIntegrationRequest({context,integration_id:'github',method:'POST',route:'/x',rate_limit_per_minute:60,max_retries:2,timeout_ms:1000,body:{a:1}});
  assert.equal(r.status,'REQUEST_PLAN');assert.equal(r.network_execution,false);assert.equal(r.auditable,true);
  assert.throws(()=>buildIntegrationRequest({context:{company_id:'fenix',environment:'PROD',version:'0.1.0'},integration_id:'x',method:'GET',route:'/'}),/outside LAB\/PREPROD/);
});

test('ARCH-001 detects missing targets, duplicates and source-of-truth duplication without mutation',()=>{
  const r=analyzeArchitecture({components:[{id:'A',source_of_truth:'db'},{id:'A',source_of_truth:'db'}],dependencies:[{from:'A',to:'B'}]});
  assert.equal(r.status,'VIOLATIONS');assert.ok(r.violations.some(x=>x.type==='DUPLICATE_COMPONENT'));assert.ok(r.violations.some(x=>x.type==='MISSING_DEPENDENCY_TARGET'));assert.equal(r.mutation_execution,false);
});

test('DEBT-001 scores technical debt deterministically',()=>{
  const a=scoreTechnicalDebt({debt_id:'d1',impact:8,risk:7,urgency:6,effort:3});
  const b=scoreTechnicalDebt({debt_id:'d1',impact:8,risk:7,urgency:6,effort:3});
  assert.equal(a.priority_score,b.priority_score);assert.equal(a.issue_creation,false);
  assert.throws(()=>scoreTechnicalDebt({debt_id:'d2',impact:11,risk:1,urgency:1,effort:1}),/0..10/);
});

test('FF-001 evaluates deterministic environment/role/percentage flags without persistence',()=>{
  const base={flag_id:'f1',company_id:'fenix',environment:'PREPROD',subject_id:'u1',enabled:true,percentage:100,roles:['admin'],role:'admin'};
  const a=evaluateFeatureFlag(base),b=evaluateFeatureFlag(base);
  assert.equal(a.active,true);assert.equal(a.rollout_bucket,b.rollout_bucket);assert.equal(a.flag_persistence,false);
  assert.equal(evaluateFeatureFlag({...base,role:'guest'}).active,false);
  assert.throws(()=>evaluateFeatureFlag({...base,environment:'PROD'}),/outside this foundation/);
});

test('CAN-001 supports only 10 to 50 to 100 candidates and never executes rollout/rollback',()=>{
  const promote=evaluateCanaryStage({release_id:'r1',current_percentage:10,error_rate_pct:0,max_error_rate_pct:1,latency_ms:100,max_latency_ms:200});
  assert.equal(promote.status,'PROMOTE_CANDIDATE');assert.equal(promote.next_percentage,50);assert.equal(promote.rollout_execution,false);
  const rollback=evaluateCanaryStage({release_id:'r2',current_percentage:50,error_rate_pct:5,max_error_rate_pct:1,latency_ms:100,max_latency_ms:200});
  assert.equal(rollback.status,'ROLLBACK_CANDIDATE');assert.equal(rollback.rollback_execution,false);
});

test('LOCAL-001 chooses local then free fallback then canonical human exception',()=>{
  assert.equal(selectProcessingPath({task_id:'t1',task_type:'ocr',local_supported:true,local_available:true}).path,'LOCAL');
  assert.equal(selectProcessingPath({task_id:'t2',task_type:'ocr',local_supported:true,local_available:false,free_fallback_available:true}).path,'FREE_FALLBACK');
  assert.equal(selectProcessingPath({task_id:'t3',task_type:'ocr',paid_fallback_required:true}).human_exception_code,'MONEY_LIMIT');
  assert.equal(selectProcessingPath({task_id:'t4',task_type:'ocr'}).human_exception_code,'LOW_CONFIDENCE');
});

test('AIBUD-001 enforces hard caps and never purchases',()=>{
  const ok=evaluateAiBudget({engine_id:'RSH-001',spent_eur:0,proposed_eur:0,hard_cap_eur:0});assert.equal(ok.status,'WITHIN_BUDGET');assert.equal(ok.purchase_execution,false);
  const over=evaluateAiBudget({engine_id:'RSH-001',spent_eur:0,proposed_eur:0.01,hard_cap_eur:0});assert.equal(over.human_exception_code,'MONEY_LIMIT');
});

test('DOCS-001 enforces the canonical change documentation set',()=>{
  const complete=Object.fromEntries(['engine_registry','contracts','dependency_map','runbook','changelog','backup','rebuild','autonomy_state'].map(k=>[k,true]));
  assert.equal(assessChangeDocumentation({change_id:'c1',provided:complete}).status,'GREEN');
  const bad=assessChangeDocumentation({change_id:'c2',provided:{runbook:true}});assert.equal(bad.status,'INCOMPLETE');assert.ok(bad.missing.includes('backup'));assert.equal(bad.write_execution,false);
});

test('INT-001 inventories readers writers webhooks and credential refs without secret values',()=>{
  const e=buildIntegrationInventoryEntry({integration_id:'notion',provider:'Notion',owner:'ops',company_id:'fenix',readers:['crm'],writers:['tasks'],webhooks:['lead-created'],credential_ref:'vault://notion',health:{status:'GREEN'}});
  assert.equal(e.contains_secret_values,false);assert.equal(assessIntegrationHealth(e).status,'GREEN');
  assert.throws(()=>buildIntegrationInventoryEntry({integration_id:'x',provider:'x',owner:'x',company_id:'fenix',token:'abc'}),/forbidden secret-value field/);
});

test('STOROFF-001 separates hot operational data from cold artifacts without storage execution',()=>{
  const hot=planStoragePlacement({artifact_id:'a1',company_id:'fenix',type:'OPERATIONAL',age_days:2,hot_retention_days:30});assert.equal(hot.target,'HOT_PRIMARY');
  const cold=planStoragePlacement({artifact_id:'a2',company_id:'fenix',type:'TRAINING_ARTIFACT',age_days:1,hot_retention_days:30});assert.equal(cold.target,'COLD_OFFLOAD');assert.equal(cold.requires_provider_selection,true);assert.equal(cold.storage_execution,false);
});

test('L6 foundation contains no network clients, child-process execution or credential env names',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url)),dir=path.resolve(here,'../runtime/l6');
  for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.mjs'))){const s=fs.readFileSync(path.join(dir,file),'utf8');assert.doesNotMatch(s,/\b(fetch|axios|got|child_process|execSync|spawnSync)\b/);assert.doesNotMatch(s,/SUPABASE_SERVICE_KEY|GITHUB_TOKEN|OPENAI_API_KEY/);}
});
