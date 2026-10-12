import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OIDC_ISSUER="https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE="cerebro-human-route-control-preprod-v1";
const REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const WORKFLOW_PATH=".github/workflows/cerebro-human-intelligence-v1.yml";
const COMPANY_ID="fenix";
const ROUTE_KEY="human_conversation";
const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";

type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;actor?:string;run_id?:string;[key:string]:unknown};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function b64urlBytes(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);const raw=atob(normalized);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}
let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`,{cache:"no-store"});if(!configRes.ok)throw new Error("OIDC_CONFIG_UNAVAILABLE");const config=await configRes.json();const jwksRes=await fetch(String(config.jwks_uri),{cache:"no-store"});if(!jwksRes.ok)throw new Error("OIDC_JWKS_UNAVAILABLE");const jwks=await jwksRes.json();if(!Array.isArray(jwks?.keys))throw new Error("OIDC_JWKS_INVALID");jwksCache={at:Date.now(),keys:jwks.keys};return jwks.keys;}
async function authorize(req:Request){const bearer=req.headers.get("authorization")??"";if(!bearer.startsWith("Bearer "))return {ok:false as const,reason:"OIDC_MISSING"};const token=bearer.slice(7),parts=token.split(".");if(parts.length!==3)return {ok:false as const,reason:"OIDC_MALFORMED"};try{const header=b64urlJson<any>(parts[0]);const claims=b64urlJson<Claims>(parts[1]);if(header?.alg!=="RS256"||!header?.kid)return {ok:false as const,reason:"OIDC_ALG_OR_KID_INVALID"};const keys=await githubJwks(),jwk=keys.find((key:any)=>key?.kid===header.kid);if(!jwk)return {ok:false as const,reason:"OIDC_KID_UNKNOWN"};const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));if(!verified)return {ok:false as const,reason:"OIDC_SIGNATURE_INVALID"};const now=Math.floor(Date.now()/1000),audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:"OIDC_ISSUER_OR_AUDIENCE_INVALID"};if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:"OIDC_TIME_INVALID"};if(claims.repository!==REPOSITORY)return {ok:false as const,reason:"OIDC_REPOSITORY_INVALID"};if(!["pull_request","workflow_dispatch"].includes(String(claims.event_name??"")))return {ok:false as const,reason:"OIDC_EVENT_INVALID"};if(!String(claims.workflow_ref??"").includes(WORKFLOW_PATH))return {ok:false as const,reason:"OIDC_WORKFLOW_INVALID"};return {ok:true as const,claims};}catch(error){return {ok:false as const,reason:"OIDC_VERIFY_ERROR",detail:String(error instanceof Error?error.message:error)};}}

Deno.serve(async(req:Request)=>{
  const auth=await authorize(req);if(!auth.ok)return json(403,{ok:false,status:403,error:auth.reason});
  if(!U||!S)return json(500,{ok:false,status:500,error:"PREPROD_ROUTE_CONTROL_CONFIG_MISSING"});
  const svc=createClient(U,S,{auth:{persistSession:false}});
  const suffix=new URL(req.url).pathname.split("/").filter(Boolean).pop()??"";
  if(req.method==="GET"&&(suffix==="state"||suffix==="health")){
    const {data,error}=await svc.from("cerebro_human_route_control_preprod").select("company_id,route_key,mode,canary_percent,serve_actor,candidate_actor,previous_actor,version,last_reason,last_idempotency_key,updated_by,updated_at").eq("company_id",COMPANY_ID).eq("route_key",ROUTE_KEY).maybeSingle();
    if(error)return json(500,{ok:false,status:500,error:"ROUTE_STATE_READ_FAILED"});
    if(!data)return json(404,{ok:false,status:404,error:"ROUTE_STATE_NOT_FOUND"});
    return json(200,{ok:true,status:200,environment:"PREPROD",state:data,safety:{prod_authorized:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0}});
  }
  if(req.method==="POST"&&suffix==="transition"){
    let body:any;try{body=await req.json();}catch{return json(400,{ok:false,status:400,error:"INVALID_JSON"});}
    const expected=Number(body?.expected_version),mode=String(body?.mode??""),percent=Number(body?.canary_percent),reason=String(body?.reason??"").trim(),idem=String(body?.idempotency_key??"").trim();
    if(!Number.isInteger(expected)||!Number.isInteger(percent)||!reason||!idem)return json(400,{ok:false,status:400,error:"INVALID_TRANSITION_PAYLOAD"});
    const changedBy=`github:${String(auth.claims.actor??"unknown")}:run:${String(auth.claims.run_id??"unknown")}`.slice(0,200);
    const {data,error}=await svc.rpc("cerebro_human_route_transition_preprod",{p_company_id:COMPANY_ID,p_route_key:ROUTE_KEY,p_expected_version:expected,p_mode:mode,p_canary_percent:percent,p_reason:reason,p_idempotency_key:idem,p_changed_by:changedBy});
    if(error)return json(500,{ok:false,status:500,error:"ROUTE_TRANSITION_RPC_FAILED"});
    const status=Number(data?.status??500);
    return json(status,{...data,environment:"PREPROD",safety:{prod_authorized:false,prod_write_authorized:false,trading_access:false,customer_data:false,additional_cost_eur:0}});
  }
  return json(404,{ok:false,status:404,error:"ROUTE_NOT_AVAILABLE"});
});
