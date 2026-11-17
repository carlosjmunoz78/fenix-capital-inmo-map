import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {DurableJobRuntimeV1} from '../../runtime/durable-job-runtime-v1.mjs';
export function createIsolatedJob001LabReaderV0({runtime,fixture_directory}={}){
 if(!(runtime instanceof DurableJobRuntimeV1))throw Error('EXISTING_JOB001_RUNTIME_REQUIRED');
 if(typeof fixture_directory!=='string')throw Error('FIXTURE_DIRECTORY_REQUIRED');
 const dir=fs.realpathSync(fixture_directory);
 if(!dir.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(dir).startsWith('cerebro-universal-v0-fixture-'))throw Error('UNSAFE_JOURNAL_DIRECTORY');
 const journal=path.resolve(runtime.journal_path);
 if(!journal.startsWith(dir+path.sep)||fs.realpathSync(path.dirname(journal))!==dir)throw Error('JOURNAL_NOT_ISOLATED');
 return Object.freeze({
  source:'ISOLATED_JOB001_V1_FIXTURE_NOT_LIVE',
  listForContext(lab){
   if(!lab||lab.environment!=='LAB'||typeof lab.company_id!=='string'||typeof lab.engine_id!=='string'||typeof lab.version!=='string')throw Error('LAB_CONTEXT_REQUIRED');
   if(!lab.company_id.trim()||!lab.engine_id.trim()||!lab.version.trim())throw Error('LAB_CONTEXT_INVALID');
   if(/trading/i.test(lab.engine_id)||lab.engine_id==='LAB-TRD')throw Error('TRADING_ISOLATED');
   const sourceContext={...lab,environment:'PREPROD'};
   return runtime.listForContext(sourceContext).map(item=>({
    job_id:item.job_id,name:item.name,status:item.status,attempts:item.attempts,priority:item.priority,
    context:{...lab},origin_environment:'PREPROD',provenance:'JOB001_V1_EPHEMERAL_TEST_JOURNAL',payload_redacted:true
   }));
  }
 });
}
