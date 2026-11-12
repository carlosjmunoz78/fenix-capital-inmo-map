import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {adjudicateCompletedImage} from '../runtime/ums001_image_acceptance_controller_lab_v2.mjs';
const root='cerebro/media-studio/v2/';
const get=p=>JSON.parse(readFileSync(root+p,'utf8'));
const master=get('requests/UMS001_MULTICHANNEL_IMAGE_11_20261111.json');
const old=get('qa/UMS001_MULTICHANNEL_IMAGE_GATE_REAL_20261111_V5.json');
const originalOrder=get('requests/autonomous-inbox/UMS001-LAB-SEO-BODY-20261111-01.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?
 Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b,'en'))):x);
const clone=x=>structuredClone(x);
function make(item_id='SEO-BODY-01',n=1){
 const order=clone(originalOrder);order.item_id=item_id;
 const item=master.pieces.find(p=>p.item_id===item_id);order.consumer_engine_id=item.consumer_engine_id;
 const history=clone(old);history.attempts_by_item[item_id]=n;
 const rawBytes=Buffer.alloc(1024,41),finalBytes=Buffer.alloc(2048,65);
 const finish={item_id,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  raw_sha256:sha(rawBytes),output_sha256:sha(finalBytes),output_file_verified_sha256:sha(finalBytes),
  width_px:item.width_px,height_px:item.height_px,
  brand_logo_sha256:item.channel==='SEO'?null:'ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7',
  private_artifact_ref:'artifact:private-lab-review',publish_enabled:false,video_gate_allowed:false};
 const vision={pass:true,score:91,violations:[],rubric_scores:{human_presence_and_cast:18,
  camera_and_composition:14,lighting_and_realism:15,contrast_and_color:9,
  surreal_creativity:13,typography_and_brand_integrity:13,context_and_claims:9}};
 const rights={status:'VERIFIED_LICENSE',source_provider:'bytedance/seedream-4',item_id,
  raw_sha256:finish.raw_sha256,allowed_commercial_use:true,restrictions_checked:true,
  provenance_sha256:sha(Buffer.from('synthetic license test fixture'))};
 const editorial={item_id,output_sha256:finish.output_sha256,approved:true,no_unverified_financial_claims:true,
  brand_verified:true,no_generated_logos:true,critical_flags:[]};
 const roles=['VISUAL','FINISHER','RIGHTS','EDITORIAL','DESTINATION'];
 const keys=Object.fromEntries(roles.map(role=>[role,generateKeyPairSync('ed25519')]));
 const trust=Object.fromEntries(roles.map(role=>[role,{key_id:'SYNTHETIC_TEST_'+role,
  public_key_pem:keys[role].publicKey.export({type:'spki',format:'pem'})}]));
 const base={schema_version:1,order_id:order.order_id,item_id,company_id:'fenix',engine_id:'UMS-001',
  environment:'LAB',raw_sha256:finish.raw_sha256,output_sha256:finish.output_sha256};
 function signed(role,payload){return {key_id:trust[role].key_id,role,payload,
  signature:sign(null,Buffer.from(canon(payload)),keys[role].privateKey).toString('base64')};}
 const attestations=Object.fromEntries(['VISUAL','FINISHER','RIGHTS','EDITORIAL'].map(role=>{
  const doc={VISUAL:vision,FINISHER:finish,RIGHTS:rights,EDITORIAL:editorial}[role];
  return [role,signed(role,{...base,role,evidence_sha256:sha(Buffer.from(canon(doc)))})];
 }));
 const args={order,master,history,rawBytes,finalBytes,vision,finish,rights,editorial,attestations,trust};
 function delivered(){const digest=sha(Buffer.from(canon({...base,attempts:n})));
  const receipt={consumer_engine_id:item.consumer_engine_id,received_sha256:finish.output_sha256,accepted:true};
  receipt.attestation=signed('DESTINATION',{...base,role:'DESTINATION',
   consumer_engine_id:item.consumer_engine_id,idempotency_key:digest,received_sha256:finish.output_sha256});
  return receipt;}
 return {args,delivered};
}
test('synthetic: independent signatures only create private candidate, no publishing',()=>{
 const r=adjudicateCompletedImage(make().args);
 assert.equal(r.status,'AUTO_APPROVED_PRIVATE_CANDIDATE');assert.equal(r.delivery_allowed,false);
 assert.equal(r.automatic_publication,false);assert.equal(r.video_enabled,false);
 assert.equal(r.paid_provider_calls_authorized,false);assert.equal(r.additional_spend_eur,0);
});
test('synthetic: signed acknowledgement verifies private receipt and leaves PROD OFF',()=>{
 const {args,delivered}=make();const r=adjudicateCompletedImage({...args,destinationReceipt:delivered()});
 assert.equal(r.status,'PRIVATE_DELIVERY_RECEIPT_VERIFIED');assert.equal(r.delivery_allowed,true);
 assert.equal(r.production_enabled,false);assert.equal(r.automatic_publication,false);
});
test('second recorded attempt may be accepted without permitting third generation',()=>{
 assert.equal(adjudicateCompletedImage(make('SEO-BODY-01',2).args).status,'AUTO_APPROVED_PRIVATE_CANDIDATE');
});
test('first rejected visual requests one retake after prepaid reservation, never spending here',()=>{
 const {args}=make();args.vision.pass=false;args.vision.score=87;args.vision.rubric_scores.context_and_claims=5;
 const r=adjudicateCompletedImage(args);
 assert.equal(r.status,'AUTO_RETAKE_PENDING_PREPAID_RESERVATION');assert.equal(r.paid_provider_calls_authorized,false);
});
test('second rejected visual escalates LOW_CONFIDENCE',()=>{
 const {args}=make('SEO-BODY-01',2);args.vision.pass=false;
 assert.equal(adjudicateCompletedImage(args).status,'HUMAN_REQUIRED');
});
test('invalid QA arithmetic reevaluates same pixels; no image generation',()=>{
 const {args}=make();args.vision.score=100;
 const r=adjudicateCompletedImage(args);
 assert.equal(r.status,'AUTO_QA_REEVALUATION_REQUIRED');assert.match(r.reason,/NO_NEW_GENERATION/);
});
test('binary alteration blocks physical provenance',()=>{
 const {args}=make();args.finalBytes[0]^=1;
 assert.equal(adjudicateCompletedImage(args).reason,'PHYSICAL_BYTES_SHA_MISMATCH');
});
test('unverified rights trigger LEGAL_REQUIRED',()=>{
 const {args}=make();args.rights.allowed_commercial_use=false;
 assert.equal(adjudicateCompletedImage(args).code,'LEGAL_REQUIRED');
});
test('wrong original brand sha blocks social',()=>{
 const {args}=make('LI-FEED-01',1);args.finish.brand_logo_sha256=null;
 assert.equal(adjudicateCompletedImage(args).reason,'OFFICIAL_BRAND_MISMATCH');
});
test('fake review signature cannot approve',()=>{
 const {args}=make();args.attestations.VISUAL.signature='AAAA';
 assert.match(adjudicateCompletedImage(args).reason,/SIGNATURE_VISUAL/);
});
test('signed QA cannot be replayed after altering grade',()=>{
 const {args}=make();args.vision.rubric_scores.human_presence_and_cast=17;args.vision.score=90;
 assert.match(adjudicateCompletedImage(args).reason,/SIGNATURE_VISUAL/);
});
test('critical editorial flags cannot pass',()=>{
 const {args}=make();args.editorial.critical_flags=['UNVERIFIED_FINANCE_CLAIM'];
 assert.equal(adjudicateCompletedImage(args).reason,'EDITORIAL_OR_CLAIMS_NOT_CLEARED');
});
test('revoked right-signing identity cannot release',()=>{
 const {args}=make();args.trust.RIGHTS.revoked=true;
 assert.match(adjudicateCompletedImage(args).reason,/SIGNATURE_RIGHTS/);
});
test('shared signer is not independent tribunal',()=>{
 const {args}=make();args.trust.EDITORIAL.key_id=args.trust.VISUAL.key_id;
 assert.equal(adjudicateCompletedImage(args).code,'SECURITY_INCIDENT');
});
test('receipt for another department does not verify',()=>{
 const {args,delivered}=make();const receipt=delivered();receipt.consumer_engine_id='OTHER';
 assert.equal(adjudicateCompletedImage({...args,destinationReceipt:receipt}).reason,'DESTINATION_RECEIPT_INVALID');
});
test('missing bytes, no image recorded and cross-tenant all reject safely',()=>{
 const {args}=make();
 assert.equal(adjudicateCompletedImage({...args,rawBytes:null}).status,'WAITING_FOR_PHYSICAL_BYTES');
 const h=clone(args.history);h.attempts_by_item[args.order.item_id]=0;
 assert.equal(adjudicateCompletedImage({...args,history:h}).status,'WAITING_FOR_PHYSICAL_IMAGE');
 assert.throws(()=>adjudicateCompletedImage({...args,order:{...args.order,company_id:'other'}}));
});
