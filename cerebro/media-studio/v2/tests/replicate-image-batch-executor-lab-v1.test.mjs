import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeIsolatedImageLab} from '../runtime/replicate-image-batch-executor-lab-v1.mjs';
const req=JSON.parse(readFileSync(new URL('../requests/UMS001_REPLICATE_4_ART_IMAGES_LAB_20261111.json',import.meta.url)));
const token='r8_'+'x'.repeat(40);
function adapters(){
  const submissions=[],saved=[],recorded=[],calls=[];
  const bytes=Buffer.concat([Buffer.from([0xff,0xd8,0xff]),Buffer.alloc(1800,0x44)]);
  const billingService={verifyPrepaidAutoReloadOff:async()=>({
    verified_by_trusted_operator:true,auto_reload_disabled:true,prepaid_credit_only:true,evidence_id:'billing-proof-20261111'})};
  const finopsService={reserveBatchOnce:async input=>{
    assert.equal(input.max_predict_count,4);assert.equal(input.amount_usd,0.24);
    return {atomic:true,amount_usd:0.24,reservation_id:'rsv-lab01',rollback_tested:true};}};
  const assetStore={
    verifyPrivateDurableWrite:async()=>({private_durable_write_verified:true,destination_id:'private-lab-asset-store'}),
    saveImage:async asset=>{saved.push(asset);return {stored:true,private:true,durable:true,asset_id:'private-'+asset.concept_id};}
  };
  const audit={recordSubmission:async x=>submissions.push(x),recordAsset:async x=>recorded.push(x)};
  const providerFetch=async(url,options)=>{
    calls.push({url,method:options.method,headers:options.headers});
    if(options.method==='POST'){
      const index=submissions.length+1;
      return {ok:true,status:201,json:async()=>({status:'succeeded',id:'prediction'+String(index).padStart(8,'0'),
        output:'https://replicate.delivery/path/sample'+index+'.jpg'})};
    }
    assert.equal(options.method,'GET');
    return {ok:true,status:200,headers:{get:()=>String(bytes.length)},
      arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  };
  return {billingService,finopsService,assetStore,audit,providerFetch,
    submissions,saved,recorded,calls,token,paidEnabled:true};
}
test('OFF means no API call or billing',async()=>{
  const a=adapters();a.paidEnabled=false;
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/PAID_LAB_DISABLED/);
  assert.equal(a.calls.length,0);assert.equal(a.submissions.length,0);
});
test('Missing billing verification prevents POST',async()=>{
  const a=adapters();a.billingService={verifyPrepaidAutoReloadOff:async()=>({auto_reload_disabled:false})};
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/BILLING_UNVERIFIED/);
  assert.equal(a.calls.length,0);
});
test('Missing FINOPS reservation blocks all paid output',async()=>{
  const a=adapters();a.finopsService={reserveBatchOnce:async()=>({atomic:false})};
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/FINOPS_GATE/);
  assert.equal(a.calls.length,0);
});
test('Missing durable store prevents paid call',async()=>{
  const a=adapters();a.assetStore.verifyPrivateDurableWrite=async()=>({private_durable_write_verified:false});
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/STORAGE_UNVERIFIED/);
  assert.equal(a.calls.length,0);
});
test('Four mocked predictions saved privately, never approved or published',async()=>{
  const a=adapters();
  const r=await executeIsolatedImageLab(req,a);
  assert.equal(r.count,4);assert.equal(r.status,'LAB_GENERATED_PENDING_INDEPENDENT_QA');
  assert.equal(a.submissions.length,4);assert.equal(a.saved.length,4);assert.equal(a.recorded.length,4);
  assert.ok(a.saved.every(x=>x.content_type==='image/jpeg'&&x.bytes.length>1000&&x.publication_approved===false));
  assert.equal(a.calls.filter(x=>x.method==='POST').length,4);
  assert.ok(!JSON.stringify(r).includes(a.token));
});
test('Failure during first provider call never auto retries',async()=>{
  const a=adapters();a.providerFetch=async()=>{a.calls.push('POST');return {ok:false,status:503};};
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/PROVIDER_POST_FAILED_RECONCILE_503/);
  assert.equal(a.calls.length,1);
});
test('Invalid response destination cannot persist an image',async()=>{
  const a=adapters();a.providerFetch=async(url,opts)=>{
    a.calls.push('CALL');
    return {ok:true,json:async()=>({status:'succeeded',id:'predictionabcdefgh',output:'https://evil.example/invalid.jpg'})};
  };
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/UNTRUSTED_PROVIDER_OUTPUT_URL/);
  assert.equal(a.saved.length,0);assert.equal(a.calls.length,1);
});
test('Cannot claim completed when storage does not confirm private durability',async()=>{
  const a=adapters();a.assetStore.saveImage=async()=>({stored:true,private:false,durable:false});
  await assert.rejects(()=>executeIsolatedImageLab(req,a),/DURABLE_PERSISTENCE_NOT_CONFIRMED/);
});
