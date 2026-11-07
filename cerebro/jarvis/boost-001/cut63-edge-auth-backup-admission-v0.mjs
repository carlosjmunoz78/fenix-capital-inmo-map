/**
 * CUT63 · All 60 JWT-off deployed Edge sources: static authentication marker
 * inventory. 8 real dated Supabase Pro PHYSICAL backup UI entries.
 * Source and backup evidence are NOT authorization, E2E, or a tested restore.
 * No network, secrets, DB/API writes, host access, billing or credentials.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const FLAG_NAMES=['auth_header','bearer','user_lookup','crypto','server_secret',
  'owner_scope','company_scope','privileged','rpc','webhook_signature'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=r=>{throw Error('CUT63_EVIDENCE_FAIL_CLOSED:'+r)};
const stablePath=x=>typeof x==='string'&&x.length>0&&!/[\\<>"']/g.test(x);
export const OBSERVED_SCOPE=Object.freeze({
 company_id:'fenix',environment:'LAB',
 project_ref:'cluhljgonannaafpmblx',observed_date:'2026-11-07',
 expected_total_deployments:95,expected_off_platform_jwt:60,expected_batched_sources:5,
 expected_pro_backup_entries:8,expected_latest_utc:'2026-11-07T02:59:58Z'
});
export function readCut63Fixtures(){
 const root='cut63-deployed-auth-batch-';
 const batches=['a','b','c','d','e'].map(k=>JSON.parse(fs.readFileSync(
  path.join(HERE,root+k+'-20261107.json'),'utf8')));
 return {
  listing:JSON.parse(fs.readFileSync(path.join(HERE,'cut63-edge-listing-20261107.json'),'utf8')),
  backup:JSON.parse(fs.readFileSync(path.join(HERE,'cut63-prod-backup-ui-observation-20261107.json'),'utf8')),
  batches
 };
}
export function inspectCut63({listing,batches,backup}){
 const scope=OBSERVED_SCOPE;
 if(listing?.schema!=='jarvis.cut63.deployed.edge.listing.readonly.v1'||
  listing.company_id!==scope.company_id||
  listing.project_ref!==scope.project_ref||
  listing.environment!==scope.environment||
  listing.observed_date!==scope.observed_date||
  listing.source!=='LIVE_SUPABASE_MCP_EDGE_FUNCTIONS_LIST'||
  listing.supabase_prod_modified!==false)
  fail('LISTING_SCOPE');
 if(!Array.isArray(listing.functions)||
  listing.functions.length!==scope.expected_total_deployments||
  listing.total!==scope.expected_total_deployments||
  listing.verify_jwt_false!==scope.expected_off_platform_jwt||
  listing.verify_jwt_true!==35)
  fail('EDGE_DEPLOYMENT_CARDINALITY');
 const all=new Map();
 for(const item of listing.functions){
  if(!stablePath(item?.slug)||all.has(item.slug)||
   !['ACTIVE'].includes(item.status)||!Number.isInteger(item.version)||
   ![true,false].includes(item.verify_jwt)||!/^([a-f0-9]{64})$/.test(item.ezbr_sha256))
   fail('DUPLICATE_OR_INVALID_DEPLOYMENT');
  all.set(item.slug,item);
 }
 if([...all.values()].filter(x=>x.verify_jwt===false).length!==60)
  fail('JWT_FALSE_COUNT_DRIFT');
 if(!Array.isArray(batches)||batches.length!==5)fail('BATCHES_MISSING');
 const seen=new Map();
 for(const [i,b] of batches.entries()){
  if(b.schema!=='jarvis.cut63.static.auth.batch.v1'||b.company_id!=='fenix'||
    b.project_ref!==scope.project_ref||b.environment!=='LAB'||
    b.observed_date!==scope.observed_date||b.batch!=='abcde'[i]||
    b.no_source_export!==true||b.live_endpoints_called!==false||
    b.static_flags_not_auth_proof!==true||
    !Array.isArray(b.rows)||b.rows.length!==12)
    fail('BATCH_SCOPE_OR_CARDINALITY');
  for(const r of b.rows){
   if(!all.has(r.slug)||all.get(r.slug).verify_jwt!==false||
     seen.has(r.slug)||r.status!=='READ'||r.verify_jwt!==false||
     r.version!==all.get(r.slug).version||
     !Number.isInteger(r.files)||r.files<1||
     !Number.isInteger(r.source_bytes)||r.source_bytes<50||
     !r.flags||typeof r.flags!=='object'||Array.isArray(r.flags)||
     Object.keys(r.flags).sort().join()!==[...FLAG_NAMES].sort().join()||
     FLAG_NAMES.some(f=>typeof r.flags[f]!=='boolean')||
     Object.keys(r).sort().join()!==
      ['slug','status','version','verify_jwt','files','source_bytes','flags'].sort().join())
     fail('EDGE_SOURCE_MISMATCH_OR_PRIVATE_SOURCE_EXPORT');
   seen.set(r.slug,r);
  }
 }
 if(seen.size!==60||[...all.values()].some(x=>x.verify_jwt===false&&!seen.has(x.slug)))
  fail('JWT_FALSE_DEPLOYED_SOURCE_UNREAD');
 if(backup?.schema!=='jarvis.cut63.supabase.backup.ui.observation.v1'||
   backup.company_id!=='fenix'||backup.project_ref!==scope.project_ref||
   backup.observed_date!==scope.observed_date||backup.organization_plan!=='pro'||
   backup.source!=='AUTHENTICATED_OPERA_SUPABASE_DASHBOARD_DATABASE_BACKUPS_SCHEDULED'||
   backup.listed_backup_type!=='PHYSICAL'||
   backup.visible_backup_entries!==scope.expected_pro_backup_entries||
   !Array.isArray(backup.listed_backup_times_utc)||backup.listed_backup_times_utc.length!==scope.expected_pro_backup_entries||
   new Set(backup.listed_backup_times_utc).size!==scope.expected_pro_backup_entries||
   backup.most_recent_visible_backup_utc!==scope.expected_latest_utc||
   backup.listed_backup_times_utc.at(-1)!==scope.expected_latest_utc||
   backup.backup_entries_visible!==true||
   backup.per_backup_success_status_independently_verified!==false||
   backup.actual_backup_restore_to_isolated_project_tested!==false||
   backup.restore_action_clicked!==false||backup.new_project_created!==false||
   backup.storage_api_objects_included!==false||
   backup.new_paid_addons_enabled!==false)
  fail('REAL_BACKUP_PROOF_SCOPE');
 const rows=[...seen.values()];
 const flagsCount=Object.fromEntries(FLAG_NAMES.map(k=>[k,rows.filter(x=>x.flags[k]).length]));
 const noHeader=rows.filter(x=>!x.flags.auth_header).map(x=>x.slug).sort();
 const noDirectAuthCues=rows.filter(x=>!
  (x.flags.auth_header||x.flags.bearer||x.flags.user_lookup||
   x.flags.crypto||x.flags.server_secret||x.flags.webhook_signature))
   .map(x=>x.slug).sort();
 const policySensitive=noDirectAuthCues.filter(x=>
  /gateway|signer|owner|dispatch|auth-probe|browser|prod|admin/i.test(x));
 return Object.freeze({
  schema:'jarvis.cut63.edge.auth.backup.admission.v1',
  company_id:'fenix',engine_id:'JARVIS',
  environment:'LAB',version:'CUT63-v0.1',
  source_snapshot_date:scope.observed_date,project_ref:scope.project_ref,
  deployed_total:95,jwt_on_35:35,jwt_off_60:60,
  jwt_off_code_sources_read:seen.size,
  source_batched_5:5,static_auth_cues_count:flagsCount,
  jwt_off_no_explicit_authorization_header: noHeader,
  without_examined_auth_cue:noDirectAuthCues,
  policy_sensitive_without_examined_auth_cue:policySensitive,
  real_pro_physical_backup_entries_visible:backup.visible_backup_entries,
  latest_real_backup_visible_utc:backup.most_recent_visible_backup_utc,
  backup_success_status_verified:false,
  backed_up_database_bytes_verified:false,
  storage_objects_backed_up_by_database:false,
  real_prod_restore_to_isolated_target_verified:false,
  source_code_read_does_not_prove_authentication:true,
  jwt_disabled_does_not_prove_authentication_bypass:true,
  runtime_negative_auth_tests_executed:0,
  owner_b2b3_e2e_verified:false,
  supabase_prod_write_authorized:false,
  new_project_created:false,
  additional_paid_subscriptions:0,
  next_gate:'CUT64_PHYSICAL_AUTH_NEGATIVE_E2E_AND_RESTORE_TO_ISOLATED_ENVIRONMENT',
  verdict:'NO_GO',
  artifact_sha256:hash(JSON.stringify({all:[...all.values()].map(x=>x.slug),flagsCount,backup:scope.expected_latest_utc}))
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const o=inspectCut63(readCut63Fixtures());
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(o,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({reviewed:o.jwt_off_code_sources_read,total:o.deployed_total,
   backup_visible:o.real_pro_physical_backup_entries_visible,
   no_cues:o.without_examined_auth_cue.length,
   verdict:o.verdict,prod_write_authorized:false}));
}
