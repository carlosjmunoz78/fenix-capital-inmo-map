import test from 'node:test';
import assert from 'node:assert/strict';
import {buildResearchDossier,RSH001_CONTRACT} from '../knowledge/research-runtime.mjs';
const context={company_id:'fenix',engine_id:'RSH-001',environment:'PREPROD',version:'0.1.0'};
const sources=[
 {source_id:'s1',source_type:'WEB',source_uri:'https://example.com/a',retrieved_at:'2026-09-11T11:30:00Z',confidence:0.9,excerpt_hash:'a'.repeat(64)},
 {source_id:'s2',source_type:'OFFICIAL',source_uri:'https://example.org/b',retrieved_at:'2026-09-11T11:31:00Z',confidence:0.95,excerpt_hash:'b'.repeat(64)}
];
const claims=[{claim_id:'c1',statement:'Claim one',source_ids:['s1','s2'],confidence:0.9,contradicted:false}];
const input=(x={})=>({context,research_id:'r1',query:'market evidence',sources,claims,summary:'Contrasted dossier',...x});
test('contract remains research-only and safe',()=>{assert.equal(RSH001_CONTRACT.knowledge_promotion,false);assert.equal(RSH001_CONTRACT.rule_promotion,false);assert.equal(RSH001_CONTRACT.requires_knw_review,true);assert.equal(RSH001_CONTRACT.prod_write,false);assert.equal(RSH001_CONTRACT.trading_access,false);assert.equal(RSH001_CONTRACT.additional_cost_target_eur,0);});
test('builds contrasted dossier with evidence hash',()=>{const r=buildResearchDossier(input());assert.equal(r.status,'GREEN');assert.equal(r.ready,true);assert.equal(r.knowledge_promotion,false);assert.match(r.dossier.evidence_hash,/^[a-f0-9]{64}$/);assert.equal(r.dossier.source_count,2);assert.equal(r.dossier.source_type_count,2);});
test('requires at least two sources',()=>{const r=buildResearchDossier(input({sources:[sources[0]]}));assert.deepEqual([r.status,r.reason],['HUMAN_REQUIRED','LOW_CONFIDENCE']);});
test('requires source diversity',()=>{const r=buildResearchDossier(input({sources:[sources[0],{...sources[1],source_type:'WEB'}]}));assert.equal(r.reason,'LOW_CONFIDENCE');assert.equal(r.detail,'source_diversity_below_threshold');});
test('contradiction fails closed',()=>{const r=buildResearchDossier(input({claims:[{...claims[0],contradicted:true}]}));assert.deepEqual([r.status,r.reason],['HUMAN_REQUIRED','POLICY_CONFLICT']);});
test('low claim confidence fails closed',()=>{const r=buildResearchDossier(input({claims:[{...claims[0],confidence:0.4}]}));assert.equal(r.reason,'LOW_CONFIDENCE');});
test('unknown source reference fails closed',()=>{assert.throws(()=>buildResearchDossier(input({claims:[{...claims[0],source_ids:['missing']}]})),/unknown source/);});
test('cross-engine and PROD contexts are rejected',()=>{assert.throws(()=>buildResearchDossier(input({context:{...context,engine_id:'KNW-001'}})),/RSH-001/);assert.throws(()=>buildResearchDossier(input({context:{...context,environment:'PROD'}})),/LAB\/PREPROD/);});
