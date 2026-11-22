// FACT-001 / Encrypted Notion content backup pilot. READ ONLY; no cloud writes.
// Exports one fixed Wiki page object + its first block-children page, AES-256-GCM.
// Never return raw content, titles, signed asset URLs or decrypted key to caller.
// Does NOT claim backup of nested blocks, database records or binary assets.
export const NOTION_PILOT_KEY_NAME='cerebro_fact001_notion_backup_aes256_lab_v1';
export const NOTION_PILOT_PAGE_ID='1c481b1a-756d-8002-813d-f3efdd4ecd89';
const NOTION_VERSION='2026-03-11';
const PREFIX='FACT001-NOTION-ENCRYPTED-PILOT-V1';
const encoder=new TextEncoder();
const decoder=new TextDecoder();
const hexBytes=s=>{
 if(typeof s!=='string'||!/^[0-9a-f]{64}$/.test(s))throw Error('FACT001_AES_KEY_INVALID');
 return Uint8Array.from(s.match(/../g),h=>parseInt(h,16));
};
const toBase64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.slice(i,i+8192));return btoa(s);};
const fromBase64=s=>{
 if(typeof s!=='string'||s.length>6500000||!/^[a-zA-Z0-9+/]*={0,2}$/.test(s))throw Error('FACT001_CIPHERTEXT_INVALID');
 let x;try{x=atob(s)}catch{throw Error('FACT001_CIPHERTEXT_INVALID');}
 return Uint8Array.from(x,ch=>ch.charCodeAt(0));
};
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const importKey=async secret=>crypto.subtle.importKey('raw',hexBytes(secret),{name:'AES-GCM'},false,['encrypt','decrypt']);
async function notionGet(url,token,http){
 let r;try{r=await http(url,{method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':NOTION_VERSION,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});}
 catch{throw Error('FACT001_NOTION_PILOT_NETWORK_FAILED');}
 if(r.status===401||r.status===403)throw Error('FACT001_NOTION_PILOT_AUTH_DENIED');
 if(r.status!==200)throw Error('FACT001_NOTION_PILOT_UPSTREAM_'+r.status);
 try{return await r.json()}catch{throw Error('FACT001_NOTION_PILOT_JSON_INVALID');}
}
export async function encryptNotionPilot({notionToken,encryptionKey,http=fetch,random=crypto.getRandomValues.bind(crypto)}={}){
 if(typeof notionToken!=='string'||notionToken.length<24||notionToken.length>8192||/\s/.test(notionToken))throw Error('FACT001_NOTION_TOKEN_INVALID');
 const key=await importKey(encryptionKey);
 const url='https://api.notion.com/v1/';
 const page=await notionGet(url+'pages/'+NOTION_PILOT_PAGE_ID,notionToken,http);
 if(page?.object!=='page'||page.id!==NOTION_PILOT_PAGE_ID)throw Error('FACT001_NOTION_PAGE_ID_MISMATCH');
 const blocks=await notionGet(url+'blocks/'+NOTION_PILOT_PAGE_ID+'/children?page_size=100',notionToken,http);
 if(!Array.isArray(blocks?.results)||blocks.results.length>100||typeof blocks.has_more!=='boolean'||(blocks.has_more&&typeof blocks.next_cursor!=='string'))
  throw Error('FACT001_NOTION_BLOCKS_INVALID');
 const nested=blocks.results.filter(x=>x.has_children===true).length;
 const media=blocks.results.filter(x=>['image','video','audio','file','pdf'].includes(x.type)).length;
 const plaintext=encoder.encode(JSON.stringify({format:PREFIX,scope:{company_id:'fenix-capital',engine_id:'FACT-001',
  environment:'LAB',version:'1.0.0'},page_id:NOTION_PILOT_PAGE_ID,page,blocks:blocks.results,
  remaining_blocks:blocks.has_more,remaining_cursor:blocks.has_more?blocks.next_cursor:null,
  nested_blocks:nested,media_blocks:media}));
 if(plaintext.length>4500000)throw Error('FACT001_NOTION_PILOT_CHUNK_TOO_LARGE');
 const nonce=new Uint8Array(12);
 random(nonce);
 if(nonce.every(x=>x===0))throw Error('FACT001_NOTION_PILOT_NONCE_INVALID');
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:encoder.encode(PREFIX)},key,plaintext));
 const digest=await hash(plaintext);
 return {status:'FACT001_NOTION_AES256_GCM_PILOT',scope:'fenix-capital/FACT-001/LAB/1.0.0',
  page_id:NOTION_PILOT_PAGE_ID,algorithm:'AES-256-GCM',key_location:'SUPABASE_VAULT_ONLY',
  plaintext_sha256:digest,plaintext_bytes:plaintext.length,block_count:blocks.results.length,
  nested_block_count:nested,media_block_count:media,remaining_blocks:blocks.has_more,
  full_workspace_backup:false,notion_restore_performed:false,external_provider_writes:0,
  envelope:{format:PREFIX,nonce_b64:toBase64(nonce),ciphertext_b64:toBase64(ciphertext)}};
}
export async function verifyEncryptedNotionPilot({encryptionKey,artifact}={}){
 if(!artifact||artifact.status!=='FACT001_NOTION_AES256_GCM_PILOT'||
  artifact.page_id!==NOTION_PILOT_PAGE_ID||artifact.envelope?.format!==PREFIX||
  !/^[0-9a-f]{64}$/.test(artifact.plaintext_sha256||''))throw Error('FACT001_PILOT_ARTIFACT_DENIED');
 const key=await importKey(encryptionKey);
 const iv=fromBase64(artifact.envelope.nonce_b64);
 const blob=fromBase64(artifact.envelope.ciphertext_b64);
 if(iv.length!==12||blob.length<17||blob.length>5500000)throw Error('FACT001_PILOT_ENVELOPE_DENIED');
 let bytes;
 try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(PREFIX)},key,blob));}
 catch{throw Error('FACT001_PILOT_AUTHENTICITY_FAILURE');}
 const digest=await hash(bytes);
 if(digest!==artifact.plaintext_sha256||bytes.length!==artifact.plaintext_bytes)
  throw Error('FACT001_PILOT_INTEGRITY_FAILURE');
 let parsed;try{parsed=JSON.parse(decoder.decode(bytes))}catch{throw Error('FACT001_PILOT_CONTENT_INVALID');}
 if(parsed.format!==PREFIX||parsed.page_id!==NOTION_PILOT_PAGE_ID||parsed.page?.id!==NOTION_PILOT_PAGE_ID||
   !Array.isArray(parsed.blocks)||parsed.blocks.length!==artifact.block_count||
   parsed.scope?.environment!=='LAB'||parsed.scope?.company_id!=='fenix-capital')throw Error('FACT001_PILOT_SCOPE_DENIED');
 return {status:'FACT001_PILOT_ENCRYPTED_ROUNDTRIP_VERIFIED',sha256:digest,
  block_count:parsed.blocks.length,plaintext_bytes:bytes.length,
  nested_blocks:parsed.nested_blocks,remaining_blocks:parsed.remaining_blocks,
  provider_restore_performed:false,full_workspace_backup:false,
  sensitive_content_returned:false,write_operations:0};
}
