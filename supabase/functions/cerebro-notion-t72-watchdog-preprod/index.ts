import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOTION_TOKEN=Deno.env.get("NOTION_TOKEN")??"";
const NOTION_VERSION="2026-03-11";
const DATA_SOURCE_ID="e5158816-4ddd-4888-b768-130466420477";
const SECRET_SHA256="e0682d10f90278d29be9c7a863e8ccd350475b6097f09c5e0fd15c289a03f38c";
const NOTICE="T-72 · La publicación entra en ventana de 72 horas y todavía no tiene cierre T-48. Revisar contenido, QA, aprobación y bloqueo de versión antes del límite.";

function J(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-fenix-env":"PREPROD"}});
}
async function sha256Hex(v:string){
  const d=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
  return [...d].map((b)=>b.toString(16).padStart(2,"0")).join("");
}
async function authed(req:Request){
  const presented=req.headers.get("x-cerebro-job-secret")??"";
  return !!presented && await sha256Hex(presented)===SECRET_SHA256;
}
function scheduledAt(page:any):string|null{
  const p=page?.properties?.["Fecha/hora programada"];
  const arr=p?.type==="rollup"&&p?.rollup?.type==="array"?p.rollup.array:[];
  for(const item of arr){
    if(item?.type==="date"&&item?.date?.start)return item.date.start;
    if(item?.type==="formula"&&item?.formula?.type==="date"&&item?.formula?.date?.start)return item.formula.date.start;
  }
  const f=page?.properties?.["Fecha/hora programada (filtro)"];
  if(f?.type==="formula"){
    if(f.formula?.type==="date"&&f.formula?.date?.start)return f.formula.date.start;
    if(f.formula?.type==="string"&&f.formula?.string)return f.formula.string;
  }
  return null;
}
async function notion(path:string,init:RequestInit){
  const r=await fetch("https://api.notion.com/v1"+path,{...init,headers:{
    Authorization:`Bearer ${NOTION_TOKEN}`,
    "Notion-Version":NOTION_VERSION,
    "Content-Type":"application/json",
    ...((init.headers??{}) as Record<string,string>)
  }});
  const body=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(`notion_${r.status}_${body?.code??"error"}`);
  return body;
}
Deno.serve(async(req:Request)=>{
  try{
    if(!await authed(req))return J({ok:false,error:"unauthorized"},401);
    if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
    if(!NOTION_TOKEN)return J({ok:false,error:"notion_token_missing"},503);
    const input=await req.json().catch(()=>({}));
    const dryRun=input?.dry_run!==false;
    const q=await notion(`/data_sources/${DATA_SOURCE_ID}/query`,{
      method:"POST",
      body:JSON.stringify({page_size:100,filter:{and:[
        {property:"Estado publicación",status:{equals:"Pendiente de publicar"}},
        {property:"T-48 aprobado",checkbox:{equals:false}},
        {property:"Recordatorio T-72 enviado",checkbox:{equals:false}},
        {property:"Programación relacionada",relation:{is_not_empty:true}}
      ]}})
    });
    const now=Date.now(),limit=now+72*60*60*1000;
    const due:any[]=[],skipped:any[]=[];
    for(const page of q?.results??[]){
      const raw=scheduledAt(page);
      const ts=raw?Date.parse(raw):NaN;
      if(!Number.isFinite(ts)){skipped.push({page_id:page.id,state:"NO_SCHEDULE_DATE"});continue;}
      if(ts<=now){skipped.push({page_id:page.id,state:"NOT_FUTURE",scheduled_at:raw});continue;}
      if(ts>limit){skipped.push({page_id:page.id,state:"OUTSIDE_T72",scheduled_at:raw});continue;}
      due.push({page_id:page.id,scheduled_at:raw});
    }
    const updated:any[]=[];
    if(!dryRun){
      for(const item of due){
        await notion(`/pages/${item.page_id}`,{
          method:"PATCH",
          body:JSON.stringify({properties:{
            "Recordatorio T-72 enviado":{checkbox:true},
            "Aviso T-72":{rich_text:[{type:"text",text:{content:NOTICE}}]}
          }})
        });
        updated.push(item);
      }
    }
    return J({ok:true,state:dryRun?"DRY_RUN":"APPLIED",company_id:"FENIX_CAPITAL",engine_id:"SOCIAL-001",environment:"PREPROD",version:"v0",candidates:(q?.results??[]).length,due,updated,skipped_count:skipped.length});
  }catch(err){
    return J({ok:false,error:"watchdog_exception",detail:err instanceof Error?err.message:String(err)},500);
  }
});