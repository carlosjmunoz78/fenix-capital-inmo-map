// CEREBRO Console NIA: authenticated user chat -> pre-existing FACT private Queue.
// External permission: dedicated Queues Write LAB token escrowed in Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {parseNiaConsoleReadIntent} from './nia_console_intent.mjs';
const TOKEN_NAME='cerebro_nia_cf_queues_write_lab_20261117';
const URL='https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/queues/c6325451fce54fd6bf4b25095627ba66/messages';
const QUEUE_PAYLOAD=topic=>({
 content_type:'json',body:{type:'NIA_FACT_PRIVATE_DISCOVERY_V1',company_id:'fenix',
  engine_id:'ACTGW-001',topic}
});
export async function maybeDispatchNiaConsoleRead(req,message,authorizeOwner,{enabled=true}={}){
 const topic=parseNiaConsoleReadIntent(message);
 if(topic===null)return null;
 const denial=(reason,notice)=>({status:'HUMAN_REQUIRED',intent:'notion.nia.discover.read',reason,executed:false,message:notice});
 if(!enabled)return denial('POLICY_CONFLICT','NIA está preparado, pero el enlace de Console permanece desactivado.');
 const actor=await authorizeOwner(req);
 if(!actor||actor.ok!==true||actor.actor!=='CARLOS-ADMIN')
  return denial('POLICY_CONFLICT','La consulta a NIA necesita una sesión de propietario verificada.');
 const db=Deno.env.get('SUPABASE_DB_URL');
 if(!db)return denial('SECURITY_INCIDENT','No se dispone del almacén seguro para enviar la consulta.');
 const sql=postgres(db,{prepare:false,max:1,connect_timeout:5,idle_timeout:1});
 let token='';
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${TOKEN_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<24)
   throw Error('NIA_QUEUE_SECRET_UNAVAILABLE');
  token=rows[0].decrypted_secret;
 }catch{
  return {status:'ERROR',intent:'notion.nia.discover.read',reason:'NIA_QUEUE_SECRET_UNAVAILABLE',executed:false,
   message:'La conexión privada de NIA no dispone ahora de su credencial. No se ha enviado ninguna orden.'};
 }finally{await sql.end({timeout:2}).catch(()=>{})}
 const correlation=crypto.randomUUID();
 try{
  const r=await fetch(URL,{method:'POST',headers:{Authorization:'Bearer '+token,
   'Content-Type':'application/json'},body:JSON.stringify(QUEUE_PAYLOAD(topic)),
   redirect:'error',signal:AbortSignal.timeout(12000)});
  // Never log CF response body: it is not a verified NIA completion result.
  if(!r.ok)throw Error('NIA_QUEUE_HTTP_DENIED');
  const answer=await r.json();
  if(answer?.success!==true)throw Error('NIA_QUEUE_REJECTED');
  console.log('CONSOLE_NIA_EDGE_QUEUE_ACCEPTED',correlation,topic);
  return {status:'QUEUED',intent:'notion.nia.discover.read',executed:false,
   message:'He enviado la consulta de lectura a NIA en el entorno LAB. Está en cola; todavía no significa que haya terminado. La confirmación final se comprueba en el registro de CEREBRO.',
   queue:'CEREBRO_FACT_NIA_PRIVATE_LAB',request_id:correlation,
   notion_ai_invoked:false,additional_cost_eur:0};
 }catch{
  console.log('CONSOLE_NIA_EDGE_QUEUE_BLOCKED',correlation);
  return {status:'ERROR',intent:'notion.nia.discover.read',executed:false,
   reason:'NIA_QUEUE_DELIVERY_FAILED',message:'No he podido enviar la consulta a NIA. La operación se ha detenido sin tocar otros sistemas.'};
 }
}
