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

test('current verified snapshot exposes real gaps instead of claiming universal expertise',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  assert.equal(report.verified_sources,10);
  assert.equal(report.departments_with_zero_verified_sources,24);
  assert.equal(report.departments_with_one_or_more_verified_sources,24);
  assert.equal(report.roles_with_zero_verified_department_sources,192);
  assert.equal(report.roles_with_one_or_more_verified_department_sources,192);
  assert.equal(report.deep_verified_operational_claims,0);
  assert.match(report.interpretation,/NOT A CLAIM OF ROLE KNOWLEDGE COMPLETION/);
});

test('every department gets a governed research job and zero-source departments are critical',()=>{
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
  assert.equal(critical.length,24);
  assert.ok(critical.every((job)=>job.reason==='NO_VERIFIED_OFFICIAL_SOURCE_MAPPED_TO_DEPARTMENT'));
});

test('section-level knowledge is never inferred from a department-level source mapping',()=>{
  const report=buildSpecialtyKnowledgeCoverage();
  assert.ok(report.roles.every((role)=>role.section_level_verification==='NOT_MEASURED_BY_CURRENT_SOURCE_METADATA'));
  assert.ok(report.roles.every((role)=>role.deep_verified_operational_knowledge===false));
  assert.equal(report.knowledge_auto_promotion,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});
