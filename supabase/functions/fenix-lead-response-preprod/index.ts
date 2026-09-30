import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
function J(data:unknown,status=200){return Response.json(data,{status,headers:{"cache-control":"no-store","x-fenix-env":"PREPROD"}})}
function allowedRecipient(email:string){
  const raw=Deno.env.get("FENIX_PREPROD_TEST_RECIPIENTS")??"";
  if(!raw||raw.includes("*")) return false;
  const entries=raw.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  return entries.includes(email.trim().toLowerCase());
}
async function sha(v:Uint8Array){const d=new Uint8Array(await crypto.subtle.digest("SHA-256",v));return [...d].map(x=>x.toString(16).padStart(2,"0")).join("")}
function b64(bytes:Uint8Array){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)}
function wrap(text:string,max=75){const out:string[]=[];let line="";for(const w of text.split(/\s+/)){const n=line?line+" "+w:w;if(n.length>max){if(line)out.push(line);line=w}else line=n}if(line)out.push(line);return out}
async function granadaGuide(){
  const pdf=await PDFDocument.create(), regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const W=595.28,H=841.89,orange=rgb(1,.373,0),dark=rgb(.13,.13,.13),mag=rgb(.529,0,.392),amber=rgb(1,.718,.106);
  const page=pdf.addPage([W,H]); page.drawRectangle({x:0,y:H-36,width:W,height:36,color:dark});
  page.drawText("FENIX CAPITAL · Checklist documental",{x:48,y:H-24,size:10,font:bold,color:rgb(1,1,1)});
  page.drawRectangle({x:48,y:H-215,width:W-96,height:125,color:orange});
  page.drawText("CHECKLIST DOCUMENTAL",{x:70,y:H-140,size:22,font:bold,color:rgb(1,1,1)});
  page.drawText("HIPOTECA EN GRANADA",{x:70,y:H-170,size:22,font:bold,color:rgb(1,1,1)});
  let y=H-260; page.drawText("Antes de pedir financiación",{x:48,y,size:18,font:bold,color:mag}); y-=34;
  const intro="Ordena la documentación inicial para que el estudio empiece con titulares, ingresos, deudas, ahorro y vivienda claros. No supone una aprobación de financiación.";
  for(const l of wrap(intro)){page.drawText(l,{x:48,y,size:10.5,font:regular,color:dark});y-=15}
  y-=10; page.drawRectangle({x:48,y:y-65,width:W-96,height:75,color:amber});
  const goal="Objetivo: saber qué documentación aporta evidencia real, qué falta y cuál es el siguiente paso, sin pedir archivos innecesarios.";
  let gy=y-15;for(const l of wrap(goal,70)){page.drawText(l,{x:62,y:gy,size:10.5,font:bold,color:dark});gy-=15} y-=95;
  const rows=[
    ["Identidad","DNI/NIE de los titulares y datos de contacto."],
    ["Trabajo","Tipo de contrato o situación profesional y antigüedad."],
    ["Ingresos","Nóminas o ingresos acreditables y continuidad."],
    ["Deudas","Préstamos, tarjetas y otras cuotas mensuales."],
    ["Ahorro","Fondos disponibles para entrada y gastos."],
    ["Vivienda","Precio y datos básicos si ya existe inmueble concreto."]
  ];
  for(const [a,b] of rows){page.drawText(a,{x:48,y,size:10,font:bold,color:dark});for(const l of wrap(b,55)){page.drawText(l,{x:165,y,size:9.5,font:regular,color:dark});y-=12}y-=10}
  const page2=pdf.addPage([W,H]);page2.drawRectangle({x:0,y:H-36,width:W,height:36,color:dark});page2.drawText("FENIX CAPITAL · Checklist documental",{x:48,y:H-24,size:10,font:bold,color:rgb(1,1,1)});
  y=H-82;page2.drawText("Checklist final antes del estudio",{x:48,y,size:18,font:bold,color:mag});y-=36;
  const checks=["Identidad revisada.","Situación laboral o profesional registrada.","Ingresos recurrentes identificados.","Deudas y cuotas relevantes anotadas.","Ahorro disponible revisado.","Precio y datos del inmueble, si existe.","Documentos legibles y necesarios.","Pendientes con responsable y siguiente paso.","No se ha comunicado financiación garantizada."];
  for(const t of checks){page2.drawCircle({x:52,y:y+3,size:3,color:orange});page2.drawText(t,{x:65,y,size:10.5,font:regular,color:dark});y-=26}
  y-=12;page2.drawText("Siguiente paso",{x:48,y,size:12,font:bold,color:dark});y-=22;
  const final="Con esta información inicial, Fénix Capital puede revisar el punto de partida y decirte qué documentación adicional hace falta para avanzar.";
  for(const l of wrap(final)){page2.drawText(l,{x:48,y,size:10.5,font:regular,color:dark});y-=15}
  y-=25;page2.drawText("Fénix Capital es asesoría hipotecaria; no es un banco ni concede hipotecas.",{x:48,y,size:9,font:regular,color:rgb(.35,.35,.35)});
  const bytes=await pdf.save(); return {bytes,hash:await sha(bytes),name:"FENIX_CHECKLIST_DOCUMENTAL_HIPOTECA_GRANADA_V1.pdf"};
}
Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=="POST")return J({ok:false,error:"method_not_allowed"},405);
  if(!U||!S)return J({ok:false,error:"server_config_missing"},503);
  const auth=req.headers.get("authorization")??"";
  if(auth!==("Bearer "+S))return J({ok:false,error:"internal_auth_required"},401);
  const b=await req.json().catch(()=>null);if(!b)return J({ok:false,error:"invalid_json"},400);
  const email=String(b.email??"").trim().toLowerCase(), name=String(b.name??"").trim().slice(0,120);
  const funnel=String(b.funnel??"").trim().toUpperCase(), city=String(b.city??b.municipality??"").trim()||"Granada";
  const idem=String(b.idempotency_key??"").trim();
  const consentPrivacy=b.consent_privacy===true, consentMarketing=b.consent_marketing===true;
  if(!email||!idem||!["GUIDE","STUDY","NEWSLETTER"].includes(funnel))return J({ok:false,error:"invalid_payload"},422);
  if(!consentPrivacy)return J({ok:false,error:"privacy_consent_required"},422);
  if(!allowedRecipient(email))return J({ok:false,error:"preprod_recipient_not_allowlisted"},403);
  const db=createClient(U,S,{auth:{persistSession:false}});
  const {data:lead}=await db.from("web_leads_preprod").select("id").eq("email",email).maybeSingle();
  if(!lead?.id)return J({ok:false,error:"lead_not_found"},404);
  let subject="",html="",text="",attachment:any[]=[],assetUrl:string|null=null,assetHash:string|null=null,messageKind="";
  if(funnel==="GUIDE"){
    subject="Tu checklist para preparar tu hipoteca en "+city;
    html="<p>Hola"+(name?", "+name:"")+".</p><p>Hemos recibido tu solicitud. Te adjuntamos la checklist documental para preparar el estudio de tu hipoteca.</p><p>Si ya tienes una vivienda concreta o documentación preparada, responde a este correo y te indicaremos el siguiente paso.</p>";
    text="Hemos recibido tu solicitud. Te adjuntamos la checklist documental para preparar el estudio de tu hipoteca.";
    if(city.toLowerCase()==="granada"){const g=await granadaGuide();attachment=[{name:g.name,content:b64(g.bytes)}];assetHash=g.hash;assetUrl="attachment:"+g.name}
    messageKind="LEAD_MAGNET_DELIVERY";
  } else if(funnel==="STUDY"){
    subject="Hemos recibido tu solicitud de estudio hipotecario";
    html="<p>Hola"+(name?", "+name:"")+".</p><p>Hemos recibido tu solicitud de estudio.</p><p>CEREBRO ha registrado tus datos y ha creado el seguimiento para que podamos revisar tu caso. Si ya dispones de nóminas, vida laboral, información de deudas, ahorro o datos de la vivienda, puedes responder a este correo.</p>";
    text="Hemos recibido tu solicitud de estudio hipotecario. Tu caso ya está registrado para seguimiento.";
    messageKind="STUDY_WELCOME";
  } else {
    if(!consentMarketing)return J({ok:false,error:"marketing_consent_required"},422);
    subject="Bienvenido a las novedades de Fénix Capital";
    html="<p>Hola"+(name?", "+name:"")+".</p><p>Tu suscripción ha quedado registrada.</p><p>Recibirás contenidos de Fénix Capital relacionados con financiación hipotecaria. Puedes darte de baja en cualquier momento.</p>";
    text="Tu suscripción a las novedades de Fénix Capital ha quedado registrada.";
    messageKind="NEWSLETTER_WELCOME";
  }
  const outboxKey="lead-response:"+lead.id+":"+idem+":"+funnel;
  const {data:old}=await db.from("seo_cerebro_email_outbox_preprod").select("id,status,brevo_message_id").eq("idempotency_key",outboxKey).maybeSingle();
  if(old?.status==="SENT")return J({ok:true,idempotent:true,state:"SENT",message_id:old.brevo_message_id});
  let outboxId=old?.id;
  if(!outboxId){
    const ins=await db.from("seo_cerebro_email_outbox_preprod").insert({
      company_id:"FENIX_CAPITAL",engine_id:"SEO-001",environment:"PREPROD",province:city,municipality:city,
      lead_id:lead.id,email,message_kind:messageKind,subject,html_content:html,text_content:text,asset_url:assetUrl,
      status:"SENDING",idempotency_key:outboxKey,evidence:{funnel,city,consent_marketing:consentMarketing,attachment_sha256:assetHash,source:"fenix-lead-response-preprod"}
    }).select("id").single();
    if(ins.error)return J({ok:false,error:"outbox_insert_failed",detail:ins.error.message},500);
    outboxId=ins.data.id;
  } else {
    await db.from("seo_cerebro_email_outbox_preprod").update({status:"SENDING",updated_at:new Date().toISOString(),last_error:null}).eq("id",outboxId);
  }
  const payload:any={mode:"PREPROD_TEST",run_id:outboxKey,to:[{email}],subject,sender:{name:"Fénix Capital",email:"hipotecas@fenixcapital.es"},htmlContent:html,textContent:text,tags:["CEREBRO_LEAD_AUTORESPONSE",funnel,city.toUpperCase()]};
  if(attachment.length)payload.attachment=attachment;
  const r=await fetch(U+"/functions/v1/fenix-brevo-api-preprod/send-email",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+S},body:JSON.stringify(payload)});
  const rr=await r.json().catch(()=>({}));
  if(!r.ok||!rr?.ok){
    await db.from("seo_cerebro_email_outbox_preprod").update({status:"FAILED",attempts:1,last_error:"brevo_send_failed:"+r.status,evidence:{funnel,city,response_status:r.status,response:rr},updated_at:new Date().toISOString()}).eq("id",outboxId);
    return J({ok:false,error:"send_failed",status:r.status},502);
  }
  await db.from("seo_cerebro_email_outbox_preprod").update({status:"SENT",attempts:1,brevo_message_id:String(rr.message_id??rr.remote_id??""),evidence:{funnel,city,attachment_sha256:assetHash,sent_at:new Date().toISOString(),brevo_status:rr.status??r.status},updated_at:new Date().toISOString()}).eq("id",outboxId);
  return J({ok:true,state:"SENT",message_id:rr.message_id??rr.remote_id??null,message_kind:messageKind});
 }catch(e){return J({ok:false,error:"lead_response_exception",detail:e instanceof Error?e.message:String(e)},500)}
});