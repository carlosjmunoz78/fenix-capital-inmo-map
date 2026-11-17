/**
 * Cloudflare one-shot physical test of NIA SQLite Durable Object replay ledger.
 * No real Notion, paid models, HTTP route, cron or PROD access.
 */
import {makeNiaNonceStoreV1} from './nia-sqlite-nonce-ledger-v1.mjs';
export {NiaNonceLedger} from './nia-sqlite-nonce-ledger-v1.mjs';
const QUEUE='cerebro-nia-nonce-do-one-shot-eu';
const good=(label,ok)=>{
  console.log('NIA_NONCE_'+label+'='+(ok?'PASS':'FAIL'));
  if(!ok)throw new Error('NIA_NONCE_GATE_FAILED_'+label);
};
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});},
 async scheduled(){console.log('NIA_NONCE_SCHEDULED_OFF');},
 async queue(batch,env){
  for(const msg of batch.messages){
   if(batch.queue!==QUEUE||msg.body?.type!=='NIA_NONCE_TEST_V1'){
     console.log('NIA_NONCE_QUEUE_DENIED');msg.ack();continue;
   }
   try{
     const store=makeNiaNonceStoreV1(env.NIA_NONCE_LEDGER,'fenix');
     const stub=env.NIA_NONCE_LEDGER.get(env.NIA_NONCE_LEDGER.idFromName('fenix/ACTGW-001/PREPROD'));
     const health=await stub.health();
     good('HEALTH',health?.status==='READY');
     const nonce=crypto.randomUUID();
     const a=await store.claim(nonce,50),b=await store.claim(nonce,50);
     good('FIRST_ATOMIC_CLAIM',a===true);
     good('REPLAY_REJECTED',b===false);
     const concurrent=crypto.randomUUID();
     const pair=await Promise.all([store.claim(concurrent,50),store.claim(concurrent,50)]);
     good('PARALLEL_RACE',pair.filter(Boolean).length===1);
     good('BAD_NONCE_DENIED',await store.claim('not-a-uuid',50)===false);
     good('TTL_BOUNDS',await store.claim(crypto.randomUUID(),61)===false);
     let other=false;try{makeNiaNonceStoreV1(env.NIA_NONCE_LEDGER,'other');}catch{other=true}
     good('TENANT_BOUND',other);
     console.log('NIA_NONCE_PHYSICAL_GATE=PASS');
   }catch{
     console.log('NIA_NONCE_PHYSICAL_GATE=BLOCKED');
   }finally{msg.ack()}
  }
 }
};
