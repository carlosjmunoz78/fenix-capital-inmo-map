import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const text=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const c=JSON.parse(text('./wrangler-access-canary.lab.jsonc'));
assert.equal(c.name,'cerebro-jarvis-lab-eu');
assert.equal(c.main,'./worker-access-probe.mjs');
assert.equal(c.compatibility_date,'2026-11-06');
assert.equal(c.workers_dev,false);
assert.deepEqual(c.routes,[]);
assert.equal(c.observability?.enabled,false);
assert.equal(c.d1_databases,undefined,'Access probe must not read or mutate D1');
assert.equal(c.triggers,undefined);
assert.deepEqual(c.vars,{
 JARVIS_ENVIRONMENT:'LAB',JARVIS_ACCESS_PROBE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false',JARVIS_B2_B3_LIVE_ENABLED:'false'
});
for(const [name,value] of Object.entries(c.vars)){
 assert.equal(typeof value,'string');
 assert.equal(/PASSWORD|TOKEN|EMAIL|SECRET|OWNER/i.test(name),false);
}
const code=text('./worker-access-probe.mjs');
assert.match(code,/createJarvisAccessOwnerCanary/);
assert.doesNotMatch(code,/getClaims|supabase|fetch\('https?:|service_role/i);
assert.equal(JSON.stringify(c).includes('app.fenixcapital.es'),false);
console.log('CUT30 Cloudflare Access canary nonpublic, no D1, OFF default, no secrets: PASS');
