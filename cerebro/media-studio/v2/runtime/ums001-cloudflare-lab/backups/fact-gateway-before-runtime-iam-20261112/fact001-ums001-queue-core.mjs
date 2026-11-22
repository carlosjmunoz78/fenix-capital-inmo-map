/**
 * FACT-001 / UMS-001 queue command consumer, LAB only. Incoming queue messages
 * never contain secrets; the trusted Cloudflare Worker supplies its secret.
 * One pinned 208,766-byte CC0 candidate; no publication/paid side effects.
 */
const PREFIX='meta/fact001-ums001-queue-e2e/v1/';
const EXPECTED_SHA='e84f82f453c52151d3a28ef22a22faeefdd5dda51f656c4b089c4b88dab8b508';
const EXACT_BYTES=208766;
const REQUEST_FIELDS={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images',action:'READ',production_id:'UMS001-LAB-TEST',selected_asset_id:'met:436524',explicit_selection:true};

export function validateQueueCommand(command){
 if(!command||typeof command!=='object'||Array.isArray(command))throw Error('UMS_QUEUE_INVALID_COMMAND');
 if(command.mode!=='READ_ONLY'||command.actor_id!=='cerebro-orchestrator-lab'||command.schema_version!==1)throw Error('UMS_QUEUE_IDENTITY_DENIED');
 if(!/^UMS001-QUEUE-[A-Z0-9_-]{8,48}$/.test(command.request_id??''))throw Error('UMS_QUEUE_REQUEST_ID_DENIED');
 for(const [key,val] of Object.entries(REQUEST_FIELDS))if(command[key]!==val)throw Error('UMS_QUEUE_SCOPE_DENIED');
 if(command.auto_publish===true||command.publish_requested===true||command.production_approved===true||command.expected_cost_eur>0||command.private_token!==undefined)throw Error('UMS_QUEUE_SIDE_EFFECT_DENIED');
 const exactKeys=new Set([...Object.keys(REQUEST_FIELDS),'schema_version','mode','actor_id','request_id']);
 if(Object.keys(command).some(x=>!exactKeys.has(x)))throw Error('UMS_QUEUE_UNEXPECTED_FIELD');
 return command;
}

export async function consumeUMS001QueueCommand(command,env,route){
 if(env?.UMS001_PRIVATE_BINDING_ENABLED!=='true'||env?.UMS001_QUEUE_ENABLED!=='true')throw Error('UMS_QUEUE_DISABLED');
 if(!env.LAB_KV||typeof env.LAB_KV.get!=='function'||typeof env.LAB_KV.put!=='function')throw Error('UMS_QUEUE_AUDIT_BINDING_MISSING');
 if(typeof env.UMS001_CALLER_TOKEN!=='string'||env.UMS001_CALLER_TOKEN.length<32)throw Error('UMS_QUEUE_PRIVATE_TOKEN_MISSING');
 validateQueueCommand(command);
 const key=PREFIX+command.request_id;
 const prior=await env.LAB_KV.get(key,{type:'json'});
 if(prior?.status==='COMPLETED')return {...prior,duplicate_request:true};
 const write=async record=>env.LAB_KV.put(key,JSON.stringify(record));
 await write({status:'STARTED',at:new Date().toISOString(),request_id:command.request_id});
 try{
  const result=await route(env,{private_token:env.UMS001_CALLER_TOKEN,request:{...command}});
  if(result?.status!=='CANDIDATE_BYTES_VERIFIED_NOT_PUBLISHED'||result?.asset_id!=='met:436524'||
    !(result.bytes instanceof Uint8Array)||result.bytes.length!==EXACT_BYTES||result.sha256!==EXPECTED_SHA||
    result.production_approved!==false||result.publish_authorized!==false)throw Error('UMS_QUEUE_UNSAFE_MEDIA_RESULT');
  // The producer's route verifies source bytes SHA-256 before returning.
  const receipt={status:'COMPLETED',at:new Date().toISOString(),request_id:command.request_id,
   engine_id:'UMS-001',via:'FACT-001_PRIVATE_QUEUE_TO_SERVICE_BINDING',asset_id:result.asset_id,
   bytes:EXACT_BYTES,sha256:EXPECTED_SHA,downloaded_again:false,
   source_qa:'RIGHTS_REVIEW_PENDING',production_approved:false,publish_authorized:false,
   additional_cost_eur_reported:0};
  await write(receipt);return receipt;
 }catch(e){
  const code=String(e?.message||'UNKNOWN').slice(0,120);
  await write({status:'ERROR',at:new Date().toISOString(),request_id:command.request_id,code,
   production_approved:false,publish_authorized:false});
  throw e;
 }
}