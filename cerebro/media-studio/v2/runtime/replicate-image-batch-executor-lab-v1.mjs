/** UMS-001 Replicate LAB execution seam (NOT deployed).
 * Unsafe invocation is impossible without independent trusted billing, FINOPS,
 * private durable storage and audit callbacks. No fallback, no auto retry.
 * Request JSON is NEVER a source of billing or storage attestations.
 */
import {createHash} from 'node:crypto';
import {planReplicateImageBatch,validatePaidExecutionGates} from './replicate-image-batch-planner-lab-v1.mjs';
const API='https://api.replicate.com/v1/';
const deny=s=>{throw Error('UMS001_EXEC_'+s);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const sleeper=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function validAssetUrl(text){
  try{const u=new URL(text);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&
    (u.hostname==='replicate.delivery'||u.hostname.endsWith('.replicate.delivery'));}
  catch{return false;}
}
function validPredictionId(text){return typeof text==='string'&&/^[a-z0-9]{8,80}$/.test(text);}
export async function executeIsolatedImageLab(request,{
  token, billingService,finopsService,assetStore,audit,providerFetch=fetch,wait=sleeper,
  paidEnabled=false,environment='LAB',maxPolling=12
}={}){
  // We do not accept input.run_mode=EXECUTE. Only previously vetted DRY_RUN orders may be promoted by trusted services.
  const plan=planReplicateImageBatch(request);
  if(!paidEnabled||environment!=='LAB')deny('PAID_LAB_DISABLED');
  if(typeof token!=='string'||!/^r8_[A-Za-z0-9_-]{20,}$/.test(token))deny('SECRET_UNAVAILABLE');
  if(typeof billingService?.verifyPrepaidAutoReloadOff!=='function'||
     typeof finopsService?.reserveBatchOnce!=='function'||typeof assetStore?.verifyPrivateDurableWrite!=='function'||
     typeof assetStore?.saveImage!=='function'||typeof audit?.recordSubmission!=='function'||
     typeof audit?.recordAsset!=='function')deny('TRUSTED_SERVICES_NOT_CONNECTED');
  if(typeof providerFetch!=='function'||typeof wait!=='function'||!Number.isInteger(maxPolling)||maxPolling<0||maxPolling>25)deny('INVALID_RUNTIME');
  const billing=await billingService.verifyPrepaidAutoReloadOff({company_id:'fenix',provider:'replicate',request_id:plan.request_id});
  if(billing?.verified_by_trusted_operator!==true||billing?.auto_reload_disabled!==true||
     billing?.prepaid_credit_only!==true||!billing.evidence_id)deny('BILLING_UNVERIFIED');
  const storage=await assetStore.verifyPrivateDurableWrite({company_id:'fenix',engine_id:'UMS-001',environment:'LAB'});
  if(storage?.private_durable_write_verified!==true||!storage.destination_id)deny('STORAGE_UNVERIFIED');
  const reservation=await finopsService.reserveBatchOnce({
    company_id:'fenix',environment:'LAB',engine_id:'UMS-001',request_id:plan.request_id,
    model_id:plan.model_id,max_predict_count:4,amount_usd:plan.projected_provider_cost_usd
  });
  // The reservation must be guaranteed exclusive and durable by the underlying trusted service.
  const gates=validatePaidExecutionGates(plan,{billing,storage,finops:{
    atomic_reservation_confirmed:reservation?.atomic===true,
    reserved_usd:reservation?.amount_usd,
    reservation_id:reservation?.reservation_id
  },runtime:{isolated_lab_worker:true,rollback_tested:reservation?.rollback_tested===true}});
  if(!gates.execute_allowed)deny('GATES_NOT_GREEN');
  const receipts=[];
  for(const output of plan.outputs){
    const requestBody=JSON.stringify({input:output.model_input});
    let response;
    try{
      response=await providerFetch(API+'models/black-forest-labs/flux-1.1-pro-ultra/predictions',{
        method:'POST',redirect:'error',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Prefer':'wait=60'},
        body:requestBody
      });
    }catch{
      // Provider may have accepted charge before network failure. No retry.
      deny('SUBMISSION_UNKNOWN_RECONCILIATION_REQUIRED');
    }
    if(!response?.ok)deny('PROVIDER_POST_FAILED_RECONCILE_'+String(response?.status||'UNKNOWN'));
    let prediction;
    try{prediction=await response.json();}catch{deny('SUBMISSION_RECEIPT_INVALID_RECONCILE');}
    if(!validPredictionId(prediction?.id))deny('PREDICTION_ID_INVALID_RECONCILE');
    await audit.recordSubmission({request_id:plan.request_id,concept_id:output.concept_id,
      prediction_id:prediction.id,reservation_id:reservation.reservation_id,provider:'replicate'});
    for(let polls=0;!['succeeded','failed','canceled'].includes(prediction.status);polls++){
      if(polls>=maxPolling)deny('PENDING_PREDICTION_MANUAL_RECONCILIATION_'+prediction.id);
      await wait(3000);
      let getResponse;
      try{
        getResponse=await providerFetch(API+'predictions/'+prediction.id,{method:'GET',redirect:'error',
          headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
      }catch{deny('PREDICTION_POLL_FAILED_RECONCILE_'+prediction.id);}
      if(!getResponse?.ok)deny('PREDICTION_POLL_HTTP_RECONCILE_'+prediction.id);
      try{prediction=await getResponse.json();}catch{deny('PREDICTION_JSON_RECONCILE_'+prediction.id);}
    }
    if(prediction.status!=='succeeded')deny('PREDICTION_NOT_SUCCEEDED_'+prediction.id);
    const url=typeof prediction.output==='string'?prediction.output:Array.isArray(prediction.output)?prediction.output[0]:null;
    if(!validAssetUrl(url))deny('UNTRUSTED_PROVIDER_OUTPUT_URL_'+prediction.id);
    let asset;
    try{
      const downloaded=await providerFetch(url,{method:'GET',redirect:'error'});
      if(!downloaded?.ok)deny('OUTPUT_DOWNLOAD_FAILED_'+prediction.id);
      const length=Number(downloaded.headers?.get?.('content-length')||0);
      if(length>12_000_000)deny('OUTPUT_TOO_LARGE');
      asset=Buffer.from(await downloaded.arrayBuffer());
    }catch{deny('OUTPUT_DOWNLOAD_UNCERTAIN_'+prediction.id);}
    if(asset.length<1024||asset.length>12_000_000||asset[0]!==0xff||asset[1]!==0xd8||asset[2]!==0xff)
      deny('JPEG_OUTPUT_INVALID_'+prediction.id);
    const digest=sha(asset);
    const stored=await assetStore.saveImage({
      company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
      request_id:plan.request_id,concept_id:output.concept_id,prediction_id:prediction.id,
      sha256:digest,extension:'jpg',bytes:asset,content_type:'image/jpeg',
      model_id:output.model_id,prompt_sha256:output.prompt_sha256,publication_approved:false
    });
    if(stored?.stored!==true||stored?.private!==true||stored?.durable!==true||
       typeof stored?.asset_id!=='string'||!stored.asset_id)deny('DURABLE_PERSISTENCE_NOT_CONFIRMED_'+prediction.id);
    const receipt={request_id:plan.request_id,concept_id:output.concept_id,prediction_id:prediction.id,
      provider:'replicate',model_id:output.model_id,sha256:digest,asset_id:stored.asset_id,bytes:asset.length,
      qa_human_realism:'PENDING',qa_creative_diversity:'PENDING',publication_approved:false};
    await audit.recordAsset(receipt);
    receipts.push(receipt);
  }
  return {status:'LAB_GENERATED_PENDING_INDEPENDENT_QA',count:receipts.length,
    receipts,estimated_provider_cost_usd:plan.projected_provider_cost_usd,publication_approved:false};
}
