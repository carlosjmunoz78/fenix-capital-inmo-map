import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nacl from "npm:tweetnacl@1.0.3";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const CONTEXT="CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1";
function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}})}
async function sha256Bytes(v:string){return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))}
function b64(bytes:Uint8Array){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
Deno.serve(async(req)=>{
  if(req.method!=="GET")return J({ok:false,error:"method_not_allowed"},405);
  if(!S)return J({ok:false,error:"server_config_missing"},503);
  const seed=await sha256Bytes(S+"|"+CONTEXT);
  const kp=nacl.sign.keyPair.fromSeed(seed);
  return J({ok:true,algorithm:"Ed25519",key_id:"cerebro-actgw-prod-v1",public_key_b64:b64(kp.publicKey),context:CONTEXT});
});