import test from 'node:test';import assert from 'node:assert/strict';
import {probeP5Egress} from '../egress-probe.mjs';
test('Cloudflare Workers-compatible manual redirect and never-follow policy',async()=>{let seen;let count=0;
const db={prepare(sql){return{bind(...args){return {first:async()=>({id:'FACT001-P5-EGRESS-PROBE-20261112-V2'}),run:async()=>({success:true})};}}}};
const env={P5_DIAG_ENABLED:'true',RECOVERY_DB:db};
const x=await probeP5Egress(env,async(u,opt)=>{seen=opt;count++;return {status:302}});
assert.equal(count,1);assert.equal(seen.redirect,'manual');assert.equal(x.status,'BLOCKED');assert.equal(x.code,'UNEXPECTED_HTTP_302');
});
