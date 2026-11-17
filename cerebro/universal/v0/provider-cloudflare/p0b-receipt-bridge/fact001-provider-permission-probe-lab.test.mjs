import test from 'node:test';
import assert from 'node:assert/strict';
import {runFact001P0BPermissionProbeLabV0 as probe} from './fact001-provider-permission-probe-lab.mjs';
const TOKEN='a'.repeat(32);
function fakeDb(){
 let inserted=false,values=null,calls=0;
 return {
  get values(){return values;},get calls(){return calls;},
  prepare(sql){
   return {bind(...args){return {async first(){
    calls++;
    if(sql.startsWith('INSERT INTO')){
     if(inserted)return null;
     inserted=true;return {id:args[0]};
    }
    if(sql.startsWith('UPDATE')){
     values=args;return {state:'COMPLETE'};
    }
    throw Error('UNEXPECTED_SQL');
   }
   };
   }
  };
  }
 };
}
test('diagnostic OFF does not read D1 or make HTTP requests',async()=>{
 let ops=0;
 const out=await probe({env:{FACT001_P0B_SCOPE_PROBE_ENABLED:'false',
  FACT001_RECEIPTS_ENABLED:'false',RECOVERY_DB:{prepare(){ops++;throw Error('UNEXPECTED')}}},
  fetchImpl:async()=>{ops++;throw Error('UNEXPECTED')}});
 assert.equal(out.status,'OFF');assert.equal(ops,0);
});
test('diagnostic only runs when signer/normal receipts are switched OFF',async()=>{
 const db=fakeDb();
 const x=await probe({env:{FACT001_P0B_SCOPE_PROBE_ENABLED:'true',
  FACT001_RECEIPTS_ENABLED:'true',RECOVERY_DB:db,CF_WORKERS_TOKEN:TOKEN}});
 assert.equal(x.status,'OFF');assert.equal(db.calls,0);
});
test('one-shot probe gets exactly four allowlisted Cloudflare paths and persists only codes',async()=>{
 const db=fakeDb(),uris=[],statuses=[200,403,401,200];
 const fetchImpl=async(url,opts)=>{
  uris.push(url);
  assert.equal(opts.method,'GET');
  assert.equal(new URL(url).hostname,'api.cloudflare.com');
  return {status:statuses[uris.length-1]};
 };
 const env={FACT001_P0B_SCOPE_PROBE_ENABLED:'true',FACT001_RECEIPTS_ENABLED:'false',
   CF_WORKERS_TOKEN:TOKEN,RECOVERY_DB:db};
 const out=await probe({env,fetchImpl,now:()=>1794862701631});
 assert.equal(out.status,'PROBE_DONE_PRIVATE');assert.equal(out.provider_actions,0);
 assert.equal(out.provider_get_requests,4);assert.equal(uris.length,4);
 assert.deepEqual(db.values.slice(1,5),statuses);
 assert.equal(db.values[0],'FACT001-P0B-PERMISSION-PROBE-20261116');
 assert.equal(JSON.stringify(db.values).includes(TOKEN),false);
 const twice=await probe({env,fetchImpl,now:()=>1794862701632});
 assert.equal(twice.status,'ALREADY_ATTEMPTED');assert.equal(uris.length,4);
});
test('negative malformed status/network errors persist only integers',async()=>{
 const db=fakeDb();
 const result=await probe({env:{FACT001_P0B_SCOPE_PROBE_ENABLED:'true',
  FACT001_RECEIPTS_ENABLED:'false',CF_WORKERS_TOKEN:TOKEN,RECOVERY_DB:db},
  fetchImpl:async()=>{throw Error('sensitive token raw');},now:()=>1794862701631});
 assert.equal(result.status,'PROBE_DONE_PRIVATE');
 assert.deepEqual(db.values.slice(1,5),[0,0,0,0]);
 assert.equal(JSON.stringify(db.values).includes('sensitive'),false);
});
