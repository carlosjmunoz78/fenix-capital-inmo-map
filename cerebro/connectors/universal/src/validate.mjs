import assert from 'node:assert/strict';
import { CAPABILITIES, CLIENTS, DIMENSIONS } from './catalog.mjs';
const names=CAPABILITIES.map(x=>x.id);
assert.equal(new Set(names).size,names.length);
assert.deepEqual(CLIENTS,['chatgpt','cerebro']);
assert.deepEqual(DIMENSIONS,['company_id','engine_id','environment','version']);
for(const c of CAPABILITIES){assert.ok(c.permission);assert.ok(c.status);assert.ok(c.path);}
console.log(JSON.stringify({valid:true,capabilities:CAPABILITIES.length,clients:CLIENTS}));
