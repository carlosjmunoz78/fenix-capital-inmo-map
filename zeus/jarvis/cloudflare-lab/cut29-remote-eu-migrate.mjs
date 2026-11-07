#!/usr/bin/env node
/**
 * CUT29 / JARVIS EU LAB: controlled remote D1 schema application.
 * --plan: offline inspection only, no credentials or remote calls.
 * --apply: ONE controlled migration attempt, requires explicit env gate.
 * No destructive SQL, no Worker deployment, no changes to other databases.
 * Baseline and post-migration exports MUST be retained outside this runner.
 * No retry after an ambiguous remote change.
 */
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root=dirname(fileURLToPath(import.meta.url));
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const DB='cerebro-jarvis-lab-eu';
const UUID='988b11e1-21aa-4cf9-8b9d-110319df7ccc';
const OLD='a859fde1-126b-4c40-bc0d-aec2f8839f7b';
const CONF=join(root,'wrangler-eu.lab.jsonc');
const FILES=[
'0001_jarvis_d1_mission_lab.sql',
'0002_jarvis_d1_session_lab.sql',
'0003_jarvis_d1_b3_readonly_audit_lab.sql',
'0004_jarvis_d1_gateway_denial_audit_lab.sql',
'0005_jarvis_d1_daily_denial_quota_lab.sql'];
const TABLES=[
'jarvis_lab_mission_v0', 'jarvis_lab_session_binding_v0',
'jarvis_lab_b3_control_v0','jarvis_lab_b3_read_grant_v0',
'jarvis_lab_b3_audit_v0','jarvis_lab_gateway_denial_audit_v0',
'jarvis_lab_denial_quota_v0'];
const fail=(state)=>{throw new Error(state)};
function inspectLocal(){
  const c=JSON.parse(readFileSync(CONF,'utf8'));
  if(c.name!==DB||c.main!=='./worker-off.mjs'||c.workers_dev!==false||
    !Array.isArray(c.routes)||c.routes.length!==0||
    c.d1_databases?.length!==1||
    c.d1_databases[0].database_name!==DB||
    c.d1_databases[0].database_id!==UUID||
    c.d1_databases[0].database_id===OLD||
    c.d1_databases[0].binding!=='JARVIS_LAB_DB'||
    c.vars?.JARVIS_GATEWAY_ENABLED!=='false'||
    c.vars?.JARVIS_B2_B3_LIVE_ENABLED!=='false')fail('UNSAFE_LOCAL_D1_CONFIG');
  return FILES.map(file=>{
    const contents=readFileSync(join(root,file),'utf8');
    const body=contents.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n');
    if(/\b(DROP|TRUNCATE|ALTER\s+TABLE|ATTACH|DETACH|DELETE\s+FROM)\b/i.test(body)||
      !/CREATE TABLE IF NOT EXISTS/i.test(body))fail('UNSAFE_MIGRATION_FILE');
    return {file,sha256:createHash('sha256').update(contents).digest('hex')};
  });
}
function wrangler(args){
  const result=spawnSync('npx',['--yes','wrangler@4.157.0',...args],{
    cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:'false'},
    encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024
  });
  if(result.status!==0||result.error)fail('WRANGLER_REMOTE_OPERATION_UNVERIFIED');
  return result.stdout;
}
function query(sql){
  let response;
  try{response=JSON.parse(wrangler(['d1','execute',DB,'--remote','--config',CONF,
    '--command',sql,'--json','--yes']));}catch{fail('D1_QUERY_RESPONSE_UNVERIFIED')}
  if(!Array.isArray(response)||response.length!==1||
     response[0]?.success!==true||!Array.isArray(response[0]?.results))
    fail('D1_QUERY_RESULT_UNVERIFIED');
  return response[0].results;
}
async function verifyRemote(){
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if(typeof token!=='string'||token.length<12||/[\r\n]/.test(token))
    fail('PROTECTED_CLOUDFLARE_TOKEN_REQUIRED');
  let data;
  try{
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${UUID}`,{
      method:'GET',redirect:'error',cache:'no-store',
      headers:{accept:'application/json',authorization:`Bearer ${token}`},
      signal:AbortSignal.timeout(15000)
    });
    if(!response.ok||response.status!==200)fail('D1_METADATA_UNAVAILABLE');
    const raw=await response.text();
    if(raw.length>32768)fail('D1_METADATA_SIZE_INVALID');
    data=JSON.parse(raw);
  }catch{fail('D1_METADATA_UNAVAILABLE')}
  const db=data?.result;
  if(data?.success!==true||!Array.isArray(data.errors)||data.errors.length!==0||
    db?.uuid!==UUID||db?.name!==DB||db?.jurisdiction!=='eu'||
    db?.read_replication?.mode!=='disabled')fail('EU_RESIDENCY_NOT_VERIFIED');
}
function countTables(){
  const rows=query(`SELECT count(*) AS total FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`);
  if(rows.length!==1||!Number.isSafeInteger(rows[0]?.total))fail('D1_TABLE_COUNT_UNVERIFIED');
  return rows[0].total;
}
function exportDatabase(path){
  if(existsSync(path))fail('BACKUP_DESTINATION_ALREADY_EXISTS');
  wrangler(['d1','export',DB,'--remote','--config',CONF,'--output',path,'--yes']);
  if(!existsSync(path)||statSync(path).size===0)fail('BACKUP_EXPORT_UNVERIFIED');
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
async function main(){
  const files=inspectLocal();
  const mode=process.argv[2]??'--plan';
  if(!['--plan','--apply'].includes(mode)||process.argv.length>3)fail('INVALID_COMMAND_MODE');
  if(mode==='--plan'){
    console.log(JSON.stringify({status:'LOCAL_PLAN_ONLY',target:DB,uuid:UUID,
      migrations:files,remoteWrites:0,workerDeployment:false,production:'NO_GO'},null,2));
    return;
  }
  if(process.env.JARVIS_CUT29_APPROVED!=='APPLY_EU_LAB_0001_0005')
    fail('EXPLICIT_LAB_MIGRATION_APPROVAL_REQUIRED');
  const directory=process.env.JARVIS_CUT29_BACKUP_DIR;
  if(!directory||!resolve(directory).startsWith('/'))fail('DEDICATED_BACKUP_DIR_REQUIRED');
  const target=resolve(directory);
  mkdirSync(target,{recursive:true,mode:0o700});
  if(existsSync(join(target,'baseline.sql'))||existsSync(join(target,'post-migration.sql')))
    fail('BACKUP_DIR_MUST_BE_FRESH');
  await verifyRemote();
  // PRECONDITION: remote D1 must still be fresh. Do not overwrite existing schemas.
  if(countTables()!==0)fail('REMOTE_D1_NOT_EMPTY_NO_WRITE');
  const baseline=exportDatabase(join(target,'baseline.sql'));
  // Repeat read before first mutation, in case Cloudflare state changed.
  if(countTables()!==0)fail('REMOTE_D1_CHANGED_NO_WRITE');
  for(const filename of FILES){
    // At most one attempt per migration, no retry on error.
    wrangler(['d1','execute',DB,'--remote','--config',CONF,
      '--file',join(root,filename),'--yes']);
  }
  const rows=query(`SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE 'jarvis_lab_%' ORDER BY name`);
  const actual=rows.map(r=>r.name).sort();
  if(JSON.stringify(actual)!==JSON.stringify([...TABLES].sort()))
    fail('REMOTE_SCHEMA_PARITY_FAILURE_HUMAN_REVIEW');
  const post=exportDatabase(join(target,'post-migration.sql'));
  // No synthetic identity grants, no Worker publish and no real personal data.
  const record={status:'REMOTE_SCHEMA_APPLIED_BACKUP_READY',environment:'LAB',
    target:DB,uuid:UUID,migrationCount:FILES.length,tableCount:actual.length,
    baseline_sha256:baseline,post_sha256:post,workerDeployment:false,
    independentRemoteRestore:'PENDING',production:'NO_GO'};
  writeFileSync(join(target,'cut29-evidence.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify(record,null,2));
}
main().catch(e=>{console.error('CUT29_BLOCKED: '+String(e?.message??'UNAVAILABLE').replace(/[^A-Z0-9_]/gi,''));process.exitCode=1});