import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const live=fs.readFileSync(new URL('./index.ts',import.meta.url),'utf8');
const original=fs.readFileSync(new URL('./backup/cerebro-console-activity-v8-index.ts',import.meta.url),'utf8');
test('V10 GitOps source equals restored V8 fallback, with no residual V9 CORS change',()=>{
 assert.equal(live,original);
 assert.doesNotMatch(live,/fenix-capital-preprod-eptv5utjp/);
});
test('Owner and JWT-dependent guards remain mandatory',()=>{
 assert.match(live,/withSupabase\(\{auth:"user"\}/);
 assert.match(live,/await authorizedOwner\(req\)/);
 assert.match(live,/!ALLOWED_ORIGINS\.has\(origin\)/);
 assert.match(live,/req\.method!=="GET"/);
});
test('Only canonical production origins are allowlisted',()=>{
 const span=live.slice(live.indexOf('const ALLOWED_ORIGINS='),live.indexOf('const QUEUED_JOB_STATUSES='));
 const urls=[...span.matchAll(/"https:\/\/[^"]+"/g)].map(x=>JSON.parse(x[0]));
 assert.deepEqual(urls,['https://app.fenixcapital.es','https://www.app.fenixcapital.es']);
 assert.doesNotMatch(span,/\*|includes\(|endsWith\(/);
});
