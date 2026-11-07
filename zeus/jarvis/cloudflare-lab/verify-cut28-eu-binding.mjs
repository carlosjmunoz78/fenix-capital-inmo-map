/**
 * CUT28 · CI attestation for the REAL Cloudflare EU LAB D1 binding.
 * Read-only static guard: never calls Cloudflare, never deploys or migrates.
 * Physical Cloudflare dashboard evidence was independently observed 2026-11-06:
 * EU jurisdiction, replication disabled, separate from old synthetic D1.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const load=filename=>JSON.parse(readFileSync(fileURLToPath(new URL(filename,import.meta.url)),'utf8'));
const target=load('./wrangler-eu.lab.jsonc');
const template=load('./wrangler-eu.template.jsonc');
const old=load('./wrangler.jsonc');
const uuid='988b11e1-21aa-4cf9-8b9d-110319df7ccc';
const oldUuid='a859fde1-126b-4c40-bc0d-aec2f8839f7b';
const placeholder='00000000-0000-0000-0000-000000000000';
const noPublicRoute=c=>{
 assert.equal(c.workers_dev,false,'No public workers.dev route');
 assert.deepEqual(c.routes,[],'No route / DNS');
 assert.equal(c.main,'./worker-off.mjs','Always-deny worker');
 assert.equal(c.observability?.enabled,false,'No unreviewed logging');
 assert.equal(c.triggers,undefined,'No jobs or cron');
};
noPublicRoute(target);
noPublicRoute(template);
noPublicRoute(old);
assert.equal(target.name,'cerebro-jarvis-lab-eu');
assert.deepEqual(target.vars,{
 JARVIS_ENVIRONMENT:'LAB',
 JARVIS_GATEWAY_ENABLED:'false',
 JARVIS_B2_B3_LIVE_ENABLED:'false'
});
assert.equal(target.d1_databases?.length,1);
const d=target.d1_databases[0];
assert.equal(d.binding,'JARVIS_LAB_DB');
assert.equal(d.database_name,target.name);
assert.equal(d.database_id,uuid);
assert.notEqual(d.database_id,oldUuid);
assert.notEqual(d.database_id,placeholder);
assert.equal(d.preview_database_id,'jarvis-cut28-eu-local');
assert.equal(template.d1_databases[0].database_id,placeholder,
 'Existing placeholder template must remain non-deployable');
assert.equal(old.d1_databases[0].database_id,placeholder,
 'Older synthetic LAB config must remain unchanged');
const stub=readFileSync(fileURLToPath(new URL('./worker-off.mjs',import.meta.url)),'utf8');
assert.match(stub,/JARVIS_LAB_NOT_AUTHORIZED/);
assert.match(stub,/status:503/);
for(const forbidden of ['app.fenixcapital.es','fenix-capital-inmo-maps','fenix-capital-inmo-map','PROD','CLOUDFLARE_API_TOKEN','JWT','service_role']){
 assert.equal(JSON.stringify(target).includes(forbidden),false,
  'Unsafe config literal: '+forbidden);
}
console.log('CUT28: verified EU LAB D1 UUID pinned; OFF/no routes/no deploy/no migration: PASS');
