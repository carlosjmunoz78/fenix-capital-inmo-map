/** Unified, paginated, owner-only CEREBRO AGENT DIRECTORY, PREVIEW.
 * Inventory coverage is PARTIAL, not a certification of all installed agents.
 * Immutable source files: 11 GitHub canonical roles + 35 documented social roles +
 * 29 proposed subagent templates; templates are NOT instantiated subagents.
 * No elevated privileges, mutations, runtime controls or credentials exposed.
 */
import roles from '../cerebro/registry/role-agent-registry.v1.json' with {type:'json'};
import packs from '../cerebro/registry/role-knowledge-packs.v1.json' with {type:'json'};
import facebook from '../cerebro/registry/social-facebook-agent-role-design.v1.json' with {type:'json'};
import fbComponents from '../cerebro/registry/social-facebook-financial-real-estate-components.v1.json' with {type:'json'};
import seoProfiles from '../cerebro/registry/seo001-role-templates-191.sourced.v1.json' with {type:'json'};
import {materializeRoles,registrySummary} from '../cerebro/media-studio/v2/registry/role-registry.mjs';

type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(n:number)=>Res;setHeader:(name:string,val:string)=>void;json:(body:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const head=(h:H)=>Array.isArray(h)?h[0]||'':h||'';
const fail=(res:Res,code:number,reason:string)=>res.status(code).json({status:'UNAVAILABLE',reason,executed:false});
const simple:Record<string,string>={
 'ENG-ARCHITECT':'Diseña cómo encajan los componentes de CEREBRO y evita cambios incompatibles.',
 'ENG-CODE':'Escribe y corrige código de forma segura y reversible.',
 'ENG-SYSTEMS':'Mantiene servidores, colas, procesos y trabajos fiables.',
 'ENG-MATH':'Comprueba cálculos, estadísticas y reglas de decisión.',
 'ENG-DATA':'Organiza los datos y comprueba su calidad y trazabilidad.',
 'ENG-SECURITY':'Protege permisos, claves y sistemas contra accesos y cambios indebidos.',
 'ENG-QA':'Realiza pruebas para detectar fallos antes de publicar cambios.',
 'ENG-INTEGRATOR':'Conecta motores y servicios mediante contratos comprobables.',
 'ENG-TECH-SCOUT':'Busca tecnologías útiles y comprueba su coste y aplicabilidad.',
 'ENG-PERFORMANCE':'Mejora la velocidad y el coste a partir de métricas.',
 'AGT-SALES-EXECUTIVE':'Organiza oportunidades comerciales y prepara respuestas sujetas a aprobación.'
};
const packMap=new Map(packs.packs.map(p=>[p.role_id,p]));
export type AgentDirectoryEntry={
 id:string;name:string;kind:'AGENT_ROLE'|'SUBAGENT_ROLE'|'SUBAGENT_TEMPLATE';family:string;
 state:string;source:string;purpose_plain:string;purpose_technical:string;
 engine_ids:string[];parent_id:string|null;hierarchy_verified:boolean;runtime_verified:boolean;
 company_scope:string;source_url:string;
};
export function buildCerebroAgentDirectoryV0():AgentDirectoryEntry[]{
 if(roles.registry_id!=='CEREBRO_ROLE_AGENT_REGISTRY_V1'||!Array.isArray(roles.roles)||
  !Array.isArray(packs.packs)||!Array.isArray(facebook.roles)||!Array.isArray(facebook.subagent_templates)||
  facebook.registry_id!=='CEREBRO_SOCIAL_FACEBOOK_AGENT_ROLE_DESIGN_V1')throw Error('REGISTRY_SOURCE_CONTRACT_INVALID');
 const engineers:AgentDirectoryEntry[]=roles.roles.map(r=>({
  id:r.role_id,name:r.name,kind:'AGENT_ROLE',family:r.department==='ENGINEERING'?'ENGINEERING':'REVENUE_SALES',
  state:r.state,source:'GITHUB_CANONICAL_ROLE_REGISTRY',purpose_plain:simple[r.role_id]||'Función pendiente de descripción verificada.',
  purpose_technical:packMap.get(r.role_id)?.mission||'Misión técnica pendiente de verificar.',
  engine_ids:[...r.engines],parent_id:r.reports_to,hierarchy_verified:r.reports_to_state!=='UNRESOLVED',
  runtime_verified:false,company_scope:r.company_scope,
  source_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/universal-control-plane-lab-v0-20261113/cerebro/registry/role-agent-registry.v1.json'
 }));
 const fblist=fbComponents.components;
 if(fbComponents.registry_id!=='CEREBRO_FB_FINANCIAL_REAL_ESTATE_COMPONENTS_SOURCED_V1'||
  fbComponents.source_commit_sha!=='07b40c571e3d58879fdda56b833417cc5c7aed9c'||
  fblist.length!==569||fblist.filter(r=>r.component_kind==='AGENT_ROLE').length!==42||
  fblist.filter(r=>r.component_kind==='SUBAGENT_ROLE').length!==527)
  throw Error('FB_SOURCE_COMPONENTS_REGISTRY_DRIFT');
 const fbParents=new Map(fblist.filter(x=>x.component_kind==='AGENT_ROLE').map(x=>[x.id,x.name]));
 const fbPurpose=new Map(facebook.roles.map(r=>[r.id,r.plain_purpose]));
 const fb:AgentDirectoryEntry[]=fblist.map(r=>{
  const child=r.component_kind==='SUBAGENT_ROLE';
  const parent=r.parent_id?fbParents.get(r.parent_id):null;
  if(child&&(!r.parent_id||!parent))throw Error('FB_PARENT_CHILD_CONTRACT_BROKEN');
  return {
   id:r.id,name:r.name,kind:child?'SUBAGENT_ROLE':'AGENT_ROLE',family:'SOCIAL_FACEBOOK',
   state:'SCAFFOLDED_PREPROD_ADDITIVE_RUNTIME_NOT_VERIFIED',
   source:'FACEBOOK_FAMILY_SOURCE_PINNED_SHA',
   purpose_plain:child?
    'Ayuda al agente '+parent+' con tareas de '+r.name+'. Su ejecución autónoma todavía no está verificada.':
    fbPurpose.get(r.id)||'Coordina la especialidad '+r.name+' de la familia Facebook.',
   purpose_technical:'SOC-001 / FACEBOOK FINANCIAL REAL ESTATE / '+r.id+
     (r.parent_id?' / parent '+r.parent_id:''),
   engine_ids:[], // SOC-001 is a source-associated engine, absent from historical 179; no false link
   parent_id:r.parent_id||null,hierarchy_verified:child,runtime_verified:false,
   company_scope:'GLOBAL_OR_SCOPED',
   source_url:'https://github.com/carlosjmunoz78/fenix-capital-cerebro-social/blob/'+
    fbComponents.source_commit_sha+'/families/facebook/financial-real-estate/roles.v1.json'
  };
 });
 const templates:AgentDirectoryEntry[]=facebook.subagent_templates.map(r=>({
  id:r.family_template_id,name:r.name,kind:'SUBAGENT_TEMPLATE',family:'SOCIAL_FACEBOOK',
  state:'TEMPLATE_CONCEPT_NOT_AGENT_INSTANCE',source:'NOTION_SOCIAL_ARCHITECTURE_SNAPSHOT',
  purpose_plain:'Especialidad prevista de subagentes para '+r.name+'. No hay instancia ni ejecución acreditadas.',
  purpose_technical:'Subagent family template: '+r.name,engine_ids:[],parent_id:null,
  hierarchy_verified:false,runtime_verified:false,company_scope:'GLOBAL_OR_SCOPED',
  source_url:facebook.source_url
 }));

 type MediaRole={id:string;name:string;role_kind:string;parent_id?:string|null};
 const summary=registrySummary();
 const mediaRoles=materializeRoles() as MediaRole[];
 if(summary.total_roles!==529||summary.departments!==48||summary.specialists!==384||
    summary.supervisors!==32||summary.judges!==48||summary.guardians!==16||
    mediaRoles.length!==529)throw Error('UMS_ROLE_SOURCE_COUNT_DRIFT');
 const names=new Map(mediaRoles.map(r=>[r.id,r.name]));
 if(names.size!==mediaRoles.length)throw Error('UMS_ROLE_SOURCE_ID_COLLISION');
 const media:AgentDirectoryEntry[]=mediaRoles.map(r=>{
  const child=r.role_kind==='SPECIALIST';
  const parentId=typeof r.parent_id==='string'?r.parent_id:null;
  const parentName=parentId?(names.get(parentId)||parentId):'Dirección de la productora';
  const purpose=child?'Realiza tareas especializadas de '+r.name+' para '+parentName+' en la productora audiovisual.':
   r.role_kind==='DEPARTMENT_HEAD'?'Dirige el departamento '+r.name+' y coordina sus especialistas.':
   r.role_kind==='STUDIO_BRAIN'?'Coordina departamentos, producción, decisiones y controles de la productora audiovisual.':
   r.role_kind==='SUPERVISOR'?'Supervisa de forma independiente la calidad audiovisual en '+r.name+'.':
   r.role_kind==='JUDGE'?'Revisa las evidencias y participa en las decisiones del tribunal '+parentName+'.':
   'Controla políticas, derechos, seguridad o permisos relacionados con '+r.name+'.';
  return {
   id:'UMS:'+r.id,name:r.name,kind:child?'SUBAGENT_ROLE':'AGENT_ROLE',family:'MEDIA_STUDIO',
   state:'REGISTERED_LOGICAL_ROLE_RUNTIME_NOT_VERIFIED',
   source:'UMS001_ROLE_REGISTRY_V2',purpose_plain:purpose,
   purpose_technical:'UMS-001 / '+r.role_kind+' / '+r.name+(parentId?' / parent='+parentId:''),
   engine_ids:[], // UMS-001 is NOT in the 179 historical engine IDs; do not invent a catalog link
   parent_id:parentId?'UMS:'+parentId:null,hierarchy_verified:parentId!==null,
   runtime_verified:false,company_scope:'GLOBAL_MULTI_COMPANY',
   source_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/universal-control-plane-lab-v0-20261113/cerebro/media-studio/v2/registry/role-registry.mjs'
  };
 });

 const seoSource=seoProfiles.entries;
 if(seoProfiles.registry_id!=='SEO001_191_ROLE_TEMPLATES_SOURCED_V1'||
  seoProfiles.engine_id!=='SEO-001'||seoProfiles.company_id!=='fenix'||
  seoProfiles.source_head_sha!=='b4bbe8a4043f45821d0825e3aab846370c4530f8'||
  seoSource.length!==191||seoSource.filter(x=>x.kind==='SUBAGENT_ROLE').length!==141)
  throw Error('SEO001_SOURCE_ROSTER_DRIFT');
 const seoIds=new Set(seoSource.map(x=>x.id));
 if(seoIds.size!==191||seoSource.some(x=>x.parent_id&&!seoIds.has(x.parent_id)))
  throw Error('SEO001_PARENT_CONTRACT_BROKEN');
 const seo:AgentDirectoryEntry[]=seoSource.map(r=>({
  id:r.id,name:r.name,kind:r.kind,family:'SEO_ENTERPRISE',
  state:r.status,source:'SEO001_SOURCE_PINNED_SHA',
  purpose_plain:r.purpose_plain,
  purpose_technical:'SEO-001 / '+r.family_id+(r.department_id?' / '+r.department_id:'')+' / '+r.id,
  engine_ids:['SEO-001'], // source: roster engine_id SEO-001; does NOT imply runtime certified
  parent_id:r.parent_id,hierarchy_verified:r.parent_id!==null,
  runtime_verified:false,company_scope:'fenix',
  source_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/'+
   seoProfiles.source_head_sha+'/cerebro/seo-enterprise/v2/seo-specialist-role-roster-v2.json'
 }));

 const all=[...engineers,...fb,...media,...seo,...templates],keys=new Set(all.map(x=>x.kind+':'+x.id));
 if(keys.size!==all.length||all.some(x=>!x.id||!x.name||!x.purpose_plain||!x.source_url||
   !Array.isArray(x.engine_ids)||x.engine_ids.some(y=>!/^[A-Z0-9-]+$/.test(y))))
  throw Error('DIRECTORY_DUPLICATE_OR_INCOMPLETE');
 return all;
}
export function validateCerebroAgentDirectoryQueryV0(q:URLSearchParams){
 const valid=new Set(['company_id','offset','limit','kind','family','q']);
 if([...q.keys()].some(k=>!valid.has(k)||q.getAll(k).length!==1)||q.get('company_id')!=='fenix')
  throw Error('INVALID_QUERY_OR_SCOPE');
 const pInt=(v:string|null,def:number,max:number)=>{
  if(v===null)return def;
  if(!/^(0|[1-9][0-9]*)$/.test(v))throw Error('INVALID_PAGINATION');
  const n=Number(v);if(!Number.isSafeInteger(n)||n>max)throw Error('INVALID_PAGINATION');return n;
 };
 const offset=pInt(q.get('offset'),0,10000000),limit=pInt(q.get('limit'),30,100);
 if(limit<1)throw Error('INVALID_PAGINATION');
 const kind=q.get('kind')||'AGENT_ROLE';
 if(!['AGENT_ROLE','SUBAGENT_ROLE','SUBAGENT_TEMPLATE','ALL'].includes(kind))throw Error('INVALID_KIND');
 const family=q.get('family')||'ALL';
 if(!['ALL','ENGINEERING','REVENUE_SALES','SOCIAL_FACEBOOK','MEDIA_STUDIO','SEO_ENTERPRISE'].includes(family))throw Error('INVALID_FAMILY');
 const term=(q.get('q')||'').normalize('NFKC').trim().toLocaleLowerCase('es-ES');
 if(term.length>100||/[\u0000-\u001F]/.test(term))throw Error('INVALID_SEARCH');
 return {offset,limit,kind,family,term};
}
export function queryCerebroAgentDirectoryV0(q:URLSearchParams){
 const {offset,limit,kind,family,term}=validateCerebroAgentDirectoryQueryV0(q);
 const all=buildCerebroAgentDirectoryV0();
 const records=all.filter(r=>(kind==='ALL'||r.kind===kind)&&(family==='ALL'||r.family===family)&&
  (!term||[r.id,r.name,r.family,r.purpose_plain,r.purpose_technical,...r.engine_ids].join(' ').toLocaleLowerCase('es-ES').includes(term)));
 return {
  status:'OK' as const,company_id:'fenix' as const,
  coverage:'PARTIAL_SOURCED_INVENTORY_NOT_ALL_AGENTS' as const,
  transport:'PREVIEW_ONLY_SERVER_VERIFIED' as const,read_only:true as const,executed:false as const,
  active_agents_verified:false as const,subagent_instances_verified:false as const,
  counts:{known_agent_roles:all.filter(r=>r.kind==='AGENT_ROLE').length,
   registered_logical_subagent_roles:all.filter(r=>r.kind==='SUBAGENT_ROLE').length,
   media_studio_source_roles:all.filter(r=>r.family==='MEDIA_STUDIO').length,
   facebook_source_components:all.filter(r=>r.family==='SOCIAL_FACEBOOK'&&r.kind!=='SUBAGENT_TEMPLATE').length,
   seo_source_profiles:all.filter(r=>r.family==='SEO_ENTERPRISE').length,
   subagent_templates_not_instances:all.filter(r=>r.kind==='SUBAGENT_TEMPLATE').length,
   total_runtime_instances:null,unindexed_sources_possible:true},
  sources:['GITHUB_CANONICAL_ROLE_REGISTRY','FACEBOOK_FAMILY_SOURCE_PINNED_SHA','NOTION_SOCIAL_ARCHITECTURE_SNAPSHOT','UMS001_ROLE_REGISTRY_V2','SEO001_SOURCE_PINNED_SHA'],
  page:{offset,limit,total:records.length,next_offset:offset+limit<records.length?offset+limit:null},
  records:records.slice(offset,offset+limit)
 };
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 const host=head(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return fail(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return fail(res,405,'READ_ONLY');
 const origin=head(req.headers.origin);
 if(origin&&origin!=='https://'+host)return fail(res,403,'ORIGIN_DENIED');
 let query:URLSearchParams;
 try{query=new URL(req.url||'/','https://'+host).searchParams}catch{return fail(res,400,'INVALID_URL')}
 try{validateCerebroAgentDirectoryQueryV0(query)}catch{return fail(res,400,'INVALID_QUERY_OR_SCOPE')}
 const bearer=head(req.headers.authorization),apikey=head(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return fail(res,401,'OWNER_SESSION_REQUIRED');
 try{
  const response=await fetch(OWNER,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return fail(res,403,'OWNER_NOT_VERIFIED');
  const body=await response.json();
  const ctx=body?.context&&typeof body.context==='object'?body.context:body;
  if(body?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')return fail(res,403,'OWNER_NOT_VERIFIED');
 }catch{return fail(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{return res.status(200).json(queryCerebroAgentDirectoryV0(query))}
 catch{return fail(res,503,'REGISTRY_SOURCE_INVALID')}
}
