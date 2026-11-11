/**
 * UMS-001 LAB: CEREBRO intake -> PRIVATE transactional ledger -> verified
 * already-delivered receipt. No model API, no budget execution, no publication.
 *
 * Secrets/trust anchors must arrive from a separate trusted private runtime.
 * Public GitHub Actions has no trusted image/artifact vault and is NOT an
 * autonomous producer. A caller cannot create trust by submitting a JSON flag.
 */
import {spawnSync} from 'node:child_process';
import {createHash,createHmac,createPublicKey,verify} from 'node:crypto';
import {readFileSync,realpathSync,statSync,lstatSync} from 'node:fs';
import {resolve,relative,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planIntake} from './ums001_image_autonomous_intake_lab_v1.mjs';
import {adjudicateCompletedImage} from './ums001_image_acceptance_controller_lab_v2.mjs';
const script=fileURLToPath(new URL('./ums001_private_image_ledger_lab_v1.py',import.meta.url));
const project=resolve(dirname(script),'../../../../');
const HASH=/^[0-9a-f]{64}$/;
const keyFields=['company_id','engine_id','environment','source_request_id','item_id'];
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error('UMS001_PRIVATE_BRIDGE_'+code);};
const canon=obj=>JSON.stringify(obj,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
function privatePath(path,root,existing=true){
 if(!isAbsolute(path)||!isAbsolute(root))fail('PATH_NOT_ABSOLUTE');
 const r=realpathSync(root);
 if(r===project||r.startsWith(project+'/'))fail('PRIVATE_ROOT_INSIDE_PUBLIC_REPO');
 const p=existing?realpathSync(path):resolve(path);
 if(p===r||!p.startsWith(r+'/'))fail('PRIVATE_PATH_ESCAPES_ROOT');
 if(existing){
  if(lstatSync(path).isSymbolicLink()||!statSync(p).isFile())fail('PRIVATE_FILE_NOT_REGULAR');
  if(statSync(p).size>12_000_000)fail('PRIVATE_FILE_OVERSIZE');
 }
 return p;
}
function runLedger(db,request,secret=null){
 if(!isAbsolute(db)||resolve(db)===project||resolve(db).startsWith(project+'/'))
  fail('PUBLIC_LEDGER_STORAGE_FORBIDDEN');
 const env={PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8'};
 const privileged=['record_existing_prediction','freeze_unknown','acknowledge_private'].includes(request.action);
 if(privileged){
  if(typeof secret!=='string'||secret.length<32)fail('TRUSTED_BRIDGE_SECRET_MISSING');
  env.UMS001_LEDGER_BRIDGE_HMAC_KEY=secret;
  request={...request,authorization_hmac:createHmac('sha256',secret).update(canon(request)).digest('hex')};
 }
 const p=spawnSync('python3',[script,'--db',db],{input:canon(request),encoding:'utf8',timeout:6000,env,maxBuffer:32_768});
 if(p.error||p.status!==0){let output={};try{output=JSON.parse(p.stdout||'{}')}catch{}
  fail('LEDGER_DENIED_'+String(output.reason||p.error?.code||p.status).replace(/[^A-Z0-9_]/gi,'_').slice(0,120));}
 const receipt=JSON.parse(p.stdout);
 if(receipt.status!=='LAB_LEDGER_OK'||receipt.paid_execution_enabled!==false||
  receipt.automatic_publication!==false||receipt.video_enabled!==false)fail('LEDGER_UNSAFE_STATUS');
 return receipt;
}
function key(order){return Object.fromEntries(keyFields.map(k=>[k,order[k]]));}
export function registerAutoOrder({order,master,history,db}){
 const plan=planIntake(order,master,history);
 const d=runLedger(db,{action:'register',...key(order),order_id:order.order_id,
   order_sha256:hash(canon(order)),historical_attempts:history.attempts_by_item[order.item_id]});
 if(plan.status==='HUMAN_REQUIRED'&&d.attempts_remaining!==0)fail('PLAN_LEDGER_DIVERGED');
 if(d.total_attempts!==history.attempts_by_item[order.item_id]+d.new_predictions)
  fail('HISTORY_LEDGER_DIVERGED');
 return {status:'LAB_PRIVATE_ORDER_REGISTERED',plan,ledger:d,paid_execution_enabled:false,
   publish_enabled:false,video_enabled:false};
}
function readPrivateJson(path,root){
 const p=privatePath(path,root);
 const b=readFileSync(p);
 if(b.length>1_000_000)fail('JSON_TOO_BIG');
 return JSON.parse(b.toString('utf8'));
}
export function recordExistingSignedPrediction({order,master,history,db,privateRoot,
  imagePath,providerProofPath,trustPath,bridgeSecret}){
 const intake=registerAutoOrder({order,master,history,db});
 if(intake.ledger.frozen||intake.ledger.attempts_remaining===0)fail('ATTEMPT_CAP_EXHAUSTED');
 const rawBytes=readFileSync(privatePath(imagePath,privateRoot));
 if(rawBytes.length<40_000||rawBytes.length>12_000_000||
    rawBytes[0]!==0xff||rawBytes[1]!==0xd8||rawBytes[2]!==0xff)
  fail('PROVIDER_IMAGE_NOT_VERIFIED_JPEG');
 const providerDoc=readPrivateJson(providerProofPath,privateRoot);
 const trust=readPrivateJson(trustPath,privateRoot);
 const providerKey=trust.PROVIDER;
 if(!providerKey||providerKey.revoked===true||typeof providerKey.public_key_pem!=='string'||
    typeof providerKey.key_id!=='string'||providerKey.key_id.startsWith('SYNTHETIC_TEST_'))
  fail('REAL_PROVIDER_TRUST_ANCHOR_MISSING');
 if(providerDoc?.role!=='PROVIDER'||providerDoc.key_id!==providerKey.key_id||
    typeof providerDoc.signature!=='string'||!providerDoc.payload)fail('SIGNED_PROVIDER_PROOF_MISSING');
 const evidence=providerDoc.payload;
 const expected={schema_version:1,...key(order),order_id:order.order_id,
  provider:'bytedance/seedream-4',prediction_id:evidence.prediction_id,
  raw_sha256:hash(rawBytes),model_call_authorized_by_this_bridge:false};
 if(canon(evidence)!==canon(expected)||typeof evidence.prediction_id!=='string')
  fail('PROVIDER_PROOF_MISMATCH');
 let verified=false;
 try{verified=verify(null,Buffer.from(canon(evidence)),createPublicKey(providerKey.public_key_pem),
   Buffer.from(providerDoc.signature,'base64'))}catch{}
 if(!verified)fail('PROVIDER_SIGNATURE_INVALID');
 const d=runLedger(db,{action:'record_existing_prediction',...key(order),
    prediction_id:evidence.prediction_id,raw_sha256:evidence.raw_sha256,
    signed_evidence_sha256:hash(canon(providerDoc)),provider_call_authorized:false},bridgeSecret);
 return {status:'SIGNED_EXISTING_PREDICTION_RECORDED_FOR_QA_ONLY',
  item_id:order.item_id,total_attempts:d.total_attempts,attempts_remaining:d.attempts_remaining,
  provider_calls_this_execution:0,publication_enabled:false,video_enabled:false};
}

export function reviewPrivateCandidate({order,master,history,db,privateRoot,files,bridgeSecret=undefined}){
 const intake=registerAutoOrder({order,master,history,db});
 // Public or caller-controlled references do not determine trusted public keys.
 const required=['raw','finished','vision','finish','rights','editorial','attestations','trust'];
 for(const k of required)if(typeof files?.[k]!=='string')fail('MISSING_PRIVATE_FILE_'+k);
 const rawBytes=readFileSync(privatePath(files.raw,privateRoot));
 const finalBytes=readFileSync(privatePath(files.finished,privateRoot));
 if(rawBytes.length<1024||finalBytes.length<1024||
   rawBytes[0]!==0xff||rawBytes[1]!==0xd8||rawBytes[2]!==0xff||
   finalBytes.toString('ascii',0,4)!=='RIFF'||finalBytes.toString('ascii',8,12)!=='WEBP')
  fail('INVALID_NATIVE_IMAGE_MAGIC');
 const vision=readPrivateJson(files.vision,privateRoot),finish=readPrivateJson(files.finish,privateRoot),
       rights=readPrivateJson(files.rights,privateRoot),editorial=readPrivateJson(files.editorial,privateRoot),
       attestations=readPrivateJson(files.attestations,privateRoot),trust=readPrivateJson(files.trust,privateRoot);
 // The trusted private registry is file-backed here for LAB; the production
 // trust anchor must later come from IAM/Vault, not a value inside an order.
 if(Object.values(trust).some(x=>x?.key_id?.startsWith('SYNTHETIC_TEST_')))
  fail('SYNTHETIC_TEST_KEY_NOT_AUTHORIZED_FOR_REAL_DELIVERY');
 const adjusted=structuredClone(history);
 adjusted.attempts_by_item[order.item_id]=intake.ledger.total_attempts;
 const receipt=typeof files.destination==='string'?readPrivateJson(files.destination,privateRoot):null;
 const verdict=adjudicateCompletedImage({order,master,history:adjusted,rawBytes,finalBytes,
   vision,finish,rights,editorial,attestations,trust,destinationReceipt:receipt});
 if(verdict.status==='PRIVATE_DELIVERY_RECEIPT_VERIFIED'){
  if(!HASH.test(verdict.idempotency_key)||!HASH.test(finish.output_sha256))fail('ACK_INVALID');
  const d=runLedger(db,{action:'acknowledge_private',...key(order),
    order_id:order.order_id,idempotency_key:verdict.idempotency_key,
    output_sha256:finish.output_sha256,destination_id:order.consumer_engine_id,
    signed_receipt_sha256:hash(canon(receipt)),
    signed_receipt_cryptographically_verified:true},bridgeSecret);
  if(d.status!=='LAB_LEDGER_OK')fail('ACK_NOT_PERSISTED');
 }
 return {...verdict,source:'PRIVATE_LAB_ATTESTATION_ONLY',new_model_calls:0,
   publication_enabled:false,video_enabled:false};
}
