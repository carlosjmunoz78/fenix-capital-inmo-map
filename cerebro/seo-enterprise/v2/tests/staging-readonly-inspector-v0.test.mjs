import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStagingSnapshot} from '../runtime/staging-readonly-inspector-v0.mjs';
const html='<html><head><title>Fénix Capital · Córdoba</title><meta content="noindex,nofollow" name="robots"><link href="https://fenixcapital.es/" rel="canonical"></head><body><h1>Hipotecas en Córdoba</h1><p>Fénix Capital</p></body></html>';
const args={url:'https://staging.fenixcapital.es/',status:200,html,headers:'HTTP/2 200\nContent-Type: text/html\n'};
test('STAGING public snapshot read-only probe certifies limited visible metadata',()=>{
 const x=inspectStagingSnapshot(args);assert.equal(x.noindex_confirmed,true);assert.equal(x.staging_readonly_probe_passed,true);assert.equal(x.external_mutations,0);assert.equal(x.h1_count,1);assert.equal(x.prod_authorized,false);
});
test('missing noindex is a finding and cannot be certified',()=>{
 const x=inspectStagingSnapshot({...args,html:html.replace('noindex,nofollow','index,follow')});assert.equal(x.noindex_confirmed,false);assert.ok(x.findings.includes('STAGING_NOINDEX_NOT_CONFIRMED'));assert.equal(x.staging_readonly_probe_passed,false);
});
test('X-Robots-Tag can supply noindex; 403 / wrong domain rejected',()=>{
 const x=inspectStagingSnapshot({...args,html:html.replace('noindex,nofollow','index,follow'),headers:'X-Robots-Tag: noindex\n'});assert.equal(x.noindex_confirmed,true);
 assert.equal(inspectStagingSnapshot({...args,status:403}).staging_readonly_probe_passed,false);
 assert.throws(()=>inspectStagingSnapshot({...args,url:'https://fenixcapital.es/'}),/NOT_ALLOWLISTED/);
});
