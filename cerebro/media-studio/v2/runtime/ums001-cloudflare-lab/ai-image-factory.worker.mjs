/**
 * UMS-001 · Free image generation worker · LAB ONLY.
 * Private Queue consumer. No public routes, paid fallback, publication or customer delivery.
 * Contract: canonical MEDIA_JOB_REQUESTED v1.0.0; brief in scoped private KV.
 */
const ROOT='meta/ums001-ai-image-factory/v1/';
const ASSET_ROOT='private/ums001-ai-image-factory/v1/';
const MODEL='@cf/black-forest-labs/flux-1-schnell';
const ORIGINS=['CHATGPT-001','SOC-001','SEO-001'];
const REQ=['schema_version','event_type','request_id','company_id','engine_id','origin_engine_id','environment','version','trigger','asset_kind','capability_id','item_id','consumer_engine_id','channel_id','placement','brief_ref','format','rights_profile','priority','requested_at_utc','deadline_utc','policy_version','budget','reply_to'];
const FMT=['profile_id','width_px','height_px','duration_seconds','output_mime'];
const BUD=['max_additional_cost_eur','max_attempts','prepaid_only','paid_execution_enabled','auto_recharge','publish_requested'];
function err(m){throw Error('UMS001_IMG_'+m)}
function exact(x,fields){return x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===[...fields].sort().join('|')}
function check(r){
 if(!exact(r,REQ)||r.schema_version!=='1.0.0'||r.event_type!=='MEDIA_JOB_REQUESTED'||r.company_id!=='fenix'||r.engine_id!=='UMS-001'||r.environment!=='LAB'||r.version!=='1.0.0')err('SCOPE');
 if(!ORIGINS.includes(r.origin_engine_id)||!['IMAGE.SYNTHETIC','IMAGE.GENERATION'].includes(r.capability_id)||r.asset_kind!=='IMAGE'||r.rights_profile!=='SYNTHETIC_ORIGINAL')err('SCOPE');
 if(r.origin_engine_id==='CHATGPT-001'?r.trigger!=='CHATGPT':r.trigger!=='ENGINE_EVENT')err('TRIGGER');
 if(r.origin_engine_id==='SOC-001'&&!(r.consumer_engine_id==='SOC-001'&&['FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK'].includes(r.channel_id)))err('SOC_SCOPE');
 if(r.origin_engine_id==='SEO-001'&&!(r.consumer_engine_id==='SEO-001'&&r.channel_id==='SEO'))err('SEO_SCOPE');
 if(r.origin_engine_id==='CHATGPT-001'&&!((r.consumer_engine_id==='SEO-001'&&r.channel_id==='SEO')||(r.consumer_engine_id==='SOC-001'&&['FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK'].includes(r.channel_id))))err('CHAT_SCOPE');
 if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(r.request_id||'')||!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(r.item_id||''))err('ID');
 if(r.brief_ref!==('cerebro://briefs/ums001/'+r.request_id)||r.reply_to!=='cerebro://events/ums001/lab')err('BRIEF');
 if(!exact(r.format,FMT)||r.format.width_px!==1024||r.format.height_px!==1024||r.format.duration_seconds!==null||r.format.output_mime!=='image/jpeg')err('FORMAT');
 if(!exact(r.budget,BUD)||r.budget.max_additional_cost_eur!==0||r.budget.max_attempts!==1||r.budget.prepaid_only!==true||r.budget.paid_execution_enabled!==false||r.budget.auto_recharge!==false||r.budget.publish_requested!==false)err('COST');
 if(!['NORMAL','HIGH'].includes(r.priority)||r.deadline_utc!==null&&Date.parse(r.deadline_utc)<Date.now())err('TIME');
 return r;
}
const receiptKey=r=>ROOT+'receipts/'+r.origin_engine_id+'/'+r.request_id+'/'+r.item_id;
const briefKey=r=>ROOT+'briefs/'+r.origin_engine_id+'/'+r.request_id;
const assetKey=r=>ASSET_ROOT+r.origin_engine_id+'/'+r.request_id+'/'+r.item_id+'.jpg';
const digest=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
function jpgOk(b){return b.length>5000&&b.length<4500000&&b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217;}
function dimensions(b){for(let p=2;p<b.length-12;){if(b[p]!==255){p++;continue;}const marker=b[p+1],len=(b[p+2]<<8)+b[p+3];if([192,193,194,195,198,199,201,202,203,205,206,207].includes(marker))return {width:(b[p+7]<<8)+b[p+8],height:(b[p+5]<<8)+b[p+6]};if(len<2)break;p+=2+len;}throw Error('UMS001_IMG_JPEG_DIMENSIONS_MISSING')}
async function run(r,env){
 check(r);
 const key=receiptKey(r),old=await env.ASSET_KV.get(key,{type:'json'});
 if(old&&['PRIVATE_READY','QA_PENDING','HELD','GENERATING'].includes(old.state))return {state:old.state,duplicate:true};
 if(env.GENERATION_ENABLED!=='true')err('GATE_OFF');
 const brief=await env.ASSET_KV.get(briefKey(r),{type:'json'});
 if(!brief||brief.company_id!=='fenix'||brief.environment!=='LAB'||brief.origin_engine_id!==r.origin_engine_id||brief.request_id!==r.request_id||brief.rights_profile!=='SYNTHETIC_ORIGINAL'||typeof brief.prompt!=='string'||brief.prompt.length<25||brief.prompt.length>700||brief.publish_requested!==false)err('BRIEF_MISSING_OR_DENIED');
 const day=new Date().toISOString().slice(0,10),quotaKey=ROOT+'quota/'+day;
 const spent=await env.ASSET_KV.get(quotaKey,{type:'json'})||{count:0};
 const perImageNeurons=57.60; // Actual observed JPEG 1024x1024 = four 512 tiles, 4 steps: 4*4.8 + 4*9.6 neurons.
 const estimatedUsed=Math.max(Number(spent.estimated_neurons||0),Number(spent.count||0)*perImageNeurons);
 const budget=8000; // conservative buffer below shared Free allowance of 10,000 neurons/day.
 if(estimatedUsed+perImageNeurons>budget){await env.ASSET_KV.put(key,JSON.stringify({state:'HELD',code:'ESTIMATED_FREE_NEURON_BUDGET_EXHAUSTED',at:new Date().toISOString(),provider_calls:0}));return {state:'HELD',code:'ESTIMATED_FREE_NEURON_BUDGET_EXHAUSTED'};}
 await env.ASSET_KV.put(key,JSON.stringify({state:'GENERATING',at:new Date().toISOString(),provider_calls:0}));
 // No retries or second provider. Workers Free has its own daily hard limit.
 let output;
 try{output=await env.AI.run(MODEL,{prompt:brief.prompt,steps:4})}
 catch(e){await env.ASSET_KV.put(key,JSON.stringify({state:'HELD',code:'MODEL_FAILED_OR_QUOTA',at:new Date().toISOString(),provider_calls:1,additional_cost_eur:'NOT_VERIFIED'}));return {state:'HELD',code:'MODEL_FAILED_OR_QUOTA'};}
 if(!output||typeof output.image!=='string'||output.image.length>6500000)err('NO_IMAGE');
 const bytes=Uint8Array.from(atob(output.image),x=>x.charCodeAt(0));
 if(!jpgOk(bytes))err('JPEG_TECHNICAL_QA');
 const size=dimensions(bytes);
 if(size.width!==r.format.width_px||size.height!==r.format.height_px)err('IMAGE_DIMENSION_MISMATCH');
 const sha=await digest(bytes),file=assetKey(r);
 await env.ASSET_KV.put(file,bytes,{metadata:{sha256:sha,company_id:'fenix',environment:'LAB',publish_authorized:false}});
 const persisted=await env.ASSET_KV.get(file,{type:'arrayBuffer'});
 if(!persisted||await digest(persisted)!==sha)err('STORAGE_INTEGRITY');
 const receipt={state:'PRIVATE_READY',code:'TECHNICAL_QA_PASS',company_id:'fenix',engine_id:'UMS-001',environment:'LAB',origin_engine_id:r.origin_engine_id,consumer_engine_id:r.consumer_engine_id,request_id:r.request_id,item_id:r.item_id,mime:'image/jpeg',bytes:bytes.length,width_px:size.width,height_px:size.height,format_verified:true,asset_sha256:sha,private_artifact_ref:file,model:MODEL,provider_calls:1,technical_qa:'PASS',visual_qa:'NOT_AUTOMATICALLY_CERTIFIED',brand_qa:'NOT_AUTOMATICALLY_CERTIFIED',copyright_policy:'SYNTHETIC_ORIGINAL_DRAFT',private_delivery_available:true,commercial_delivery_authorized:false,publish_authorized:false,additional_cost_eur:'NOT_VERIFIED',at:new Date().toISOString()};
 await env.ASSET_KV.put(key,JSON.stringify(receipt));
 // FACTORY_SOCIAL_CALLBACK: return validated LAB image to private Social, no public delivery.
 if(r.origin_engine_id==='SOC-001'&&env.SOCIAL_REPLY_QUEUE){
   const social=await env.ASSET_KV.get('meta/ums001-social-creative-bridge/v1/events/'+r.request_id+'/'+r.item_id,{type:'json'});
   if(social?.state==='QUEUED_FOR_UNIVERSAL_ROUTER'&&social.origin_engine_id==='SOC-001'&&['INSTAGRAM','FACEBOOK'].includes(social.platform_id)){
     await env.SOCIAL_REPLY_QUEUE.send({state:'PRIVATE_READY',company_id:'fenix',origin_engine_id:'SOC-001',environment:'LAB',request_id:r.request_id,item_id:r.item_id,platform_id:social.platform_id,asset_sha256:sha,private_artifact_ref:file,publish_authorized:false});
     await env.ASSET_KV.put(ROOT+'callback/'+r.request_id+'/'+r.item_id,JSON.stringify({state:'DELIVERY_QUEUED',at:new Date().toISOString(),origin:'SOC-001',no_publication:true}));
   }
 }
 await env.ASSET_KV.put(quotaKey,JSON.stringify({count:Number(spent.count||0)+1,estimated_neurons:estimatedUsed+perImageNeurons,free_neuron_budget:budget,neurons_per_image:perImageNeurons,day,last_request_id:r.request_id}));
 return {state:receipt.state,sha256:sha};
}
export default {
 async queue(batch,env){
  if(batch.queue!=='cerebro-ums001-ai-image-factory-lab-eu')throw Error('UMS001_WRONG_QUEUE');
  for(const msg of batch.messages){
   try{await run(msg.body,env);msg.ack()}
   catch(e){
    const code=String(e?.message||'ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
    try{await env.ASSET_KV.put(ROOT+'errors/'+String(msg.id).slice(0,64),JSON.stringify({code,at:new Date().toISOString(),no_publication:true,no_paid_fallback:true}));msg.ack()}
    catch{msg.retry({delaySeconds:30})}
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};