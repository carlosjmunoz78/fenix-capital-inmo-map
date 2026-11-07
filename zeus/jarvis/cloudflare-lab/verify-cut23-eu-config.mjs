/** CUT23 release template admission: local only, never deploy directly. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const path=new URL('./wrangler-eu.template.jsonc',import.meta.url);
const c=JSON.parse(readFileSync(fileURLToPath(path),'utf8'));
assert.equal(c.name,'cerebro-jarvis-lab-eu');
assert.equal(c.main,'./worker-off.mjs');
assert.equal(c.workers_dev,false);
assert.deepEqual(c.routes,[]);
assert.equal(c.observability?.enabled,false);
assert.equal(c.d1_databases?.length,1);
assert.deepEqual(c.d1_databases[0],{
 binding:'JARVIS_LAB_DB',
 database_name:'cerebro-jarvis-lab-eu',
 database_id:'00000000-0000-0000-0000-000000000000',
 preview_database_id:'jarvis-cut23-eu-local'
});
const off=readFileSync(fileURLToPath(new URL('./worker-off.mjs',import.meta.url)),'utf8');
assert.match(off,/JARVIS_LAB_NOT_AUTHORIZED/);
assert.match(off,/503/);
console.log('CUT23 EU private Worker template: OFF, no routes, fictitious binding, no deploy: PASS');
