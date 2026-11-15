import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requireSeoStagingOff,seoStagingSuspensionStatus} from '../runtime/seo-staging-suspension-v1.mjs';
test('owner suspension is fail-closed, no network and no hostinger claim',()=>{
 const s=seoStagingSuspensionStatus();
 assert.equal(s.host,'staging.fenixcapital.es');
 assert.equal(s.staging_off,true);
 assert.equal(s.allow_staging_requests,false);
 assert.equal(s.allow_staging_jobs,false);
 assert.equal(s.network_calls_by_this_module,0);
 assert.equal(s.hostinger_resource_consumption_verified,false);
 assert.equal(requireSeoStagingOff({source_refs:['canonical:inventory:2026-11-05']}),true);
});
test('source and target staging access is rejected without resolving DNS',()=>{
 for(const item of [
  {source_refs:['https://staging.fenixcapital.es/']},
  {source_refs:['https://STAGING.FENIXCAPITAL.ES:443/']},
  {target_url:'https://staging.fenixcapital.es/test'},
  {base_url:'http://staging.fenixcapital.es'},
  {endpoint:'https://sub.staging.fenixcapital.es/hook'},
  {web_source:'staging.fenixcapital.es'},
  {environment:'STAGING'},
  {target_environment:'WEB_STAGING'}
 ])assert.throws(()=>requireSeoStagingOff(item),/SEO_STAGING_SUSPENDED/);
});
test('historical reference metadata not used as an operational target',()=>{
 assert.equal(requireSeoStagingOff({source_refs:['cerebro/seo-enterprise/v2/seo-existing-content-assets-source-registry-v1.json']}),true);
});

test('all STAGING workflow jobs are suspended, preserving code but consuming no runners',()=>{
 const yaml=fs.readFileSync(new URL('../../../../.github/workflows/cerebro-seo-staging-readonly-v0.yml',import.meta.url),'utf8');
 for(const name of ['readonly-staging','seo-worker-isolated','seo-qa-isolated','seo-tribunal-isolated']){
  const start=yaml.indexOf('  '+name+':');
  assert.ok(start>0,'missing job '+name);
  const part=yaml.slice(start).split(/\n  [a-z][a-z-]*:\n/)[0];
  assert.match(part,/^\s+if: \$\{\{ false \}\}$/m,'job must be disabled: '+name);
 }
});
