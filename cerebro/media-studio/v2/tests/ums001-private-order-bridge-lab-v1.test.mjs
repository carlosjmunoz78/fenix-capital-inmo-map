import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {registerAutoOrder,recordExistingSignedPrediction,reviewPrivateCandidate}
 from '../runtime/ums001_private_order_bridge_lab_v1.mjs';

const ROOT='cerebro/media-studio/v2/';
const get=p=>JSON.parse(readFileSync(ROOT+p,'utf8'));
const order=get('requests/autonomous-inbox/UMS001-LAB-SEO-BODY-20261111-01.json');
const master=get('requests/UMS001_MULTICHANNEL_IMAGE_11_20261111.json');
const baseline=get('qa/UMS001_MULTICHANNEL_IMAGE_GATE_REAL_20261111_V5.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?
 Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b,'en'))):x);
const SECRET='TEST_SYNTHETIC_HMAC_SECRET_ONLY_CI_0123456789';
const withTemp=fn=>{
 const root=mkdtempSync(join(tmpdir(),'ums001-private-bridge-'));
 try{return fn({root,db:join(root,'ledger.sqlite3')})}finally{rmSync(root,{recursive:true,force:true})}
};
function signedProviderFixture({root,rawBytes,job=order,prediction='labtest98765'}){
 const pair=generateKeyPairSync('ed25519');
 const keyId='LAB_UNIT_ONLY_PROVIDER_KEY_NO_EXTERNAL_AUTH';
 const doc={schema_version:1,company_id:'fenix',engine_id:'UMS-001',
   environment:'LAB',source_request_id:job.source_request_id,item_id:job.item_id,
   order_id:job.order_id,provider:'bytedance/seedream-4',
   prediction_id:prediction,raw_sha256:sha(rawBytes),
   model_call_authorized_by_this_bridge:false};
 const file={role:'PROVIDER',key_id:keyId,payload:doc,
   signature:sign(null,Buffer.from(canon(doc)),pair.privateKey).toString('base64')};
 const providerProofPath=join(root,'provider-proof.json'),trustPath=join(root,'trust.json');
 writeFileSync(providerProofPath,JSON.stringify(file));
 writeFileSync(trustPath,JSON.stringify({PROVIDER:{
   key_id:keyId,public_key_pem:pair.publicKey.export({type:'spki',format:'pem'})}}));
 return {providerProofPath,trustPath};
}
function fixture(root){
 const rawBytes=Buffer.concat([Buffer.from([0xff,0xd8,0xff]),Buffer.alloc(44_000,0x41)]);
 const imagePath=join(root,'original.jpg');writeFileSync(imagePath,rawBytes);
 const witness=signedProviderFixture({root,rawBytes});
 return {...witness,rawBytes,imagePath};
}
test('CEREBRO order flows into a private SQLite ledger; no new subscription or model call',()=>withTemp(({db})=>{
 const x=registerAutoOrder({order,master,history:baseline,db});
 assert.equal(x.status,'LAB_PRIVATE_ORDER_REGISTERED');
 assert.equal(x.ledger.total_attempts,0);
 assert.equal(x.ledger.attempts_remaining,2);
 assert.equal(x.paid_execution_enabled,false);
 assert.equal(x.publish_enabled,false);
 assert.equal(x.video_enabled,false);
 assert.equal(registerAutoOrder({order,master,history:baseline,db}).ledger.total_attempts,0);
}));
test('historical two rejected Stories remain HUMAN_REQUIRED rather than resetting',()=>withTemp(({db})=>{
 const story=master.pieces.find(x=>x.item_id==='IG-STORY-01');
 const j={...order,item_id:story.item_id,consumer_engine_id:story.consumer_engine_id};
 const x=registerAutoOrder({order:j,master,history:baseline,db});
 assert.equal(x.status,'HUMAN_REQUIRED');
 assert.equal(x.ledger.total_attempts,2);
 assert.equal(x.plan.attempts_remaining,0);
}));
test('real signed-file mechanism rejects symlink escape and repo-local trust paths',()=>withTemp(({root,db})=>{
 registerAutoOrder({order,master,history:baseline,db});
 const rawBytes=Buffer.concat([Buffer.from([0xff,0xd8,0xff]),Buffer.alloc(44_000,3)]);
 const imagePath=join(root,'original.jpg');writeFileSync(imagePath,rawBytes);
 const {providerProofPath}=signedProviderFixture({root,rawBytes});
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:resolve('.'),
   imagePath,providerProofPath,trustPath:join(root,'trust.json'),bridgeSecret:SECRET}),
 /PRIVATE_ROOT_INSIDE_PUBLIC_REPO|PRIVATE_PATH_ESCAPES_ROOT/);
}));
test('tampered signed provenance cannot increment attempt count',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 const proof=JSON.parse(readFileSync(f.providerProofPath,'utf8'));
 proof.payload.raw_sha256='0'.repeat(64);
 writeFileSync(f.providerProofPath,JSON.stringify(proof));
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,
  ...f,bridgeSecret:SECRET}),/PROVIDER_PROOF_MISMATCH/);
 const x=registerAutoOrder({order,master,history:baseline,db});
 assert.equal(x.ledger.total_attempts,0);
}));
test('signed existing provider image accounted once: repeat is idempotent',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 const args={order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET};
 const a=recordExistingSignedPrediction(args);
 assert.equal(a.status,'SIGNED_EXISTING_PREDICTION_RECORDED_FOR_QA_ONLY');
 assert.equal(a.total_attempts,1);
 assert.equal(a.provider_calls_this_execution,0);
 const b=recordExistingSignedPrediction(args);
 assert.equal(b.total_attempts,1);
 assert.equal(registerAutoOrder({order,master,history:baseline,db}).ledger.attempts_remaining,1);
}));
test('cannot forge second receipt to evade provider unique-ID check',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET});
 const proof=JSON.parse(readFileSync(f.providerProofPath,'utf8'));
 proof.payload.raw_sha256='0'.repeat(64);
 writeFileSync(f.providerProofPath,JSON.stringify(proof));
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET}));
}));
test('separate order ID cannot reset private attempt count',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET});
 const j={...order,order_id:'UMS001-LAB-SEO-BODY-20261111-02'};
 const x=registerAutoOrder({order:j,master,history:baseline,db});
 assert.equal(x.ledger.total_attempts,1);
 assert.equal(x.plan.attempts_remaining,1);
}));
test('without private QA files, end-to-end approval denies by default',()=>withTemp(({root,db})=>{
 assert.throws(()=>reviewPrivateCandidate({order,master,history:baseline,db,privateRoot:root,files:{}}),
 /MISSING_PRIVATE_FILE/);
}));
test('private QA cannot use synthetic CI trust anchors to release',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET});
 const raw=f.rawBytes;
 const finished=Buffer.concat([Buffer.from('RIFF'),Buffer.from([0,0,0,0]),Buffer.from('WEBP'),Buffer.alloc(2100,0x46)]);
 const files={raw:f.imagePath,finished:join(root,'finished.webp'),
 vision:join(root,'vision.json'),finish:join(root,'finish.json'),
 rights:join(root,'rights.json'),editorial:join(root,'editorial.json'),
 attestations:join(root,'attestations.json'),trust:join(root,'trust.json')};
 writeFileSync(files.finished,finished);
 for(const k of ['vision','finish','rights','editorial','attestations'])writeFileSync(files[k],'{}');
 writeFileSync(files.trust,JSON.stringify({VISUAL:{key_id:'SYNTHETIC_TEST_BAD_KEY'}}));
 assert.throws(()=>reviewPrivateCandidate({order,master,history:baseline,db,privateRoot:root,files}),
 /SYNTHETIC_TEST_KEY_NOT_AUTHORIZED_FOR_REAL_DELIVERY/);
}));
