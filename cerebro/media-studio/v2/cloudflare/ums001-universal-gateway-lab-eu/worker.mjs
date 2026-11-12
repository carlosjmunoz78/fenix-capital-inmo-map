/** Universal media Gateway LAB: private RPC + signed Cloudflare Queue, zero spend. */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {acceptMediaJob} from './core.mjs';
const NAME='cerebro-ums001-universal-demand-lab-eu';
async function receive(env,envelope){
 if(env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('LAB_GATEWAY_DISABLED');
 return acceptMediaJob(env.MEDIA_DB,envelope);
}
export class UniversalMediaLab extends WorkerEntrypoint {
 async submitSignedJob(envelope){return receive(this.env,envelope)}
}
export default {
 async queue(batch,env) {
  if(batch.queue!==NAME||env.UNIVERSAL_GATEWAY_ENABLED!=='true')throw Error('UNIVERSAL_QUEUE_DISABLED');
  for(const message of batch.messages) {
   try{await receive(env,message.body);message.ack()}
   catch(err){
    const code=String(err?.message||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_').slice(0,90);
    console.error('UMS001_UNIVERSAL_REJECTED',code);
    try{await env.MEDIA_DB.prepare('INSERT INTO media_rejections(code,created_at) VALUES(?,?)').bind(code,new Date().toISOString()).run()}catch{}
    message.ack(); // Never replay untrusted commands. Caller handles safe reconciliation.
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};
