/**
 * Read-only bridge to EXISTING Supabase Company Registry, JARVIS project overlay,
 * and Company Engine State. No migrations, mutations, or access delegation.
 * Actor permissions MUST be validated by the Gateway; additional company
 * memberships remain unverified and are denied by default.
 */
import { listOwnerRegisteredScopes } from "./owner_scope_registry.ts";

const ID=/^[a-z0-9][a-z0-9_-]{0,79}$/;
const PAGE=101; // detect truncation at 100 without unbounded listing
const COMPANY_SOURCES=[
  {name:"companies",table:"cerebro_company_registry_preprod",
   columns:"company_id,environment,version,state,prod_authorized,prod_write_authorized"},
  {name:"projects",table:"jarvis_project_overlay_v1",
   columns:"company_id,project_id,environment,status"},
  {name:"engines",table:"cerebro_company_engine_state_preprod",
   columns:"company_id,engine_id,environment,version,state,prod_authorized"}
];
function cleanId(x:unknown){
 const id=typeof x==="string"?x.trim().toLowerCase():"";
 return ID.test(id)?id:null;
}
function refused(status:string,reason:string){
 return {status,reason,executed:false,access_granted:false,
  companies:[],projects:[],engines:[],source_status:"UNVERIFIED"};
}
function safeEngine(x:any,company_id:string){
 if(!x||String(x.company_id??"").toLowerCase()!==company_id)return null;
 const engine_id=String(x.engine_id??"").trim();
 if(!/^[A-Za-z0-9-]{2,100}$/.test(engine_id))return null;
 return {company_id,engine_id,environment:String(x.environment??"PREPROD").slice(0,24),
  version:String(x.version??"").slice(0,40),
  engine_state:String(x.state??"UNKNOWN").slice(0,48),
  access_status:"ENGINE_STATE_RECORD_NOT_RUNTIME_VERIFIED",
  prod_authorized:false}; // PREPROD metadata does not confer runtime permissions
}
/**
 * In V0, only the Fénix company linked to CARLOS-ADMIN in the existing
 * actor-context RPC is authorized. Later company memberships must come from
 * a verified server-side identity/registry resolution, never a query parameter.
 */
export async function readOwnerRegistryLive({
 actor,serviceClient,requestedCompany="all",requestedProject=null,
 verifiedCompanyIds=["fenix"],now=()=>new Date().toISOString()
}:{
 actor:string;serviceClient:any;requestedCompany?:string|null;
 requestedProject?:string|null;verifiedCompanyIds?:string[];
 now?:()=>string;
}){
 if(actor!=="CARLOS-ADMIN")return refused("FORBIDDEN","OWNER_ONLY");
 if(!serviceClient||!Array.isArray(verifiedCompanyIds))return refused("SOURCE_UNAVAILABLE","SERVER_CONFIGURATION_MISSING");
 const ids=[...new Set(verifiedCompanyIds.map(cleanId).filter((id):id is string=>Boolean(id)))];
 if(!ids.length||ids.length>16)return refused("SOURCE_UNAVAILABLE","VERIFIED_COMPANY_SCOPE_REQUIRED");
 const requested=String(requestedCompany??"all").trim().toLowerCase();
 if(requested&&!["all","todas"].includes(requested)&&!ids.includes(requested))
  return refused("NOT_CONNECTED","COMPANY_NOT_IN_AUTHORIZED_OWNER_CONTEXT");
 const effectiveIds=requested&&!["all","todas"].includes(requested)?[requested]:ids;
 const companies:any[]=[];
 const projects:any[]=[];
 const engines:any[]=[];
 const source_counts:Record<string,number>={};
 const truncated:string[]=[];
 try{
  for(const company_id of effectiveIds){
   for(const source of COMPANY_SOURCES){
    // Service role is server-only; limit query by authoritative company_id.
    const {data,error}=await serviceClient.from(source.table).select(source.columns)
      .eq("company_id",company_id).limit(PAGE);
    if(error||!Array.isArray(data))return refused("SOURCE_UNAVAILABLE","REGISTRY_READ_FAILED_"+source.name.toUpperCase());
    source_counts[source.name]=(source_counts[source.name]??0)+data.length;
    if(data.length>=PAGE)truncated.push(source.name+":"+company_id);
    const rows=data.slice(0,PAGE-1);
    if(source.name==="companies")companies.push(...rows);
    if(source.name==="projects")projects.push(...rows);
    if(source.name==="engines")engines.push(...rows);
   }
   if(!companies.some(x=>String(x.company_id??"").toLowerCase()===company_id)){
    // Validated owner context is REAL, but it is NOT a registered PREPROD row.
    companies.push({company_id,environment:"PROD",state:"AUTHENTICATED_OWNER_CONTEXT",
      prod_authorized:false,prod_write_authorized:false,__verified_owner_context:true});
   }
  }
  const selected=listOwnerRegisteredScopes({actor,serverSourceVerified:true,
   companyRecords:companies,projectRecords:projects,
   requestedCompany:requested,requestedProject});
  if(selected.status!=="OK")return {...selected,engines:[],
   source_status:"LIVE_SERVER_READ",source_tables:COMPANY_SOURCES.map(x=>x.table)};
  return {...selected,version:"OWNER_REGISTRY_LIVE_LAB_V0",observed_at:now(),
   engines:engines.map(x=>safeEngine(x,String(x?.company_id??"").toLowerCase())).filter(Boolean),
   source_status:"LIVE_SERVER_READ",
   source_tables:COMPANY_SOURCES.map(x=>x.table),
   counts:source_counts,truncated,
   factory:{engine_id:"FACT-001",repository:"carlosjmunoz78/capital-mapa-pro",
    branch:"cerebro-engine-factory-v0",integration_status:"GITOPS_ADAPTER_NOT_YET_CONNECTED"},
   prod_execution_enabled:false,live_writes:false,
   message:"Lectura real de registros existentes. Los proyectos y motores no conectados a ejecución se señalan; ningún dato concede permiso o ejecuta operaciones."};
 }catch{return refused("SOURCE_UNAVAILABLE","REGISTRY_READ_EXCEPTION")}
}
