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
const NH={Authorization:`Bearer ${N}`,"Notion-Version":NV,"Content-Type":"application/json"};

const CANONICAL_PAGES=[
  {id:"3be81b1a-756d-81da-ad05-d6ab37855c2f",title:"Base estratégica CEREBRO"},
  {id:"3ba81b1a-756d-8118-8a48-eebf163b9f1c",title:"Centro de decisión CEREBRO"},
  {id:"3eb81b1a-756d-8153-a1ef-f4c13e75519c",title:"Owner Decision by Exception V1"}
];

const DOMAIN_CANONICAL:Record<string,{id:string,title:string}[]>={
  finance:[
    {id:"3ba81b1a-756d-817f-9d61-e54e7f270e16",title:"Conocimiento financiero canónico · Fénix Uno"},
    {id:"3be81b1a-756d-81b6-a75f-cb6bbe842766",title:"Base Maestra Belén · Motor financiero CEREBRO"}
  ],
  marketing:[
    {id:"3b481b1a-756d-81ce-bdd3-d28125e964c7",title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"},
    {id:"3bf81b1a-756d-8183-ad00-d546747ec1c5",title:"Redes sociales orgánicas"}
  ],
  multiempresa:[
    {id:"3e981b1a-756d-8100-9198-c75858d5371c",title:"Company Registry · CEREBRO · Fénix Capital"},
    {id:"3be81b1a-756d-81da-ad05-d6ab37855c2f",title:"Base estratégica CEREBRO"}
  ],
  seo:[
    {id:"3b481b1a-756d-81ce-bdd3-d28125e964c7",title:"Motor maestro · Estrategia SEO, contenidos, embudos y redes"},
    {id:"3d481b1a-756d-81b2-8d63-fdccf0481401",title:"Auditoría SEO/Web semanal · Fénix Capital"}
  ]
};

function detectKnowledgeDomain(question:string){
  const q=norm(question);
  if(/hipoteca|banco|financi|tin|tae|cuota|fein|tasacion|ingresos|endeudamiento/.test(q))return "finance";
  if(/marketing|redes|facebook|instagram|linkedin|contenido|embudo|campana|campaña|newsletter|brevo|buffer/.test(q))return "marketing";
  if(/multiempresa|empresa|company|registry|motor|engine|autonomia|autonomía/.test(q))return "multiempresa";
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
  const explicit=networks.find(n=>q.includes(n))||(/(^|\\s)x($|\\s)/.test(q)?"x":undefined);
  const scheduleIntent=/(proxima|siguiente|cuando|sale|publicacion|programad|dia|hora|texto|copy|contenido|caption)/.test(q);
  const followup=Boolean(context?.kind==="social_schedule"&&/(dia|hora|cuando|que dia|a que hora|y hora|texto|copy|contenido|caption|que pone)/.test(q));
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
    caption:String(item?.caption??""),as_of:live.as_of
  };
}
async function queryOperationalSocialSchedule(question:string,context?:CerebroReadContext|null){
  const network=detectSocialScheduleQuery(question,context);
  if(!network)return null;
  const display=displayNetwork(network);
  const wantsText=/(texto|copy|contenido|caption|que pone|qué pone)/.test(norm(question));
  const preserved=wantsText?await socialPublicationByContext(context):null;
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

async function pageText(id:string){
  if(!N)return "";
  let cursor:string|undefined;
  const parts:string[]=[];
  for(let pageNo=0;pageNo<1;pageNo++){
    const qs=new URLSearchParams({page_size:"100"});
    if(cursor)qs.set("start_cursor",cursor);
    const r=await fetch(`https://api.notion.com/v1/blocks/${id}/children?${qs}`,{headers:NH});
    const b=await r.json().catch(()=>null);
    if(!r.ok||!Array.isArray(b?.results))break;
    for(const block of b.results){
      const s=richText(block);
      if(s)parts.push(s);
      if(parts.join("\n").length>12000)break;
    }
    if(parts.join("\n").length>12000||!b.has_more||!b.next_cursor)break;
    cursor=String(b.next_cursor);
  }
  return parts.join("\n").slice(0,12000);
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

export async function queryCerebroKnowledge(req:Request,question:string,context?:CerebroReadContext|null){
  const actor=await actorContext(req);
  if(!actor.ok)return {status:"HUMAN_REQUIRED",reason:actor.error,executed:false,message:"Esta consulta está reservada al propietario autorizado de CEREBRO."};

  if(!N)return {status:"ERROR",reason:"NOTION_TOKEN_MISSING",executed:false,message:"El conector de conocimiento de CEREBRO no está configurado."};

  const operationalSocial=await queryOperationalSocialSchedule(question,context);
  if(operationalSocial)return operationalSocial;

  const qTokens=tokens(question);
  if(!qTokens.length)return {status:"LOW_CONFIDENCE",reason:"QUERY_TOO_GENERIC",executed:false,message:"La consulta es demasiado general. Dime el tema concreto que quieres consultar."};

  const candidates=new Map<string,{id:string,title:string,page:any}>();
  const domain=detectKnowledgeDomain(question);
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
  const ordered=[
    ...CANONICAL_PAGES.map(x=>candidates.get(x.id)).filter(Boolean),
    ...[...candidates.values()].filter(x=>!canonicalIds.has(x.id))
  ].slice(0,10) as {id:string,title:string,page:any}[];

  const ranked:any[]=[];
  for(const item of ordered){
    const body=await pageText(item.id);
    const score=scoreText(qTokens,item.title,body);
    if(score>=3)ranked.push({id:item.id,title:item.title,score,snippet:snippet(body,qTokens)});
  }
  ranked.sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,3);
  if(!top.length){
    return {status:"NO_KNOWLEDGE_MATCH",intent:"knowledge",executed:false,message:"No he encontrado evidencia suficiente en el conocimiento autorizado de CEREBRO para responder con seguridad. No voy a inventarla.",sources:[]};
  }

  const lines=top.map((x:any,i:number)=>`${i+1}. ${x.title}: ${x.snippet}`);
  return {
    status:"OK",
    intent:"knowledge",
    executed:false,
    message:`He encontrado esto en el conocimiento autorizado de CEREBRO:\n\n${lines.join("\n\n")}`,
    sources:top.map((x:any)=>({notion_page_id:x.id,title:x.title,score:x.score}))
  };
}
