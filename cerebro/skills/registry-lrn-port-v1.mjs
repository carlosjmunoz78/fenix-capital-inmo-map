import {snapshotSha256,validatePrivateInventory} from './skill-private-intake-v2.mjs';
const fail=code=>{throw Error(code)};
const scope={company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.6.0'};
const exact=(x,y)=>JSON.stringify(Object.keys(x??{}).sort().map(k=>[k,x[k]]))===JSON.stringify(Object.keys(y).sort().map(k=>[k,y[k]]));
// One bounded projection in the existing registry; never admits, promotes or executes learning.
export async function reconcileLrnPublication({storage,manifest,authorization,authenticate,validatePublication,loadSnapshot,enabled=false,clock=Date.now}){
 if(enabled!==true||typeof authenticate!=='function'||typeof validatePublication!=='function'||typeof loadSnapshot!=='function')fail('CLOSED');
 if(typeof authorization!=='string'||authorization.length>12288||typeof manifest!=='string'||manifest.length>8192)fail('INPUT');
 const claims=await authenticate(authorization), m=JSON.parse(manifest);
 validatePublication(m,claims);
 if(!exact(m.scope,scope)||!Number.isSafeInteger(m.run_id)||m.run_id<=0||!Number.isSafeInteger(m.run_attempt)||m.run_attempt<=0||!(/^[a-f0-9]{40}$/.test(m.state_commit))||!Number.isSafeInteger(claims.exp)||claims.exp*1000<=clock()||m.promotion_allowed!==false||m.additional_cost_eur!==0)fail('SCOPE');
 const expected=await loadSnapshot(), sql=storage.sql;
 return storage.transactionSync(()=>{
  if(claims.exp*1000<=clock())fail('EXPIRED');
  const st=sql.exec('SELECT snapshot FROM registry WHERE company=?','fenix').toArray()[0];
  if(!st)fail('REGISTRY_ABSENT');const inventory=JSON.parse(st.snapshot);const counts=validatePrivateInventory(inventory);
  if(snapshotSha256(inventory)!==snapshotSha256(expected))fail('INVENTORY_DRIFT');
  sql.exec('CREATE TABLE IF NOT EXISTS lrn_fact_projection (company TEXT PRIMARY KEY, run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, state_commit TEXT NOT NULL, body TEXT NOT NULL)');
  const old=sql.exec('SELECT run_id,attempt,state_commit,body FROM lrn_fact_projection WHERE company=?','fenix').toArray()[0];
  const receipt={status:'LRN_FACT_REGISTRY_RECONCILED',company_id:'fenix',engine_id:'FACT-001',source_engine:'LRN-001',environment:'LAB',run_id:m.run_id,attempt:m.run_attempt,state_commit:m.state_commit,...counts,learning_execution:'BOUND_NOT_RUN',added:0,provider_calls:0,promotion_authorized:false};
  if(old&&(old.run_id>m.run_id||old.run_id===m.run_id&&old.attempt>m.run_attempt))fail('STALE');
  if(old&&old.run_id===m.run_id&&old.attempt===m.run_attempt){if(old.state_commit!==m.state_commit||old.body!==JSON.stringify(receipt))fail('CONFLICT');return {...receipt,write:'EXISTING'};}
  sql.exec('INSERT INTO lrn_fact_projection VALUES (?,?,?,?,?) ON CONFLICT(company) DO UPDATE SET run_id=excluded.run_id,attempt=excluded.attempt,state_commit=excluded.state_commit,body=excluded.body','fenix',m.run_id,m.run_attempt,m.state_commit,JSON.stringify(receipt));
  return {...receipt,write:'RECORDED'};
 });
}
