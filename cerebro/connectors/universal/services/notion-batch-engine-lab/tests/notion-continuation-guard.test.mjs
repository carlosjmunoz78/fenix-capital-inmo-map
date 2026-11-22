import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deriveNotionNextBatch,assessNotionFullCoverage,NOTION_INDEX_SHA} from '../notion-batch-continuation-guard.mjs';
const load=()=>JSON.parse(fs.readFileSync(new URL('../checkpoints/batch-75-100-composite-d1-cas.v1.json',import.meta.url)));
test('immutable last checkpoint determines exactly 100→125, not an export',()=>{
 const o=deriveNotionNextBatch({checkpoint:load()});
 assert.equal(o.status,'NEXT_BATCH_PREPARED_NOT_EXECUTED');
 assert.equal(o.offset,100);assert.equal(o.next_offset,125);assert.equal(o.items,25);
 assert.equal(o.index_sha256,NOTION_INDEX_SHA);assert.equal(o.service_deployed,false);
 assert.equal(o.notion_writes,0);assert.equal(o.queue_enabled,false);assert.equal(o.full_workspace_backed_up,false);
});
test('25 is maximum; 24 and 1 allowed; 0 and 26 rejected',()=>{
 assert.equal(deriveNotionNextBatch({checkpoint:load(),maxItems:1}).next_offset,101);
 assert.equal(deriveNotionNextBatch({checkpoint:load(),maxItems:24}).next_offset,124);
 for(const maxItems of [0,26,-1,1.5,'25',null])assert.throws(()=>deriveNotionNextBatch({checkpoint:load(),maxItems}),/CURSOR_DENIED/);
});
test('never replay earlier 0→100 or skip ahead',()=>{
 for(const requestedOffset of [0,25,50,75,99,101,125,6632,-1,NaN,'100'])assert.throws(()=>deriveNotionNextBatch({checkpoint:load(),requestedOffset}),/CURSOR_DENIED/);
});
test('different tenant, environment or schema denied',()=>{
 for(const [section,key,value] of [['scope','company_id','other'],['scope','environment','PROD'],['scope','engine_id','CRM-001'],['scope','version','1.1.0'],['cas','database_id','other'],['cas','final_offset',75],['cas','final_version',3],['cas','audit_rows_total',2],['batch','next_offset',125],['batch','provider_notion_writes',1],['cumulative','objects',99],['composite','private',false],['composite','encrypted_only',false],['composite','crc_pass',false],['composite','sha256','a'.repeat(64)],['composite','drive_download_sha256_equal_d1',false],['gates','full_workspace_backup',true]]){
  const cp=load();cp[section][key]=value;assert.throws(()=>deriveNotionNextBatch({checkpoint:cp}),/DENIED|GATE_CHANGE/);
 }
});
test('key material never present in continuation plan',()=>{
 const s=JSON.stringify(deriveNotionNextBatch({checkpoint:load()}));
 for(const bad of ['notionToken','aes256_key','decrypted_secret','plaintext','authorization_header']) assert.equal(s.includes(bad),false);
});
test('coverage is fail-closed even at 6632 when no escrow, comments or physical restore',()=>{
 assert.equal(assessNotionFullCoverage({objects:100}).missing.objects,6532);
 assert.equal(assessNotionFullCoverage({objects:6632}).status,'BACKUP_AND_ROLLBACK_PENDING');
 assert.equal(assessNotionFullCoverage({objects:6632,media:true,comments:true,permissions:true,escrow:true,physicalRestore:true,offsiteParity:true,durableCas:true}).status,'COVERAGE_EVIDENCE_READY_FOR_TRIBUNAL');
 for(const objects of [-1,6633,100.4,'100'])assert.throws(()=>assessNotionFullCoverage({objects}),/BAD_COUNT/);
});
