import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";

const U=Deno.env.get("SUPABASE_URL")??"";
const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const N=Deno.env.get("NOTION_TOKEN")??"";
const NV="2025-09-03";
const SOCIAL_SCHEDULE_DATA_SOURCE_ID="a03dd9dc-fd5e-4492-a084-c9a03b698884";
const SOCIAL_LIVE_ENDPOINT="https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-social-schedule-read-preprod";
const SIGNING_CONTEXT="CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1";
const SIGNING_KEY_ID="cerebro-actgw-prod-v1";
const FINANCE_PREANALYSIS_PAGE_ID="310505c4-12df-47e9-a3fb-f1e07a7baf3f";
const SEO_LATEST_AUDIT_PAGE_ID="3e981b1a-756d-81b3-9259-eee14327239d";
const MARKETING_MASTER_PAGE_ID="3b481b1a-756d-81ce-bdd3-d28125e964c7";
const SOCIAL_ORGANIC_PAGE_ID="3bf81b1a-756d-8183-ad00-d546747ec1c5";
const BREVO_CANONICAL_PAGE_ID="3bf81b1a-756d-8143-a078-f8bced73b8f5";
const OWNER_DECISION_PAGE_ID="3eb81b1a-756d-8153-a1ef-f4c13e75519c";
const DECISION_CENTER_PAGE_ID="3ba81b1a-756d-8118-8a48-eebf163b9f1c";
const CEREBRO_AUDIT_PAGE_ID="3e681b1a-756d-8104-9733-fefac3619902";
const FINOPS_PAGE_ID="3e781b1a-756d-8156-9840-fe833e6accc7";
const TRADING_ISOLATION_PAGE_ID="3d081b1a-756d-81f6-83d1-f9c676f90050";
const REGISTRY_AUDIT_PAGE_ID="3e781b1a-756d-8117-abb1-d5df7145428d";
const LEGAL_QUALITY_PAGE_ID="3bf81b1a-756d-81e6-b4d5-eaeb99a8152e";
const BELEN_MASTER_PAGE_ID="3be81b1a-756d-81b6-a75f-cb6bbe842766";
const INHERITANCE_MASTER_PAGE_ID="3c781b1a-756d-8178-8950-e2c6b740df68";
const NH={Authorization:`Bearer ${N}`,"Notion-Version":NV,"Content-Type":"application/json"};

const CANONICAL_PAGES=[
  {id:"3be81b1a-756d-81da-ad05-d6ab37855c2f",title:"Base estratégica CEREBRO"},
  {id:"3ba81b1a-756d-8118-8a48-eebf163b9f1c",title:"Centro de decisión CEREBRO"},
  {id:"3eb81b1a-756d-8153-a1ef-f4c13e75519c",title:"Owner Decision by Exception V1"}
];

const DOMAIN_CANONICAL:Record<string,{id:string,title:string}[]>={
  finance:[
    {id:FINANCE_PREANALYSIS_PAGE_ID,title:"Formulario de preanálisis hipotecario"},
    {id:"3ba81b1a-756d-817f-9d61-e54e7f270e16",title:"Conocimiento financiero canónico · Fénix Uno"},
    {id:"3be81b1a-756d-81b6-a75f-cb6bbe842766",title:"Base Maestra Belén · Motor financiero CEREBRO"}
  ],
  marketing:[
    {id:MARKETING_MASTER_PAGE_ID,title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"}
  ],
  social:[
    {id:SOCIAL_ORGANIC_PAGE_ID,title:"Redes sociales orgánicas"},
    {id:MARKETING_MASTER_PAGE_ID,title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"}
  ],
  newsletter:[
    {id:BREVO_CANONICAL_PAGE_ID,title:"Brevo · configuración canónica Fénix Capital · PRE-PROD"},
    {id:CEREBRO_AUDIT_PAGE_ID,title:"AUDITORÍA VIVA · CEREBRO OS"}
  ],
  autonomy:[
    {id:DECISION_CENTER_PAGE_ID,title:"Centro de decisión CEREBRO"},
    {id:OWNER_DECISION_PAGE_ID,title:"Owner Decision by Exception V1"}
  ],
  platform:[
    {id:CEREBRO_AUDIT_PAGE_ID,title:"AUDITORÍA VIVA · CEREBRO OS"},
    {id:FINOPS_PAGE_ID,title:"FINOPS-001 · Costes, velocidad, GitHub y cron"}
  ],
  trading:[
    {id:TRADING_ISOLATION_PAGE_ID,title:"P1 · Perímetro técnico aislado · Trading Lab"},
    {id:REGISTRY_AUDIT_PAGE_ID,title:"REGISTRY-AUDIT · Estado de motores y funcionalidades"}
  ],
  multiempresa:[
    {id:"3e981b1a-756d-8100-9198-c75858d5371c",title:"Company Registry · CEREBRO · Fénix Capital"},
    {id:"3be81b1a-756d-81da-ad05-d6ab37855c2f",title:"Base estratégica CEREBRO"}
  ],
  seo:[
    {id:SEO_LATEST_AUDIT_PAGE_ID,title:"Auditoría SEO/Web semanal · Fénix Capital · 28/09/2026"},
    {id:MARKETING_MASTER_PAGE_ID,title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"}
  ],
  legal:[
    {id:LEGAL_QUALITY_PAGE_ID,title:"Fiscal y legal sensible · Contrato de calidad PRE-PROD"},
    {id:BELEN_MASTER_PAGE_ID,title:"Base Maestra Belén · Motor financiero CEREBRO"},
    {id:INHERITANCE_MASTER_PAGE_ID,title:"APP Fénix · Herencias · Ficha maestra guiada por Ana · Especificación PRE-PROD"}
  ]
};

function detectKnowledgeDomain(question:string){
  const q=norm(question);
  if(/\b(?:legal(?:es)?|juridic[oa]s?|arras|compraventa|cargas? registrales?|registro de la propiedad|notari[oa]s?|notariales?|herencias?|donaciones?|itp|plusvalia|catastro|embargos?|titularidad|urbanismo|blanqueo|aml)\b/.test(q))return "legal";
  if(/hipoteca|banco|financi|tin|tae|cuota|fein|tasacion|ingresos|endeudamiento/.test(q))return "finance";
  if(/newsletter|brevo|campana de email|campaña de email|email marketing/.test(q))return "newsletter";
  if(/redes sociales|facebook|instagram|linkedin|tiktok|youtube|buffer|publicacion social|publicación social/.test(q))return "social";
  if(/autonomia|autonomía|confirmacion humana|confirmación humana|human_required|intervencion humana|intervención humana/.test(q))return "autonomy";
  if(/supabase|core transaccional|runtime|worker compartido|jobs largos|ocr|logs pesados/.test(q))return "platform";
  if(/trading|trading lab|alpaca|paper trading/.test(q))return "trading";
  if(/marketing|contenido|embudo|campana|campaña|crecimiento organico|crecimiento orgánico/.test(q))return "marketing";
  if(/multiempresa|nueva empresa|company|registry|motor|engine/.test(q))return "multiempresa";
  if(/seo|keyword|palabra clave|gsc|search console|landing|indexacion|indexación|canonical/.test(q))return "seo";
  return null;
}

const STOP=new Set([
  "que","qué","como","cómo","cual","cuál","cuales","cuáles","dime","sabes","saber","sobre","del","de","la","el","los","las",
  "un","una","unos","unas","y","o","en","para","por","con","sin","a","al","se","es","son","esta","este","esto","hay","tiene",
  "tienen","cerebro","fenix","fénix","me","mi","quiero","puedes","puede","podria","podría"
]);

function norm(v:string){
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function tokens(v:string){
  return [...new Set(norm(v).replace(/[^a-z0-9ñáéíóúü ]/g," ").split(/\s+/).filter(x=>x.length>=3&&!STOP.has(x)))].slice(0,8);
}

function richText(block:any){
  const arrays=[block?.paragraph?.rich_text,block?.heading_1?.rich_text,block?.heading_2?.rich_text,block?.heading_3?.rich_text,
    block?.bulleted_list_item?.rich_text,block?.numbered_list_item?.rich_text,block?.to_do?.rich_text,block?.quote?.rich_text,
    block?.callout?.rich_text,block?.toggle?.rich_text,block?.code?.rich_text,block?.bookmark?.caption,block?.image?.caption,
    block?.file?.caption,block?.pdf?.caption,block?.video?.caption];
  for(const arr of arrays){
    if(Array.isArray(arr)){
      const s=arr.map((x:any)=>String(x?.plain_text??"")).join("").trim();
      if(s)return s;
    }
  }
  if(block?.child_page?.title)return String(block.child_page.title);
  if(block?.child_database?.title)return String(block.child_database.title);
  return "";
}

function titleOf(page:any){
  const props=page?.properties??{};
  for(const value of Object.values(props) as any[]){
    if(value?.type==="title"&&Array.isArray(value.title)){
      const s=value.title.map((x:any)=>String(x?.plain_text??"")).join("").trim();
      if(s)return s;
    }
  }
  return "Página CEREBRO";
}
export type CerebroReadContext={
  kind:"social_schedule";
  network:string;
  content_key?:string;
  external_post_id?:string|null;
  scheduled_at?:string;
  public_media_url?:string|null;
  media_urls?:string[];
  caption?:string;
};

function notionPropertyText(value:any):string{
  if(!value||typeof value!=="object")return "";
  if(value.type==="title"&&Array.isArray(value.title))return value.title.map((x:any)=>String(x?.plain_text??"")).join("").trim();
  if(value.type==="rich_text"&&Array.isArray(value.rich_text))return value.rich_text.map((x:any)=>String(x?.plain_text??"")).join("").trim();
  if(value.type==="select")return String(value.select?.name??"").trim();
  if(value.type==="status")return String(value.status?.name??"").trim();
  if(value.type==="formula"){
    const f=value.formula;
    if(f?.type==="string")return String(f.string??"").trim();
    if(f?.type==="number")return String(f.number??"").trim();
    if(f?.type==="boolean")return String(f.boolean??"").trim();
  }
  if(value.type==="rollup"){
    const r=value.rollup;
    if(r?.type==="array"&&Array.isArray(r.array))return r.array.map(notionPropertyText).filter(Boolean).join(", ");
    if(r?.type==="number")return String(r.number??"").trim();
  }
  return "";
}

function detectSocialScheduleQuery(question:string,context?:CerebroReadContext|null){
  const q=norm(question);
  const networks=["facebook","instagram","linkedin","tiktok","youtube"];
  const explicit=networks.find(n=>new RegExp("\\b"+n+"\\b").test(q))||(/(^|[^a-z0-9])x([^a-z0-9]|$)/.test(q)?"x":undefined);
  // Context inheritance must only happen for a genuine social follow-up.
  // Word boundaries prevent unrelated words such as "estudiar" from matching "dia".
  const scheduleIntent=/\b(proxima|siguiente|cuando|sale|publicacion|post|programada|programado|dia|hora|texto|copy|contenido|caption|imagen|foto|creativo|media|completa|completo)\b|que pone|ensename la imagen|enséñame la imagen/.test(q);
  const followup=Boolean(context?.kind==="social_schedule"&&(/\b(dia|hora|cuando|texto|copy|contenido|caption|imagen|foto|creativo|media)\b|que dia|a que hora|y hora|que pone|ensename la imagen|enséñame la imagen/.test(q)));
  const network=explicit||(followup?norm(context?.network??""):null);
  return scheduleIntent&&network?network:null;
}

function displayNetwork(value:string){
  const key=norm(value);
  if(key==="facebook")return "Facebook";
  if(key==="instagram")return "Instagram";
  if(key==="linkedin")return "LinkedIn";
  if(key==="tiktok")return "TikTok";
  if(key==="youtube")return "YouTube";
  if(key==="x")return "X";
  return value;
}

function formatMadridDateTime(iso:string){
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return iso;
  const parts=new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??"";
  return get("weekday")+" "+get("day")+"/"+get("month")+"/"+get("year")+" a las "+get("hour")+":"+get("minute");
}

async function sha256Bytes(value:string){
  return new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
}
function bytesToB64(bytes:Uint8Array){
  let s=""; for(const b of bytes)s+=String.fromCharCode(b); return btoa(s);
}
async function liveSocialSchedule(){
  const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(!serviceRole)return {ok:false,error:"LIVE_SOCIAL_SIGNER_MISSING"} as const;
  const seed=await sha256Bytes(serviceRole+"|"+SIGNING_CONTEXT);
  const kp=nacl.sign.keyPair.fromSeed(seed);
  const timestamp=Math.floor(Date.now()/1000).toString();
  const sig=nacl.sign.detached(new TextEncoder().encode(timestamp+".SOCIAL_READ"),kp.secretKey);
  try{
    const r=await fetch(SOCIAL_LIVE_ENDPOINT,{headers:{
      "x-cerebro-actgw-key-id":SIGNING_KEY_ID,
      "x-cerebro-actgw-timestamp":timestamp,
      "x-cerebro-actgw-signature-ed25519":bytesToB64(sig)
    },cache:"no-store"});
    const body=await r.json().catch(()=>null);
    if(!r.ok||body?.ok!==true||!Array.isArray(body?.items))return {ok:false,error:"LIVE_SOCIAL_READ_FAILED",detail:body} as const;
    return {ok:true,as_of:String(body.as_of??""),items:body.items as any[]} as const;
  }catch(e){return {ok:false,error:"LIVE_SOCIAL_UNREACHABLE",detail:e instanceof Error?e.message:String(e)} as const;}
}
async function nextSocialPublication(network:string){
  const live=await liveSocialSchedule();
  if(live.ok){
    const target=norm(network);
    const now=Date.now();
    const candidates=live.items.filter((x:any)=>norm(String(x?.channel??""))===target&&["READY_PROVIDER","SCHEDULED"].includes(String(x?.state??""))&&new Date(String(x?.scheduled_at??"")).getTime()>=now);
    if(candidates.length){
      const item=candidates[0];
      return {ok:true,item:{
        title:String(item?.content_key??""),
        network:displayNetwork(network),
        date:String(item?.scheduled_at??""),
        url:"",
        source:"CEREBRO_SOCIAL_QUEUE",
        state:String(item?.state??""),
        external_post_id:item?.external_post_id?String(item.external_post_id):null,
        verified_at:item?.last_verified_at?String(item.last_verified_at):null,
        provider_error:item?.last_provider_error?String(item.last_provider_error):null,
        caption:String(item?.caption??""),
        public_media_url:item?.public_media_url?String(item.public_media_url):null,
        media_urls:Array.isArray(item?.media_urls)?item.media_urls.map((x:any)=>String(x)).filter(Boolean):[],
        as_of:live.as_of
      }} as const;
    }
    return {ok:true,item:null,live_empty:true,as_of:live.as_of} as const;
  }
  if(!N)return {ok:false,error:"NOTION_TOKEN_MISSING"} as const;
  const r=await fetch("https://api.notion.com/v1/data_sources/"+SOCIAL_SCHEDULE_DATA_SOURCE_ID+"/query",{
    method:"POST",
    headers:NH,
    body:JSON.stringify({
      filter:{and:[
        {property:"Estado programación",status:{equals:"Programada"}},
        {property:"Tipo registro",select:{equals:"Operativo"}},
        {property:"Fecha/hora programada",date:{on_or_after:new Date().toISOString()}}
      ]},
      sorts:[{property:"Fecha/hora programada",direction:"ascending"}],
      page_size:50
    })
  });
  const body=await r.json().catch(()=>null);
  if(!r.ok||!Array.isArray(body?.results))return {ok:false,error:"SOCIAL_SCHEDULE_QUERY_FAILED",http_status:r.status} as const;
  const target=norm(network);
  for(const page of body.results){
    const props=page?.properties??{};
    const title=notionPropertyText(props["Programación"]);
    const red=notionPropertyText(props["Red"]);
    const hayNetwork=norm(red).includes(target)||norm(title).includes(target);
    if(!hayNetwork)continue;
    const date=String(props["Fecha/hora programada"]?.date?.start??"");
    if(!date)continue;
    return {ok:true,item:{title,network:displayNetwork(network),date,url:String(page?.url??""),source:"NOTION_PROGRAMACION_EDITORIAL",state:"Programada",external_post_id:null,verified_at:null,provider_error:null,as_of:""}} as const;
  }
  return {ok:true,item:null} as const;
}

async function socialPublicationByContext(context?:CerebroReadContext|null){
  if(!context?.content_key&&!context?.external_post_id)return null;
  const live=await liveSocialSchedule();
  if(!live.ok)return null;
  const item=live.items.find((x:any)=>
    (context.content_key&&String(x?.content_key??"")===context.content_key)||
    (context.external_post_id&&String(x?.external_post_id??"")===context.external_post_id)
  );
  if(!item)return null;
  return {
    title:String(item?.content_key??""),network:displayNetwork(String(item?.channel??context.network)),
    date:String(item?.scheduled_at??context.scheduled_at??""),url:"",source:"CEREBRO_SOCIAL_QUEUE",
    state:String(item?.state??""),external_post_id:item?.external_post_id?String(item.external_post_id):null,
    verified_at:item?.last_verified_at?String(item.last_verified_at):null,
    provider_error:item?.last_provider_error?String(item.last_provider_error):null,
    caption:String(item?.caption??""),
    public_media_url:item?.public_media_url?String(item.public_media_url):null,
    media_urls:Array.isArray(item?.media_urls)?item.media_urls.map((x:any)=>String(x)).filter(Boolean):[],
    as_of:live.as_of
  };
}
async function queryOperationalSocialSchedule(question:string,context?:CerebroReadContext|null){
  const network=detectSocialScheduleQuery(question,context);
  if(!network)return null;
  const display=displayNetwork(network);
  const wantsComplete=/(completa|completo|todo|entera|entero)/.test(norm(question));
  const wantsText=wantsComplete||/(texto|copy|contenido|caption|que pone|qué pone)/.test(norm(question));
  const wantsImage=wantsComplete||/(imagen|foto|creativo|media|ensename la imagen|enséñame la imagen)/.test(norm(question));
  const preserved=(wantsText||wantsImage)?await socialPublicationByContext(context):null;
  const result=preserved?{ok:true,item:preserved}:await nextSocialPublication(network);
  const read_context:CerebroReadContext={kind:"social_schedule",network:display};
  if(!result.ok){
    return {status:"ERROR",intent:"social_schedule",executed:false,read_context,reason:result.error,message:"No he podido consultar ahora mismo la Programación Editorial operativa de "+display+". No voy a sustituirla por una búsqueda general de Notion."};
  }
  if(!result.item){
    return {status:"OK",intent:"social_schedule",executed:false,read_context,message:"Ahora mismo no hay ninguna publicación operativa de "+display+" programada a partir de este momento en Programación Editorial."};
  }
  read_context.content_key=result.item.title||undefined;
  read_context.external_post_id=result.item.external_post_id??null;
  read_context.scheduled_at=result.item.date||undefined;
  read_context.public_media_url=result.item.public_media_url??null;
  read_context.media_urls=result.item.media_urls??[];
  read_context.caption=result.item.caption||undefined;
  if(wantsComplete){
    const urls=[result.item.public_media_url,...(result.item.media_urls??[])].filter(Boolean);
    const unique=[...new Set(urls)];
    const when=formatMadridDateTime(result.item.date);
    const lines=[
      `Próxima publicación de ${display}: ${when}.`,
      result.item.title?`Pieza: ${result.item.title}.`:"",
      result.item.caption?`Texto exacto:\n${result.item.caption}`:"",
      unique[0]?`Imagen: ${unique[0]}`:""
    ].filter(Boolean);
    return {
      status:"OK",intent:"social_schedule_complete",executed:false,read_context,
      message:lines.join("\n\n"),
      media:unique.length?{public_media_url:unique[0],media_urls:unique}:undefined,
      source: result.item.source==="CEREBRO_SOCIAL_QUEUE" ? {system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of} : {system:"Notion",data_source:"Programación Editorial",url:result.item.url}
    };
  }
  if(wantsImage){
    const urls=[result.item.public_media_url,...(result.item.media_urls??[])].filter(Boolean);
    const unique=[...new Set(urls)];
    if(result.item.source==="CEREBRO_SOCIAL_QUEUE"&&unique.length){
      return {
        status:"OK",intent:"social_schedule_media",executed:false,read_context,
        message:"La imagen asociada a esta publicación es: "+unique[0],
        media:{public_media_url:unique[0],media_urls:unique},
        source:{system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of}
      };
    }
    return {
      status:"OK",intent:"social_schedule_media",executed:false,read_context,
      message:"Tengo identificada la publicación, pero la fuente operativa no devuelve una imagen pública asociada. No voy a inventarla.",
      source: result.item.source==="CEREBRO_SOCIAL_QUEUE" ? {system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of} : {system:"Notion",data_source:"Programación Editorial",url:result.item.url}
    };
  }
  if(wantsText){
    if(result.item.source==="CEREBRO_SOCIAL_QUEUE"&&result.item.caption){
      return {
        status:"OK",intent:"social_schedule_detail",executed:false,read_context,
        message:result.item.caption,
        source:{system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of}
      };
    }
    return {
      status:"OK",intent:"social_schedule_detail",executed:false,read_context,
      message:"Tengo identificada la publicación, pero la fuente consultada no contiene todavía el texto completo. No voy a inventarlo.",
      source: result.item.source==="CEREBRO_SOCIAL_QUEUE" ? {system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of} : {system:"Notion",data_source:"Programación Editorial",url:result.item.url}
    };
  }
  return {
    status:"OK",intent:"social_schedule",executed:false,read_context,
    message:"La próxima publicación operativa de "+display+" está programada para "+formatMadridDateTime(result.item.date)+(result.item.title?". Pieza: "+result.item.title+".":"")+(result.item.source==="CEREBRO_SOCIAL_QUEUE"?" Fuente operativa: cola CEREBRO/Buffer. Estado: "+result.item.state+(result.item.external_post_id?" · Buffer ID "+result.item.external_post_id:"")+".":" Fuente documental: Programación Editorial."),
    source: result.item.source==="CEREBRO_SOCIAL_QUEUE" ? {system:"CEREBRO Social",data_source:"cerebro_social_queue_preprod",as_of:result.item.as_of} : {system:"Notion",data_source:"Programación Editorial",url:result.item.url}
  };
}

async function actorContext(req:Request){
  if(!U||!A||!S)return {ok:false,status:503,error:"server_config_missing"} as const;
  const bearer=req.headers.get("authorization")??"";
  if(!bearer.toLowerCase().startsWith("bearer "))return {ok:false,status:401,error:"unauthorized"} as const;
  const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:ud,error:ue}=await auth.auth.getUser(bearer.slice(7));
  if(ue||!ud.user)return {ok:false,status:401,error:"unauthorized"} as const;
  const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:ud.user.id});
  if(ce||!ctx?.ok||!ctx?.actor_code)return {ok:false,status:403,error:"identity_not_linked"} as const;
  const role=String(ctx.role??"");
  const actorCode=String(ctx.actor_code);
  if(actorCode!=="CARLOS-ADMIN")return {ok:false,status:403,error:"owner_knowledge_required"} as const;
  return {ok:true,status:200,actor_code:actorCode,role} as const;
}

function conversationMemoryIntent(question:string){
  const q=norm(question);
  return /\b(recuerdas|recuerda|recordar|te dije|te comente|te comenté|hablamos|acordamos|decidimos|conversacion anterior|conversación anterior|otra conversacion|otra conversación)\b/.test(q);
}

function conversationMemoryQuery(question:string){
  const noise=new Set(["recuerdas","recuerda","recordar","dije","comente","comenté","hablamos","acordamos","decidimos","conversacion","conversación","anterior","otra","sobre"]);
  const parts=tokens(question).filter(x=>!noise.has(x));
  return parts.length?parts.join(" "):question.slice(0,500);
}

async function queryConversationMemory(actorCode:string,question:string){
  if(!U||!S)return [] as any[];
  const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await svc.rpc("fenix_prod_cerebro_memory_search_server",{
    p_actor_code:actorCode,
    p_company_id:"fenix",
    p_query:conversationMemoryQuery(question),
    p_limit:5
  });
  if(error||data?.ok!==true||!Array.isArray(data.items))return [] as any[];
  return data.items.filter((x:any)=>String(x?.content??"").trim()).slice(0,5);
}

function conversationMemoryResponse(items:any[]){
  const lines=items.slice(0,4).map((x:any,i:number)=>{
    const when=String(x?.last_seen_at??"");
    const date=when?new Intl.DateTimeFormat("es-ES",{timeZone:"Europe/Madrid",dateStyle:"medium"}).format(new Date(when)):"";
    return `${i+1}. ${String(x.content).trim()}${date?` · ${date}`:""}`;
  });
  return {
    status:"OK",
    intent:"conversation_memory",
    executed:false,
    message:"En tu memoria conversacional de CEREBRO consta esto:\n\n"+lines.join("\n\n"),
    sources:items.slice(0,4).map((x:any)=>({
      system:"CEREBRO",
      source:"CONVERSATION_MEMORY",
      memory_id:String(x?.memory_id??""),
      last_seen_at:String(x?.last_seen_at??"")
    })),
    evidence_mode:"OWNER_CONVERSATION_MEMORY_V1"
  };
}

async function notionSearch(query:string){
  if(!N)return [];
  const r=await fetch("https://api.notion.com/v1/search",{
    method:"POST",headers:NH,
    body:JSON.stringify({query,page_size:10,filter:{property:"object",value:"page"},sort:{direction:"descending",timestamp:"last_edited_time"}})
  });
  const b=await r.json().catch(()=>null);
  if(!r.ok)return [];
  return Array.isArray(b?.results)?b.results:[];
}

async function notionPage(id:string){
  if(!N)return null;
  const r=await fetch(`https://api.notion.com/v1/pages/${id}`,{headers:NH});
  if(!r.ok)return null;
  return await r.json().catch(()=>null);
}

async function blockChildrenText(id:string,depth=0,remaining=12000):Promise<string>{
  if(!N||remaining<=0||depth>2)return "";
  let cursor:string|undefined;
  const parts:string[]=[];
  for(let pageNo=0;pageNo<2;pageNo++){
    const qs=new URLSearchParams({page_size:"100"});
    if(cursor)qs.set("start_cursor",cursor);
    const r=await fetch(`https://api.notion.com/v1/blocks/${id}/children?${qs}`,{headers:NH});
    const b=await r.json().catch(()=>null);
    if(!r.ok||!Array.isArray(b?.results))break;
    for(const block of b.results){
      const s=richText(block);
      if(s)parts.push(s);
      const used=parts.join("\n").length;
      if(used>=remaining)break;
      if(depth<2&&(block?.has_children===true||block?.type==="child_page")){
        const nested=await blockChildrenText(String(block.id),depth+1,remaining-used);
        if(nested)parts.push(nested);
      }
      if(parts.join("\n").length>=remaining)break;
    }
    if(parts.join("\n").length>=remaining||!b.has_more||!b.next_cursor)break;
    cursor=String(b.next_cursor);
  }
  return parts.join("\n").slice(0,remaining);
}

async function pageText(id:string){
  return await blockChildrenText(id,0,12000);
}

function scoreText(questionTokens:string[],title:string,body:string){
  const t=norm(title),b=norm(body);
  let score=0;
  for(const tok of questionTokens){
    if(t.includes(tok))score+=6;
    const matches=b.split(tok).length-1;
    score+=Math.min(matches,5);
  }
  return score;
}

function snippet(body:string,questionTokens:string[]){
  const raw=body.replace(/\s+/g," ").trim();
  if(!raw)return "";
  const low=norm(raw);
  let pos=-1;
  for(const tok of questionTokens){
    const p=low.indexOf(tok);
    if(p>=0&&(pos<0||p<pos))pos=p;
  }
  const start=Math.max(0,(pos<0?0:pos)-220);
  const end=Math.min(raw.length,start+900);
  return (start>0?"…":"")+raw.slice(start,end)+(end<raw.length?"…":"");
}
function extractSection(body:string,start:string,end?:string){
  const s=body.indexOf(start);
  if(s<0)return "";
  const from=s+start.length;
  const e=end?body.indexOf(end,from):-1;
  return body.slice(from,e>=0?e:body.length).trim();
}

function compact(value:string,maxLines:number){
  return value.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,maxLines).join("\n");
}

function currentnessAssessment(question:string){
  const q=norm(question);
  const timeSensitive=/\b(hoy|actual|actualmente|vigente|vigencia|porcentaje|tipo de interes|interes actual|tin|tae|itp|impuesto|plusvalia|ley|normativa|plazo legal|banco ofrece|condiciones bancarias)\b/.test(q);
  if(!timeSensitive)return null;
  return {
    status:"REQUIRES_CURRENT_VERIFICATION",
    message:"Ojo: este punto puede depender de normativa, impuestos o condiciones vigentes. Te doy el conocimiento interno disponible, pero el dato actual exacto debe verificarse contra la fuente oficial o el proveedor correspondiente antes de tomar una decisión."
  };
}

function broadKnowledgeQuestion(question:string){
  const q=norm(question);
  return /(que sabes|que conoces|cuanto sabes|en que me puedes ayudar|que puedo preguntarte|que temas controlas|que temas conoces|hazme un esquema|dame un esquema|dame un mapa|todo lo que sabes)/.test(q);
}

function broadLegalMapQuestion(question:string){
  const q=norm(question);
  if(!broadKnowledgeQuestion(question))return false;
  const genericLegal=/\b(temas? legales?|legal inmobiliari|juridic|derecho inmobiliario|mapa legal)\b/.test(q);
  const specific=/\b(herencias?|arras|compraventa|registro de la propiedad|cargas? registrales?|catastro|notari|donaciones?|itp|plusvalia|embargos?|titularidad|urbanismo|blanqueo|aml)\b/.test(q);
  return genericLegal&&!specific;
}

function domainKnowledgeMap(domain:string){
  const maps:Record<string,{intent:string;message:string}>={
    finance:{
      intent:"finance_knowledge_map",
      message:"Claro. En financiación puedo ayudarte con preanálisis y viabilidad, ingresos y endeudamiento, documentación, perfiles de cliente, estrategia y ranking de bancos, financiación alta, tasación, incidencias, planes B/C/D, FEIN/firma y seguimiento del expediente. También separo lo que es criterio financiero validado de lo que necesita confirmación de banco, Belén o un profesional. ¿Sobre qué parte quieres entrar?"
    },
    seo:{
      intent:"seo_knowledge_map",
      message:"Claro. En SEO puedo ayudarte con auditoría técnica, palabras clave e intención, arquitectura, landings, contenidos, enlazado interno, SEO local, indexación, Search Console cuando haya datos disponibles, competencia, captación y seguimiento por ciudad. ¿Qué parte quieres revisar?"
    },
    marketing:{
      intent:"marketing_knowledge_map",
      message:"Claro. En marketing puedo trabajar estrategia, contenidos, embudos, captación orgánica, campañas, CRM/reactivación, referidos, reutilización multicanal, métricas de negocio y coordinación con SEO, redes y newsletter. ¿Por dónde quieres que empecemos?"
    },
    social:{
      intent:"social_knowledge_map",
      message:"Claro. En redes puedo revisar estrategia, calendario y cola operativa, próximas publicaciones, copy, creatividades, canales disponibles, Buffer, reutilización de contenidos y estado de automatización. ¿Qué quieres mirar exactamente?"
    },
    newsletter:{
      intent:"newsletter_knowledge_map",
      message:"Claro. En newsletter puedo trabajar las líneas de particulares e inmobiliarias, listas y segmentación en Brevo, campañas, automatizaciones, contenido, métricas y relación con CRM. ¿Qué parte quieres revisar?"
    },
    autonomy:{
      intent:"autonomy_knowledge_map",
      message:"Claro. Puedo explicarte qué hace CEREBRO solo, qué requiere confirmación, cuándo aparece HUMAN_REQUIRED, cómo se aprende de conversaciones y casos, y cómo se promociona una automatización hasta producción. ¿Qué parte de la autonomía quieres ver?"
    },
    platform:{
      intent:"platform_knowledge_map",
      message:"Claro. Puedo explicarte la arquitectura de CEREBRO, Gateway, Console, Supabase, runtime y workers, motores compartidos, observabilidad, costes, backups, rollback, PREPROD y promoción a producción. ¿En qué parte quieres entrar?"
    },
    trading:{
      intent:"trading_knowledge_map",
      message:"Claro. Puedo explicarte el perímetro de Trading LAB, aislamiento de credenciales y recursos, límites, logs, watchdog, circuit breaker, kill switch y reglas para que nunca comprometa producción. ¿Qué parte quieres revisar?"
    },
    multiempresa:{
      intent:"multiempresa_knowledge_map",
      message:"Claro. Puedo explicarte el alta de una empresa, descubrimiento del negocio, web y keywords, SEO, competencia, redes, marketing, conocimiento, CRM, App, automatizaciones, training, supervisor, backup y paso a producción. ¿Sobre qué fase quieres preguntar?"
    }
  };
  const item=maps[domain];
  return item?{status:"OK",intent:item.intent,executed:false,message:item.message,evidence_mode:"DOMAIN_KNOWLEDGE_MAP_V1"}:null;
}

function legalKnowledgeMap(){
  return {
    status:"OK",
    intent:"legal_knowledge_map",
    executed:false,
    message:"Pues bastante, pero lo separo por nivel de validación para no mezclar conocimiento operativo con criterio jurídico definitivo. Puedes preguntarme por:\n\n1. Arras y compraventa: plazos, coordinación, documentación, señales de riesgo y qué revisar antes de comprometer dinero.\n2. Titularidad, cargas y Registro de la Propiedad: nota simple, titulares, hipotecas, embargos, cancelaciones y discrepancias registrales.\n3. Registro frente a Catastro: metros, uso, parcela y coherencia documental; el motor de Catastro todavía no está plenamente operativo.\n4. Notaría y firma: preparación previa, FEIN/acta cuando aplique, documentación, coordinación, forma de pago y cierre; la parte notarial sigue parcialmente desarrollada.\n5. Herencias: flujo administrativo, documentación, intervinientes, seguimiento y preparación de firma, separando lo jurídico, fiscal, registral y notarial sensible.\n6. Donaciones y aportaciones familiares: cómo detectar la estructura, titularidades y posibles riesgos; cualquier consecuencia fiscal o jurídica concreta exige fuente vigente y, si corresponde, profesional.\n7. Fiscalidad de operaciones inmobiliarias: ITP, donaciones, herencias y otros impactos relacionados. No convierto porcentajes recordados o ejemplos en reglas universales sin verificar territorio, fecha y fuente oficial.\n8. Riesgos del inmueble: cargas, obra nueva, herencias sin resolver, discrepancias de metros, titularidad y otros bloqueos que pueden afectar compraventa o financiación.\n9. Prevención de blanqueo y compliance: detección de señales y escalado, sin inferir delitos ni automatizar decisiones sensibles.\n\nSi quieres, dime uno de esos temas o cuéntame el caso concreto y entro al detalle.",
    sources:[
      {notion_page_id:LEGAL_QUALITY_PAGE_ID,title:"Fiscal y legal sensible · Contrato de calidad PRE-PROD"},
      {notion_page_id:BELEN_MASTER_PAGE_ID,title:"Base Maestra Belén · Motor financiero CEREBRO"},
      {notion_page_id:INHERITANCE_MASTER_PAGE_ID,title:"APP Fénix · Herencias · Ficha maestra guiada por Ana · Especificación PRE-PROD"}
    ],
    evidence_mode:"CANONICAL_LEGAL_MAP_V1"
  };
}

function clarificationMessage(domain:string|null){
  if(domain==="legal")return "No estoy segura de qué parte legal inmobiliaria quieres tratar. ¿Te refieres a arras/compraventa, cargas y Registro, notaría, herencias, donaciones/fiscalidad o a un caso concreto?";
  if(domain==="finance")return "No he entendido qué parte financiera quieres revisar. ¿Te refieres a viabilidad, documentación, banco, tasación, FEIN/firma o a un expediente concreto?";
  if(domain==="seo")return "No he entendido qué parte de SEO quieres revisar. ¿Quieres estado actual, una zona concreta, palabras clave, contenidos, enlazado, SEO local o un problema técnico?";
  return "No te he entendido del todo. ¿Quieres que te explique un tema, que consulte el conocimiento de Fénix o que prepare una acción concreta?";
}

async function directDomainAnswer(question:string,domain:string|null){
  const q=norm(question);

  if(domain==="legal"&&broadLegalMapQuestion(question))return legalKnowledgeMap();
  if(domain&&domain!=="legal"&&broadKnowledgeQuestion(question)){
    const map=domainKnowledgeMap(domain);
    if(map)return map;
  }

  if(domain==="finance"&&/(documentacion|documentos|papeles)/.test(q)&&/(hipoteca|estudiar|preanalisis)/.test(q)){
    const body=await pageText(FINANCE_PREANALYSIS_PAGE_ID);
    const liveEconomic=body?compact(extractSection(body,"## 2) Situación laboral y económica","## 3) Datos de la operación"),10):"";
    const liveDocs=body?compact(extractSection(body,"## Documentación para confirmar (después del formulario)"),30):"";
    const economic=liveEconomic||"- Salario neto mensual y pagas extra.\n- Tipo de contrato y antigüedad laboral.\n- Ahorro disponible.\n- Gastos mensuales, préstamos, tarjetas, alquiler u otras hipotecas.\n- Precio de compra, titulares y posibles avalistas.";
    const docs=liveDocs||"- DNI/NIE en vigor y, cuando aplique, documentación de estado civil.\n- Cuenta ajena: nóminas recientes, contrato/prórroga y vida laboral.\n- Autónomos: alta RETA/IAE, declaraciones trimestrales y última renta.\n- Extractos bancarios de 3–6 meses y justificantes de préstamos, tarjetas y otras financiaciones.\n- Arras si existen, nota simple/referencia catastral e información de la vivienda.";
    return {
      status:"OK",intent:"finance_documentation",executed:false,
      message:"Para estudiar una hipoteca, primero completamos el preanálisis y después pedimos la documentación que confirme los datos.\n\nCriterios iniciales:\n"+economic+"\n\nDocumentación base según perfil:\n"+docs+"\n\nCriterio operativo: no se inicia el estudio final hasta tener el formulario completo y la documentación que lo confirme. La lista se adapta al perfil real del cliente.",
      sources:[{notion_page_id:FINANCE_PREANALYSIS_PAGE_ID,title:"Formulario de preanálisis hipotecario"}],
      evidence_mode:body?"LIVE_NOTION":"CANONICAL_FALLBACK_V1"
    };
  }

  if(domain==="seo"&&/(estado|actual|pendiente|revisar|revision|situacion)/.test(q)){
    const body=await pageText(SEO_LATEST_AUDIT_PAGE_ID);
    const liveState=body?compact(extractSection(body,"## Estado WordPress / SEO","## robots / sitemap / llms / Agentic"),12):"";
    const livePriorities=body?compact(extractSection(body,"## Prioridades","## GATE HUMANO"),10):"";
    const liveGates=body?compact(extractSection(body,"## GATE HUMANO"),10):"";
    const state=liveState||"- Auditoría de 156 contenidos publicados: 4 avisos concentrados en páginas legales/contacto por falta de focus keyword.\n- Declaración de privacidad publicada con noindex; se conserva sin cambios.\n- Biblioteca: 8 imágenes sin ALT, todas legacy/decorativas o ambiguas.\n- CEREBRO SEO PROD responde OK, versión 0.4.1; última ejecución registrada con 0 alertas, 0 correcciones y 0 bloqueos.";
    const priorities=livePriorities||"1. Recuperar acceso a GSC para CTR, ranking y canibalización con datos reales.\n2. Consolidar Jaén con utilidad real: preanálisis, documentación, antes de arras, herramientas y CTA contextual.\n3. Mantener imágenes únicas por localidad.\n4. Revisar visualmente los 8 ALT legacy antes de tocar nada.";
    const gates=liveGates||"- Search Console sigue bloqueado por el conector, así que no se inventan métricas actuales.\n- No modificar automáticamente noindex legal, claims financieros, slugs con tráfico, redirecciones/canonicals ni arquitectura global sin evidencia/gate.";
    return {
      status:"OK",intent:"seo_status",executed:false,
      message:"Última auditoría SEO canónica disponible: 28/09/2026.\n\nEstado actual:\n"+state+"\n\nPendiente prioritario:\n"+priorities+"\n\nGates pendientes:\n"+gates,
      sources:[{notion_page_id:SEO_LATEST_AUDIT_PAGE_ID,title:"Auditoría SEO/Web semanal · Fénix Capital · 28/09/2026"}],
      evidence_mode:body?"LIVE_NOTION":"CANONICAL_FALLBACK_V1"
    };
  }

  if(domain==="marketing"&&/(estrategia|actual|canales|prioriz|organico|orgánico|crecimiento)/.test(q)){
    return {
      status:"OK",intent:"marketing_strategy",executed:false,
      message:"La estrategia actual de marketing de Fénix Capital prioriza crecimiento orgánico y reutilización de activos antes de gasto nuevo. Canales prioritarios: SEO, SEO local, contenidos, redes orgánicas, Google Business Profile, B2B con inmobiliarias, CRM/reactivación, referidos y reutilización multicanal. El doble motor comercial es particulares + inmobiliarias, midiendo leads cualificados, expedientes, firmas e ingreso, no métricas de vanidad.",
      sources:[{notion_page_id:MARKETING_MASTER_PAGE_ID,title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"}],
      evidence_mode:"CANONICAL_FALLBACK_V3"
    };
  }

  if(domain==="social"&&/(redes|operativas|estado|canales|sociales)/.test(q)){
    return {
      status:"OK",intent:"social_status",executed:false,
      message:"El alcance social verificado actualmente se centra en Facebook, Instagram y LinkedIn estático mediante la capa CEREBRO/Buffer en PREPROD. TikTok, YouTube/Shorts y X no deben considerarse publicación PROD autónoma. Buffer es el transporte social canónico verificado; Substack no está verificado. Para una pieza o fecha concreta CEREBRO debe consultar la cola viva.",
      sources:[{notion_page_id:SOCIAL_ORGANIC_PAGE_ID,title:"Redes sociales orgánicas"}],
      evidence_mode:"CANONICAL_FALLBACK_V3"
    };
  }

  if(domain==="newsletter"){
    return {
      status:"OK",intent:"newsletter_status",executed:false,
      message:"El sistema canónico de newsletter es Brevo Free. Brevo actúa como transporte, listas/segmentación, automatizaciones y métricas; no es el CRM maestro. Listas verificadas: PARTICULARES id 17 e INMOBILIARIAS id 18. Las campañas 102 y 103 están en borrador y en el último corte verificado constan 0 emails enviados.",
      sources:[{notion_page_id:BREVO_CANONICAL_PAGE_ID,title:"Brevo · configuración canónica Fénix Capital · PRE-PROD"},{notion_page_id:CEREBRO_AUDIT_PAGE_ID,title:"AUDITORÍA VIVA · CEREBRO OS"}],
      evidence_mode:"CANONICAL_VERIFIED_2026_09_28"
    };
  }

  if(domain==="autonomy"){
    return {
      status:"OK",intent:"autonomy_status",executed:false,
      message:"CEREBRO puede consultar conocimiento y fuentes autorizadas sin confirmación, mantener contexto y preparar análisis o propuestas. Para una acción ordinaria no autónoma presenta el alcance exacto y pide una sola confirmación explícita antes de ejecutar, verificar y auditar. HUMAN_REQUIRED se reserva a LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT y CUSTOMER_HUMAN_REQUEST.",
      sources:[{notion_page_id:DECISION_CENTER_PAGE_ID,title:"Centro de decisión CEREBRO"},{notion_page_id:OWNER_DECISION_PAGE_ID,title:"Owner Decision by Exception V1"}],
      evidence_mode:"CANONICAL_POLICY"
    };
  }

  if(domain==="platform"){
    return {
      status:"OK",intent:"platform_architecture",executed:false,
      message:"Supabase se reserva principalmente para el core transaccional de APP/CRM/Auth/RLS/expedientes y estado crítico. El runtime/worker compartido debe absorber jobs, training, OCR, investigación y logs auxiliares. No conviene cargar en Supabase por defecto jobs largos, polling repetitivo, QA pesado, workers, investigación, training, OCR pesado, experimentos, simulación, backups pesados ni logs auxiliares de gran volumen.",
      sources:[{notion_page_id:CEREBRO_AUDIT_PAGE_ID,title:"AUDITORÍA VIVA · CEREBRO OS"},{notion_page_id:FINOPS_PAGE_ID,title:"FINOPS-001 · Costes, velocidad, GitHub y cron"}],
      evidence_mode:"CANONICAL_FALLBACK_V3"
    };
  }

  if(domain==="trading"){
    return {
      status:"OK",intent:"trading_isolation",executed:false,
      message:"Trading LAB debe permanecer en un perímetro técnico independiente: no comparte runtime, secretos, colas ni recursos críticos con marketing, SEO, redes, CRM, WordPress, App Fénix ni APIs productivas. Sus credenciales son exclusivas del laboratorio. Debe tener límites de recursos, logs, watchdog, circuit breaker y kill switch propios; si existe conflicto de recursos se detiene Trading LAB, nunca producción.",
      sources:[{notion_page_id:TRADING_ISOLATION_PAGE_ID,title:"P1 · Perímetro técnico aislado · Trading Lab"},{notion_page_id:REGISTRY_AUDIT_PAGE_ID,title:"REGISTRY-AUDIT · Estado de motores y funcionalidades"}],
      evidence_mode:"CANONICAL_FALLBACK_V3"
    };
  }

  if(domain==="multiempresa"&&/(alta|nueva empresa|onboarding|motores|activar|activarian|activarían)/.test(q)){
    return {
      status:"OK",intent:"multiempresa_onboarding",executed:false,
      message:"El onboarding objetivo de una nueva empresa en CEREBRO es: registro → escaneo web → escaneo de palabras clave → SEO → competencia → redes sociales → presencia local → marketing → modelo de negocio → procesos internos → conocimiento → CRM → App → automatizaciones → training → supervisor → producción.\n\nMotores estándar: Company Registry, Business Discovery, Digital Footprint Scanner, Web Audit, Keyword Research, SEO, Local SEO, Social Media Audit, Competitor Intelligence, Market Intelligence, Marketing, Knowledge Bootstrap, CRM Bootstrap, App Bootstrap, Automation Bootstrap, Training Bootstrap, Supervisor y Backup/Rebuild.\n\nCada motor debe llevar company_id, engine_id, environment y version. Producción solo tras contratos, permisos, tests, evaluación, observabilidad, rollback, backup/rebuild, coste medido, política y PREPROD en verde. Coste adicional objetivo: 0 €.",
      sources:[{notion_page_id:"3e981b1a-756d-8100-9198-c75858d5371c",title:"Company Registry · Fénix Capital"},{system:"CEREBRO",contract:"MULTIEMPRESA_ONBOARDING_V1"}]
    };
  }
  return null;
}


export async function queryCerebroKnowledge(req:Request,question:string,context?:CerebroReadContext|null){
  const actor=await actorContext(req);
  if(!actor.ok)return {status:"HUMAN_REQUIRED",reason:actor.error,executed:false,message:"Esta consulta está reservada al propietario autorizado de CEREBRO."};

  const learned=await queryConversationMemory(actor.actor_code,question);
  if(conversationMemoryIntent(question)&&learned.length)return conversationMemoryResponse(learned);

  const operationalSocial=await queryOperationalSocialSchedule(question,context);
  if(operationalSocial)return operationalSocial;

  const domain=detectKnowledgeDomain(question);
  const direct=await directDomainAnswer(question,domain);
  if(direct)return direct;

  if(!N){
    if(learned.length)return conversationMemoryResponse(learned);
    return {status:"ERROR",reason:"NOTION_TOKEN_MISSING",executed:false,message:"El conector documental de CEREBRO no está configurado y no he encontrado memoria conversacional suficiente para responder."};
  }

  const qTokens=tokens(question);
  if(!qTokens.length)return {status:"LOW_CONFIDENCE",intent:"clarification",reason:"QUERY_TOO_GENERIC",executed:false,message:clarificationMessage(domain)};

  const candidates=new Map<string,{id:string,title:string,page:any}>();
  for(const term of qTokens.slice(0,3)){
    for(const page of await notionSearch(term)){
      if(page?.id)candidates.set(String(page.id),{id:String(page.id),title:titleOf(page),page});
    }
  }
  for(const item of CANONICAL_PAGES){
    if(!candidates.has(item.id)){
      const p=await notionPage(item.id);
      if(p)candidates.set(item.id,{id:item.id,title:titleOf(p)||item.title,page:p});
    }
  }
  if(domain){
    for(const item of DOMAIN_CANONICAL[domain]??[]){
      if(!candidates.has(item.id)){
        const p=await notionPage(item.id);
        if(p)candidates.set(item.id,{id:item.id,title:titleOf(p)||item.title,page:p});
      }
    }
  }

  const canonicalIds=new Set(CANONICAL_PAGES.map(x=>x.id));
  const domainIds=new Set((domain?DOMAIN_CANONICAL[domain]??[]:[]).map(x=>x.id));
  const ordered=[
    ...(domain?(DOMAIN_CANONICAL[domain]??[]).map(x=>candidates.get(x.id)).filter(Boolean):[]),
    ...CANONICAL_PAGES.map(x=>candidates.get(x.id)).filter(Boolean),
    ...[...candidates.values()].filter(x=>!canonicalIds.has(x.id)&&!domainIds.has(x.id))
  ].slice(0,12) as {id:string,title:string,page:any}[];

  const ranked:any[]=[];
  for(const item of ordered){
    const body=await pageText(item.id);
    const score=scoreText(qTokens,item.title,body)+(domainIds.has(item.id)?12:0);
    if(score>=3)ranked.push({id:item.id,title:item.title,score,snippet:snippet(body,qTokens)});
  }
  ranked.sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,3);
  const freshness=currentnessAssessment(question);
  if(!top.length){
    if(learned.length)return conversationMemoryResponse(learned);
    return {status:"LOW_CONFIDENCE",intent:"clarification",executed:false,message:clarificationMessage(domain),sources:[]};
  }

  const memoryLines=learned.slice(0,2).map((x:any,i:number)=>`M${i+1}. En conversación: ${String(x.content).trim()}`);
  const lines=top.map((x:any,i:number)=>`${i+1}. ${x.title}: ${x.snippet}`);
  const sections=[
    freshness?.message??"",
    memoryLines.length?"Memoria conversacional relevante:\n"+memoryLines.join("\n\n"):"",
    "Conocimiento documental autorizado:\n"+lines.join("\n\n")
  ].filter(Boolean);
  return {
    status:"OK",
    intent:"knowledge",
    executed:false,
    message:sections.join("\n\n"),
    sources:[
      ...learned.slice(0,2).map((x:any)=>({system:"CEREBRO",source:"CONVERSATION_MEMORY",memory_id:String(x?.memory_id??""),last_seen_at:String(x?.last_seen_at??"")})),
      ...top.map((x:any)=>({notion_page_id:x.id,title:x.title,score:x.score}))
    ],
    evidence_mode:learned.length?"MIXED_CONVERSATION_AND_CANONICAL_V1":"CANONICAL_NOTION",
    knowledge_freshness:freshness?.status??"INTERNAL_SOURCE_CURRENTNESS_NOT_REQUIRED"
  };
}
