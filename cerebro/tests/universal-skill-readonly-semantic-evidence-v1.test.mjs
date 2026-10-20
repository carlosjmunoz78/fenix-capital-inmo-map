import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildReadonlySemanticEvidence} from '../runtime/universal-skill-readonly-semantic-evidence-v1.mjs';
import {resolveSemanticContract} from '../runtime/universal-skill-semantic-contracts-v1.mjs';

function plan(rootText,{domain_id='web-wordpress-frontend',engine_bindings=['WEB-001']}={}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-readonly-evidence-test-'));const rel='cerebro/intake/test/SKILL.md';const abs=path.join(root,rel);fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,rootText);return {root,activation_plan:{state_type:'CEREBRO_UNIVERSAL_SKILL_ACTIVATION_PLAN_V1',status:'ACTIVATION_PLAN_READY',company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',candidate_id:'repo:test',technical_name:'visual-style',source_refs:[rel],capabilities:[{capability_id:'repo:test:cap:1',technical_name:'visual-style',description:'web visual design',domains:[{domain_id,engine_bindings}]}]}};}

test('web provider consumes governed source and emits exact read-only contract evidence',()=>{const {root,activation_plan}=plan('# Visual UI\nUse responsive web layout, typography, color palette and accessible frontend design.');const report=buildReadonlySemanticEvidence({activation_plan,repo_root:root});assert.equal(report.status,'READONLY_SEMANTIC_EVIDENCE_GREEN');assert.equal(report.generated_semantic_evidence_count,1);const row=report.candidate_evidence.semantic_bindings[0];const contract=resolveSemanticContract({domain_id:'web-wordpress-frontend',engine_id:'WEB-001'});assert.deepEqual([...row.observed_constraints].sort(),[...contract.required_constraints].sort());assert.equal(row.real_consumption_proven,true);assert.equal(row.action_capable,false);assert.equal(row.physical_evidence,false);assert.equal(row.prod_write_authorized,false);assert.equal(row.external_skill_code_execution,false);assert.equal(row.additional_cost_eur,0);assert.ok(row.evidence_refs.some((x)=>x.startsWith('governed://readonly-semantic/web/')));});

test('non-web source does not fabricate semantic evidence',()=>{const {root,activation_plan}=plan('# Generic\nThis text discusses cooking recipes and grocery lists only.');const report=buildReadonlySemanticEvidence({activation_plan,repo_root:root});assert.equal(report.status,'READONLY_SEMANTIC_EVIDENCE_HOLD');assert.equal(report.generated_semantic_evidence_count,0);});

test('unsupported domain remains untouched',()=>{const {root,activation_plan}=plan('# Marketing\nAudience campaign measurement.',{domain_id:'marketing-growth-social',engine_bindings:['MKT-001']});const report=buildReadonlySemanticEvidence({activation_plan,repo_root:root});assert.equal(report.status,'NO_APPLICABLE_READONLY_PROVIDER');assert.equal(report.generated_semantic_evidence_count,0);});
