/** UMS-001 registered-engine image executor; shared, private, Fénix LAB only. */
const INBOX='cerebro-ums001-registered-image-lab-eu';
const ROOT='meta/ums001-ai-image-factory/v1/';
const ASSETS='private/ums001-registered-image/v1/';
const MODEL='@cf/black-forest-labs/flux-1-schnell';
const encoder=new TextEncoder();
function invalid(s){throw Error('REGISTERED_IMAGE_'+s)}
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value))).map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
const requestRx=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const engineRx=/^[A-Z][A-Z0-9-]{2,63}$/;
const itemRx=/^[A-Z0-9][A-Z0-9_-]{2,79}$/;
async function verify(message,env){
 if(env.ENABLED!=='true'||typeof env.SIGNED_JOB_DISPATCH_KEY!=='string'||env.SIGNED_JOB_DISPATCH_KEY.length<48)invalid('OFF');
 if(!message||message.schema_version!==1||message.event_type!=='UMS001_REGISTERED_IMAGE_DISPATCH'||typeof message.hmac!=='string'||!message.payload)invalid('ENVELOPE');
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.SIGNED_JOB_DISPATCH_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const data=encoder.encode(canonical({event_type:message.event_type,payload:message.payload,schema_version:message.schema_version}));
 if(!await crypto.subtle.verify('HMAC',key,b64(message.hmac),data))invalid('BAD_ATTESTATION');
 const r=message.payload;
 if(r.schema_version!=='1.0.0'||r.engine_id!=='UMS-001'||r.company_id!=='fenix'||r.environment!=='LAB'||r.trigger!=='ENGINE_EVENT'||
 !engineRx.test(r.origin_engine_id||'')||!requestRx.test(r.request_id||'')||!itemRx.test(r.item_id||'')||r.asset_kind!=='IMAGE'||r.capability_id!=='IMAGE.SYNTHETIC'||
 r.policy_version!=='ums001-execution-lab-v1'||r.rights_profile!=='SYNTHETIC_ORIGINAL'||r.brief_ref!=='cerebro://briefs/ums001/'+r.request_id||
 !['GENERIC','SEO','FACEBOOK','INSTAGRAM'].includes(r.channel_id)||r.format?.width_px!==1024||r.format?.height_px!==1024||r.format?.output_mime!=='image/jpeg'||
 r.budget?.max_additional_cost_eur!==0||r.budget?.max_attempts!==1||r.budget?.paid_execution_enabled!==false||r.budget?.auto_recharge!==false||
 r.budget?.publish_requested!==false||r.budget?.prepaid_only!==true)invalid('SCOPE');
 return r;
}
function jpegDimensions(buf){
 if(buf.length<4000||buf.length>4500000||buf[0]!==255||buf[1]!==216||buf[buf.length-2]!==255||buf[buf.length-1]!==217)invalid('JPEG');
 for(let p=2;p<buf.length-11;){
  if(buf[p]!==255){p++;continue}
  const mk=buf[p+1],len=(buf[p+2]<<8)+buf[p+3];
  if([192,193,194,195,198,199,201,202,203,205,206,207].includes(mk)){
   return {width:(buf[p+7]<<8)+buf[p+8],height:(buf[p+5]<<8)+buf[p+6]};
  }
  if(len<2)break;p+=2+len;
 }
 invalid('JPEG_DIMENSIONS');
}
async function process(job,env){
 const r=await verify(job,env);
 const receiptKey=ROOT+'receipts/'+r.origin_engine_id+'/'+r.request_id+'/'+r.item_id;
 let old=await env.IMAGE_KV.get(receiptKey,{type:'json'});
 if(old?.state==='PRIVATE_READY'){
  if(old.delivery_status!=='QUEUED'){
   await env.RESULT_QUEUE.send({event_type:'UMS001_IMAGE_PRIVATE_READY',company_id:'fenix',engine_id:r.origin_engine_id,request_id:r.request_id,item_id:r.item_id,asset_sha256:old.asset_sha256,private_artifact_ref:old.private_artifact_ref,environment:'LAB',publish_authorized:false});
   old.delivery_status='QUEUED';await env.IMAGE_KV.put(receiptKey,JSON.stringify(old));
  }
  return {state:'PRIVATE_READY',duplicate:true};
 }
 if(old?.state==='GENERATING'||old?.state==='HELD')return {state:old.state,duplicate:true};
 const brief=await env.IMAGE_KV.get(ROOT+'briefs/'+r.origin_engine_id+'/'+r.request_id,{type:'json'});
 if(!brief||brief.company_id!=='fenix'||brief.environment!=='LAB'||brief.origin_engine_id!==r.origin_engine_id||
 brief.request_id!==r.request_id||brief.rights_profile!=='SYNTHETIC_ORIGINAL'||brief.publish_requested!==false||
 typeof brief.prompt!=='string'||brief.prompt.length<40||brief.prompt.length>630)invalid('BRIEF');
 // This is a conservative local budget, not a billable account-wide quota.
 const day=new Date().toISOString().slice(0,10),qKey=ROOT+'quota/'+day;
 const q=await env.IMAGE_KV.get(qKey,{type:'json'})||{count:0};
 const estimated=Math.max(Number(q.estimated_neurons||0),Number(q.count||0)*57.6);
 if(estimated+57.6>8000){await env.IMAGE_KV.put(receiptKey,JSON.stringify({state:'HELD',code:'LOCAL_BUDGET',request_id:r.request_id}));return {state:'HELD',code:'LOCAL_BUDGET'}}
 await env.IMAGE_KV.put(receiptKey,JSON.stringify({state:'GENERATING',request_id:r.request_id,at:new Date().toISOString()}));
 let output;
 try{output=await env.AI.run(MODEL,{prompt:brief.prompt,steps:4})}
 catch(e){await env.IMAGE_KV.put(receiptKey,JSON.stringify({state:'HELD',code:'PROVIDER_ERROR',at:new Date().toISOString(),provider_calls:1}));return {state:'HELD',code:'PROVIDER_ERROR'}}
 if(typeof output?.image!=='string'||output.image.length>6500000)invalid('IMAGE_BODY');
 const bytes=b64(output.image),d=jpegDimensions(bytes);
 if(d.width!==1024||d.height!==1024)invalid('FORMAT_MISMATCH');
 const sha=await digest(bytes);
 const file=ASSETS+r.origin_engine_id+'/'+r.request_id+'/'+r.item_id+'.jpg';
 await env.IMAGE_KV.put(file,bytes,{metadata:{sha256:sha,environment:'LAB',company_id:'fenix',publish_authorized:false}});
 const saved=await env.IMAGE_KV.get(file,{type:'arrayBuffer'});
 if(!saved||await digest(saved)!==sha)invalid('STORAGE_INTEGRITY');
 const receipt={state:'PRIVATE_READY',company_id:'fenix',environment:'LAB',engine_id:'UMS-001',origin_engine_id:r.origin_engine_id,request_id:r.request_id,item_id:r.item_id,
 mime:'image/jpeg',bytes:bytes.length,width_px:d.width,height_px:d.height,asset_sha256:sha,private_artifact_ref:file,
 technical_qa:'PASS',format_verified:true,visual_qa:'PENDING',brand_qa:'PENDING',
 provider_calls:1,delivery_status:'PENDING',publish_authorized:false,additional_cost_eur:'NOT_VERIFIED',at:new Date().toISOString()};
 await env.IMAGE_KV.put(receiptKey,JSON.stringify(receipt));
 await env.IMAGE_KV.put(qKey,JSON.stringify({count:Number(q.count||0)+1,estimated_neurons:estimated+57.6,free_neuron_budget:8000,neurons_per_image:57.6,day,last_request_id:r.request_id}));
 await env.RESULT_QUEUE.send({event_type:'UMS001_IMAGE_PRIVATE_READY',company_id:'fenix',engine_id:r.origin_engine_id,request_id:r.request_id,item_id:r.item_id,asset_sha256:sha,private_artifact_ref:file,environment:'LAB',publish_authorized:false});
 receipt.delivery_status='QUEUED';
 await env.IMAGE_KV.put(receiptKey,JSON.stringify(receipt));
 return {state:'PRIVATE_READY',sha256:sha};
}
export default {
 async queue(batch,env){
  if(batch.queue!==INBOX)invalid('WRONG_QUEUE');
  for(const message of batch.messages){
   try{await process(message.body,env);message.ack()}
   catch(err){try{await env.IMAGE_KV.put(ROOT+'registered-errors/'+String(message.id).slice(0,80),
    JSON.stringify({code:String(err?.message||'ERROR').slice(0,90),at:new Date().toISOString(),publication:false}));message.ack()}
    catch{message.retry({delaySeconds:60})}}
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};