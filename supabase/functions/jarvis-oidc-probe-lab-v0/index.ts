import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

// Isolated GitHub-issued identity attestation, not a Supabase user login or a worker.
// No database, privileged key, queue, Git writes, or downstream operations.
const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='jarvis-oidc-probe-lab-v0';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const REF='refs/heads/cerebro/jarvis-git-parity-lab-20261109';
const WORKFLOW='.github/workflows/cerebro-jarvis-oidc-probe-lab-once.yml';
const FUNCTION='jarvis-oidc-probe-lab-v0';
const PREPROD='hnqlnvakzaywtafeiybt';
const EXPECTED_WORKFLOW_REF=REPO+'/'+WORKFLOW+'@'+REF;
const JWKS=createRemoteJWKSet(new URL(ISSUER+'/.well-known/jwks'));

function response(status:number,body:unknown){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
Deno.serve(async(req:Request)=>{
  const url=new URL(req.url);
  if(req.method!=='POST'||!url.pathname.endsWith('/'+FUNCTION+'/attest'))return response(404,{status:'NOT_AVAILABLE'});
  const project=Deno.env.get('SUPABASE_URL')??'';
  if(!project||new URL(project).origin!=='https://'+PREPROD+'.supabase.co')return response(403,{status:'DENIED',reason:'WRONG_ENVIRONMENT'});
  const header=req.headers.get('authorization')??'';
  if(!header.startsWith('Bearer ')||header.length>8199)return response(403,{status:'DENIED',reason:'OIDC_REQUIRED'});
  try{
    const {payload}=await jwtVerify(header.slice(7),JWKS,{issuer:ISSUER,audience:AUDIENCE,algorithms:['RS256'],clockTolerance:5});
    const now=Math.floor(Date.now()/1000);
    if(payload.repository!==REPO||
       payload.ref!==REF||
       payload.workflow_ref!==EXPECTED_WORKFLOW_REF||
       payload.event_name!=='push'||
       payload.sub!=='repo:'+REPO+':ref:'+REF||
       typeof payload.sha!=='string'||!/^[0-9a-f]{40}$/i.test(payload.sha)||
       typeof payload.run_id!=='string'||!/^[0-9]+$/.test(payload.run_id)||
       typeof payload.exp!=='number'||typeof payload.iat!=='number'||
       payload.iat>now+5||payload.iat<now-300||payload.exp>now+600
    )return response(403,{status:'DENIED',reason:'OIDC_SCOPE_DENIED'});
    return response(200,{status:'OK',proof:'SIGNED_GITHUB_OIDC_READONLY',company_id:'fenix',engine_id:'CONSOLE-001',environment:'LAB',version:'v0',repository:REPO,ref:REF,source_sha:payload.sha,run_id:payload.run_id,person_jwt_required:false,new_secret_required:false,prod_mutation:false,db_access:false,trading_access:false,write_operations:0});
  }catch{return response(403,{status:'DENIED',reason:'OIDC_INVALID'});}
});
