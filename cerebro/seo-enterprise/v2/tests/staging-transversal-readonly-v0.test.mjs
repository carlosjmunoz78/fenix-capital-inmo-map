import test from 'node:test';
import assert from 'node:assert/strict';
import {runStagingReadonlyMission,extractTextForSeoQa} from '../runtime/staging-transversal-readonly-v0.mjs';
const html='<html><head><title>Fénix Capital</title><meta name="robots" content="noindex"></head><body><h1>Fénix Capital</h1><p>Calcular mi furura cuota y reformas y constucción.</p><script>var pii="SECRET_NEVER_SHOW";</script></body></html>';
test('three logical departments execute complete read-only cross-dept mission from HTML input',()=>{
 const r=runStagingReadonlyMission({html,status:200,headers:''});
 assert.deepEqual(r.departments_exercised,['SEO-D09','SEO-D15','SEO-D31']);
 assert.equal(r.editorial.findings.length,2);
 assert.equal(r.technical.staging_readonly_probe_passed,true);
 assert.equal(r.full_department_ready,false);assert.equal(r.publish_allowed,false);assert.equal(r.external_writes,0);
 assert.equal(r.runtime_identity_verified,false);
});
test('text extraction prevents scripts and avoids source content in evidence',()=>{
 assert.equal(extractTextForSeoQa(html).includes('SECRET_NEVER_SHOW'),false);
 assert.equal(JSON.stringify(runStagingReadonlyMission({html,status:200,headers:''})).includes('SECRET_NEVER_SHOW'),false);
});
test('technically unsafe staging snapshots block transversal mission',()=>{
 assert.throws(()=>runStagingReadonlyMission({html:html.replace('noindex','index'),status:200,headers:''}),/STAGING_TECHNICAL_GATE_FAILED/);
 assert.throws(()=>runStagingReadonlyMission({html,status:403,headers:''}),/STAGING_TECHNICAL_GATE_FAILED/);
});
