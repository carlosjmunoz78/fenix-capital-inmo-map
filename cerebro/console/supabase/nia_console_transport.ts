// CEREBRO Console NIA: authenticated user chat -> pre-existing FACT private Queue.
// External permission: dedicated Queues Write LAB token escrowed in Supabase Vault.
import postgres from 'npm:postgres@3.4.7';
import {parseNiaConsoleReadIntent} from './nia_console_intent.mjs';
const TOKEN_NAME='cerebro_nia_cf_queues_write_lab_20261117';
// Read-only NIA Skill verification using the existing Notion service token.
// No Notion AI execution and no mutation endpoints.
const NOTION_TOKEN_NAME='cerebro_notion_service_token_v1';
const NOTION_PAGE_ID='41a81b1a-756d-815a-b877-f0d264a6a0d4';
const NOTION_EXPECTED_TITLE='NIA · Uso responsable de Notion Business en CEREBRO';
const notionRoot='https://api.notion.com/v1';
const textFromRich=(a)=>Array.isArray(a)?a.map(x=>typeof x?.plain_text==='string'?x.plain_text:'').join(''):'';
function validNiaPage(page){
 const values=page&&typeof page==='object'&&!Array.isArray(page)?Object.values(page.properties||{}):[];
 const prop=values.find(x=>x?.type==='title');
 return page?.id===NOTION_PAGE_ID&&page.archived!==true&&page.in_trash!==true&&
    textFromRich(prop?.title)===NOTION_EXPECTED_TITLE;
}
async function readVerifiedNiaSkill(token){
 if(typeof token!=='string'||token.length<24)return null;
 const headers={Authorization:'Bearer '+token,'Notion-Version':'2022-06-28'};
 const opts={headers,method:'GET',redirect:'manual',signal:AbortSignal.timeout(9000)};
 try{
  const [pageResponse,blocksResponse]=await Promise.all([
   fetch(notionRoot+'/pages/'+NOTION_PAGE_ID,opts),
   fetch(notionRoot+'/blocks/'+NOTION_PAGE_ID+'/children?page_size=100',opts)
  ]);
  if(pageResponse.status!==200||blocksResponse.status!==200)return null;
  const [page,blocks]=await Promise.all([pageResponse.json(),blocksResponse.json()]);
  if(!validNiaPage(page)||blocks?.object!=='list'||!Array.isArray(blocks.results))return null;
  const sections=blocks.results
   .filter(b=>['heading_1','heading_2','heading_3'].includes(b?.type))
   .map(b=>textFromRich(b[b.type]?.rich_text).slice(0,95))
   .filter(x=>x.length>0).slice(0,8);
  return {skill_title:NOTION_EXPECTED_TITLE,block_count:blocks.results.length,
    sections,has_more:blocks.has_more===true,verified_at_utc:new Date().toISOString(),
    source:'NOTION_API_DIRECT_READ_ONLY',notion_ai_invoked:false};
 }catch{return null;}
}

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
 let notionToken='';
 try{
  const rows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${TOKEN_NAME} limit 2`;
  if(rows.length!==1||typeof rows[0].decrypted_secret!=='string'||rows[0].decrypted_secret.length<24)
   throw Error('NIA_QUEUE_SECRET_UNAVAILABLE');
  token=rows[0].decrypted_secret;
  const notionRows=await sql`select decrypted_secret from vault.decrypted_secrets where name=${NOTION_TOKEN_NAME} limit 2`;
  if(notionRows.length===1&&typeof notionRows[0].decrypted_secret==='string')notionToken=notionRows[0].decrypted_secret;
 }catch{
  return {status:'ERROR',intent:'notion.nia.discover.read',reason:'NIA_QUEUE_SECRET_UNAVAILABLE',executed:false,
   message:'La conexión privada de NIA no dispone ahora de su credencial. No se ha enviado ninguna orden.'};
 }finally{await sql.end({timeout:2}).catch(()=>{})}
 const correlation=crypto.randomUUID();
 const verifiedSkill=await readVerifiedNiaSkill(notionToken);
 try{
  const r=await fetch(URL,{method:'POST',headers:{Authorization:'Bearer '+token,
   'Content-Type':'application/json'},body:JSON.stringify(QUEUE_PAYLOAD(topic)),
   redirect:'error',signal:AbortSignal.timeout(12000)});
  // Never log CF response body: it is not a verified NIA completion result.
  if(!r.ok)throw Error('NIA_QUEUE_HTTP_DENIED');
  const answer=await r.json();
  if(answer?.success!==true)throw Error('NIA_QUEUE_REJECTED');
  console.log('CONSOLE_NIA_EDGE_QUEUE_ACCEPTED',correlation,topic);
  const verified=verifiedSkill!==null;
  const overview=verified
   ? 'He comprobado la Skill NIA directamente en Notion: '+verifiedSkill.block_count+
     ' bloques de contenido y '+verifiedSkill.sections.length+' secciones principales ('+
     verifiedSkill.sections.join('; ')+').'
   : 'No he podido verificar ahora el contenido de NIA directamente en Notion.';
  return {status:verified?'NIA_SKILL_VERIFIED_AND_QUEUED':'QUEUED',
   intent:'notion.nia.discover.read',executed:false,notion_read_completed:verified,
   skill:verified?verifiedSkill:null,
   message:overview+' También he enviado la orden a FACT-001/NIA en LAB. Su procesamiento es asíncrono; no he iniciado la IA nativa de Notion.',
   queue:'CEREBRO_FACT_NIA_PRIVATE_LAB',request_id:correlation,
   fact_completion_verified:false,notion_ai_invoked:false,additional_cost_eur:0};
 }catch{
  console.log('CONSOLE_NIA_EDGE_QUEUE_BLOCKED',correlation);
  return {status:'ERROR',intent:'notion.nia.discover.read',executed:false,
   reason:'NIA_QUEUE_DELIVERY_FAILED',message:'No he podido enviar la consulta a NIA. La operación se ha detenido sin tocar otros sistemas.'};
 }
}
