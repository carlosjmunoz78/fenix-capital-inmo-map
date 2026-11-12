import {acceptSignedCommand,SIGNED_QUEUE} from './core.mjs';
/** Parallel signed-only private queue consumer. The original unsigned LAB
 * sender and its Gateway/Queue/contracts are preserved without changes. */
export default {
 async queue(batch,env){
  if(batch?.queue!==SIGNED_QUEUE||!Array.isArray(batch?.messages)||
     batch.messages.length>1)throw Error('UMS001_SIGNED_INBOX_WRONG_QUEUE_OR_BATCH');
  for(const message of batch.messages){
   try{
    const status=await acceptSignedCommand(message.body,env,Date.now());
    console.log('UMS001_SIGNED_QA_RESULT',status.status);
    // Bounded status-only LAB diagnostic: never persist signed payload, keys or IDs.
    try{await env.SIGNED_REPLAY_KV?.put('meta/ums001-signed-diagnostic/v1/DIAG02',
      JSON.stringify({state:'ACCEPTED',code:'QA_SUBMITTED',at:new Date().toISOString()}));}catch{}
    message.ack();
   }catch(error){
    // Never log the signed payload, key material, archive identifiers or user data.
    const code=String(error?.message||'UNKNOWN')
      .replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
    console.error('UMS001_SIGNED_QA_DENIED',code);
    // Use a fixed key: one canary only, no unbounded diagnostic records.
    // No error message body or stack is persisted.
    const safe=/^(UMS001_SIGNED_INBOX_|UMS001_PRIVATE_IMAGE_SENDER_)[A-Z0-9_]{1,90}$/.test(code)?code:'UNKNOWN_FAILURE';
    try{await env.SIGNED_REPLAY_KV?.put('meta/ums001-signed-diagnostic/v1/DIAG02',
      JSON.stringify({state:'DENIED',code:safe,at:new Date().toISOString()}));}catch{}
    // An authenticated malformed/expired/replayed command is terminal. A
    // runtime fault gets one bounded retry; nonce CLAIMED prevents re-sending.
    if(code.startsWith('UMS001_SIGNED_INBOX_SIGNED_')||
       code.startsWith('UMS001_PRIVATE_IMAGE_SENDER_COMMAND_')||
       code.startsWith('UMS001_PRIVATE_IMAGE_SENDER_PRIVATE_ARCHIVE_'))
      message.ack();
    else message.retry({delaySeconds:30});
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
};
