import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const f=fs.readFileSync(new URL('./index.ts',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('./backup/cerebro-console-activity-v8-index.ts',import.meta.url),'utf8');
const origin='https://fenix-capital-preprod-eptv5utjp.vercel.app';
test('only exact isolated stage origin added; all other code identical',()=>{
  const anchor='  "https://www.app.fenixcapital.es"';
  const gap=String.fromCharCode(10);
  assert.equal(f.replace(anchor+','+gap+'  "'+origin+'"',anchor),old);
});
test('owner and JWT-dependent guard remain unchanged',()=>{
  assert.match(f,/withSupabase\(\{auth:"user"\}/);
  assert.match(f,/await authorizedOwner\(req\)/);
  assert.match(f,/if\(!origin\|\|!ALLOWED_ORIGINS\.has\(origin\)\)return new Response\(null,\{status:403\}\)/);
  assert.match(f,/req\.method!=="GET"/);
});
test('CORS origins are specific and no wildcard allowed',()=>{
  const span=f.slice(f.indexOf('const ALLOWED_ORIGINS='),f.indexOf('const QUEUED_JOB_STATUSES='));
  const urls=[...span.matchAll(/"https:\/\/[^"]+"/g)].map(x=>JSON.parse(x[0]));
  assert.deepEqual(urls,['https://app.fenixcapital.es','https://www.app.fenixcapital.es',origin]);
  assert.doesNotMatch(span,/\*|includes\(|endsWith\(/);
});
