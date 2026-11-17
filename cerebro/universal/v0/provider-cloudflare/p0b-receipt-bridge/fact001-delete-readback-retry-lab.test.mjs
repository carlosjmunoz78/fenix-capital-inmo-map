import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFact001DeleteConvergenceLabV0 as verify} from './fact001-delete-readback-retry-lab.mjs';
const name='cerebro-fact001-managed-lab-sig261116a';
test('eventually consistent provider DELETE is certified ONLY after two consecutive independent observations',async()=>{
 let reads=0,checks=0,sleeps=0;
 const result=await verify({name,
  listScripts:async()=>{reads++;return reads<=2?[{id:name}]:[]},
  getScriptStatus:async()=>{checks++;return checks<=2?200:404},
  pause:async ms=>{sleeps++;assert(ms>0&&ms<=1250)}
 });
 assert.equal(result.status,'CONFIRMED_ABSENT');
 assert.equal(result.consecutive_reads,2);
 assert.equal(result.attempts,4);
 assert.equal(result.prod_promotion_allowed,false);
 assert.equal(sleeps,3);
});
test('never converts stale list, disagreement or HTTP 403 into success',async()=>{
 for(const cfg of [
  {listScripts:async()=>[{id:name}],getScriptStatus:async()=>404},
  {listScripts:async()=>[],getScriptStatus:async()=>200},
  {listScripts:async()=>[],getScriptStatus:async()=>403},
  {listScripts:async()=>[{invalid:true}],getScriptStatus:async()=>404},
  {listScripts:async()=>{throw Error('token here')},getScriptStatus:async()=>404}
 ]){
  const r=await verify({name,...cfg});
  assert.equal(r.status,'NOT_VERIFIED');
  assert.equal(r.provider_absent,false);
  assert.equal(JSON.stringify(r).includes('token here'),false);
 }
});
test('unknown script names and unapproved max attempts are denied before any HTTP',async()=>{
 let calls=0;
 const read=async()=>{calls++;return []};
 for(const bad of ['production','cerebro-jarvis-lab-eu','cerebro-fact001-managed-lab-../foo']){
  const a=await verify({name:bad,listScripts:read,getScriptStatus:async()=>{calls++;return 404}});
  assert.equal(a.reason,'SCOPE_OR_DEPENDENCY_INVALID');
 }
 const b=await verify({name,listScripts:read,getScriptStatus:async()=>404,maxAttempts:20});
 assert.equal(b.reason,'SCOPE_OR_DEPENDENCY_INVALID');
 assert.equal(calls,0);
});
test('absence cannot pass with just one confirmed observation in final attempt',async()=>{
 let n=0;
 const r=await verify({name,
  listScripts:async()=>{n++;return n<5?[{id:name}]:[]},
  getScriptStatus:async()=>n<5?200:404
 });
 assert.equal(r.status,'NOT_VERIFIED');
 assert.equal(r.reason,'POST_DELETE_CONVERGENCE_TIMEOUT');
});
