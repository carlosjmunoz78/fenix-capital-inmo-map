// FACT-001 · Independent CEREBRO Notion search-index inventory (READ-ONLY).
// A paginated search is NOT a full-workspace backup. This probe returns only
// aggregate metadata and deterministic hashes, never page contents, titles or secrets.
// Notion-Version 2026-03-11 search returns pages and data sources; rows/blocks/assets
// require separate authenticated enumerators and an independent restore drill.
import {NOTION_OPENED_ROOTS} from './notion-root-access.mjs';
import {NOTION_BATCH2_ROOTS} from './notion-batch2-access.mjs';
import {NOTION_BATCH3_ROOTS} from './notion-batch3-access.mjs';
const API='https://api.notion.com/v1/search';
const knownIds=new Set([...NOTION_OPENED_ROOTS,...NOTION_BATCH2_ROOTS,...NOTION_BATCH3_ROOTS].map(x=>x.id));
if(knownIds.size!==58)throw Error('FACT001_KNOWN_ROOTS_DRIFT');
const validToken=x=>typeof x==='string'&&x.length>=24&&x.length<=8192&&!/\s/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const digest=async text=>{
 const d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 return Array.from(d,x=>x.toString(16).padStart(2,'0')).join('');
};
export async function inventoryNotionSearchIndex({token,http=fetch,maxPages=70}={}){
 if(!validToken(token)||!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>70)
   throw Error('FACT001_NOTION_INVENTORY_INPUT_DENIED');
 const observed=new Set();
 const kinds={page:0,data_source:0,database:0};
 const parents={workspace:0,page_id:0,database_id:0,data_source_id:0,other:0};
 const cursors=new Set();
 let cursor=null,requests=0,hasMore=true;
 while(hasMore&&requests<maxPages){
  if(requests>0&&http===fetch)await new Promise(resolve=>setTimeout(resolve,380));
  const payload={page_size:100,...(cursor?{start_cursor:cursor}:{})};
  let response;
  try{response=await http(API,{method:'POST',headers:{Authorization:'Bearer '+token,
   'Notion-Version':'2026-03-11',Accept:'application/json','Content-Type':'application/json'},
   body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(14500)});}
  catch{throw Error('FACT001_NOTION_SEARCH_NETWORK_UNVERIFIED');}
  if(response.status===401||response.status===403)throw Error('FACT001_NOTION_SEARCH_AUTH_DENIED');
  if(response.status!==200)throw Error('FACT001_NOTION_SEARCH_UPSTREAM_'+response.status);
  let data;try{data=await response.json()}catch{throw Error('FACT001_NOTION_SEARCH_RESPONSE_INVALID');}
  if(!data||!Array.isArray(data.results)||data.results.length>100||typeof data.has_more!=='boolean'||
    (data.has_more&&(!data.next_cursor||typeof data.next_cursor!=='string')))
    throw Error('FACT001_NOTION_SEARCH_PAGE_INVALID');
  for(const item of data.results){
   if(!uuid(item?.id)||!['page','data_source','database'].includes(item.object)||observed.has(item.id))
     throw Error('FACT001_NOTION_SEARCH_RESULT_INVALID');
   observed.add(item.id);
   kinds[item.object]++;
   const kind=item.parent?.type;
   if(Object.prototype.hasOwnProperty.call(parents,kind))parents[kind]++;
   else parents.other++;
  }
  requests++;hasMore=data.has_more;cursor=data.next_cursor;
  if(hasMore){if(cursors.has(cursor))throw Error('FACT001_NOTION_PAGINATION_CYCLE');cursors.add(cursor);}
 }
 const sorted=[...observed].sort();
 const knownMatched=sorted.filter(x=>knownIds.has(x)).length;
 const other=sorted.length-knownMatched;
 return {status:hasMore?'PARTIAL_SEARCH_INDEX_LIMIT_REACHED':'SEARCH_INDEX_INVENTORY_COMPLETE',
  scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},
  inventory:{searchable_total:sorted.length,page_count:kinds.page,data_source_count:kinds.data_source,
    database_count:kinds.database,index_parent_kinds:parents,
    previously_verified_root_ids:58,known_roots_appearing_in_search:knownMatched,
    other_searchable_objects:other,api_requests:requests,
    has_more:hasMore,search_index_sha256:await digest(sorted.join('\n'))},
  limitations:['SEARCH_RESULTS_ARE_NOT_FULL_WORKSPACE','NOT_A_BLOCK_OR_DATA_SOURCE_ROW_EXPORT',
   'NOT_A_FILE_BINARY_BACKUP','NO_ARCHIVED_TRASH_PARITY','NO_RESTORE_DRILL'],
  complete_workspace_backup:false,eligible_for_prod_promotion:false,
  data_content_returned:false,credentials_exposed:false,external_writes:0};
}
