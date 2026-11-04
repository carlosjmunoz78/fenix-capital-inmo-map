/** JARVIS B8 CUT04 · Real disposable PG17 lab evidence, NO PROD.
 * Auth/B3/Registry/Supervisor are synthetic ports. Storage is REAL PostgreSQL 17.
 * Reuses B8 commitment contract and psql transport pattern; no paid services.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createJarvisB8CommitmentTracker} from '../core/jarvis-b8-commitments.mjs';
if(process.env.PGDATABASE!=='jarvis_b8_cut04'||!process.env.PGHOST||
 process.env.JARVIS_B8_LAB_ONLY!=='true')throw Error('B8_DISPOSABLE_LAB_GUARD_REQUIRED');
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const HASH=/^[a-f0-9]{64}$/;
async function pg(sql,values=[]){
 if(!sql.startsWith('SELECT ')||sql.includes(';')||!sql.includes('zeus_jarvis_b8_lab.')||
 values.length>6||values.some(v=>typeof v!=='string'||v.length>5000))throw Error('B8_SQL_TRANSPORT_DENIED');
 const q=sql.replace(/\$(\d+)/g,(_m,d)=>{
  const i=Number(d);if(i<1||i>values.length)throw Error('PARAM_OUT_OF_RANGE');
  return ":'p"+i+"'";
 });
 const args=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'];
 values.forEach((v,i)=>args.push('-v','p'+(i+1)+'='+v));
 args.push('-f','-');
 const statement='SELECT row_to_json(_b8_row)::text FROM ('+q+') _b8_row;\n';
 return await new Promise((resolve,reject)=>{
  const p=spawn('psql',args,{env:process.env,stdio:['pipe','pipe','pipe'],
   signal:AbortSignal.timeout(15000)});
  let out='';
  p.stdout.on('data',b=>{out+=b.toString();if(out.length>20000)p.kill();});
  p.stderr.resume();
  p.on('error',()=>reject(Error('B8_LAB_PSQL_UNAVAILABLE')));
  p.on('close',c=>{
   if(c!==0)return reject(Error('B8_LAB_SQL_FAILED'));
   const lines=out.trim().split(/\r?\n/).filter(Boolean);
   if(lines.length!==1)return reject(Error('B8_LAB_SQL_CARDINALITY_INVALID'));
   try{const data=JSON.parse(lines[0]);if(!data||typeof data!=='object')throw Error('DATA');
    resolve(data);}catch{reject(Error('B8_LAB_SQL_RESULT_INVALID'));}
  });
  p.stdin.end(statement);
 });
}
function tracker(allowed=['fenix','aion']){
 const logs=[];
 const provider={
  identityProvider:{verify:async token=>token==='synthetic-ci-token'?
   {ownerId:'owner-ci-1',roles:['OWNER_ROOT'],authorizedCompanies:allowed}:{}},
  companyRegistry:{resolve:async p=>({companyId:p.companyId,environment:'LAB',
   verified:true,status:'ACTIVE'})},
  policy:{authorize:async p=>({decision:p.environment==='LAB'?'ALLOW':'DENY'})},
  supervisor:{inspect:async p=>({enabled:p.environment==='LAB',killSwitch:false,
   halted:false,revoked:false,costEuro:0})},
  audit:{append:async e=>{logs.push([e.eventCode,e.companyId]);return true;}},
  store:{
   putIfAbsent:async({companyId,ownerId,environment,commitmentId,fingerprint,record})=>{
    if(![companyId,ownerId,environment,commitmentId].every(valid)||!HASH.test(fingerprint))
     throw Error('B8_SQL_INPUT_INVALID');
    const {result}=await pg('SELECT zeus_jarvis_b8_lab.put_internal_commitment($1,$2,$3,$4,$5,$6::jsonb) AS result',
     [companyId,ownerId,environment,commitmentId,fingerprint,JSON.stringify(record)]);
    return {state:result,companyId,commitmentId,fingerprint};
   },
   list:async({companyId,ownerId,environment})=>{
    if(![companyId,ownerId,environment].every(valid))throw Error('B8_LIST_INPUT_INVALID');
    const {records}=await pg(
     "SELECT COALESCE(json_agg(record ORDER BY commitment_id),'[]'::json) AS records FROM zeus_jarvis_b8_lab.internal_commitment WHERE company_id=$1 AND owner_id=$2 AND environment=$3",
     [companyId,ownerId,environment]);
    if(!Array.isArray(records))throw Error('B8_RECORDS_INVALID');
    return records;
   }
  }
 };
 return {api:createJarvisB8CommitmentTracker(provider),logs};
}
const mk=(companyId,id,override={})=>({companyId,commitmentId:id,type:'INTERNAL_FOLLOW_UP',
 projectId:'synthetic-project',responsibleActorId:'synthetic-responsible',
 sourceEvidenceRefs:['synthetic-evidence'],nextActionRef:'synthetic-next-action',
 dueAt:'2026-12-01T12:00:00Z',counterpartyAccepted:false,economicCommitmentEuro:0,
 externalAction:false,...override});
const c={token:'synthetic-ci-token',environment:'LAB'};
async function rowCount(){
 const {n}=await pg('SELECT COUNT(*)::integer AS n FROM zeus_jarvis_b8_lab.internal_commitment');
 return n;
}
async function writePhase(){
 const {api}=tracker();
 const claims=await Promise.all([api.track({...c,commitment:mk('fenix','follow-1')}),
  api.track({...c,commitment:mk('fenix','follow-1')})]);
 assert.deepEqual(new Set(claims.map(x=>x.state)),new Set(['LAB_INTERNAL_TRACKED']));
 assert.deepEqual(new Set(claims.map(x=>x.replayed)),new Set([true,false]));
 assert.equal((await api.track({...c,commitment:mk('aion','follow-2')})).state,'LAB_INTERNAL_TRACKED');
 assert.equal(await rowCount(),2);
 assert.equal((await api.track({...c,commitment:mk('fenix','follow-1',
  {nextActionRef:'changed-action'})})).state,'DENY');
 assert.equal((await api.track({...c,commitment:mk('fenix','illegal',{economicCommitmentEuro:1})})).state,'DENY');
 assert.equal(await rowCount(),2);
 const foreign=tracker(['fenix']).api;
 assert.equal((await foreign.list({...c,companyId:'aion'})).state,'DENY');
 const f=await api.list({...c,companyId:'fenix'}),a=await api.list({...c,companyId:'aion'});
 assert.equal(f.count,1);assert.equal(a.count,1);assert.equal(f.commitments[0].commitmentId,'follow-1');
 return {phase:'write',records:2,companies:2,atomicIdempotency:'GREEN',crossTenant:'DENY',financialCommitment:'DENY'};
}
async function readPhase(){
 const {api}=tracker();
 const f=await api.list({...c,companyId:'fenix'}),a=await api.list({...c,companyId:'aion'});
 assert.equal(f.count,1);assert.equal(a.count,1);
 const r1=await api.track({...c,commitment:mk('fenix','follow-1')});
 const r2=await api.track({...c,commitment:mk('aion','follow-2')});
 assert.equal(r1.replayed,true);assert.equal(r2.replayed,true);
 assert.equal(await rowCount(),2);
 return {phase:'read_after_restart_or_restore',records:2,replayed:2,
   noDuplicates:'GREEN',tenantIsolation:'GREEN'};
}
const phase=process.argv.find(a=>a.startsWith('--phase='))?.split('=')[1];
if(!['write','read'].includes(phase))throw Error('B8_LAB_PHASE_REQUIRED');
const result=phase==='write'?await writePhase():await readPhase();
console.log(JSON.stringify({status:'GREEN',classification:'REAL_LAB_INTEGRATION',
 environment:'ISOLATED_GITHUB_ACTIONS_POSTGRES17',paidAiCalls:0,prodWrites:0,
 realIdentityGrants:false,realJob001Adapter:false,...result}));
