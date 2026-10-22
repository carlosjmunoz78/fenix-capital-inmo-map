import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const COMPANY="fenix-capital";
const ENGINE="SOC-001";
const ENV="PREPROD";
const RENDERER="wp-brand-v0.3.2";
const WP="https://fenixcapital.es/wp-json/cerebro/v1/social-visual";
function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-cerebro-env":"PREPROD"}})}
Deno.serve(async(req)=>{
 try{
  if(!["GET","POST"].includes(req.method)) return J({ok:false,error:"method_not_allowed"},405);
  const u=new URL(req.url); const limit=Math.max(1,Math.min(20,Number(u.searchParams.get("limit")??"12")));
  if(!U||!S) return J({ok:false,error:"missing_runtime_config"},503);
  const db=createClient(U,S,{auth:{persistSession:false}}); const now=new Date().toISOString(); const horizon=new Date(Date.now()+30*86400000).toISOString();
  const {data:rows,error}=await db.from("cerebro_social_queue_preprod")
    .select("id,channel,content_key,scheduled_at,state,external_post_id,source_media_urls,renderer_version")
    .eq("company_id",COMPANY).eq("engine_id",ENGINE).eq("environment",ENV)
    .gte("scheduled_at",now).lt("scheduled_at",horizon)
    .in("state",["READY_PROVIDER","SCHEDULED","CONTENT_READY_MEDIA_REQUIRED"])
    .neq("renderer_version",RENDERER).order("scheduled_at",{ascending:true}).limit(limit);
  if(error) return J({ok:false,error:"queue_read_failed",detail:error.message},500);
  const items:any[]=[];
  for(const row of rows??[]){
    const sources=Array.isArray(row.source_media_urls)?row.source_media_urls:[];
    if(!sources.length){items.push({content_key:row.content_key,ok:false,error:"NO_SOURCE_MEDIA"});continue;}
    const urls:string[]=[]; const checks:any[]=[]; let ok=true;
    for(const source of sources){
      try{
        const endpoint=WP+"?source="+encodeURIComponent(String(source))+"&channel="+encodeURIComponent(String(row.channel));
        const r=await fetch(endpoint,{headers:{"user-agent":"CEREBRO-SOC-001-WPVisualWorker/0.3.2"}}); const p=await r.json().catch(()=>null);
        const good=!!(r.ok&&p?.ok&&p?.url&&p?.version==="0.3.2"&&p?.qa?.ok&&Number(p?.bytes??0)>=12000);
        checks.push({source,status:r.status,url:p?.url??null,version:p?.version??null,bytes:p?.bytes??null,qa:p?.qa??null,ok:good});
        if(!good){ok=false;break;} urls.push(String(p.url));
      }catch(e){ok=false;checks.push({source,ok:false,error:e instanceof Error?e.message:String(e)});break;}
    }
    if(ok&&urls.length===sources.length){
      const nextState=row.state==="CONTENT_READY_MEDIA_REQUIRED"?"READY_PROVIDER":row.state;
      const {error:upErr}=await db.from("cerebro_social_queue_preprod").update({public_media_url:urls[0],media_urls:urls,asset_status:"WP_BRAND_RENDER_VERIFIED",renderer_version:RENDERER,visual_qa_status:"WP_PIXEL_QA_PASS",visual_qa_checked_at:new Date().toISOString(),brand_qa:true,state:nextState,last_provider_error:null,updated_at:new Date().toISOString()}).eq("id",row.id);
      if(upErr){ok=false;checks.push({ok:false,error:"QUEUE_UPDATE_FAILED:"+upErr.message});}
      if(ok) await db.from("cerebro_social_visual_qa_preprod").upsert({company_id:COMPANY,engine_id:ENGINE,environment:ENV,renderer_version:RENDERER,content_key:row.content_key,channel:row.channel,slide_count:urls.length,passed:true,checks,checked_at:new Date().toISOString()});
    }
    if(!ok) await db.from("cerebro_social_visual_qa_preprod").upsert({company_id:COMPANY,engine_id:ENGINE,environment:ENV,renderer_version:RENDERER,content_key:row.content_key,channel:row.channel,slide_count:sources.length,passed:false,checks,checked_at:new Date().toISOString()});
    items.push({content_key:row.content_key,channel:row.channel,state:row.state,external_post_id:row.external_post_id,slides:sources.length,ok,urls,checks});
  }
  return J({ok:items.every(x=>x.ok),state:"WP_SOCIAL_VISUAL_WORKER_COMPLETE",renderer:RENDERER,processed:items.length,passed:items.filter(x=>x.ok).length,failed:items.filter(x=>!x.ok).length,additional_cost_eur:0,items});
 }catch(e){return J({ok:false,error:"worker_exception",detail:e instanceof Error?e.message:String(e)},500);}
});
