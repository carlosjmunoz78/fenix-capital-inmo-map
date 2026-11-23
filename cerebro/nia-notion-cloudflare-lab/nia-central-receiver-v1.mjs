/**
 * NIA · private FACT-001 receiver for ACTGW-001 in Cloudflare LAB.
 * Explicit, signed, atomic, metadata-only. No fetch route, cron or AI invocations.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {createNiaPageReadProviderV0} from './nia-notion-page-provider-v0.mjs';
import {dispatchNiaVerifiedLabV1,NIA_LAB_QUEUE} from './nia-private-dispatch-v1.mjs';
import {makeNiaNonceStoreV1,NiaNonceLedger} from './nia-sqlite-nonce-ledger-v1.mjs';
export {NiaNonceLedger};
const DENIED=Object.freeze({status:'DENIED',executed:false});
export class NiaReadOnlyLab extends WorkerEntrypoint {
 async dispatchSignedEnvelope(envelope){
  if(this.env.NIA_DISPATCH_ENABLED!=='true')
   return {status:'DENIED',reason:'NIA_DISPATCH_OFF',executed:false};
  try{
   const provider=createNiaPageReadProviderV0({
    token_provider:()=>this.env.CEREBRO_NIA_NOTION_READ_TOKEN,
    timeout_ms:10000
   });
   const result=await dispatchNiaVerifiedLabV1({
    envelope,queue:NIA_LAB_QUEUE,secret:this.env.CEREBRO_NIA_DISPATCH_HMAC_KEY,
    nonceStore:makeNiaNonceStoreV1(this.env.NIA_NONCE_LEDGER),
    notionProvider:provider,enabled:true
   });
   // No raw message, token, page body, person or source ID in logging.
   console.log('NIA_CENTRAL_RECEIVER_GATE='+
     (result.status==='DISPATCH_RECORDED'&&
      ['NIA_DISCOVERED','NOOP'].includes(result.provider_status)?'PASS':'DENIED'));
   return result;
  }catch{
   console.log('NIA_CENTRAL_RECEIVER_GATE=BLOCKED');
   return {...DENIED,reason:'NIA_RECEIVER_EXCEPTION'};
  }
 }
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});},
 async scheduled(){console.log('NIA_CENTRAL_SCHEDULED_OFF');}
};
