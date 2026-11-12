import {generatePng,validateCanary} from './core.mjs';
const PREFIX='meta/ums001-universal-render-canary/v1/';
const PRIVATE='private/ums001-universal-render-canary/v1/';
async function render(env,request){
 if(env.RENDER_ENABLED!=='true')throw Error('UMS001_RENDER_OFF');
 validateCanary(request);if(!env.ASSET_KV)throw Error('ASSET_KV_NOT_BOUND');
 const key=PREFIX+request.request_id+'/'+request.item_id;
 const prior=await env.ASSET_KV.get(key,{type:'json'});
 if(prior?.status==='LAB_IMAGE_TECHNICAL_QA_PENDING')return {...prior,duplicate:true};
 const result=await generatePng(request);
 const file=PRIVATE+request.request_id+'/'+request.item_id+'.png';
 await env.ASSET_KV.put(file,result.bytes,{metadata:{sha256:result.sha256,
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  visual_qa:'NOT_RUN',publish_authorized:false}});
 const check=await env.ASSET_KV.get(file,{type:'arrayBuffer'});
 if(!check||check.byteLength!==result.bytes.length)throw Error('STORED_BYTES_MISMATCH');
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',check)),x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!==result.sha256)throw Error('STORED_SHA256_MISMATCH');
 const receipt={status:'LAB_IMAGE_TECHNICAL_QA_PENDING',company_id:'fenix',engine_id:'UMS-001',
  environment:'LAB',request_id:request.request_id,item_id:request.item_id,sha256:actual,
  bytes:result.bytes.length,mime:'image/png',width_px:result.width_px,height_px:result.height_px,
  private_artifact_ref:file,rights_mode:'ORIGINAL_SYNTHETIC_TEST',visual_qa:'NOT_RUN',
  brand_qa:'NOT_RUN',independent_qa:'NOT_RUN',signed_delivery:false,publish_authorized:false,
  commercial_delivery_authorized:false,provider_calls:0,additional_cost_eur:0,at:new Date().toISOString()};
 await env.ASSET_KV.put(key,JSON.stringify(receipt));return receipt;
}
export default {
 async queue(batch,env){
  if(batch.queue!=='cerebro-ums001-universal-render-canary-lab-eu')
   throw Error('UNEXPECTED_RENDER_QUEUE');
  for(const m of batch.messages){
   try{await render(env,m.body);m.ack();}
   catch(e){const code=String(e?.message||'ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,75);
    await env.ASSET_KV.put('meta/ums001-render-error/v1/'+String(m.id).slice(0,75),
     JSON.stringify({state:'ERROR',code,at:new Date().toISOString(),no_payment:true,no_publication:true}));
    m.ack();}
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}})}
};
