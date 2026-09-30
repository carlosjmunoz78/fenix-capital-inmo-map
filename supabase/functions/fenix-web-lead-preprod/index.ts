import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const db=createClient(U,S,{auth:{persistSession:false}});
const allowed=new Set(["https://fenixcapital.es","https://www.fenixcapital.es","https://staging.fenixcapital.es"]);
function headers(origin:string|null){const h:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin","access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"content-type,x-fenix-idempotency-key","x-fenix-env":"PREPROD_TEST"};if(origin&&allowed.has(origin))h["access-control-allow-origin"]=origin;return h;}
function J(d:unknown,s=200,o:string|null=null){return new Response(JSON.stringify(d),{status:s,headers:headers(o)});}
Deno.serve(async req=>{const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405,origin);if(origin&&!allowed.has(origin))return J({ok:false,error:"origin_not_allowed"},403,origin);let b:any;try{b=await req.json()}catch{return J({ok:false,error:"invalid_json"},400,origin)}if(String(b?.website??"").trim())return J({ok:true,accepted:true},202,origin);const idem=String(req.headers.get("x-fenix-idempotency-key")??b?.idempotency_key??"").trim()||`web-${crypto.randomUUID()}`;const {data,error}=await db.rpc("preprod_web_lead_ingest_server",{p_payload:b??{},p_idempotency_key:idem});if(error)return J({ok:false,error:"rpc_failed"},500,origin);const status=Number(data?.status??500);
let newsletter:any=null;
if(status>=200&&status<300&&b?.consent_marketing===true&&String(b?.email??"").trim()){
  try{
    const consentAt=new Date().toISOString();
    const r=await fetch(U+"/functions/v1/fenix-newsletter-enroll-preprod",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer "+S,
        "apikey":S
      },
      body:JSON.stringify({
        email:String(b.email).trim().toLowerCase(),
        landing_url:String(b?.landing_url??""),
        consent_marketing:true,
        consent_source:"wordpress_explicit_checkbox",
        consent_at:consentAt,
        source_idempotency_key:idem
      })
    });
    const raw=await r.json().catch(()=>null);
    newsletter={ok:r.ok,status:r.status,enrolled:Boolean(raw?.enrolled),dry_run:Boolean(raw?.dry_run),audience:raw?.audience??null,list_id:raw?.list_id??null};
  }catch{
    newsletter={ok:false,status:0,enrolled:false,error:"newsletter_enrollment_unavailable"};
  }
}
let autoresponse:any=null;
if(status>=200&&status<300&&String(b?.email??"").trim()&&b?.consent_privacy===true){
  const funnel=String(b?.funnel??b?.intent??"").trim().toUpperCase();
  const city=String(b?.city??b?.municipality??b?.source_city??"").trim();
  if(["GUIDE","STUDY","NEWSLETTER"].includes(funnel)){
    try{
      const r=await fetch(U+"/functions/v1/fenix-lead-response-preprod",{
        method:"POST",
        headers:{"content-type":"application/json","authorization":"Bearer "+S},
        body:JSON.stringify({
          email:String(b.email).trim().toLowerCase(),
          name:String(b?.name??"").trim(),
          funnel,city,
          consent_privacy:true,
          consent_marketing:b?.consent_marketing===true,
          idempotency_key:idem
        })
      });
      const raw=await r.json().catch(()=>null);
      autoresponse={ok:r.ok,status:r.status,state:raw?.state??null,message_kind:raw?.message_kind??null,message_id:raw?.message_id??null,error:raw?.error??null};
    }catch{
      autoresponse={ok:false,status:0,error:"lead_response_unavailable"};
    }
  }
}
return J({...data,newsletter_enrollment:newsletter,lead_autoresponse:autoresponse},status,origin);});