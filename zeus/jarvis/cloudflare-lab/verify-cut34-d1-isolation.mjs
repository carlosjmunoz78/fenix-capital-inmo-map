/** CUT34 LAB: static gate. No Cloudflare API, D1 writes or deployment. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const dir=path.dirname(fileURLToPath(import.meta.url));
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const old=read(path.join(dir,'wrangler-b2-parallel.staging.lab.jsonc'));
const template=read(path.join(dir,'wrangler-b2-parallel.cut34-isolated.TEMPLATE.json'));
const protectedIds=new Set([
 '988b11e1-21aa-4cf9-8b9d-110319df7ccc',
 '8f966fb3-32db-43a0-aa55-67f88616a522',
 'c446f17c-c26d-4c76-a3ea-f62c843d461b',
 'a859fde1-126b-4c40-bc0d-aec2f8839f7b',
 'be037644-3da6-4a96-8cb7-9ee3af9ba196'
]);
const sentinel='CUT34_UNPROVISIONED_DO_NOT_DEPLOY';
const verifiedEuJurisdictionD1='968e86d4-617c-4539-adde-541edc9ec215';
function gate(cfg, isTemplate){
 assert.equal(cfg.name,'cerebro-jarvis-cut32-lab-eu');
 assert.equal(cfg.main,'./worker-b2-device-probe.mjs');
 assert.equal(cfg.workers_dev,false);
 assert.deepEqual(cfg.routes,[]);
 assert.deepEqual(cfg.observability,{enabled:false});
 assert.equal(cfg.vars.JARVIS_ENVIRONMENT,'LAB');
 for(const k of ['JARVIS_ACCESS_PROBE_ENABLED','JARVIS_B2_DEVICE_ENABLED',
   'JARVIS_B2_ENROLLMENT_ENABLED','JARVIS_B2_B3_LIVE_ENABLED',
   'JARVIS_GATEWAY_ENABLED']) assert.equal(cfg.vars[k],'false',k+' must remain OFF');
 assert.equal(cfg.d1_databases.length,1);
 const db=cfg.d1_databases[0];
 assert.equal(db.binding,'JARVIS_LAB_DB');
 assert.equal(db.database_name,'cerebro-jarvis-cut33-lab-eu-jur');
 assert.equal(db.preview_database_id,'jarvis-cut34-isolated-local');
 assert.equal(protectedIds.has(db.database_id),false,'PROTECTED_D1_ID_REUSE_BLOCKED');
 if(isTemplate) assert.equal(db.database_id,sentinel);
 else {
  assert.match(db.database_id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(db.database_id,'00000000-0000-0000-0000-000000000000');
  assert.equal(db.database_id,verifiedEuJurisdictionD1,'ONLY_VERIFIED_EU_JURISDICTION_D1_ALLOWED');
 }
 const serialized=JSON.stringify(cfg);
 for(const forbidden of ['JARVIS_OWNER_EMAIL','JARVIS_B2_HMAC_KEY_HEX',
   'JARVIS_ACCESS_AUD','CLOUDFLARE_API_TOKEN'])
  assert.equal(serialized.includes(forbidden),false);
}
assert.equal(old.name,'cerebro-jarvis-cut32-lab-eu');
assert.equal(old.d1_databases[0].database_id,'988b11e1-21aa-4cf9-8b9d-110319df7ccc');
gate(template,true);
const args=process.argv.slice(2);
if(args.length===1 && args[0]==='--template'){
 console.log('CUT34_TEMPLATE_SAFELY_UNPROVISIONED: PASS; no D1/deploy operation');
}else if(args.length===2 && args[0]==='--resolved'){
 const resolved=read(args[1]);
 const expected={...template,d1_databases:[{...template.d1_databases[0],
  database_id:resolved.d1_databases?.[0]?.database_id}]};
 assert.deepEqual(resolved,expected,'ONLY NEW UUID SUBSTITUTION ALLOWED');
 gate(resolved,false);
 console.log('CUT34_RESOLVED_CONFIG_STATIC_GATE: PASS; no deployment');
}else{
 console.error('Usage: node verify-cut34-d1-isolation.mjs --template | --resolved PATH');
 process.exitCode=2;
}
