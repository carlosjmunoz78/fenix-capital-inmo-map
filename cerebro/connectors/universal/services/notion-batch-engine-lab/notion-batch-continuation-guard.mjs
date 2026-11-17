// FACT-001: fail-closed continuation from verified, offsite Notion LAB content checkpoint.
// Pure calculation. Does not read a credential, call Notion, advance a CAS or deploy anything.
import {createHash} from 'node:crypto';
export const NOTION_INDEX_SHA='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
export const NOTION_TOTAL=6632;
export const NOTION_CHECKPOINT_DB='bc085807-a6ca-4c56-a288-fe56716fec6f';
export const NOTION_LAST_DRIVE='1jqCgm1qY2euqCy9uO_KGHrV4hMqSI0BC';
export const NOTION_LAST_ZIP_SHA='8501eb64a02b3bdaa9351fe2c460e81181781e399da7f839f86f0070b1a0c49b';
const HEX=/^[a-f0-9]{64}$/;
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const same=(a,b)=>Boolean(a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(b).every(k=>a[k]===b[k])&&Object.keys(a).length===Object.keys(b).length);
const fail=code=>{throw new Error(code)};
const sha=s=>createHash('sha256').update(s).digest('hex');

/** Static plan for one next batch; does not claim current D1 state or remote Drive freshness. */
export function deriveNotionNextBatch({checkpoint,requestedOffset=100,maxItems=25}={}){
 if(!checkpoint||checkpoint.format!=='FACT001-NOTION-BATCH-75-100-COMPOSITE-OFFSITE-D1-CAS-VERIFIED-V1'||!same(checkpoint.scope,scope))fail('NOTION_CHECKPOINT_SCOPE_DENIED');
 if(checkpoint.source_index_sha256!==NOTION_INDEX_SHA||checkpoint.cumulative?.objects!==100||checkpoint.cumulative?.pages!==96||checkpoint.cumulative?.data_sources!==4||checkpoint.batch?.offset!==75||checkpoint.batch?.next_offset!==100||checkpoint.batch?.objects!==25||checkpoint.batch?.provider_notion_writes!==0)fail('NOTION_CHECKPOINT_CONTENT_DENIED');
 if(checkpoint.composite?.google_drive_id!==NOTION_LAST_DRIVE||checkpoint.composite?.sha256!==NOTION_LAST_ZIP_SHA||checkpoint.composite?.encrypted_only!==true||checkpoint.composite?.private!==true||checkpoint.composite?.crc_pass!==true||checkpoint.composite?.drive_download_sha256_equal_d1!==true)fail('NOTION_OFFSITE_PARITY_DENIED');
 if(checkpoint.cas?.database_id!==NOTION_CHECKPOINT_DB||checkpoint.cas?.prior_offset!==75||checkpoint.cas?.prior_version!==3||checkpoint.cas?.final_offset!==100||checkpoint.cas?.final_version!==4||checkpoint.cas?.audit_rows_total!==3||checkpoint.cas?.last_zip_sha256!==NOTION_LAST_ZIP_SHA||checkpoint.cas?.last_drive_file_id!==NOTION_LAST_DRIVE)fail('NOTION_D1_CAS_EVIDENCE_DENIED');
 if(checkpoint.gates?.full_workspace_backup!==false||checkpoint.gates?.physical_notion_restore!==false||checkpoint.gates?.independent_key_escrow!==false)fail('NOTION_UNEXPECTED_GATE_CHANGE');
 if(!Number.isSafeInteger(requestedOffset)||requestedOffset!==100||!Number.isSafeInteger(maxItems)||maxItems<1||maxItems>25)fail('NOTION_NEXT_CURSOR_DENIED');
 const end=Math.min(NOTION_TOTAL,requestedOffset+maxItems);
 if(end<=requestedOffset)fail('NOTION_NEXT_END_DENIED');
 return Object.freeze({status:'NEXT_BATCH_PREPARED_NOT_EXECUTED',...scope,
  prior_checkpoint_offset:100,prior_checkpoint_version:4,
  checkpoint_db_id:NOTION_CHECKPOINT_DB,offset:requestedOffset,next_offset:end,
  items:end-requestedOffset,index_sha256:NOTION_INDEX_SHA,
  batch_ref:sha(NOTION_INDEX_SHA+':'+requestedOffset+':'+end),
  previous_zip_sha256:NOTION_LAST_ZIP_SHA,previous_drive_file_id:NOTION_LAST_DRIVE,
  required_provider:'CEREBRO_INDEPENDENT_NOTION_SERVICE',
  mandatory_gates:['SIGNED_OWNER_ORDER','LIVE_D1_CAS_100_V4','OFFSITE_DRIVE_READBACK','ENCRYPTED_CONTENT_100_PERCENT','DURABLE_CAS_AFTER_OFFSITE','NO_PLAINTEXT','NO_PROVIDER_WRITES'],
  credentials_exported:false,notion_writes:0,github_approval_not_implied:true,
  service_deployed:false,queue_enabled:false,cron_enabled:false,full_workspace_backed_up:false});
}
export function assessNotionFullCoverage({objects=0,expected=NOTION_TOTAL,media=false,comments=false,permissions=false,escrow=false,physicalRestore=false,offsiteParity=false,durableCas=false}={}){
 if(!Number.isSafeInteger(objects)||objects<0||objects>NOTION_TOTAL||expected!==NOTION_TOTAL)fail('NOTION_COVERAGE_BAD_COUNT');
 const missing={objects:NOTION_TOTAL-objects,media:!media,comments:!comments,permissions:!permissions,escrow:!escrow,physical_restore:!physicalRestore,offsite_parity:!offsiteParity,durable_cas:!durableCas};
 return {status:Object.values(missing).every(v=>v===false||v===0)?'COVERAGE_EVIDENCE_READY_FOR_TRIBUNAL':'BACKUP_AND_ROLLBACK_PENDING',missing};
}
