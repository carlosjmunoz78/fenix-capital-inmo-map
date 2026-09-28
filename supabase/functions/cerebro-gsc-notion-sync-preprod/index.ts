import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",N=Deno.env.get("NOTION_TOKEN")??"";
const NV="2025-09-03";
const INVENTORY_DS="71c5ac0c-ea87-4cfe-8e9f-c68728240a06";
const SECRET_SHA256="b37356f93f1631da023ffdd901e3d1c6aca007750e5e0eae884a4a05da64a834";

function J(d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-fenix-env":"PREPROD"}})}
async function sha256Hex(v:string){const d=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));return [...d].map(b=>b.toString(16).padStart(2,"0")).join("")}
function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}
function pemToDer(pem:string){const clean=pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");const raw=atob(clean),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes.buffer}
async function token(sa:any){const now=Math.floor(Date.now()/1000),h=b64url(JSON.stringify({alg:"RS256",typ:"JWT"})),p=b64url(JSON.stringify({iss:sa.client_email,scope:"https://www.googleapis.com/auth/webmasters.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})),input=`${h}.${p}`;const key=await crypto.subtle.importKey("pkcs8",pemToDer(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(input)));const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${input}.${b64url(sig)}`})});const b=await r.json().catch(()=>({}));if(!r.ok||!b.access_token)throw new Error(`google_token_${r.status}_${b?.error??"error"}`);return b.access_token}
async function notion(path:string,init:RequestInit){const r=await fetch("https://api.notion.com/v1"+path,{...init,headers:{Authorization:`Bearer ${N}`,"Notion-Version":NV,"Content-Type":"application/json",...((init.headers??{}) as Record<string,string>)}});const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(`notion_${r.status}_${b?.code??"error"}`);return b}
Deno.serve(async req=>{try{
 if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
 const presented=req.headers.get("x-fenix-cron-secret")??""; const bearer=req.headers.get("authorization")??""; const cronOk=!!presented&&await sha256Hex(presented)===SECRET_SHA256; const serviceOk=!!S&&bearer===`Bearer ${S}`; if(!cronOk&&!serviceOk)return J({ok:false,error:"unauthorized"},401);
 if(!U||!S||!N)return J({ok:false,error:"config_missing"},503);
 const body=await req.json().catch(()=>({}));const dryRun=body?.dry_run!==false;
 const requestedStart=String(body?.start_date??"").trim(),requestedEnd=String(body?.end_date??"").trim();
 if((requestedStart&&!/^\d{4}-\d{2}-\d{2}$/.test(requestedStart))||(requestedEnd&&!/^\d{4}-\d{2}-\d{2}$/.test(requestedEnd)))return J({ok:false,error:"invalid_date"},400);
 const db=createClient(U,S,{auth:{persistSession:false}});
 const {data:cfg,error}=await db.rpc("preprod_get_seo_google_config");if(error)return J({ok:false,stage:"config",error:error.message},500);
 const raw=cfg?.google_service_account_json,site=cfg?.gsc_site_url;if(!raw||!site)return J({ok:false,stage:"config",error:"missing_google_config"},500);
 const sa=JSON.parse(raw),access=await token(sa);
 const end=new Date();end.setUTCDate(end.getUTCDate()-1);const start=new Date(end);start.setUTCDate(start.getUTCDate()-29);const iso=(d:Date)=>d.toISOString().slice(0,10);
 const startDate=requestedStart||iso(start),endDate=requestedEnd||iso(end);
 const g=await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,{method:"POST",headers:{Authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify({startDate,endDate,dimensions:["page"],rowLimit:25000,dataState:"final"})});
 const gb=await g.json().catch(()=>({}));if(!g.ok)return J({ok:false,stage:"gsc",status:g.status,error:gb?.error?.message??"gsc_error",service_account_email:sa.client_email,site},200);
 const inventory:any[]=[];let cursor:string|undefined=undefined;
 do{
   const q:any=await notion(`/data_sources/${INVENTORY_DS}/query`,{method:"POST",body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})})});
   inventory.push(...(q?.results??[]));cursor=q?.has_more?q?.next_cursor:undefined;
 }while(cursor);
 const byUrl=new Map<string,any>();
 for(const page of inventory){const u=String(page?.properties?.["URL"]?.url??"");if(u)byUrl.set(u,page);}
 let matched=0,unmatched=0,changed=0;const samples:any[]=[];
 for(const row of gb.rows??[]){
   const url=String(row?.keys?.[0]??"");if(!url)continue;
   const page=byUrl.get(url);if(!page){unmatched++;if(samples.length<10)samples.push({url,state:"UNMATCHED"});continue;}
   matched++;
   const p=page.properties??{};
   const current={clicks:p["Clics GSC"]?.number??null,impressions:p["Impresiones GSC"]?.number??null,ctr:p["CTR GSC"]?.number??null,position:p["Posición media"]?.number??null};
   const next={clicks:Number(row.clicks??0),impressions:Number(row.impressions??0),ctr:Number(row.ctr??0),position:Number(row.position??0)};
   const differs=current.clicks!==next.clicks||current.impressions!==next.impressions||current.ctr!==next.ctr||current.position!==next.position;
   if(differs)changed++;
   if(!dryRun&&differs){
     await notion(`/pages/${page.id}`,{method:"PATCH",body:JSON.stringify({properties:{
       "Clics GSC":{number:next.clicks},"Impresiones GSC":{number:next.impressions},"CTR GSC":{number:next.ctr},"Posición media":{number:next.position},"Fecha última captura":{date:{start:new Date().toISOString()}}
     }})});
   }
   if(samples.length<10)samples.push({url,state:differs?"DIFF":"SAME",current,next});
 }
 return J({ok:true,state:dryRun?"DRY_RUN":"APPLIED",company_id:"FENIX_CAPITAL",engine_id:"SEO-001",environment:"PREPROD",version:"v0",window:{start:startDate,end:endDate},gsc_rows:(gb.rows??[]).length,inventory_rows:inventory.length,matched,unmatched,changed,samples});
}catch(e){return J({ok:false,stage:"exception",error:e instanceof Error?e.message:String(e)},500)}});