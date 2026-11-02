import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_001,GOV_001,POL_001,DEC_001,SEM_001,OWN_001,OBJ_001,ADR_001,CFG_001,VER_001,
  L0_EXISTING_ADAPTERS,HUMAN_EXCEPTION_CODES,buildCoreEnvelope,validateRegistry,evaluatePolicy,rankCandidates,
  canonicalizeEntity,canonicalTerms,resolveOwner,evaluateObjective,createAdr,resolveConfig,detectDrift,parseSemver,compareSemver,compatibility
} from '../runtime/l0/index-v1.mjs';

const contracts=[CORE_001,GOV_001,POL_001,DEC_001,SEM_001,OWN_001,OBJ_001,ADR_001,CFG_001,VER_001];

test('L0 Wave1 implements exactly 10 previously scaffold-only engines',()=>{
  assert.deepEqual(contracts.map(x=>x.engine_id),['CORE-001','GOV-001','POL-001','DEC-001','SEM-001','OWN-001','OBJ-001','ADR-001','CFG-001','VER-001']);
  assert.ok(contracts.every(x=>x.layer==='L0'&&x.prod_writes===false&&x.additional_cost_eur===0));
});

test('existing L0 engines are wrap-preserve only',()=>{
  assert.deepEqual(L0_EXISTING_ADAPTERS.map(x=>x.engine_id),['ORCH-001','HEX-001','FACT-001']);
  assert.ok(L0_EXISTING_ADAPTERS.every(x=>x.binding_mode==='WRAP_PRESERVE'&&x.do_not_overwrite));
});

test('canonical HUMAN_REQUIRED taxonomy remains exact',()=>{
  assert.deepEqual(HUMAN_EXCEPTION_CODES,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
});

test('CORE-001 builds tenant-scoped non-PROD envelope',()=>{
  const x=buildCoreEnvelope({context:{company_id:'fenix',environment:'PREPROD',version:'0.1.0'},command:'status.read',payload:{x:1}});
  assert.equal(x.engine_id,'CORE-001');assert.equal(x.context.company_id,'fenix');assert.equal(x.context.environment,'PREPROD');
  assert.throws(()=>buildCoreEnvelope({context:{company_id:'fenix',environment:'PROD',version:'0.1.0'},command:'x'}),/outside LAB\/PREPROD/);
});

test('GOV-001 validates count and uniqueness',()=>{
  assert.equal(validateRegistry({count:2,engine_ids:['A','B']}).status,'GREEN');
  const bad=validateRegistry({count:2,engine_ids:['A','A']});assert.equal(bad.valid,false);assert.deepEqual(bad.duplicate_ids,['A']);
});

test('POL-001 applies canonical exception precedence and zero-cost default',()=>{
  assert.equal(evaluatePolicy({customer_human_request:true,legal_required:true}).reason,'CUSTOMER_HUMAN_REQUEST');
  assert.equal(evaluatePolicy({legal_required:true}).reason,'LEGAL_REQUIRED');
  assert.equal(evaluatePolicy({signature_required:true}).reason,'SIGNATURE_REQUIRED');
  assert.equal(evaluatePolicy({security_incident:true}).reason,'SECURITY_INCIDENT');
  assert.equal(evaluatePolicy({policy_conflict:true}).reason,'POLICY_CONFLICT');
  assert.equal(evaluatePolicy({high_risk:true}).reason,'HIGH_RISK');
  assert.equal(evaluatePolicy({low_confidence:true}).reason,'LOW_CONFIDENCE');
  assert.equal(evaluatePolicy({additional_cost_eur:0.01,money_limit_eur:0}).reason,'MONEY_LIMIT');
  assert.equal(evaluatePolicy({additional_cost_eur:0,money_limit_eur:0}).decision,'ALLOW');
  assert.equal(evaluatePolicy({environment:'PROD',write:true}).decision,'DENY');
});

test('DEC-001 ranking is deterministic and explainable',()=>{
  const r=rankCandidates({weights:{quality:2,cost:-1},candidates:[{id:'b',metrics:{quality:4,cost:2}},{id:'a',metrics:{quality:4,cost:2}},{id:'c',metrics:{quality:3,cost:0}}]});
  assert.equal(r.winner.id,'a');assert.deepEqual(r.winner.contributions,{quality:8,cost:-2});
});

test('SEM-001 canonical vocabulary covers master entities and refuses guesses',()=>{
  assert.equal(canonicalizeEntity('expediente').canonical,'Expediente');
  assert.equal(canonicalizeEntity('inventado').status,'UNKNOWN');
  assert.deepEqual(canonicalTerms(),['Cliente','Lead','Contacto','Expediente','Firma','Banco','Producto','Documento','Tarea']);
});

test('OWN-001 never invents an owner',()=>{
  assert.equal(resolveOwner({engine_id:'X',owners:{}}).status,'UNASSIGNED');
  assert.equal(resolveOwner({engine_id:'X',owners:{X:'Carlos'}}).owner,'Carlos');
});

test('OBJ-001 evaluates targets without hidden thresholds',()=>{
  assert.equal(evaluateObjective({objective_id:'o1',current:10,target:10,direction:'MAXIMIZE'}).status,'ACHIEVED');
  assert.equal(evaluateObjective({objective_id:'o2',current:11,target:10,direction:'MINIMIZE'}).status,'GAP');
});

test('ADR-001 emits validated immutable record',()=>{
  const a=createAdr({adr_id:'ADR-1',title:'x',context:'ctx',decision:'keep',alternatives:['replace'],consequences:['none'],rollback:'revert',created_at:'2026-11-02T00:00:00Z'});
  assert.equal(a.status,'VALID');assert.throws(()=>{a.record.title='y';},TypeError);
});

test('CFG-001 resolves LAB/PREPROD config and detects drift without PROD activation',()=>{
  const r=resolveConfig({base:{a:1,n:{x:1}},environment:'PREPROD',overrides:{PREPROD:{n:{y:2}}}});
  assert.deepEqual(r.config,{a:1,n:{x:1,y:2}});
  assert.equal(detectDrift({a:1},{a:2}).status,'DRIFT');
  assert.throws(()=>resolveConfig({base:{},environment:'PROD',overrides:{}}),/outside this LAB\/PREPROD runtime/);
});

test('VER-001 parses, compares and classifies compatibility deterministically',()=>{
  assert.equal(parseSemver('1.2.3').minor,2);assert.equal(compareSemver('1.2.4','1.2.3'),1);
  assert.equal(compatibility({from:'1.2.3',to:'1.3.0'}).backward_compatible,true);
  assert.equal(compatibility({from:'1.2.3',to:'2.0.0'}).backward_compatible,false);
  assert.throws(()=>parseSemver('v1.2.3'),/invalid semver/);
});

test('L0 modules contain no network clients, secrets, child processes or PROD write capability',()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));const dir=path.resolve(here,'../runtime/l0');
  const files=fs.readdirSync(dir).filter(x=>x.endsWith('.mjs'));
  for(const file of files){const s=fs.readFileSync(path.join(dir,file),'utf8');assert.doesNotMatch(s,/\b(fetch|axios|got|child_process|execSync|spawnSync)\b/);assert.doesNotMatch(s,/SUPABASE_(SERVICE|ANON)_KEY|GITHUB_TOKEN|OPENAI_API_KEY/);}
});
