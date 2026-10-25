import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSpecialtyKnowledgeCoverage} from '../knowledge/specialty-knowledge-coverage.mjs';

test('coverage report accounts for all 384 specialists and all 48 departments',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  assert.equal(report.specialist_roles,384);
  assert.equal(report.departments,48);
  assert.equal(report.roles.length,384);
  assert.equal(report.department_coverage.length,48);
  assert.equal(report.research_jobs.length,48);
  assert.equal(new Set(report.roles.map((x)=>x.role_id)).size,384);
});

test('PROD knowledge expansion closes all department-level verified-source gaps without claiming mastery',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  assert.ok(report.verified_sources>10);
  assert.equal(report.departments_with_zero_verified_sources,0);
  assert.equal(report.departments_with_one_or_more_verified_sources,48);
  assert.equal(report.roles_with_zero_verified_department_sources,0);
  assert.equal(report.roles_with_one_or_more_verified_department_sources,384);
  assert.equal(report.deep_verified_operational_claims,0);
  assert.match(report.interpretation,/NOT A CLAIM OF DEEP ROLE MASTERY/);
  assert.equal(report.environment,'PROD_KNOWLEDGE_WITH_GOVERNED_RESEARCH');
  assert.equal(report.prod_knowledge_loaded,true);
  assert.ok(report.source_sets.some((x)=>x.id==='PROD_EXPANSION_2026_10_25'&&x.environment==='PROD'));
});

test('every department keeps governed research active after seed coverage is closed',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  for(const job of report.research_jobs){
    assert.equal(job.environment,'PREPROD');
    assert.equal(job.status,'RESEARCH_REQUIRED');
    assert.equal(job.auto_promote,false);
    assert.equal(job.prod_write_authorized,false);
    assert.equal(job.spend_authorized,false);
    assert.equal(job.additional_cost_eur,0);
    assert.ok(job.specialist_role_ids.length>0);
    assert.ok(job.research_queries.length>0);
    assert.ok(job.required_pipeline.includes('OLD_vs_NEW'));
    assert.ok(job.required_pipeline.includes('tribunal'));
  }
  const critical=report.research_jobs.filter((job)=>job.priority==='CRITICAL');
  assert.equal(critical.length,0);
  assert.ok(report.research_jobs.every((job)=>job.reason==='DEEP_ROLE_AND_SECTION_COVERAGE_NOT_YET_PROVEN'));
});

test('department knowledge points become inherited evidence but never execution authority or deep mastery',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  assert.ok(report.roles.every((role)=>role.section_level_verification==='PARTIAL_DEPARTMENT_SOURCE_MAPPING'));
  assert.ok(report.roles.every((role)=>role.deep_verified_operational_knowledge===false));
  assert.equal(report.knowledge_auto_promotion,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.prod_tool_execution_authorized,false);
  assert.equal(report.spend_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});
