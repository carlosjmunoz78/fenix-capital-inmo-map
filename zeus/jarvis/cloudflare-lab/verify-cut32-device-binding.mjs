import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=path=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
const cfg=JSON.parse(read('./wrangler-b2-device.candidate.lab.jsonc'));
assert.equal(cfg.name,'cerebro-jarvis-lab-eu');
assert.equal(cfg.main,'./worker-b2-device-probe.mjs');
assert.equal(cfg.workers_dev,false);
assert.deepEqual(cfg.routes,[]);
assert.equal(cfg.triggers,undefined);
assert.equal(cfg.observability?.enabled,false);
assert.deepEqual(cfg.vars,{
 JARVIS_ENVIRONMENT:'LAB',
 JARVIS_ACCESS_PROBE_ENABLED:'false',
 JARVIS_B2_DEVICE_ENABLED:'false',
 JARVIS_B2_ENROLLMENT_ENABLED:'false',
 JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false'
});
assert.deepEqual(cfg.d1_databases,[{
 binding:'JARVIS_LAB_DB',database_name:'cerebro-jarvis-lab-eu',
 database_id:'988b11e1-21aa-4cf9-8b9d-110319df7ccc',
 preview_database_id:'jarvis-cut32-device-local'
}]);
const src=read('./worker-b2-device-probe.mjs');
assert.match(src,/createJarvisB2DeviceSessionGate/);
assert.match(src,/createJarvisD1SessionStore/);
assert.match(src,/createJarvisB2DeviceEnrollment/);
for(const forbidden of ['INSERT INTO','UPDATE jarvis_lab_session','DELETE FROM',
 'ENROLL','JARVIS_OWNER_EMAIL','JARVIS_ACCESS_AUD','JARVIS_B2_HMAC_KEY_HEX',
 'service_role','app.fenixcapital.es','a859fde1-126b-4c40-bc0d-aec2f8839f7b'])
 assert.equal(JSON.stringify(cfg).includes(forbidden),false);
assert.doesNotMatch(src,/INSERT INTO|DELETE FROM|\.insert\(/);
console.log('CUT32 per-device B2 candidates OFF, EU DB fixed, no public route or session mutation: PASS');
