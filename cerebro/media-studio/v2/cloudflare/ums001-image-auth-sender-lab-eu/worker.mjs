/** Private Cloudflare Queue-to-Queue CEREBRO QA emitter. No HTTP endpoint. */
import {sendImageQaFromCerebro} from './core.mjs';
export const COMMAND_QUEUE_NAME='cerebro-ums001-image-sender-command-lab-eu';
export default {
 async queue(batch,env) {
  if(batch?.queue!==COMMAND_QUEUE_NAME)throw Error('UMS001_PRIVATE_SENDER_WRONG_QUEUE');
  if(!Array.isArray(batch.messages)||batch.messages.length>1)
   throw Error('UMS001_PRIVATE_SENDER_BATCH_SIZE_DENIED');
  for(const msg of batch.messages){
   try {
    await sendImageQaFromCerebro(msg.body,env);
    msg.ack();
   }catch(error){
    const code=String(error?.message||'UNKNOWN').replace(/[^A-Z0-9_]/gi,'_').slice(0,90);
    console.error('UMS001_PRIVATE_SENDER_DENIED',code);
    // Actor/account claims are NOT accepted as approvals. Invalid input is
    // permanently quarantined by rejection; runtime/RPC failure gets at most
    // one Cloudflare consumer-configured retry. Never resend paid calls.
    if(code.startsWith('UMS001_PRIVATE_IMAGE_SENDER_COMMAND_')||
       code.startsWith('UMS001_PRIVATE_IMAGE_SENDER_PRIVATE_ARCHIVE_'))
      msg.ack();
    else msg.retry({delaySeconds:30});
   }
  }
 },
 async fetch(){
  return new Response('Not Found',{status:404,headers:{
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
  }});
 }
};
