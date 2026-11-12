import test from 'node:test';
import assert from 'node:assert/strict';
import {probeP5Egress} from '../egress-probe.mjs';
function f(enabled='true'){
 const writes=[];let count=0;
 const db={prepare(sql){return{bind(...args){return{async first(){if(sql.startsWith('INSERT'))return count++?null:{id:'FACT001-P5-EGRESS-PROBE-20261112-V2'};throw Error('not first')},async run(){writes.push({sql,args});return {success:true};}}}}}};
 return{writes,env:{P5_DIAG_ENABLED:enabled,RECOVERY_DB:db}};
}
test('no diagnostic unless explicitly enabled',async()=>{const x=f('false');const r=await probeP5Egress(x.env);assert.equal(r.status,'OFF');assert.equal(x.writes.length,0)});
test('a single invalid token probe gets 401, stores status only, one shot',async()=>{
 const x=f();let calls=0;
 const api=async(url,opts)=>{calls++;assert.match(url,/cerebro-fact001-p5-dispatch-lab\/dispatch/);assert.equal(opts.headers.Authorization,'Bearer invalid');return {status:401}};
 assert.equal((await probeP5Egress(x.env,api)).status,'PASS');assert.equal((await probeP5Egress(x.env,api)).status,'ALREADY_PROBED');assert.equal(calls,1);
 assert.equal(x.writes[0].args[1],'PASS');assert.equal(x.writes[0].args[2],'EDGE_HTTP_401');
});
test('network failure recorded as blocked without credentials',async()=>{const x=f();const r=await probeP5Egress(x.env,async()=>{throw new TypeError('failed to fetch')});assert.equal(r.status,'BLOCKED');assert.equal(r.code,'EGRESS_TYPE_ERROR')});
