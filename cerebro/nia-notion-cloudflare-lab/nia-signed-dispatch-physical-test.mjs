/**
 * TEST-ONLY: physical Cloudflare evaluation of NIA signed dispatch contract.
 * Uses a PUBLICLY INVALID fixture key (not the real FACT/Gateway/Notion key).
 * No network, Notion secrets, production, public route or cron.
 */
import { signNiaDiscoveryLabV1, dispatchNiaVerifiedLabV1, NIA_LAB_QUEUE } from './nia-private-dispatch-v1.mjs';
import { NIA_SKILL_ID } from './nia-action-gateway-binding-v0.mjs';
const QUEUE='cerebro-nia-signed-proof-once-eu';
const SECRET='SYNTHETIC-TEST-KEY-ONLY-DO-NOT-USE-IN-REAL-SERVICE-'+('X'.repeat(48));
const TITLE='NIA · Uso responsable de Notion Business en CEREBRO';
const NONCE='c5280e1d-4c52-4544-b7b6-e0b74ecc46e9';
function rig() {
 const claimed=new Set();let reads=0;
 const nonceStore={async claim(key){if(claimed.has(key))return false;claimed.add(key);return true;}};
 const notionProvider={async readSkillPage(){reads++;return {id:NIA_SKILL_ID,archived:false,properties:{title:{title:[{plain_text:TITLE}]}}};}};
 return {nonceStore,notionProvider,get reads(){return reads;}};
}
async function evaluate(){
 const now=Date.now();
 const signed=await signNiaDiscoveryLabV1({secret:SECRET,nonce:NONCE,idempotency_key:'nia_sign_lab_123456',now});
 const c=(env,body,extra={})=>dispatchNiaVerifiedLabV1({envelope:body,queue:NIA_LAB_QUEUE,secret:SECRET,nonceStore:env.nonceStore,notionProvider:env.notionProvider,enabled:true,now:now+1000,...extra});
 let passed=0;
 const check=(label,ok)=>{
   console.log('NIA_SIGNED_'+label+'='+(ok?'PASS':'FAIL'));
   if(!ok)throw new Error('NIA_SIGNED_ASSERTION_FAILED_'+label);
   passed++;
 };
 const env=rig();
 const valid=await c(env,signed);
 check('VALID_ACTGW',valid.status==='DISPATCH_RECORDED'&&valid.provider_status==='NIA_DISCOVERED'&&valid.skill_id===NIA_SKILL_ID&&env.reads===1);
 const replay=await c(env,signed);
 check('ATOMIC_REPLAY',replay.status==='DENIED'&&replay.reason==='REPLAY_DENIED'&&env.reads===1);
 const tamperEnv=rig();
 const tamper=await c(tamperEnv,{...signed,payload:{topic:'knowledge',already_handled:false}});
 check('HMAC_TAMPER',tamper.reason==='SIGNATURE_INVALID'&&tamperEnv.reads===0);
 const companyEnv=rig();
 const company=await c(companyEnv,{...signed,context:{...signed.context,company_id:'other'}});
 check('TENANT_ISOLATION',company.reason==='INVALID_ENVELOPE'&&companyEnv.reads===0);
 const untrustedEnv=rig();
 const unsigned=await c(untrustedEnv,{...signed,authorized:true});
 check('UNTRUSTED_AUTH_FIELD',unsigned.reason==='INVALID_ENVELOPE'&&untrustedEnv.reads===0);
 const noLedgerEnv=rig();
 const noLedger=await c(noLedgerEnv,signed,{nonceStore:null});
 check('ATOMIC_LEDGER_REQUIRED',noLedger.reason==='ATOMIC_REPLAY_LEDGER_REQUIRED'&&noLedgerEnv.reads===0);
 const offEnv=rig();
 const off=await c(offEnv,signed,{enabled:false});
 check('DISABLED',off.reason==='NIA_DISPATCH_OFF'&&offEnv.reads===0);
 const wrongEnv=rig();
 const wrong=await c(wrongEnv,signed,{queue:'cerebro-ums001-media'});
 check('QUEUE_ISOLATION',wrong.reason==='WRONG_QUEUE'&&wrongEnv.reads===0);
 const expiredEnv=rig();
 const expired=await c(expiredEnv,signed,{now:now+180000});
 check('TTL',expired.reason==='INVALID_ENVELOPE'&&expiredEnv.reads===0);
 const noopEnv=rig();
 const noopSigned=await signNiaDiscoveryLabV1({secret:SECRET,nonce:NONCE,idempotency_key:'nia_sign_lab_handled_123',now,already_handled:true});
 const noop=await c(noopEnv,noopSigned);
 check('NO_DUPLICATION',noop.status==='DISPATCH_RECORDED'&&noop.provider_status==='NOOP'&&noopEnv.reads===0);
 check('NO_CONTENT_EXPORT',!JSON.stringify(valid).includes(SECRET)&&valid.content_exported===false&&valid.ai_session_started===false);
 check('NO_COST',valid.additional_cost_eur===0);
 console.log('NIA_SIGNED_PHYSICAL_GATE='+ (passed===12?'PASS':'FAIL'));
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});},
 async scheduled(){console.log('NIA_SIGNED_SCHEDULED_OFF');},
 async queue(batch) {
   for(const message of batch.messages){
     if(batch.queue!==QUEUE || message.body?.type!=='NIA_SIGNED_ONCE_E2E_TEST'){
       console.log('NIA_SIGNED_PRIVATE_GATE=BLOCKED');
       message.ack(); continue;
     }
     try{await evaluate();}
     catch{console.log('NIA_SIGNED_PHYSICAL_GATE=BLOCKED');}
     finally{message.ack();}
   }
 }
};
