import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../organization.manifest.json',import.meta.url),'utf8'));
const board=JSON.parse(readFileSync(new URL('../competency-coverage-and-board-v0.json',import.meta.url),'utf8'));
test('all 32 unique V2 departments have specialist coverage without inventing staff',()=>{
 assert.equal(board.departments.length,32);
 assert.deepEqual(board.departments.map(d=>d.department_id),manifest.departments.map(d=>d.department_id));
 assert.equal(new Set(board.departments.map(d=>d.department_id)).size,32);
 for(const d of board.departments){
   assert.ok(d.required_competencies.length>=4,d.department_id);
   assert.ok(d.existing_engine_candidates.includes('SEO-001'),d.department_id);
   assert.equal(d.existing_binding_state,'POR_AUDITAR');
   assert.equal(d.verified_active_agents,0);
   assert.equal(d.verified_active_subagents,0);
   assert.equal(d.ready,false);
   assert.equal(d.real_staging_e2e_passed,false);
 }
});
test('independent F4 editorial and sector coverage, without mandatory fixed workforce',()=>{
 const byId=id=>board.departments.find(d=>d.department_id==='SEO-'+id);
 const editorial=['D13','D14','D15','D16'].flatMap(id=>byId(id).required_competencies).join(' ').toLowerCase();
 for(const phrase of ['copy','hipotec','fact-check','newsletter','consentimiento','guiones','formularios','descargables'])assert.ok(editorial.includes(phrase),phrase);
 for(const d of board.departments)assert.deepEqual(d.sector_variants,['FIN_MORTGAGE','REAL_ESTATE','ECOMMERCE','TECH_SAAS']);
});
test('production, awards and releases remain evidence gated',()=>{
 assert.equal(board.environment,'LAB');
 assert.equal(board.operational_declarations_prohibited_without_physical_evidence,true);
 assert.equal(board.departments.filter(d=>d.ready).length,0);
});
