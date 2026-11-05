import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB3VaultBroker} from './jarvis-b3-vault-broker.mjs';
const input={token:'signed-real-session',companyId:'fenix',environment:'LAB',connectorId:'github',actionName:'READ_REPO',parameters:{repository:'public-name'}};
function make(options={}){
 let invoked=0;
 const broker=createJarvisB3VaultBroker({
  decisionService:{authorize:async()=>({decision:'ALLOW'})},
  inventoryStore:{get:async()=>({status:'ACTIVE',reference:'vault-ref-001',companyId:'fenix',connectorId:'github',allowedActions:['READ_REPO']})},
  credentialExecutor:{run:async()=>{invoked++;return{ok:true,evidenceId:'audit-001',secret:'must-not-escape'}}},
  ...options
 });
 return {broker,invoked:()=>invoked};
}
test('B3 broker returns only evidence and never leaks raw credential or tool result',async()=>{
 const {broker,invoked}=make();
 const result=await broker.execute(input);
 assert.deepEqual(result,{status:'SUCCEEDED',evidenceId:'audit-001'});
 assert.equal(invoked(),1);
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('B3 broker refuses missing grants, expired inventory, cross-company and unknown action',async()=>{
 const cases=[
  {decisionService:{authorize:async()=>({decision:'DENY'})}},
  {inventoryStore:{get:async()=>null}},
  {inventoryStore:{get:async()=>({status:'REVOKED',reference:'vault-ref-001',companyId:'fenix',connectorId:'github',allowedActions:['READ_REPO']})}},
  {inventoryStore:{get:async()=>({status:'ACTIVE',reference:'vault-ref-001',companyId:'aion',connectorId:'github',allowedActions:['READ_REPO']})}},
  {inventoryStore:{get:async()=>({status:'ACTIVE',reference:'vault-ref-001',companyId:'fenix',connectorId:'github',allowedActions:['WRITE_REPO']})}}
 ];
 for(const opts of cases){const {broker,invoked}=make(opts);assert.equal((await broker.execute(input)).status,'DENIED');assert.equal(invoked(),0);}
});
test('B3 broker fails closed if Vault or privileged execution becomes unavailable',async()=>{
 for(const options of [
  {inventoryStore:{get:async()=>{throw Error('Vault offline')}}},
  {credentialExecutor:{run:async()=>{throw Error('secret: private')}}},
  {credentialExecutor:{run:async()=>({ok:true,secret:'private'})}}
 ]){
  const {broker}=make(options);
  const result=await broker.execute(input);
  assert.equal(result.status,'DENIED');
  assert.equal(JSON.stringify(result).includes('private'),false);
 }
});
test('B3 refuses missing server adapters',()=>{
 assert.throws(()=>createJarvisB3VaultBroker({}),/VAULT_SERVER_ADAPTERS_REQUIRED/);
});
