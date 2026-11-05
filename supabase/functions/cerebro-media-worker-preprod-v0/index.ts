import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {Image} from "jsr:@matmen/imagescript@3.13.1";
const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const MODEL="gpt-image-2.5-flare";
const PROJECT="hnqlnvakzaywtafeiybt";
const BUCKET="cerebro-creative-assets";
const API="https://api.openai.com/v1/images/generations";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pngMagic=[137,80,78,71,13,10,26,10];
function reply(d:unknown,s=200){return new Response(JSON.stringify(d),{
 status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
})}
function isPng(b:Uint8Array){return b.length>=10000&&b.length<=12000000&&pngMagic.every((x,i)=>b[i]===x)}
function decode64(b64:string){
 const raw=atob(b64);const b=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);
 return b;
}
async function sha(b:Uint8Array){
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",b));
 return Array.from(digest).map(x=>x.toString(16).padStart(2,"0")).join("");
}
function photoPrompt(payload:any){
 if(payload?.buyer_persona!=="familia_primera_vivienda"||
 payload?.brief_source!=="CEREBRO_SOC001_LIVE_EXISTING_QUEUE")
 throw new Error("BRIEF_PERSONA_NOT_APPROVED");
 return [
 "FACT-001 / Fenix Capital. Create ONE original premium advertising photograph.",
 "Photorealistic sunlit contemporary Andalusian apartment in Cordoba, Spain.",
 "Beautiful, authentic middle-class residential property, not a luxury fantasy.",
 "Warm Mediterranean afternoon daylight through a window; solid oak dining table.",
 "At foreground, keys to a first home beside a closed calculator and blank,",
 "unmarked budgeting notebook; hints of a cozy, lived-in residence in the background.",
 "Natural texture, subtle orange ambient highlights, elegant real-estate editorial photography.",
 "Balanced framing with strong central visual focus and room for text overlays.",
 "Professional full-frame realistic photograph, natural architectural proportions,",
 "cinematic but credible lighting, crisp interior detail, 1024x1024 square.",
 "This is a conceptual editorial visualization, never a real property listing.",
 "Absolutely no people, typography, letters, captions, numbers, signs, logos,",
 "watermarks, price tags, financial claims, brand imitations or surreal elements.",
 "Do not add any fake Fenix Capital branding. Official logo added separately",
 "by the controlled brand compositor after independent quality review."
 ].join(" ");
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({ok:false,code:"METHOD_DENIED"},405);
 if(!U.includes(PROJECT)||!S)return reply({ok:false,code:"SERVER_NOT_READY"},503);
 let body:any;try{body=await req.json()}catch{return reply({ok:false,code:"INVALID_JSON"},400)}
 if(!uuid.test(body?.job_id??"")||typeof body?.nonce!=="string"||
 !/^[a-f0-9]{48}$/i.test(body.nonce)||!["probe","generate","preview","preview_bytes","compose"].includes(body?.action))
 return reply({ok:false,code:"INVALID_INVOCATION"},400);
 const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
 if(body.action==="compose"){
   const {data:claim,error:ce}=await db.rpc("cerebro_media_claim_composite_v0",{
     p_job_id:body.job_id,p_token:body.nonce});
   if(ce||claim?.ok!==true)return reply({ok:false,code:"COMPOSITOR_AUTH_DENIED"},403);
   try{
     const {data:blob,error:se}=await db.storage.from(BUCKET).download(claim.source_path);
     if(se||!blob)return reply({ok:false,code:"SOURCE_PHOTO_MISSING"},500);
     const originalBytes=new Uint8Array(await blob.arrayBuffer());
     if(!isPng(originalBytes)||await sha(originalBytes)!==claim.source_sha256)
       return reply({ok:false,code:"SOURCE_PROVENANCE_FAILED"},500);
     const LOGO_URL="https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png";
     const FONT_URL="https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf";
     const [logoResponse,fontResponse]=await Promise.all([
       fetch(LOGO_URL,{redirect:"error",signal:AbortSignal.timeout(18000)}),
       fetch(FONT_URL,{redirect:"error",signal:AbortSignal.timeout(18000)})
     ]);
     if(!logoResponse.ok||!fontResponse.ok)
       return reply({ok:false,code:"OFFICIAL_ASSETS_UNAVAILABLE",
         logo_status:logoResponse.status,font_status:fontResponse.status},502);
     const logoBytes=new Uint8Array(await logoResponse.arrayBuffer());
     const fontBytes=new Uint8Array(await fontResponse.arrayBuffer());
     if(logoBytes.length<1000||logoBytes.length>4000000||
       fontBytes.length<50000||fontBytes.length>2000000)
       return reply({ok:false,code:"BRAND_ASSET_INVALID"},500);
     const photo=(await Image.decode(originalBytes)).cover(1080,1080);
     const logo=(await Image.decode(logoBytes)).contain(355,110);
     const white=Image.rgbaToColor(255,255,255,255);
     const orange=Image.rgbaToColor(255,95,0,255);
     const purple=Image.rgbaToColor(135,0,100,255);
     photo.drawBox(0,0,1080,133,white);
     photo.drawBox(0,708,1080,372,orange);
     photo.drawBox(0,706,1080,5,purple);
     photo.composite(logo,{x:50,y:Math.max(5,Math.round((133-logo.height)/2))});
     const title=await Image.renderText(fontBytes,71,
       "ANTES DE RESERVAR,\nHAZ NÚMEROS",{
          color:white,style:{variations:{weight:800}}});
     const subtitle=await Image.renderText(fontBytes,32,
       "Una buena compra empieza antes de firmar",{color:white});
     const cta=await Image.renderText(fontBytes,28,
       "Solicita una revisión antes de comprometerte",{color:white});
     if(title.width>970||subtitle.width>970||cta.width>970||
       title.height>188)return reply({ok:false,code:"TEXT_SAFE_ZONE_OVERFLOW"},500);
     photo.composite(title,{x:55,y:750});
     photo.composite(subtitle,{x:55,y:945});
     photo.composite(cta,{x:55,y:1019});
     const branded=await photo.encode({compression:5});
     if(!isPng(branded))return reply({ok:false,code:"COMPOSITOR_OUTPUT_INVALID"},500);
     const brandedHash=await sha(branded);
     const outPath="fact001/preprod/openai/"+body.job_id+"/branded.png";
     const {error:uploadError}=await db.storage.from(BUCKET).upload(
         outPath,branded,{contentType:"image/png",upsert:false,cacheControl:"0"});
     if(uploadError)return reply({ok:false,code:"BRAND_STORAGE_FAILED"},500);
     const {data:committed,error:commitError}=await db.rpc(
       "cerebro_media_complete_composite_v0",{
       p_job_id:body.job_id,p_hash:brandedHash,p_bytes:branded.length});
     if(commitError||committed?.ok!==true)return reply({ok:false,code:"BRAND_MANIFEST_FAILED"},500);
     return reply({ok:true,status:"VISUAL_QA_PENDING",
       job_id:body.job_id,brand_compositor:"FACT001_IMAGESCRIPT_V0",
       source:"VERIFIED_FACT001_OPENAI_IMAGE",official_logo:"REAL_FIRST_PARTY_PNG",
       sha256:brandedHash,storage_bucket:BUCKET,storage_path:outPath,
       bytes:branded.length,provider_calls:0,publish_authorized:false});
   }catch{
     return reply({ok:false,code:"COMPOSITOR_FAILED_NO_PROVIDER_RETRY"},500);
   }
 }
 if(body.action==="probe"){
   const {data,error}=await db.rpc("cerebro_media_claim_invocation_v0",{
    p_job_id:body.job_id,p_token:body.nonce,p_purpose:"PROBE"});
   if(error||data?.ok!==true)return reply({ok:false,code:"ONE_SHOT_AUTH_DENIED"},403);
   return reply({ok:true,action:"probe",company_id:"fenix",engine_id:"FACT-001",
     provider:"OPENAI",model:MODEL,openai_env_ready:Boolean(Deno.env.get("OPENAI_API_KEY")),
     service_storage_ready:true,api_called:false,cost_incurred:false,publish_authorized:false});
 }
 if(body.action==="preview"||body.action==="preview_bytes"){
   const previewRPC=(body.variant==="branded"&&body.action==="preview_bytes")?
     "cerebro_media_claim_branded_preview_v0":"cerebro_media_claim_preview_v0";
   const {data:claim,error}=await db.rpc(previewRPC,{
     p_job_id:body.job_id,p_token:body.nonce
   });
   if(error||claim?.ok!==true)return reply({ok:false,code:"PREVIEW_AUTH_DENIED"},403);
   if(body.action==="preview_bytes"){
     const {data:blob,error:downloadError}=await db.storage.from(BUCKET).download(claim.storage_path);
     if(downloadError||!blob)return reply({ok:false,code:"PRIVATE_FILE_READ_FAILED"},500);
     const bytes=new Uint8Array(await blob.arrayBuffer());
     if(!isPng(bytes)||await sha(bytes)!==claim.sha256)
        return reply({ok:false,code:"FILE_HASH_MISMATCH"},500);
     let binary="";for(let i=0;i<bytes.length;i+=8192){
       binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
     }
     return reply({ok:true,status:body.variant==="branded"?
      "VERIFIED_REAL_FACT001_BRANDED_CANDIDATE":"VERIFIED_REAL_FACT001_IMAGE",
       job_id:body.job_id,model:MODEL,sha256:claim.sha256,
       filename:"cerebro_fact001_primera_imagen.png",
       mime:"image/png",bytes:bytes.length,
       image_base64:btoa(binary),publish_authorized:false});
   }
   const {data:ticket,error:se}=await db.storage.from(BUCKET).createSignedUrl(
       claim.storage_path,900,{download:"cerebro_fact001_primera_imagen.png"});
   if(se||!ticket?.signedUrl)return reply({ok:false,code:"PRIVATE_PREVIEW_FAILED"},500);
   return reply({ok:true,status:"FACT001_PRIVATE_PREVIEW_READY",
     job_id:body.job_id,model:MODEL,sha256:claim.sha256,
     url:ticket.signedUrl,expires_in_seconds:900,
     publish_authorized:false});
 }
 // No provider access before server-side one-use nonce and reservation transaction.
 const {data:claim,error:claimError}=await db.rpc("cerebro_media_claim_generate_v0",{
  p_job_id:body.job_id,p_token:body.nonce});
 if(claimError||claim?.ok!==true)return reply({ok:false,code:"SPEND_AUTH_DENIED"},403);
 let providerWasCalled=false;
 const fail=async(code:string)=>{
   try{await db.rpc("cerebro_media_fail_generation_v0",{
      p_job_id:body.job_id,p_error_code:code});}catch{}
   return reply({ok:false,status:"HOLD_NO_RETRY",error_code:code,
     api_was_called:providerWasCalled,publish_authorized:false},502);
 };
 try{
   const key=Deno.env.get("OPENAI_API_KEY");
   if(!key||key.length<20)return await fail("MODEL_NOT_CONFIGURED");
   const {data:job,error:je}=await db.from("cerebro_creative_job_v1")
     .select("job_id,company_id,engine_id,environment,channel,output_type,status,request")
     .eq("job_id",body.job_id).maybeSingle();
   if(je||!job||job.company_id!=="fenix"||job.engine_id!=="FACT-001"||
      job.environment!=="PREPROD"||job.channel!=="FACEBOOK"||
      job.output_type!=="SQUARE_POST"||job.status!=="HOLD")
      return await fail("PROVIDER_ERROR");
   const payload=job.request?.creative_payload??{};
   const keySocial=String(payload.content_key??"");
   if(!/^facebook-cadence-2026-11-16-fb-01$/.test(keySocial)||
     payload.requester_engine_id!=="SOC-001"||typeof payload.topic!=="string"||
     payload.topic.length>170||typeof payload.full_caption!=="string"||
     !payload.full_caption.includes(payload.topic))
     return await fail("PROVIDER_ERROR");
   const {data:social,error:se}=await db.from("cerebro_social_queue_preprod")
     .select("id,company_id,channel,content_key,hook,caption,buyer_persona,destination_url,state")
     .eq("content_key",keySocial).eq("company_id","fenix-capital")
     .eq("channel","facebook").maybeSingle();
   if(se||!social||social.state!=="CONTENT_READY_MEDIA_REQUIRED"||
      social.hook!==payload.topic||social.caption!==payload.full_caption||
      social.buyer_persona!==payload.buyer_persona||
      social.destination_url!==payload.destination_url)
     return await fail("PROVIDER_ERROR");
   const dest=new URL(String(payload.destination_url));
   if(dest.protocol!=="https:"||dest.hostname!=="fenixcapital.es"||
      dest.username||dest.password)return await fail("PROVIDER_ERROR");
   const prompt=photoPrompt(payload);
   const ai=await fetch(API,{
     method:"POST",redirect:"error",
     headers:{authorization:"Bearer "+key,"content-type":"application/json",
       "user-agent":"CEREBRO-FACT001-PREPROD-ONE-SHOT/0.1"},
     body:JSON.stringify({model:MODEL,prompt,n:1,size:"1024x1024",
          quality:"high",output_format:"png",background:"opaque"}),
     signal:AbortSignal.timeout(107000)
   });
   providerWasCalled=true;
   if(!ai.ok)return await fail("OPENAI_HTTP_"+String(ai.status));
   const requestId=ai.headers.get("x-request-id")??ai.headers.get("x-openai-request-id");
   const data=await ai.json().catch(()=>null);
   const b64=data?.data?.[0]?.b64_json;
   if(!requestId||typeof b64!=="string"||b64.length>17000000||
      !/^[a-zA-Z0-9+/=]+$/.test(b64))return await fail("OPENAI_INVALID_RESPONSE");
   const bytes=decode64(b64);
   if(!isPng(bytes))return await fail("OPENAI_INVALID_RESPONSE");
   const imageHash=await sha(bytes);
   const path="fact001/preprod/openai/"+body.job_id+"/scene.png";
   const {error:uploadError}=await db.storage.from(BUCKET).upload(
      path,bytes,{contentType:"image/png",upsert:false,cacheControl:"0"});
   if(uploadError)return await fail("STORAGE_FAILED");
   const rawUsage=data?.usage??{};
   const usage={
     total_tokens:Number(rawUsage?.total_tokens||0),
     input_tokens:Number(rawUsage?.input_tokens||0),
     output_tokens:Number(rawUsage?.output_tokens||0),
     input_text_tokens:Number(rawUsage?.input_tokens_details?.text_tokens||0),
     input_image_tokens:Number(rawUsage?.input_tokens_details?.image_tokens||0)
   };
   const {data:complete,error:completeError}=await db.rpc(
       "cerebro_media_complete_generation_v0",{p_job_id:body.job_id,
       p_artifact:{storage_path:path,sha256:imageHash,bytes:bytes.length,
          model:MODEL,provider_request_id:requestId,usage}});
   if(completeError||complete?.ok!==true)
     return reply({ok:false,status:"PROVIDER_SUCCEEDED_LEDGER_PENDING",
      api_was_called:true,storage_saved:true,code:"FINALIZE_FAILED",
      job_id:body.job_id,publish_authorized:false},500);
   return reply({ok:true,status:"GENERATED_SCENE_QA_PENDING",job_id:body.job_id,
      provider:"OPENAI",model:MODEL,sha256:imageHash,bytes:bytes.length,
      storage_bucket:BUCKET,storage_path:path,
      provider_request_id:requestId,usage,
      api_was_called:true,independent_qa_passed:false,publish_authorized:false});
 }catch(e){
   return await fail(providerWasCalled?"OPENAI_UNAVAILABLE":"PROVIDER_ERROR");
 }
});
