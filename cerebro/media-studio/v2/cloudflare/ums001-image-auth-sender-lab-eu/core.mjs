/**
 * CEREBRO UMS-001 · PRIVATE IMAGE QA SENDER LAB V0
 * Isolated queue-triggered adapter. It calls an EXISTING CEREBRO producer
 * Gateway RPC (read-only catalog readiness), then submits exactly one
 * immutable, previously archived image's metadata to the separate QA Queue.
 *
 * Auth boundary: a Cloudflare-account-authenticated private trigger Queue +
 * a private Cloudflare service binding to CEREBRO_PRODUCER.
 * Actor strings by themselves are NOT cryptographic user authentication.
 * No public HTTP, no provider POST, no FINOPS, no customer delivery, no social.
 */
const COMMAND_KEYS=Object.freeze(['schema_version','actor_id','company_id','engine_id',
 'environment','mode','action','request_id','order_id']);
const SCOPE=Object.freeze({schema_version:1,actor_id:'cerebro-orchestrator-lab',
 company_id:'fenix',engine_id:'UMS-001',environment:'LAB',mode:'QA_METADATA_ONLY',
 action:'SUBMIT_ARCHIVED_LINKEDIN_QA'});
const ID=/^UMS001-LAB-LI-FEED-01-ARCHIVE-[0-9]{8}$/;
const REQ=/^UMS001-SENDER-REQ-[A-Z0-9_-]{8,64}$/;
const SHA=/^[0-9a-f]{64}$/;
const DRIVE=/^[A-Za-z0-9_-]{20,80}$/;
const MANIFEST_KEYS=Object.freeze([
 'archive_drive_file_id','archive_zip_sha256','archive_zip_bytes',
 'image_sha256','image_bytes','image_type','source_qa_zip_sha256',
 'source_qa_drive_file_id'
]);
const fail=code=>{throw Error('UMS001_PRIVATE_IMAGE_SENDER_'+code);};
export function assertCommand(command){
 if(!command||typeof command!=='object'||Array.isArray(command)||
    Object.keys(command).length!==COMMAND_KEYS.length||
    COMMAND_KEYS.some(k=>!Object.hasOwn(command,k))) fail('COMMAND_SCHEMA');
 for(const [k,v] of Object.entries(SCOPE))if(command[k]!==v)fail('COMMAND_SCOPE_'+k);
 if(!REQ.test(command.request_id||'')||!ID.test(command.order_id||''))
  fail('COMMAND_IDENTITY');
 return command;
}
export function assertArchiveManifest(raw){
 let m;
 try {m=typeof raw==='string'?JSON.parse(raw):raw;}catch{fail('PRIVATE_ARCHIVE_INVALID_JSON');}
 if(!m||typeof m!=='object'||Array.isArray(m)||
    Object.keys(m).length!==MANIFEST_KEYS.length||
    MANIFEST_KEYS.some(k=>!Object.hasOwn(m,k))) fail('PRIVATE_ARCHIVE_SCHEMA');
 if(!DRIVE.test(m.archive_drive_file_id||'')||
    !DRIVE.test(m.source_qa_drive_file_id||''))fail('PRIVATE_ARCHIVE_ID');
 for(const k of ['archive_zip_sha256','image_sha256','source_qa_zip_sha256'])
  if(!SHA.test(m[k]||''))fail('PRIVATE_ARCHIVE_SHA');
 if(m.image_type!=='image/webp'||!Number.isInteger(m.archive_zip_bytes)||
    m.archive_zip_bytes<1024||m.archive_zip_bytes>12_000_000||
    !Number.isInteger(m.image_bytes)||m.image_bytes<1024||m.image_bytes>12_000_000)
  fail('PRIVATE_ARCHIVE_SIZE');
 return m;
}
export async function sendImageQaFromCerebro(command,env){
 assertCommand(command);
 if(env?.SENDER_ENABLED!=='true'||!env.CEREBRO_PRODUCER||
    typeof env.CEREBRO_PRODUCER.latest!=='function'||!env.QA_QUEUE||
    typeof env.QA_QUEUE.send!=='function'||typeof env.PRIVATE_ARCHIVE_MANIFEST!=='string')
   fail('PRIVATE_BINDINGS_OR_FEATURE_FLAG_MISSING');
 const m=assertArchiveManifest(env.PRIVATE_ARCHIVE_MANIFEST);
 // Prove an actual PRIVATE CEREBRO producer-Gateway RPC responds. The RPC
 // is read-only and does NOT certify image rights, source bytes or request IAM.
 const live=await env.CEREBRO_PRODUCER.latest({
   company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images'
 });
 if(!live||live.company_id!=='fenix'||live.engine_id!=='UMS-001'||
    live.environment!=='LAB'||live.provider!=='met'||live.kind!=='images'||
    live.mode!=='METADATA_ONLY'||live.cost_eur!==0||
    live.production_approved!==false||live.publish_authorized!==false||
    live.downloaded!==false||
    !['CACHED_CANDIDATES_FOR_QA','SOURCE_NOT_READY'].includes(live.status)||
    !Array.isArray(live.results))fail('CEREBRO_PRIVATE_RPC_UNTRUSTED');
 const qaOrder={
   schema_version:1,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
   order_id:command.order_id,item_id:'LI-FEED-01',
   consumer_engine_id:'UMS-QA-LAB',
   ...m,
   stage:'QA_ONLY_INBOX',rights_approved:false,editorial_approved:false,
   publish_enabled:false,video_enabled:false,production_enabled:false,
   paid_execution_enabled:false,delivery_allowed:false
 };
 // All archive identifiers are from a private Worker secret; not from
 // the queue command, so a caller cannot swap the image or consumer.
 await env.QA_QUEUE.send(qaOrder);
 return Object.freeze({
   status:'CEREBRO_PRIVATE_RPC_VERIFIED_QA_MESSAGE_SUBMITTED',
   gateway_rpc_live:true,gateway_rpc_mode:live.mode,
   gateway_rpc_status:live.status,request_id:command.request_id,
   order_id:qaOrder.order_id,company_id:'fenix',
   consumer_engine_id:qaOrder.consumer_engine_id,source_bytes_verified_here:false,
   signed_editorial_or_rights_verified:false,delivered_to_qa_kv_confirmed:false,
   cost_added_eur:0,publish_enabled:false,video_enabled:false,
   paid_execution_enabled:false,production_enabled:false
 });
}
