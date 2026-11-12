import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveOwnerCapabilities} from '../cerebro/ops/gateway-v36-followups/owner_access.ts';

const entrypoint=readFileSync(new URL('../cerebro/ops/gateway-v36-followups/index.ts',import.meta.url),'utf8');

test('Owner resolver returns a truthful partial inventory, not universal live access',()=>{
 const r=resolveOwnerCapabilities({actor:'CARLOS-ADMIN',requestedCompany:'fenix'});
 assert.equal(r.status,'OK');
 assert.equal(r.company_id,'fenix');
 assert.equal(r.executed,false);
 assert.equal(r.data_returned,false);
 assert.equal(r.source_status,'CODE_CAPABILITY_INVENTORY_NOT_LIVE_SOURCE_HEALTH');
 assert.ok(Array.isArray(r.capabilities)&&r.capabilities.length>=8);
 assert.ok(r.capabilities.every(x=>x.status!=='CONNECTED_VERIFIED'));
 assert.ok(r.capabilities.some(x=>x.id==='OWNER_GLOBAL_ROUTER'&&x.status==='NOT_CONNECTED'));
 assert.ok(r.capabilities.some(x=>x.id==='APP_EXPEDIENTES'&&x.mode==='READ'));
 assert.ok(r.capabilities.some(x=>x.id==='EMAIL_PROPOSAL'&&x.mode==='PROPOSAL_ONLY'));
});

test('Company selector never grants access to another tenant',()=>{
 for(const company of ['aion','captacasa','all','todas','foo', 'fenix/../aion']){
  const r=resolveOwnerCapabilities({actor:'CARLOS-ADMIN',requestedCompany:company});
  assert.equal(r.status,'NOT_CONNECTED',company);
  assert.equal(r.executed,false);
  assert.deepEqual(r.capabilities,[]);
  assert.equal(r.data_returned,false);
  assert.doesNotMatch(JSON.stringify(r),/api_key|service_role|access_token|password/i);
 }
});

test('Admin actor from trusted backend is required; role or client claims alone have no effect',()=>{
 for(const actor of ['',null,'FENIX-DIRECTOR','CARLOS-ADMIN-FAKE','admin']){
  const r=resolveOwnerCapabilities({actor,requestedCompany:'fenix'});
  assert.equal(r.status,'FORBIDDEN');
  assert.equal(r.reason,'OWNER_ONLY');
  assert.equal(r.executed,false);
  assert.ok(!('capabilities' in r));
 }
 const alias=resolveOwnerCapabilities({actor:'CARLOS-ADMIN',requestedCompany:'fenix-capital'});
 assert.equal(alias.status,'OK');
 assert.equal(alias.company_id,'fenix');
});

test('New route is behind existing authenticated owner guard and does not grant writes',()=>{
 const ownerCheck=entrypoint.indexOf('const owner=await authorizedOwner(req);',entrypoint.indexOf('fetch: withSupabase'));
 const deny=entrypoint.indexOf('if(!owner.ok)return json(req,403',ownerCheck);
 const endpoint=entrypoint.indexOf('if(req.method==="GET"&&suffix==="owner-capabilities")',ownerCheck);
 assert.ok(ownerCheck>0&&deny>ownerCheck&&endpoint>deny);
 assert.match(entrypoint,/resolveOwnerCapabilities\(\{\s*actor:owner\.actor/);
 assert.match(entrypoint,/withSupabase\(\{ auth: "user" \}/);
 assert.match(entrypoint,/prod_execution_enabled: false/);
 assert.match(entrypoint,/live_writes: false/);
 assert.doesNotMatch(entrypoint,/if\(req\.method==="POST"&&suffix==="owner-capabilities"\)/);
});

test('Version and proposed interface are insensitive to untrusted company input',()=>{
 const r=resolveOwnerCapabilities({actor:'CARLOS-ADMIN',requestedCompany:'  FENIX  '});
 assert.equal(r.status,'OK');
 assert.equal(r.version,'OWNER_ACCESS_RESOLVER_V0');
 const sample=JSON.stringify(r);
 assert.ok(!sample.includes('jwt'));
 assert.ok(!sample.includes('secret'));
 assert.ok(!sample.includes('client_email'));
});
