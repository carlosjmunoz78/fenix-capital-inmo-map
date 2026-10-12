import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { planHumanResponse, type Turn } from "./planner.ts";

const PREPROD_PROJECT_REF="hnqlnvakzaywtafeiybt";
const SOURCE_SERVICE="cerebro-human-new-actor-preprod-v1";
const SOURCE_VERSION="human-intelligence-new-v1";
const SOURCE_SHA256="4eb5816611dbe738c9588e4d843d921c3f4023dd492c4c49ed45e4b577f691b7";
const OIDC_ISSUER="https://token.actions.githubusercontent.com";
const OIDC_AUDIENCE="cerebro-human-new-actor-preprod-v1";
const REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const WORKFLOW_PATH=".github/workflows/cerebro-human-intelligence-v1.yml";

const EVIDENCE=Object.freeze({
  real_cerebro_actor:true,
  environment:"PREPROD",
  project_ref:PREPROD_PROJECT_REF,
  prod_write_authorized:false,
  prod_execution_enabled:false,
  customer_data:false,
  trading_access:false,
  additional_cost_eur:0,
  source_service:SOURCE_SERVICE,
  source_version:SOURCE_VERSION,
  source_sha256:SOURCE_SHA256,
  source_mode:"HUMAN_INTELLIGENCE_NEW_V1_PREPROD",
  source_scope:"SAFE_CONVERSATIONAL_CORE",
  auth_mode:"GITHUB_OIDC"
});

type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;[key:string]:unknown};
function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function b64urlBytes(value:string){const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);const raw=atob(normalized);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}
let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){
  if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;
  const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`,{cache:"no-store"});
  if(!configRes.ok)throw new Error("OIDC_CONFIG_UNAVAILABLE");
  const config=await configRes.json();
  const jwksRes=await fetch(String(config.jwks_uri),{cache:"no-store"});
  if(!jwksRes.ok)throw new Error("OIDC_JWKS_UNAVAILABLE");
  const jwks=await jwksRes.json();
  if(!Array.isArray(jwks?.keys))throw new Error("OIDC_JWKS_INVALID");
  jwksCache={at:Date.now(),keys:jwks.keys};
  return jwks.keys;
}
async function authorizeGitHubOidc(req:Request){
  const bearer=req.headers.get("authorization")??"";
  if(!bearer.startsWith("Bearer "))return {ok:false as const,reason:"OIDC_MISSING"};
  const token=bearer.slice(7);const parts=token.split(".");
  if(parts.length!==3)return {ok:false as const,reason:"OIDC_MALFORMED"};
  try{
    const header=b64urlJson<any>(parts[0]);const claims=b64urlJson<Claims>(parts[1]);
    if(header?.alg!=="RS256"||!header?.kid)return {ok:false as const,reason:"OIDC_ALG_OR_KID_INVALID"};
    const keys=await githubJwks();const jwk=keys.find((key:any)=>key?.kid===header.kid);
    if(!jwk)return {ok:false as const,reason:"OIDC_KID_UNKNOWN"};
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const verified=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if(!verified)return {ok:false as const,reason:"OIDC_SIGNATURE_INVALID"};
    const now=Math.floor(Date.now()/1000);const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);
    if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:"OIDC_ISSUER_OR_AUDIENCE_INVALID"};
    if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:"OIDC_TIME_INVALID"};
    if(claims.repository!==REPOSITORY)return {ok:false as const,reason:"OIDC_REPOSITORY_INVALID"};
    if(!["pull_request","workflow_dispatch"].includes(String(claims.event_name??"")))return {ok:false as const,reason:"OIDC_EVENT_INVALID"};
    if(!String(claims.workflow_ref??"").includes(WORKFLOW_PATH))return {ok:false as const,reason:"OIDC_WORKFLOW_INVALID"};
    return {ok:true as const,claims};
  }catch(error){return {ok:false as const,reason:"OIDC_VERIFY_ERROR",detail:String(error instanceof Error?error.message:error)};}
}
function validateContext(raw:unknown):Turn[]{
  if(!Array.isArray(raw))return [];
  const out:Turn[]=[];let total=0;
  for(const item of raw.slice(-10)){
    if(!item||typeof item!=="object")continue;
    const role=String((item as any).role??"");const text=String((item as any).text??"").trim().slice(0,1200);
    if((role!=="user"&&role!=="cerebro")||!text)continue;
    if(total+text.length>8000)break;total+=text.length;out.push({role:role as Turn["role"],text});
  }
  return out;
}
function validateLabContext(value:unknown){
  if(!value||typeof value!=="object")return false;
  const v=value as any;
  return v.company_id==="fenix"&&v.engine_id==="SIM-001"&&v.environment==="LAB"&&v.prod_write_authorized===false&&v.trading_access===false&&v.customer_data===false;
}
Deno.serve(async(req:Request)=>{
  const auth=await authorizeGitHubOidc(req);
  if(!auth.ok)return json(403,{status:"FORBIDDEN",reason:auth.reason});
  const suffix=new URL(req.url).pathname.split("/").filter(Boolean).pop()??"";
  if(req.method==="GET"&&suffix==="health")return json(200,{status:"ok",service:SOURCE_SERVICE,actor_evidence:EVIDENCE});
  if(req.method!=="POST"||suffix!=="chat")return json(404,{status:"CLOSED",reason:"ROUTE_NOT_AVAILABLE"});
  let body:any;try{body=await req.json();}catch{return json(400,{status:"INVALID",reason:"JSON_INVALID"});}
  if(typeof body?.message!=="string"||body.message.length>2000)return json(400,{status:"INVALID",reason:"MESSAGE_INVALID"});
  if(!validateLabContext(body?.lab_context))return json(400,{status:"INVALID",reason:"LAB_CONTEXT_REQUIRED"});
  const answer=planHumanResponse({message:body.message,conversation_context:validateContext(body?.conversation_context),seed:String(body.lab_context.seed??"")});
  return json(200,{...answer,actor_evidence:EVIDENCE});
});
