import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const y=fs.readFileSync(new URL('../../../../.github/workflows/cerebro-seo-physical-release-tribunal-v0.yml',import.meta.url),'utf8');
test('physical tribunal is skipped if any pinned source archive is missing',()=>{
 assert.match(y,/needs: evidence-preflight/);
 assert.match(y,/needs\.evidence-preflight\.outputs\.all_available == 'true'/);
 assert.match(y,/if \(\( \$\{#missing\[@\]\} > 0 \)\)/);
 assert.match(y,/all_available=false/);
 assert.match(y,/Physical tribunal SKIPPED \(not PASSED\)/);
 assert.match(y,/RELEASE_HOLD/);
 for(const id of ['42242988793','42247533380','42248337759'])assert.ok(y.includes(id));
 assert.ok(!y.includes('https://staging.fenixcapital.es'));
});
