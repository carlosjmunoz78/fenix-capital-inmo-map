/**
 * Read-only FACT-001 GitOps catalog bridge. Uses ONLY two fixed endpoints in
 * the existing PUBLIC GitHub repository. No tokens, writes, or deployments.
 * A repo catalog entry is never an execution permission or a running engine.
 */
const ROOT="https://raw.githubusercontent.com/carlosjmunoz78/capital-mapa-pro/cerebro-engine-factory-v0";
const REPO="https://api.github.com/repos/carlosjmunoz78/capital-mapa-pro";
const CATALOG_URL=ROOT+"/cerebro-os/registry/engine_registry.seed.json";
const DIRECTORY_URL=REPO+"/contents/cerebro-os/engines?ref=cerebro-engine-factory-v0";
const ENGINE_ID=/^[A-Z][A-Z0-9-]{1,99}$/;
const MAX_BYTES=256000;
const MAX_ITEMS=200;
const FRESH_MS=180000;
type FactoryCatalog={status:string;[key:string]:any};
let cached:{at:number;value:FactoryCatalog}|null=null;
function fail(reason:string):FactoryCatalog{
 return {status:"SOURCE_UNAVAILABLE",reason,executed:false,
   source_status:"UNVERIFIED",catalog:[],scaffolded:[],production_authorized:false};
}
async function getJson(url:string,fetcher:typeof fetch){
 const response=await fetcher(url,{method:"GET",headers:{
  accept:"application/vnd.github+json",
  "user-agent":"CEREBRO-OS-FACT-GitOps-ReadOnly-LAB"
 },signal:AbortSignal.timeout(7500),cache:"no-store",redirect:"error"});
 if(!response.ok)throw new Error("HTTP_SOURCE_REJECTED");
 const body=await response.text();
 if(body.length>MAX_BYTES)throw new Error("SOURCE_TOO_LARGE");
 return JSON.parse(body);
}
function cleanSeed(rows:any){
 if(!Array.isArray(rows)||rows.length>MAX_ITEMS)throw new Error("INVALID_CATALOG");
 const result:any[]=[];const seen=new Set<string>();
 for(const row of rows){
  if(!row||typeof row!=="object")throw new Error("INVALID_CATALOG_ROW");
  const engine_id=String(row.engine_id??"").trim().toUpperCase();
  if(!ENGINE_ID.test(engine_id)||seen.has(engine_id))throw new Error("INVALID_CATALOG_ID");
  seen.add(engine_id);
  result.push({engine_id,name:String(row.name??engine_id).slice(0,150),
   version:String(row.version??"").slice(0,40),
   environment:String(row.environment??"LAB").slice(0,32),
   declared_state:String(row.status??"UNKNOWN").slice(0,48),
   source_type:"FACT_ENGINE_SEED_NOT_RUNTIME_EVIDENCE"});
 }
 return result;
}
function cleanDirectory(rows:any){
 if(!Array.isArray(rows)||rows.length>MAX_ITEMS)throw new Error("INVALID_DIRECTORY");
 const seen=new Set<string>();
 const result:any[]=[];
 for(const row of rows){
  if(row?.type!=="dir")continue;
  const id=String(row.name??"").trim().toUpperCase();
  if(!ENGINE_ID.test(id)||seen.has(id)||
    row.path!=="cerebro-os/engines/"+row.name)throw new Error("INVALID_DIRECTORY_ITEM");
  seen.add(id);
  result.push({engine_id:id,source_type:"FACT_SCAFFOLD_DIRECTORY",
    manifest_verified:false,runtime_verified:false,execution_enabled:false});
 }
 return result;
}
export async function readFactoryGitOpsCatalog({
 actor,requestFetch=fetch,now=()=>Date.now(),useCache=true
}:{
 actor:string;requestFetch?:typeof fetch;now?:()=>number;useCache?:boolean;
}):Promise<FactoryCatalog>{
 if(actor!=="CARLOS-ADMIN")return {status:"FORBIDDEN",reason:"OWNER_ONLY",executed:false};
 const t=now();
 if(useCache&&cached&&t>=cached.at&&t-cached.at<FRESH_MS)
  return {...cached.value,source_status:"PUBLIC_GITHUB_CACHED",cached_at:new Date(cached.at).toISOString()};
 try{
  const [seed,directory]=await Promise.all([
   getJson(CATALOG_URL,requestFetch),getJson(DIRECTORY_URL,requestFetch)
  ]);
  const result:FactoryCatalog={
   status:"OK",source_status:"PUBLIC_GITHUB_LIVE",
   observed_at:new Date(t).toISOString(),
   repository:"carlosjmunoz78/capital-mapa-pro",
   branch:"cerebro-engine-factory-v0",engine_id:"FACT-001",
   catalog:cleanSeed(seed),scaffolded:cleanDirectory(directory),
   production_authorized:false,executed:false,permissions_granted:false,
   cost_additional_eur:0,
   message:"Catálogo y directorios reales de FACT-001 en GitHub. No certifica runtime ni concede permisos para ejecutar motores."
  };
  if(useCache)cached={at:t,value:result};
  return result;
 }catch{return fail("FACT_GITOPS_SOURCE_READ_FAILED")}
}
