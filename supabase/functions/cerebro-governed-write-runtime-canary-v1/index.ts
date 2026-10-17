import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nacl from "npm:tweetnacl@1.0.3";

const OWNER="carlosjmunoz78";
const REPO="fenix-capital-inmo-map";
const BASE_BRANCH="main";
const EXPECTED_BASE_SHA="9baf5a1885d3fbd8fc18614fb3b867a49583f40f";
const CANARY_BRANCH="cerebro/prod-governed-write-e2e-canary-20261016-v1";
const CANARY_PATH="cerebro/evidence/prod-governed-write/physical-canary-2026-10-16.json";
const CANARY_ID="CEREBRO-PROD-GOVERNED-WRITE-E2E-CANARY-20261016-V1";
const SIGNING_CONTEXT="CEREBRO_GATEWAY_TO_PROD_GOVERNED_WRITE_CANARY_V1";
const KEY_ID="cerebro-prod-governed-write-canary-v1";

function J(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
async function sha256Bytes(v:string){return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));}
function fromB64(v:string){const b=atob(v);return Uint8Array.from(b,c=>c.charCodeAt(0));}
async function verifyGateway(req:Request,bodyText:string){
  const s=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!s)return{ok:false,error:"SERVER_SIGNING_CONFIG_MISSING"} as const;
  const keyId=req.headers.get("x-cerebro-key-id")??"";
  const ts=req.headers.get("x-cerebro-timestamp")??"";
  const sig64=req.headers.get("x-cerebro-signature-ed25519")??"";
  if(keyId!==KEY_ID||!/^\d{10}$/.test(ts)||!sig64)return{ok:false,error:"GATEWAY_SIGNATURE_HEADERS_INVALID"} as const;
  if(Math.abs(Math.floor(Date.now()/1000)-Number(ts))>120)return{ok:false,error:"GATEWAY_SIGNATURE_EXPIRED"} as const;
  const seed=await sha256Bytes(s+"|"+SIGNING_CONTEXT);
  const kp=nacl.sign.keyPair.fromSeed(seed);
  let sig:Uint8Array;try{sig=fromB64(sig64);}catch{return{ok:false,error:"GATEWAY_SIGNATURE_ENCODING_INVALID"} as const;}
  const msg=new TextEncoder().encode(ts+"."+bodyText);
  return nacl.sign.detached.verify(msg,sig,kp.publicKey)?{ok:true} as const:{ok:false,error:"GATEWAY_SIGNATURE_INVALID"} as const;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="GET")return J({status:"READY",service:"cerebro-governed-write-runtime-canary-v1",environment:"PROD_GOVERNED_WRITE_CANARY",credential_mode:"DELEGATED_EPHEMERAL_GITHUB_ACTIONS",credential_exported:false,fixed_action_only:true,direct_main_write:false,merge:false,customer_data:false,additional_cost_target_eur:0});
  if(req.method!=="POST")return J({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const bodyText=await req.text();
  const auth=await verifyGateway(req,bodyText);if(!auth.ok)return J({ok:false,stage:"AUTHZ",error:auth.error},403);
  let body:any;try{body=JSON.parse(bodyText);}catch{return J({ok:false,stage:"CONTRACT",error:"INVALID_JSON"},400);}
  const exact=body?.action_type==="AUTHORIZE_DELEGATED_GOVERNED_CANARY"&&body?.company_id==="fenix"&&body?.engine_id==="ACTGW-001"&&body?.environment==="PROD"&&body?.version==="v1"&&body?.expected_base_sha===EXPECTED_BASE_SHA&&body?.idempotency_key===CANARY_ID&&/^\d+$/.test(String(body?.source_run_id??""))&&/^[0-9a-f]{40}$/i.test(String(body?.source_sha??""));
  if(!exact)return J({ok:false,stage:"CONTRACT",error:"ACTION_NOT_ALLOWLISTED"},403);

  const headRes=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BASE_BRANCH}`,{headers:{"accept":"application/vnd.github+json","x-github-api-version":"2022-11-28"},redirect:"manual"});
  const head=await headRes.json().catch(()=>null);
  if(!headRes.ok||head?.object?.sha!==EXPECTED_BASE_SHA)return J({ok:false,stage:"BASE_LEASE",error:"BASE_SHA_MISMATCH",expected:EXPECTED_BASE_SHA,observed:head?.object?.sha??null,http_status:headRes.status},409);

  const artifact={schema_version:"1",evidence_id:CANARY_ID,company_id:"fenix",engine_id:"ACTGW-001",environment:"PROD",version:"v1",execution_mode:"PROD_GOVERNED_WRITE",credential_mode:"DELEGATED_EPHEMERAL_GITHUB_ACTIONS",credential_exported:false,source_run_id:String(body.source_run_id),source_sha:String(body.source_sha),source_workflow_ref:String(body.source_workflow_ref??""),expected_base_sha:EXPECTED_BASE_SHA,target_repository:`${OWNER}/${REPO}`,target_branch:CANARY_BRANCH,target_path:CANARY_PATH,safety:{direct_main_write:false,merge:false,auto_merge:false,force_push:false,workflow_mutation:false,governance_self_mutation:false,customer_data:false,trading:false,paid_fallback:false,additional_cost_eur:0}};
  return J({ok:true,status:"AUTHORIZED",authorization_id:CANARY_ID,company_id:"fenix",engine_id:"ACTGW-001",environment:"PROD",version:"v1",operation:"CREATE_VERIFY_ROLLBACK_GOVERNED_CANARY_BRANCH_FILE",repository:`${OWNER}/${REPO}`,base_ref:BASE_BRANCH,base_sha:EXPECTED_BASE_SHA,branch:CANARY_BRANCH,path:CANARY_PATH,artifact,direct_main_write:false,merge:false,auto_merge:false,force_push:false,workflow_mutation:false,governance_self_mutation:false,customer_data:false,trading:false,additional_cost_eur:0,credential_mode:"DELEGATED_EPHEMERAL_GITHUB_ACTIONS",credential_exported:false});
});
