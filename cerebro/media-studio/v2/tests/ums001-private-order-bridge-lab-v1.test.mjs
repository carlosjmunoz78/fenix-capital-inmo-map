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
 const base=mkdtempSync(join(tmpdir(),'ums001-private-bridge-'));
 const root=join(base,'assets'),trusted=join(base,'separate-iam');
 mkdirSync(root);mkdirSync(trusted);
 const oldFile=process.env.UMS001_TRUST_REGISTRY_FILE;
 const oldSha=process.env.UMS001_TRUST_REGISTRY_SHA256;
 process.env.UMS001_TRUST_REGISTRY_FILE=join(trusted,'trusted-keys.json');
 delete process.env.UMS001_TRUST_REGISTRY_SHA256;
 try{return fn({root,db:join(base,'ledger.sqlite3'),trusted})}
 finally{
  if(oldFile===undefined)delete process.env.UMS001_TRUST_REGISTRY_FILE;
  else process.env.UMS001_TRUST_REGISTRY_FILE=oldFile;
  if(oldSha===undefined)delete process.env.UMS001_TRUST_REGISTRY_SHA256;
  else process.env.UMS001_TRUST_REGISTRY_SHA256=oldSha;
  rmSync(base,{recursive:true,force:true});
 }
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
 // A caller-supplied trust file is deliberately ignored by the bridge.
 writeFileSync(trustPath,JSON.stringify({PROVIDER:{
   key_id:'UNTRUSTED_ASSET_KEY',public_key_pem:pair.publicKey.export({type:'spki',format:'pem'})}}));
 const roles=['PROVIDER','VISUAL','FINISHER','RIGHTS','EDITORIAL','DESTINATION'];
 const keys=Object.fromEntries(roles.map(role=>{
  const k=role==='PROVIDER'?pair:generateKeyPairSync('ed25519');
  return [role,{key_id:role==='PROVIDER'?keyId:'LAB_CI_ONLY_'+role+'_INDEPENDENT',
    public_key_pem:k.publicKey.export({type:'spki',format:'pem'}),revoked:false}];
 }));
 const registry={schema_version:1,company_id:'fenix',engine_id:'UMS-001',
   environment:'LAB',status:'ACTIVATED_BY_PRIVATE_IAM',keys};
 const data=Buffer.from(JSON.stringify(registry));
 writeFileSync(process.env.UMS001_TRUST_REGISTRY_FILE,data);
 process.env.UMS001_TRUST_REGISTRY_SHA256=sha(data);
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
 const pinnedPath=process.env.UMS001_TRUST_REGISTRY_FILE;
 const pinned=JSON.parse(readFileSync(pinnedPath,'utf8'));
 pinned.keys.VISUAL.key_id='SYNTHETIC_TEST_BAD_KEY';
 const bytes=Buffer.from(JSON.stringify(pinned));
 writeFileSync(pinnedPath,bytes);
 process.env.UMS001_TRUST_REGISTRY_SHA256=sha(bytes);
 assert.throws(()=>reviewPrivateCandidate({order,master,history:baseline,db,privateRoot:root,files}),
 /TRUST_REGISTRY_ROLE_NOT_AUTHORIZED_VISUAL/);
}));

test('tampering a pinned IAM registry after approval is detected',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 const configured=process.env.UMS001_TRUST_REGISTRY_FILE;
 const x=JSON.parse(readFileSync(configured,'utf8'));x.keys.PROVIDER.revoked=true;
 writeFileSync(configured,JSON.stringify(x)); // PIN deliberately unchanged
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET}),
  /TRUST_REGISTRY_SHA_MISMATCH/);
}));
test('unconfigured IAM registry fails closed without accepting private asset roots',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 delete process.env.UMS001_TRUST_REGISTRY_SHA256;
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET}),
  /TRUST_REGISTRY_UNCONFIGURED/);
}));
test('asset-supplied forged trust cannot override independent pinned IAM identity',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 const fake=generateKeyPairSync('ed25519');
 const malicious={PROVIDER:{key_id:'FAKE_ATTACKER',
  public_key_pem:fake.publicKey.export({type:'spki',format:'pem'})}};
 writeFileSync(f.trustPath,JSON.stringify(malicious));
 const receipt=recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET});
 assert.equal(receipt.total_attempts,1); // legitimate pinned signer, never the fake
}));
test('isolated proof file cannot use registry inside asset directory',()=>withTemp(({root,db})=>{
 const f=fixture(root);
 const data=readFileSync(process.env.UMS001_TRUST_REGISTRY_FILE);
 const unsafePath=join(root,'pretend-iam.json');writeFileSync(unsafePath,data);
 process.env.UMS001_TRUST_REGISTRY_FILE=unsafePath;
 process.env.UMS001_TRUST_REGISTRY_SHA256=sha(data);
 assert.throws(()=>recordExistingSignedPrediction({order,master,history:baseline,db,privateRoot:root,...f,bridgeSecret:SECRET}),
  /TRUST_REGISTRY_NOT_ISOLATED/);
}));
