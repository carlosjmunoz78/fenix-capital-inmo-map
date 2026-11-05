import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const projectOk=U.includes("hnqlnvakzaywtafeiybt");
function json(o:unknown,s=200){return new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}})}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({ok:false,code:"METHOD_DENIED"},405);
  if(!projectOk||!S)return json({ok:false,code:"SERVER_NOT_READY"},503);
  let body:any;
  try{body=await req.json()}catch{return json({ok:false,code:"INVALID_JSON"},400)}
  if(body?.action!=="probe"||typeof body?.job_id!=="string"||typeof body?.nonce!=="string"||!/^[-0-9a-f]{36}$/i.test(body.job_id))
    return json({ok:false,code:"INVALID_PROBE_REQUEST"},400);
  const client=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.rpc("cerebro_media_claim_invocation_v0",{
    p_job_id:body.job_id,p_token:body.nonce,p_purpose:"PROBE"
  });
  if(error||data?.ok!==true)return json({ok:false,code:"ONE_SHOT_AUTH_DENIED"},403);
  // Do not return, log, hash, or transmit a credential. Presence check only.
  const available=Boolean(Deno.env.get("OPENAI_API_KEY"));
  return json({ok:true,action:"probe",company_id:"fenix",engine_id:"FACT-001",
    provider:"OPENAI",model:"gpt-image-2.5-flare",
    openai_env_ready:available,service_storage_ready:!!S,
    api_called:false,cost_incurred:false,publish_authorized:false});
});
