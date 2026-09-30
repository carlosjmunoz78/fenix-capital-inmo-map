import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const U=Deno.env.get("SUPABASE_URL")??"";
const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const N=Deno.env.get("NOTION_TOKEN")??"";
const NV="2025-09-03";
const NH={Authorization:`Bearer ${N}`,"Notion-Version":NV,"Content-Type":"application/json"};

const CANONICAL_PAGES=[
  {id:"3be81b1a-756d-81da-ad05-d6ab37855c2f",title:"Base estratégica CEREBRO"},
  {id:"3ba81b1a-756d-8118-8a48-eebf163b9f1c",title:"Centro de decisión CEREBRO"},
  {id:"3eb81b1a-756d-8153-a1ef-f4c13e75519c",title:"Owner Decision by Exception V1"}
];

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

export async function queryCerebroKnowledge(req:Request,question:string){
  const actor=await actorContext(req);
  if(!actor.ok)return {status:"HUMAN_REQUIRED",reason:actor.error,executed:false,message:"Esta consulta está reservada al propietario autorizado de CEREBRO."};

  if(!N)return {status:"ERROR",reason:"NOTION_TOKEN_MISSING",executed:false,message:"El conector de conocimiento de CEREBRO no está configurado."};

  const qTokens=tokens(question);
  if(!qTokens.length)return {status:"LOW_CONFIDENCE",reason:"QUERY_TOO_GENERIC",executed:false,message:"La consulta es demasiado general. Dime el tema concreto que quieres consultar."};

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

  const canonicalIds=new Set(CANONICAL_PAGES.map(x=>x.id));
  const ordered=[
    ...CANONICAL_PAGES.map(x=>candidates.get(x.id)).filter(Boolean),
    ...[...candidates.values()].filter(x=>!canonicalIds.has(x.id))
  ].slice(0,10) as {id:string,title:string,page:any}[];

  const ranked:any[]=[];
  for(const item of ordered){
    const body=await pageText(item.id);
    const score=scoreText(qTokens,item.title,body);
    if(score>0)ranked.push({id:item.id,title:item.title,score,snippet:snippet(body,qTokens)});
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
