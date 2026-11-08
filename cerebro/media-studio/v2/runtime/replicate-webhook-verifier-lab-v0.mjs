/**
 * UMS-001 · Replicate webhook authenticity verifier LAB V0.
 * Stateless cryptographic core only; production requires durable replay ledger,
 * signed asset manifest, private persistence and trusted handler deployment.
 *
 * Replicate official signing contract:
 *  HMAC SHA256(key=base64decode(whsec_...), data=id+"."+timestamp+"."+rawBody)
 *  Headers: webhook-id, webhook-timestamp, webhook-signature="v1,<base64> ..."
 */
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
const ID=/^[a-zA-Z0-9_-]{6,160}$/;
const VERSION=/^v1,([A-Za-z0-9+/]+={0,2})$/;
const MAX_BYTES=512*1024;
const fail=(x)=>Object.freeze({verified:false,reason:x,output_ready:false,asset_stored:false});
export function verifyReplicateWebhook({rawBody,headers,signingSecret,
  nowSeconds=Math.floor(Date.now()/1000),seenWebhookIds}={}){
 if(!(seenWebhookIds instanceof Set))return fail('DURABLE_REPLAY_LEDGER_REQUIRED');
 if(typeof signingSecret!=='string'||!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(signingSecret))
   return fail('WEBHOOK_SECRET_NOT_INSTALLED');
 if(!(Buffer.isBuffer(rawBody)||typeof rawBody==='string'))return fail('RAW_BODY_MISSING');
 const raw=Buffer.isBuffer(rawBody)?rawBody:Buffer.from(rawBody,'utf8');
 if(raw.length<2||raw.length>MAX_BYTES)return fail('INVALID_RAW_BODY_SIZE');
 const h={};for(const [key,value] of Object.entries(headers||{}))h[key.toLowerCase()]=value;
 const id=h['webhook-id'],ts=h['webhook-timestamp'],sigs=h['webhook-signature'];
 if(typeof id!=='string'||!ID.test(id)||seenWebhookIds.has(id))return fail('INVALID_OR_REPLAYED_WEBHOOK_ID');
 if(typeof ts!=='string'||!/^\d{10,11}$/.test(ts)||!Number.isSafeInteger(Number(ts)))
   return fail('BAD_WEBHOOK_TIMESTAMP');
 const delta=nowSeconds-Number(ts);
 if(delta>300||delta< -60)return fail('WEBHOOK_TIMESTAMP_OUT_OF_WINDOW');
 if(typeof sigs!=='string'||sigs.length>2000)return fail('BAD_WEBHOOK_SIGNATURE_HEADER');
 const parsed=sigs.trim().split(/\s+/).map(s=>s.match(VERSION)?.[1]).filter(Boolean);
 if(!parsed.length)return fail('NO_SUPPORTED_WEBHOOK_SIGNATURE');
 const signed=Buffer.concat([Buffer.from(id+'.'+ts+'.'),raw]);
 const key=Buffer.from(signingSecret.slice(6),'base64');
 if(key.length<16)return fail('INVALID_WEBHOOK_SIGNING_KEY');
 const expected=createHmac('sha256',key).update(signed).digest();
 let good=false;
 for(const base64 of parsed){
    const claimed=Buffer.from(base64,'base64');
    if(claimed.length===expected.length&&timingSafeEqual(claimed,expected))good=true;
 }
 if(!good)return fail('WEBHOOK_SIGNATURE_MISMATCH');
 // Replay storage here is ONLY test scaffolding. Persistent unique INSERT required
 // at the trusted production boundary; do not auto-enable a handler from this module.
 seenWebhookIds.add(id);
 return Object.freeze({verified:true,status:'SIGNATURE_VERIFIED_ONLY_NO_ASSET',
   message_hash_sha256:createHash('sha256').update(raw).digest('hex'),
   output_ready:false,asset_stored:false,can_publish:false});
}
