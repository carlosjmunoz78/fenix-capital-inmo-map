// FACT001 Notion content exporter v2 LAB, isolated from original broker and exporter.
// Pinned one-shot OIDC only. READ Notion pages and data-source queries (POST query is read-only).
import postgres from 'npm:postgres@3.4.7';
import {verifyGitHubOidc} from './policy.mjs';
import {INDEX_SHA,BATCH_REF,exportObject,verifyObject} from './content.mjs';
const header={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status:number,o:Record<string,unknown>)=>new Response(JSON.stringify(o),{status,headers:header});
const fixed={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.content_export.mixed_object',request_id:'FACT001-NOTION-SECOND-25-CONTENT-20261111',batch_ref:BATCH_REF};
async function vault(){
 const db=Deno.env.get('SUPABASE_DB_URL');if(!db)throw Error('VAULT_UNAVAILABLE');
 const sql=postgres(db,{max:1,connect_timeout:5,idle_timeout:1,prepare:false});
 try{const keys=['cerebro_notion_service_token_v1','cerebro_fact001_notion_backup_aes256_lab_v1'];const rows=await sql`select name,decrypted_secret from vault.decrypted_secrets where name in (${keys[0]},${keys[1]})`;
  if(rows.length!==2)throw Error('VAULT_MISSING');const m=new Map(rows.map(r=>[r.name,r.decrypted_secret]));if(keys.some(k=>typeof m.get(k)!=='string'))throw Error('VAULT_MISSING');return {notionToken:m.get(keys[0]) as string,encryptionKey:m.get(keys[1]) as string};
 }finally{await sql.end({timeout:2}).catch(()=>{});}
}
Deno.serve(async req=>{
 if(req.method!=='POST'||!new URL(req.url).pathname.endsWith('/cerebro-fact001-notion-content-export-v2-lab/export'))return reply(404,{status:'NOT_FOUND'});
 const auth=req.headers.get('authorization')??'';
 try{if(!auth.startsWith('Bearer '))throw Error('AUTH');await verifyGitHubOidc(auth.slice(7));}catch{return reply(401,{status:'UNAUTHORIZED'});}
 let body:Record<string,unknown>;
 try{
  if(Number(req.headers.get('content-length')||'0')>18000)throw Error('TOO_LARGE');const raw=await req.text();if(raw.length>18000)throw Error('TOO_LARGE');body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(Object.keys(body).sort())!==JSON.stringify([...Object.keys(fixed),'plan_artifact','item_index'].sort())||Object.entries(fixed).some(([k,v])=>body[k]!==v)||!Number.isSafeInteger(body.item_index)||Number(body.item_index)<0||Number(body.item_index)>24)throw Error('ORDER_DENIED');
  const plan=body.plan_artifact as Record<string,unknown>;
  if(!plan||typeof plan!=='object'||Array.isArray(plan)||plan.batch_ref!==BATCH_REF||plan.index_sha256!==INDEX_SHA||plan.offset!==25||plan.next_offset!==50||plan.items!==25||plan.pages!==24||plan.data_sources!==1)throw Error('PLAN_DENIED');
 }catch{return reply(403,{status:'ORDER_DENIED'});}
 try{let {notionToken,encryptionKey}=await vault();try{
  const item=await exportObject({planArtifact:body.plan_artifact,encryptionKey,notionToken,index:Number(body.item_index)});
  const check=await verifyObject({artifact:item,planArtifact:body.plan_artifact,encryptionKey});
  if(check.status!=='FACT001_CONTENT_MEMORY_REBUILT')throw Error('INTERNAL_PARITY_DENIED');
  return reply(200,{...item,verify_roundtrip:true});
 }finally{notionToken='';encryptionKey='';}}
 catch(e){const raw=e instanceof Error?e.message:'';const code=/^(VAULT_UNAVAILABLE|VAULT_MISSING|BATCH_[A-Z0-9_]+|NOTION_[A-Z0-9_]+|SOURCE_[A-Z0-9_]+|PAGE_DENIED|BLOCK_[A-Z0-9_]+|INCOMPLETE_[A-Z0-9_]+|CURSOR_LOOP|CHILD_LOOP|INTERNAL_PARITY_DENIED)$/.test(raw)?raw:'CONTENT_EXPORT_BLOCKED';return reply(503,{status:'BLOCKED',code,credentials_exposed:false,content_exposed:false,provider_writes:0,checkpoint_committed:false});}
});