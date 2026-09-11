import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCertification} from '../hr/skills-certification-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-004',environment:'PREPROD',version:'0.1.0'};
test('non-critical certification can be ready',()=>{const r=assessCertification({context,authorized:true,confidence:.95,source_refs:['cert:1'],skills:['doc','crm'],required_skills:['doc','crm'],test_score:90,case_score:86,critical:false});assert.equal(r.status,'CERTIFICATION_READY');assert.equal(r.automatic_certification,true);});
test('missing skill blocks readiness',()=>{const r=assessCertification({context,authorized:true,confidence:.95,source_refs:['cert:2'],skills:['doc'],required_skills:['doc','crm'],test_score:95,case_score:95});assert.equal(r.status,'CERTIFICATION_NOT_READY');assert.ok(r.missing_skills.includes('crm'));});
test('critical certification escalates for human review',()=>{const r=assessCertification({context,authorized:true,confidence:.95,source_refs:['cert:3'],skills:['doc'],required_skills:['doc'],test_score:95,case_score:95,critical:true});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
