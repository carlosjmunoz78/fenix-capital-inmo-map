/**
 * Owner-only, read-only CEREBRO Activity introspection.
 * The caller has already passed Gateway owner authorization. Forward ONLY
 * the same owner's bearer token and browser-safe public API key; no service key.
 * This never schedules, cancels, or edits GitHub jobs.
 */
const REPO="carlosjmunoz78/fenix-capital-inmo-map";
const ACTIVITY="https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/";
const MAX_AGE_MS=20*60_000;
type Kind="summary"|"running"|"queue"|"recent"|"incidents"|"oldest";
type ActivityRun={run_id:number;workflow_name:string;status:string;conclusion:string|null;html_url:string;created_at:string;updated_at:string;company_id?:string;source?:string};
type ActivityResponse={status:string;observed_at:string;source_status:string;repository:string;runs:ActivityRun[]};
function norm(value:string){
 return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^[¿¡\s]+|[?!.\s]+$/g,"").trim();
}
export function classifyActivityQuestion(message:string):Kind|null{
 const q=norm(message);
 if(!q||q.length>2000)return null;
 if(/^(?:activa|lanza|crea|prepara|ejecuta|cancela|borra|elimina|modifica|programa|publica)\b/.test(q)||/\b(aion|captacasa)\b/.test(q))return null;
 if(/(?:hay algun|hay alguna|tenemos|existen)\s+(?:fallo|bloqueo|incidente|decision)/.test(q)&&/\b(mi intervencion|requiera|atencion|pendiente)\b/.test(q))return"incidents";
 if(/\b(?:trabajos?|ejecuciones?|workflows?|cola|motores?|tareas?)\b/.test(q)||/que esta haciendo cerebro ahora|que hace cerebro ahora/.test(q)){
  if(/mas tiempo esperando|mas antiguo|mas tiempo en cola|lleva mas esperando/.test(q))return"oldest";
  if(/ultimo (?:trabajo|resultado)|ultima ejecucion|mas reciente|terminad[oa]s?|completad[oa]s?/.test(q)&&!/siguen ejecutandose/.test(q))return"recent";
  if(/\b(fallos?|bloqueos?|incidentes?|errores?|decisiones?)\b/.test(q))return"incidents";
  if(/\b(nombres?|cuales|muestra|dime|lista)\b/.test(q)&&/\b(ejecutandose|en ejecucion|en curso|avanzando)\b/.test(q))return"running";
  if(/\b(esperando|cola|pendientes?)\b/.test(q)&&!/\b(cuantos|numero|total)\b/.test(q))return"queue";
  return"summary";
 }
 return null;
}
function validRun(r:ActivityRun){
 return Number.isSafeInteger(r?.run_id)&&r.run_id>0&&typeof r.workflow_name==="string"&&r.workflow_name.length<=250&&typeof r.status==="string"&&r.company_id==="fenix"&&r.source==="GITHUB_ACTIONS"&&String(r.html_url??"").startsWith("https://github.com/"+REPO+"/actions/runs/");
}
function unavailable(reason:string){
 return{status:"ERROR",intent:"work_activity_unavailable",executed:false,message:"No puedo verificar ahora el estado de los trabajos desde la fuente autenticada. Consulta el indicador y la hora de última lectura en Operativa; no voy a inventar cifras ni resultados.",reason,evidence_mode:"SOURCE_NOT_VERIFIED"};
}
export async function answerWithVerifiedActivity(req:Request,message:string,requestFetch:typeof fetch=fetch){
 const kind=classifyActivityQuestion(message);
 if(!kind)return null;
 const token=req.headers.get("authorization")??"";
 const apikey=req.headers.get("apikey")??"";
 if(!/^Bearer\s+\S+$/i.test(token)||!apikey)return unavailable("OWNER_TOKEN_OR_PUBLIC_KEY_MISSING");
 try{
  const res=await requestFetch(ACTIVITY,{method:"GET",headers:{Authorization:token,apikey,accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8500)});
  if(!res.ok)return unavailable("ACTIVITY_HTTP_"+res.status);
  const obj=await res.json() as ActivityResponse;
  if(obj?.status!=="OK"||obj.repository!==REPO||!["LIVE","CACHED"].includes(obj.source_status)||!Array.isArray(obj.runs))return unavailable("ACTIVITY_SOURCE_UNVERIFIED");
  const age=Date.now()-Date.parse(obj.observed_at);
  if(!Number.isFinite(age)||age<(-120000)||age>MAX_AGE_MS)return unavailable("ACTIVITY_SNAPSHOT_STALE");
  const valid=obj.runs.filter(validRun);
  const running=valid.filter(r=>r.status==="in_progress");
  const queued=valid.filter(r=>["queued","waiting","pending","requested"].includes(r.status));
  const completed=valid.filter(r=>r.status==="completed").sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
  const asOf=new Date(obj.observed_at).toLocaleString("es-ES",{timeZone:"Europe/Madrid",dateStyle:"short",timeStyle:"short"});
  const stamp=" Datos verificados en la última captura de GitHub Actions ("+asOf+", hora de Madrid); no es streaming.";
  let answer:string;
  if(kind==="summary")answer="En los trabajos de CEREBRO visibles para Fénix hay "+running.length+(running.length===1?" ejecución en curso":" ejecuciones en curso")+" y "+queued.length+(queued.length===1?" trabajo en cola":" trabajos en cola")+". Se muestran "+completed.length+" resultados terminados visibles."+stamp;
  else if(kind==="running")answer=running.length?"Trabajos en ejecución: "+running.slice(0,8).map((r,i)=>(i+1)+". "+r.workflow_name+" (#"+r.run_id+").").join(" ")+stamp:"En esta captura no aparecen ejecuciones de CEREBRO en curso."+stamp;
  else if(kind==="queue")answer=queued.length?"En cola: "+queued.slice(0,8).map((r,i)=>(i+1)+". "+r.workflow_name+" (#"+r.run_id+").").join(" ")+stamp:"No aparece ninguna ejecución de CEREBRO en cola en esta captura."+stamp;
  else if(kind==="oldest"){
   const ordered=[...queued].filter(r=>Number.isFinite(Date.parse(r.created_at))).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
   answer=ordered.length?"La ejecución más antigua de las pendientes visibles es «"+ordered[0].workflow_name+"» (#"+ordered[0].run_id+"), creada el "+new Date(ordered[0].created_at).toLocaleString("es-ES",{timeZone:"Europe/Madrid"})+". No dispongo de una causa verificada de la espera; no voy a atribuirla a límites o errores sin evidencia."+stamp:"No hay una ejecución pendiente con fecha verificable en la fuente."+stamp;
  }else if(kind==="recent"){
   const latest=completed[0];
   answer=latest?"El resultado terminado más reciente visible es «"+latest.workflow_name+"» (#"+latest.run_id+"), conclusión: "+(latest.conclusion||"sin conclusión verificada")+". Enlace: "+latest.html_url+"."+stamp:"No hay un resultado terminado verificable en esta captura."+stamp;
  }else{
   const failed=completed.filter(r=>["failure","timed_out","cancelled","action_required"].includes(String(r.conclusion??"")));
   answer=(failed.length?"Detecto "+failed.length+" resultados recientes fallidos o no concluidos correctamente. Ejemplo: «"+failed[0].workflow_name+"» (#"+failed[0].run_id+").":"En esta captura no aparecen resultados fallidos entre los trabajos terminados visibles.")+" Esta fuente NO cubre todas las decisiones de propietario ni errores internos; no puedo asegurar que no existan otros bloqueos."+stamp;
  }
  return{status:"OK",intent:"work_activity_"+kind,executed:false,message:answer,evidence_mode:"VERIFIED_GITHUB_ACTIONS_SNAPSHOT",source:{system:"GITHUB_ACTIONS",repository:REPO,observed_at:obj.observed_at,source_status:obj.source_status}};
 }catch{return unavailable("ACTIVITY_READ_FAILED")}
}
