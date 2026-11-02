import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UPD_001,OBS_001,CON_001,CACHE_001,TWIN_001,
  buildKnowledgeCandidate,assessObsolescence,normalizeConversationKnowledge,
  buildCacheKey,createCacheRecord,assessCacheRecord,createTwinSnapshot,simulateTwinScenario
} from '../runtime/l1/index-v1.mjs';

const contracts=[UPD_001,OBS_001,CON_001,CACHE_001,TWIN_001];

test('L1 Wave1 implements exactly five previously scaffold-only engines',()=>{
  assert.deepEqual(contracts.map(x=>x.engine_id),['UPD-001','OBS-001','CON-001','CACHE-001','TWIN-001']);
  assert.ok(contracts.every(x=>x.layer==='L1'&&x.prod_writes===false&&x.additional_cost_eur===0));
});

test('UPD-001 creates candidates but never publishes directly',()=>{
  const base={context:{company_id:'fenix',environment:'PREPROD',version:'0.1.0'},candidate_id:'k1',domain:'software',source:{source_id:'s1',provenance:'repo',observed_at:'2026-11-02T10:00:00Z',validated:true},confidence:0.95,min_confidence:0.9,payload:{x:1}};
  const ok=buildKnowledgeCandidate(base);assert.equal(ok.status,'KNOWLEDGE_CANDIDATE');assert.equal(ok.publish,false);assert.equal(ok.requires_policy_gate,true);
  assert.equal(buildKnowledgeCandidate({...base,confidence:0.4}).human_exception_code,'LOW_CONFIDENCE');
  assert.equal(buildKnowledgeCandidate({...base,domain:'legal'}).human_exception_code,'HIGH_RISK');
  assert.equal(buildKnowledgeCandidate({...base,source:{...base.source,validated:false}}).status,'HOLD_SOURCE_UNVALIDATED');
});

test('UPD-001 only emits canonical exception codes for explicit gates',()=>{
  const base={context:{company_id:'fenix',environment:'LAB',version:'0.1.0'},candidate_id:'k2',domain:'seo',source:{source_id:'s1',provenance:'research',observed_at:'2026-11-02T10:00:00Z',validated:true},confidence:1,min_confidence:0.5};
  assert.equal(buildKnowledgeCandidate({...base,legal_required:true}).human_exception_code,'LEGAL_REQUIRED');
  assert.equal(buildKnowledgeCandidate({...base,policy_conflict:true}).human_exception_code,'POLICY_CONFLICT');
  assert.equal(buildKnowledgeCandidate({...base,high_risk:true}).human_exception_code,'HIGH_RISK');
});

test('OBS-001 marks stale records without deleting history',()=>{
  const fresh=assessObsolescence({record_id:'r1',last_verified_at:'2026-11-02T10:00:00Z',now:'2026-11-02T10:30:00Z',ttl_ms:3600000});
  assert.equal(fresh.status,'ACTIVE');assert.equal(fresh.delete_history,false);
  const old=assessObsolescence({record_id:'r1',last_verified_at:'2026-11-02T10:00:00Z',now:'2026-11-02T12:00:00Z',ttl_ms:3600000});
  assert.equal(old.status,'STALE');assert.equal(old.action,'CREATE_REVIEW');
  const contradicted=assessObsolescence({record_id:'r2',last_verified_at:'2026-11-02T10:00:00Z',now:'2026-11-02T10:01:00Z',ttl_ms:3600000,contradictions:['source conflict']});
  assert.equal(contradicted.stale_by_contradiction,true);
});

test('CON-001 only normalizes structured items and escalates low confidence or sensitive data',()=>{
  const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
  const r=normalizeConversationKnowledge({context,conversation_id:'c1',min_confidence:0.8,items:[{kind:'fact',text:'Dato confirmado',confidence:0.9},{kind:'risk',text:'Riesgo sensible',confidence:0.9,sensitive:true},{kind:'task',text:'Tarea dudosa',confidence:0.5}]});
  assert.equal(r.extraction_mode,'STRUCTURED_INPUT_ONLY');assert.equal(r.publish,false);assert.equal(r.status,'REVIEW_REQUIRED');
  assert.equal(r.items[1].human_exception_code,'HIGH_RISK');assert.equal(r.items[2].human_exception_code,'LOW_CONFIDENCE');
  assert.throws(()=>normalizeConversationKnowledge({context,conversation_id:'c2',min_confidence:0.8,items:[{kind:'invented',text:'x',confidence:1}]}),/not canonical/);
});

test('CACHE-001 key is deterministic, company-scoped and insensitive to object key order',()=>{
  const a=buildCacheKey({company_id:'fenix',engine_id:'RSH-001',rule_version:'1.0.0',prompt_version:'none',domain:'seo',payload:{b:2,a:1}});
  const b=buildCacheKey({company_id:'fenix',engine_id:'RSH-001',rule_version:'1.0.0',prompt_version:'none',domain:'seo',payload:{a:1,b:2}});
  const c=buildCacheKey({company_id:'other',engine_id:'RSH-001',rule_version:'1.0.0',prompt_version:'none',domain:'seo',payload:{a:1,b:2}});
  assert.equal(a.cache_key,b.cache_key);assert.notEqual(a.cache_key,c.cache_key);
});

test('CACHE-001 TTL evaluation is explicit and deterministic',()=>{
  const rec=createCacheRecord({cache_key:'abc',created_at:'2026-11-02T10:00:00Z',ttl_ms:60000,value:{x:1}});
  assert.equal(rec.persistent,false);
  assert.equal(assessCacheRecord(rec,'2026-11-02T10:00:30Z').status,'HIT_FRESH');
  assert.equal(assessCacheRecord(rec,'2026-11-02T10:02:00Z').status,'MISS_STALE');
});

test('TWIN-001 is simulation-only and rejects raw production-like source kinds',()=>{
  const snapshot=createTwinSnapshot({context:{company_id:'fenix',environment:'LAB',version:'0.1.0'},snapshot_id:'t1',source_kind:'SYNTHETIC',metrics:{capacity:10,cost:5},entities:{teams:2}});
  assert.equal(snapshot.simulation_only,true);assert.equal(snapshot.persist,false);
  const sim=simulateTwinScenario({snapshot,scenario_id:'s1',metric_deltas:{capacity:3,cost:-1}});
  assert.deepEqual(sim.after,{capacity:13,cost:4});assert.equal(sim.prod_write,false);
  assert.throws(()=>createTwinSnapshot({context:{company_id:'fenix',environment:'PREPROD',version:'0.1.0'},snapshot_id:'t2',source_kind:'PROD_COPY',metrics:{}}),/source_kind/);
  assert.throws(()=>createTwinSnapshot({context:{company_id:'fenix',environment:'PROD',version:'0.1.0'},snapshot_id:'t3',source_kind:'SYNTHETIC',metrics:{}}),/outside LAB\/PREPROD/);
});

test('L1 foundation contains no network clients, secrets or child-process execution',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url)),dir=path.resolve(here,'../runtime/l1');
  const files=fs.readdirSync(dir).filter(x=>x.endsWith('.mjs'));
  for(const file of files){
    const s=fs.readFileSync(path.join(dir,file),'utf8');
    assert.doesNotMatch(s,/\b(fetch|axios|got|child_process|execSync|spawnSync)\b/);
    assert.doesNotMatch(s,/SUPABASE_(SERVICE|ANON)_KEY|GITHUB_TOKEN|OPENAI_API_KEY/);
  }
});
