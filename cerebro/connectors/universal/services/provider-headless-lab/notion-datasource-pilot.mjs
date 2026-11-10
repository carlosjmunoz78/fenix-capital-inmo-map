// FACT-001 · fixed Notion marketing data-source encrypted backup pilot.
// Querying a data source uses POST but is READ ONLY; no creation/update/delete.
// Not complete without row page blocks, signed attachments or comments.
export const MARKETING_SOURCE_ID='38981b1a-756d-81e0-9936-000b6a8c430c';
export const MARKETING_SOURCE_PARENT_ID='38981b1a-756d-8008-95e1-d1d80c2f7623';
export const SOURCE_KEY_VAULT='cerebro_fact001_notion_backup_aes256_lab_v1';
const PREFIX='FACT001-NOTION-DATA-SOURCE-AES256GCM-LAB-V1',te=new TextEncoder(),td=new TextDecoder();
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
function keyBytes(s){if(typeof s!=='string'||!/^[0-9a-f]{64}$/.test(s))throw Error('FACT001_SOURCE_KEY_INVALID');
return Uint8Array.from(s.match(/../g),x=>parseInt(x,16));}
const keyImport=async s=>crypto.subtle.importKey('raw',keyBytes(s),'AES-GCM',false,['encrypt','decrypt']);
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
const deb64=s=>{if(typeof s!=='string'||s.length>6500000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('FACT001_SOURCE_CIPHER_INVALID');
let raw;try{raw=atob(s)}catch{throw Error('FACT001_SOURCE_CIPHER_INVALID');}return Uint8Array.from(raw,c=>c.charCodeAt(0));};
async function request(url,method,body,token,http){
 let r;try{r=await http(url,{method,headers:{Authorization:'Bearer '+token,
 'Notion-Version':'2026-03-11',Accept:'application/json',
 ...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});}
 catch{throw Error('FACT001_SOURCE_NETWORK_UNVERIFIED');}
 if(r.status===401||r.status===403)throw Error('FACT001_SOURCE_AUTH_DENIED');
 if(r.status!==200)throw Error('FACT001_SOURCE_HTTP_'+r.status);
 try{return await r.json()}catch{throw Error('FACT001_SOURCE_BAD_JSON');}
}
export async function sealMarketingSource({notionToken,encryptionKey,http=fetch,random=crypto.getRandomValues.bind(crypto)}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken))
  throw Error('FACT001_SOURCE_TOKEN_DENIED');
 const key=await keyImport(encryptionKey);
 const api='https://api.notion.com/v1/data_sources/'+MARKETING_SOURCE_ID;
 const schema=await request(api,'GET',null,notionToken,http);
 if(schema?.object!=='data_source'||schema.id!==MARKETING_SOURCE_ID)
  throw Error('FACT001_SOURCE_SCHEMA_ID_MISMATCH');
 const pages=[],seenIds=new Set(),seenCursors=new Set();let cursor=null,more=true;
 for(let i=0;i<4&&more;i++){
  if(i&&http===fetch)await new Promise(resolve=>setTimeout(resolve,380));
  const body={page_size:50,...(cursor?{start_cursor:cursor}:{})};
  const response=await request(api+'/query','POST',body,notionToken,http);
  if(!Array.isArray(response?.results)||response.results.length>50||
   typeof response.has_more!=='boolean'||(response.has_more&&(!response.next_cursor||typeof response.next_cursor!=='string')))
   throw Error('FACT001_SOURCE_QUERY_SHAPE_DENIED');
  for(const record of response.results){
   if(record?.object!=='page'||!uuid(record.id)||seenIds.has(record.id))
    throw Error('FACT001_SOURCE_ROW_INVALID');
   seenIds.add(record.id);
  }
  pages.push({cursor,rows:response.results,next_cursor:response.has_more?response.next_cursor:null});
  more=response.has_more;cursor=response.has_more?response.next_cursor:null;
  if(more){if(seenCursors.has(cursor))throw Error('FACT001_SOURCE_PAGINATION_CYCLE');seenCursors.add(cursor);}
 }
 const snapshot={format:PREFIX,scope:{company_id:'fenix-capital',engine_id:'FACT-001',
  environment:'LAB',version:'1.0.0'},source_id:MARKETING_SOURCE_ID,source_parent_id:MARKETING_SOURCE_PARENT_ID,
  schema,pages,rows:seenIds.size,next_cursor:more?cursor:null,
  rows_complete:!more,child_page_block_content_exported:false,attachments_downloaded:false,
  comments_exported:false};
 const bytes=te.encode(JSON.stringify(snapshot));
 if(bytes.length>4500000)throw Error('FACT001_SOURCE_BYTES_BUDGET_EXCEEDED');
 const iv=new Uint8Array(12);random(iv);if(iv.every(x=>x===0))throw Error('FACT001_SOURCE_NONCE_INVALID');
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,
  additionalData:te.encode(PREFIX)},key,bytes));
 return {status:'FACT001_SOURCE_AES_GCM_SNAPSHOT',scope:'fenix-capital/FACT-001/LAB/1.0.0',
  source_id:MARKETING_SOURCE_ID,parent_id:MARKETING_SOURCE_PARENT_ID,
  rows:seenIds.size,query_pages:pages.length,has_more:more,
  schema_included:true,row_properties_included:true,row_page_blocks_included:false,
  attachments_downloaded:false,provider_restore_performed:false,full_workspace_backup:false,
  write_operations:0,plaintext_sha256:await sha(bytes),plaintext_bytes:bytes.length,
  algorithm:'AES-256-GCM',key_vault_name:SOURCE_KEY_VAULT,
  envelope:{format:PREFIX,nonce_b64:b64(iv),ciphertext_b64:b64(cipher)}};
}
export async function verifyMarketingSource({encryptionKey,artifact}={}){
 if(artifact?.status!=='FACT001_SOURCE_AES_GCM_SNAPSHOT'||
  artifact.source_id!==MARKETING_SOURCE_ID||artifact.envelope?.format!==PREFIX||
  artifact.algorithm!=='AES-256-GCM'||!/^[a-f0-9]{64}$/.test(artifact.plaintext_sha256||''))
  throw Error('FACT001_SOURCE_ARTIFACT_DENIED');
 const key=await keyImport(encryptionKey),iv=deb64(artifact.envelope.nonce_b64),cipher=deb64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||cipher.length<17||cipher.length>5500000)throw Error('FACT001_SOURCE_ENVELOPE_DENIED');
 let bytes;try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(PREFIX)},key,cipher));}
 catch{throw Error('FACT001_SOURCE_AUTHENTICITY_FAILED');}
 if(await sha(bytes)!==artifact.plaintext_sha256||bytes.length!==artifact.plaintext_bytes)
  throw Error('FACT001_SOURCE_INTEGRITY_FAILED');
 let data;try{data=JSON.parse(td.decode(bytes))}catch{throw Error('FACT001_SOURCE_FORMAT_DENIED');}
 if(data.format!==PREFIX||data.source_id!==MARKETING_SOURCE_ID||
  data.scope?.environment!=='LAB'||data.scope?.engine_id!=='FACT-001'||
  !Array.isArray(data.pages)||data.pages.length!==artifact.query_pages||
  data.pages.reduce((n,p)=>n+p.rows.length,0)!==artifact.rows||
  data.rows_complete!==!artifact.has_more)
  throw Error('FACT001_SOURCE_PARITY_DENIED');
 return {status:'FACT001_SOURCE_MEMORY_REBUILD_PASS',rows:artifact.rows,query_pages:artifact.query_pages,
  has_more:artifact.has_more,sha256:artifact.plaintext_sha256,content_exposed:false,
  notion_physical_restore:false,full_workspace_backup:false,write_operations:0};
}
