import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const config=JSON.parse(read('./wrangler-b2-read-probe.candidate.lab.jsonc'));
assert.equal(config.name,'cerebro-jarvis-lab-eu');
assert.equal(config.main,'./worker-b2-read-probe.mjs');
assert.equal(config.workers_dev,false);
assert.deepEqual(config.routes,[]);
assert.equal(config.observability?.enabled,false);
assert.equal(config.triggers,undefined);
assert.deepEqual(config.vars,{
 JARVIS_ENVIRONMENT:'LAB',
 JARVIS_ACCESS_PROBE_ENABLED:'false',
 JARVIS_B2_ACCESS_ENABLED:'false',
 JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false'
});
assert.deepEqual(config.d1_databases,[{
 binding:'JARVIS_LAB_DB',database_name:'cerebro-jarvis-lab-eu',
 database_id:'988b11e1-21aa-4cf9-8b9d-110319df7ccc',
 preview_database_id:'jarvis-cut31-b2-local'
}]);
for(const forbidden of [
 'JARVIS_ACCESS_AUD','JARVIS_OWNER_EMAIL','JARVIS_OWNER_ID','JARVIS_B2_HMAC_KEY_HEX',
 'DEEPSEEK_API_KEY','app.fenixcapital.es','fenix-capital-inmo-maps',
 'a859fde1-126b-4c40-bc0d-aec2f8839f7b'
])assert.equal(JSON.stringify(config).includes(forbidden),false);
const code=read('./worker-b2-read-probe.mjs');
assert.match(code,/createJarvisAccessB2SessionVerifier/);
assert.match(code,/createJarvisD1SessionStore/);
assert.doesNotMatch(code,/INSERT INTO|UPDATE |DELETE FROM|POST \/v1\/|service_role/);
console.log('CUT31 candidate B2 verified Access -> read-only EU D1: OFF, no routes, no grants, no deployment: PASS');
