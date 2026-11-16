/** Minimal, reversible source-level instrumentation for the ORIGINAL LAB runner.
 * Never reconstruct the runtime, never edit sibling modules, routes, cron or bindings.
 * Caller must verify the deployed baseline version/hash before upload.
 * This script only transforms a text string. It has NO Cloudflare SDK or network IO.
 */
const BEFORE="import {pagesTick} from './pages-adapter.mjs';";
const RETURN=" return {status:state,request_id:job.request_id,attempts:out.attempts};";
const IMPORT="import {emitFact001ReceiptIfEnabledLabV0} from './fact001-runner-receipt-hook-lab.mjs';";
const HOOK=[
 " if(env?.FACT001_RECEIPTS_ENABLED==='true'&&state==='COMPLETED'){",
 "  try{",
 "   const evidence=await emitFact001ReceiptIfEnabledLabV0({env,jobId:job.id});",
 "   // Sanitized status only; never log receipt contents, request IDs or secrets.",
 "   console.log('FACT001_P0B_RECEIPT_STATUS='+",
 "    (['DURABLE_LAB_RECEIPT_UNATTESTED','NOT_CERTIFIED'].includes(evidence?.status)?evidence.status:'NOT_CERTIFIED'));",
 "  }catch{console.log('FACT001_P0B_RECEIPT_STATUS=NOT_CERTIFIED');}",
 " }"
].join('\n');
const occurrences=(text,needle)=>text.split(needle).length-1;
export function patchOriginalFact001RunnerLabV0(original){
 if(typeof original!=='string'||original.length<8000||original.length>30000||
    occurrences(original,BEFORE)!==1||occurrences(original,RETURN)!==1||
    !original.includes("export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'})")||
    !original.includes("async function remove(db,token,name,time)")||
    !original.includes("export async function tick(env,time=Date.now())")||
    original.includes("fact001-runner-receipt-hook-lab.mjs"))
  throw Error('FACT001_BASELINE_UNRECOGNIZED');
 const patched=original.replace(BEFORE,BEFORE+'\n'+IMPORT).replace(RETURN,HOOK+'\n'+RETURN);
 if(unpatchFact001RunnerLabV0(patched)!==original)
  throw Error('OLD_NEW_SOURCE_REVERSIBILITY_FAILED');
 return Object.freeze({source:patched,feature_flag:'FACT001_RECEIPTS_ENABLED',default_state:'OFF',
  old_behavior_preserved_when_flag_absent:true});
}
export function unpatchFact001RunnerLabV0(candidate){
 if(typeof candidate!=='string'||occurrences(candidate,IMPORT)!==1||
    occurrences(candidate,HOOK)!==1)throw Error('FACT001_CANDIDATE_UNKNOWN');
 return candidate.replace(BEFORE+'\n'+IMPORT,BEFORE)
  .replace(HOOK+'\n'+RETURN,RETURN);
}
