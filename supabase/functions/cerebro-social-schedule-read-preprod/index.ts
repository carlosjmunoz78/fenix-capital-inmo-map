import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const PROD_KEY_URL="https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-actgw-signer-key-v0";
const KEY_ID="cerebro-actgw-prod-v1";
const CONTEXT="CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1";

function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-fenix-env":"PREPROD"}})}
function b64decode(v:string){const raw=atob(v);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function publicKey(){
  const r=await fetch(PROD_KEY_URL,{headers:{"user-agent":"CEREBRO-SOCIAL-READ/1.0"},cache:"no-store"});
  const b=await r.json().catch(()=>null);
  if(!r.ok||b?.ok!==true||b?.key_id!==KEY_ID||b?.context!==CONTEXT||!b?.public_key_b64)throw new Error("signer_key_unavailable");
  return b64decode(String(b.public_key_b64));
}
async function verify(req:Request){
  const ts=req.headers.get("x-cerebro-actgw-timestamp")??"";
  const sig=req.headers.get("x-cerebro-actgw-signature-ed25519")??"";
  const keyId=req.headers.get("x-cerebro-actgw-key-id")??"";
  if(keyId!==KEY_ID||!/^\d{10}$/.test(ts)||!sig)return false;
  if(Math.abs(Math.floor(Date.now()/1000)-Number(ts))>300)return false;
  const pk=await publicKey();
  return nacl.sign.detached.verify(new TextEncoder().encode(ts+".SOCIAL_READ"),b64decode(sig),pk);
}

Deno.serve(async(req)=>{
  try{
    if(req.method!=="GET")return J({ok:false,error:"method_not_allowed"},405);
    if(!U||!S)return J({ok:false,error:"server_config_missing"},503);
    if(!await verify(req))return J({ok:false,error:"signature_invalid"},401);
    const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
    const now=new Date().toISOString();
    const {data,error}=await db.from("cerebro_social_queue_preprod")
      .select("channel,content_key,scheduled_at,state,external_post_id,provider_channel_id,last_verified_at,last_provider_error")
      .eq("company_id","fenix-capital").eq("environment","PREPROD")
      .gte("scheduled_at",now).in("state",["READY_PROVIDER","SCHEDULED"])
      .order("scheduled_at",{ascending:true}).limit(100);
    if(error)return J({ok:false,error:"queue_read_failed"},500);
    return J({ok:true,source:"cerebro_social_queue_preprod",as_of:new Date().toISOString(),items:data??[]});
  }catch(e){return J({ok:false,error:"social_read_exception",detail:e instanceof Error?e.message:String(e)},500)}
});