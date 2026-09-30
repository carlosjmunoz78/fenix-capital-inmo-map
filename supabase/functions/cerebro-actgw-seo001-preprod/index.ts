import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const PROD_KEY_URL="https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-actgw-signer-key-v0";
const EXPECTED_KEY_ID="cerebro-actgw-prod-v1";
const EXPECTED_CONTEXT="CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1";

function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-fenix-env":"PREPROD"}})}
function b64decode(v:string){const raw=atob(v);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function norm(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function codeOf(x:any){return String(x?.Codigo??x?.Código??x?.Cod??x?.codigo??x?.cod??x?.CodigoOficial??x?.codigoOficial??"").replace(/\D/g,"")}
function nameOf(x:any){return String(x?.Nombre??x?.nombre??x?.Name??x?.name??"").trim()}

async function publicKey(){
  const r=await fetch(PROD_KEY_URL,{headers:{"user-agent":"CEREBRO-ACTGW-PREPROD/1.0"},cache:"no-store"});
  const b=await r.json().catch(()=>null);
  if(!r.ok||b?.ok!==true||b?.key_id!==EXPECTED_KEY_ID||b?.context!==EXPECTED_CONTEXT||!b?.public_key_b64)throw new Error("prod_signer_key_unavailable");
  return b64decode(String(b.public_key_b64));
}
async function verify(req:Request,raw:string){
  const ts=req.headers.get("x-cerebro-actgw-timestamp")??"";
  const sig=req.headers.get("x-cerebro-actgw-signature-ed25519")??"";
  const keyId=req.headers.get("x-cerebro-actgw-key-id")??"";
  if(keyId!==EXPECTED_KEY_ID||!/^\d{10}$/.test(ts)||!sig)return false;
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(ts));
  if(age>300)return false;
  const pk=await publicKey();
  return nacl.sign.detached.verify(new TextEncoder().encode(ts+"."+raw),b64decode(sig),pk);
}

async function getJson(url:string){
  const r=await fetch(url,{headers:{"accept":"application/json","user-agent":"CEREBRO-SEO-001/1.0"},cache:"no-store"});
  const b=await r.json().catch(()=>null);
  if(!r.ok||!Array.isArray(b))throw new Error("ine_api_failed_"+r.status);
  return b;
}

async function provinceCode(province:string){
  const rows=await getJson("https://servicios.ine.es/wstempus/js/ES/VALORES_VARIABLE/115?det=2");
  const target=norm(province);
  const matches=rows.map((x:any)=>({name:nameOf(x),code:codeOf(x)})).filter((x:any)=>x.name&&x.code&&(
    norm(x.name)===target ||
    norm(x.name).startsWith(target+" ") ||
    target.startsWith(norm(x.name)+" ") ||
    (target==="valencia"&&norm(x.name).startsWith("valencia"))
  ));
  if(matches.length!==1)throw new Error("province_code_not_unique");
  return matches[0];
}

async function municipalitiesFor(province:string,code:string){
  const rows=await getJson("https://servicios.ine.es/wstempus/js/ES/VALORES_VARIABLE/19?clasif=121&det=2");
  const prefix=code.padStart(2,"0").slice(0,2);
  const out:any[]=[];
  const seen=new Set<string>();
  for(const x of rows){
    const name=nameOf(x),official=codeOf(x);
    if(!name||official.length<5||!official.startsWith(prefix))continue;
    const key=norm(name);
    if(seen.has(key))continue;
    seen.add(key);out.push({name,code:official.slice(0,5)});
  }
  if(!out.length)throw new Error("municipality_source_empty");
  return out;
}

const CAPITAL_EXCEPTIONS:Record<string,string[]>={
  "araba alava":["vitoria gasteiz"],
  "asturias":["oviedo"],
  "balears illes":["palma"],
  "bizkaia":["bilbao"],
  "cantabria":["santander"],
  "castellon castello":["castello de la plana","castellon de la plana"],
  "gipuzkoa":["donostia san sebastian","san sebastian"],
  "navarra":["pamplona iruna","pamplona"],
  "palmas las":["palmas de gran canaria las","las palmas de gran canaria"],
  "rioja la":["logrono"]
};
function resolveCapital(requestedProvince:string,officialProvince:string,municipalities:any[]){
  const directTargets=[norm(requestedProvince),norm(officialProvince)];
  for(const target of directTargets){
    const direct=municipalities.find(x=>norm(String(x.name??""))===target);
    if(direct)return direct;
  }
  const aliases=CAPITAL_EXCEPTIONS[norm(officialProvince)]??CAPITAL_EXCEPTIONS[norm(requestedProvince)]??[];
  for(const alias of aliases){
    const match=municipalities.find(x=>norm(String(x.name??""))===alias);
    if(match)return match;
  }
  return null;
}

Deno.serve(async(req)=>{
  try{
    if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
    if(!U||!S)return J({ok:false,error:"server_config_missing"},503);
    const raw=await req.text();
    if(!await verify(req,raw))return J({ok:false,error:"signature_invalid"},401);
    const body=JSON.parse(raw);
    if(body?.action_type!=="SEO_ZONE_ACTIVATION")return J({ok:false,error:"action_not_allowed"},400);
    if(body?.company_id!=="fenix"||body?.engine_id!=="SEO-001")return J({ok:false,error:"identity_not_allowed"},400);
    const scope=body?.scope??{};
    const province=String(scope.location??"").trim();
    const coverage=String(scope.coverage??"capital_and_province");
    const proposalHash=String(body?.proposal_hash??"");
    const requestedBy=String(body?.requested_by??"owner").slice(0,120);
    if(!province||!/^[0-9a-f]{64}$/.test(proposalHash))return J({ok:false,error:"invalid_payload"},400);

    const p=await provinceCode(province);
    let municipalities=await municipalitiesFor(province,p.code);
    const capitalMatch=resolveCapital(province,p.name,municipalities);
    if(!capitalMatch)throw new Error("capital_not_found_in_ine");
    if(coverage==="capital_only")municipalities=[capitalMatch];

    const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await svc.rpc("seo001_register_province_activation_preprod",{
      p_company_id:"FENIX_CAPITAL",
      p_engine_id:"SEO-001",
      p_environment:"PREPROD",
      p_province:p.name,
      p_capital:capitalMatch.name,
      p_coverage:coverage,
      p_proposal_hash:proposalHash,
      p_requested_by:requestedBy,
      p_municipalities:municipalities
    });
    if(error)return J({ok:false,error:"activation_rpc_failed",detail:error.message},500);
    if(!data||data?.ok!==true)return J({ok:false,error:"activation_rejected",detail:data},409);
    return J({ok:true,state:"ACTIVATION_ACCEPTED_PREPROD",province:p.name,province_code:p.code,municipality_count:municipalities.length,activation:data});
  }catch(e){
    return J({ok:false,error:"actgw_seo001_exception",detail:e instanceof Error?e.message:String(e)},500);
  }
});