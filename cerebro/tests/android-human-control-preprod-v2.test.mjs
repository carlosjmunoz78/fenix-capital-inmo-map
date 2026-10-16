import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync(new URL('../android-worker-preprod-v1/src/es/cerebro/worker/preprod/PolicyGuard.java',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../android-worker-preprod-v2/AndroidManifest.xml',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../runtime/build-android-human-control-preprod-v2.sh',import.meta.url),'utf8');

function tokens(){
  const block=guard.match(/HIGH_RISK_TOKENS\s*=\s*new String\[\]\{([\s\S]*?)\};/)?.[1]??'';
  return [...block.matchAll(/"([^"]+)"/g)].map(x=>x[1].toLowerCase());
}
function highRisk(value){const v=value.toLowerCase();return tokens().some(t=>v.includes(t));}

test('owner-directed PREPROD policy is broad for ordinary apps, including WhatsApp',()=>{
  assert.equal(guard.includes('UI_PACKAGES'),false);
  assert.equal(highRisk('com.whatsapp'),false);
  assert.equal(highRisk('com.spotify.music'),false);
  assert.equal(highRisk('com.android.chrome'),false);
  assert.match(guard,/return isHighRiskTarget\(pkg\) \? "HUMAN_REQUIRED_HIGH_RISK" : null;/);
});

test('high-risk device and money surfaces remain human-by-exception',()=>{
  for(const target of ['com.bbva.mobile','es.bancosantander.apps','com.paypal.android.p2pmobile','com.google.android.apps.authenticator2','com.android.settings','com.google.android.permissioncontroller','example.crypto.wallet']){
    assert.equal(highRisk(target),true,target);
  }
  for(const token of ['bank','banco','wallet','paypal','payment','crypto','authenticator','credential','signature','legal','security','settings','permissioncontroller']) assert.equal(tokens().includes(token),true,token);
  assert.match(guard,/risk\.contains\("HIGH"\)/);
  assert.match(guard,/HUMAN_REQUIRED_HIGH_RISK/);
});

test('kill switch, engine scope and PREPROD boundary remain fail closed',()=>{
  assert.match(guard,/DeviceState\.killSwitch\(c\)/);
  assert.match(guard,/"PREPROD"\.equalsIgnoreCase/);
  assert.match(guard,/ENGINE_DENIED/);
  assert.match(guard,/ENVIRONMENT_DENIED/);
});

test('V2 is side-by-side and keeps V1 as rollback',()=>{
  assert.match(manifest,/package="es\.cerebro\.worker\.preprod\.v2"/);
  assert.match(manifest,/es\.cerebro\.worker\.preprod\.MainActivity/);
  assert.match(manifest,/es\.cerebro\.worker\.preprod\.CerebroAccessibilityService/);
  assert.equal(manifest.includes('REQUEST_INSTALL_PACKAGES'),false);
  assert.equal(manifest.includes('READ_SMS'),false);
  assert.equal(manifest.includes('READ_CONTACTS'),false);
  assert.match(build,/rollback_package.*es\.cerebro\.worker\.preprod/);
  assert.match(build,/prod_authorized.*false/);
  assert.match(build,/payment_automation.*false/);
  assert.match(build,/credential_automation.*false/);
});

test('V2 URL lane accepts ordinary HTTPS without fixed-domain allowlist',()=>{
  assert.match(guard,/"https"\.equalsIgnoreCase/);
  assert.equal(guard.includes('staging.fenixcapital.es'),false);
  assert.equal(guard.includes('URL_HOST_DENIED_PREPROD'),false);
  assert.match(guard,/isHighRiskTarget\(host\)/);
});
