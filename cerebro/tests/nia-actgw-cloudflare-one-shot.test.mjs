import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../nia-notion-cloudflare-lab/actgw-one-shot-worker.mjs',import.meta.url),'utf8');
test('physical ACTGW lab probe retains original imports',()=>{
 assert.match(s,/import \{ ActionGatewayV1 \} from '\.\/action-gateway-v1\.mjs'/);
 assert.match(s,/bindNiaDiscoveryToActionGatewayV0/);
 assert.match(s,/createNiaPageReadProviderV0/);
});
test('no HTTP route, cron, AI invocation or writes',()=>{
 assert.match(s,/status:404/);
 assert.match(s,/NIA_ACTGW_SCHEDULED=OFF/);
 assert.doesNotMatch(s,/fetch\(['"]https:\/\//);
 assert.doesNotMatch(s,/method:\s*['"]POST['"]/);
 assert.match(s,/NIA_ACTGW_PHYSICAL_GATE=PASS/);
});
