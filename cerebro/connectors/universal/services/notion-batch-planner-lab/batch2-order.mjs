// FACT-001 batch planner: pure allowlist, read-only, no arbitrary offsets or provider endpoints.
export const SOURCE_SHA='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
export const PREVIOUS_SHA='e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65';
export const EXPECTED={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.content_batch.plan',request_id:'FACT001-NOTION-SECOND-BATCH-PLAN-20261111',offset:25,max_items:25,previous_zip_sha256:PREVIOUS_SHA,expected_index_sha256:SOURCE_SHA};
export function assertBatch2Order(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('FACT001_ORDER_DENIED');
 const required=[...Object.keys(EXPECTED),'index_artifact'];
 if(JSON.stringify(Object.keys(body).sort())!==JSON.stringify(required.sort())||Object.entries(EXPECTED).some(([k,v])=>body[k]!==v))throw Error('FACT001_ORDER_DENIED');
 const a=body.index_artifact;
 if(!a||typeof a!=='object'||Array.isArray(a)||a.status!=='FACT001_NOTION_INDEX_ENCRYPTED'||a.object_count!==6632||a.page_count!==6446||a.data_source_count!==186||a.search_index_complete!==true||a.id_list_sha256!==SOURCE_SHA||a.envelope?.format!=='FACT001-NOTION-INDEX-MANIFEST-AES256GCM-V1')throw Error('FACT001_INDEX_DENIED');
 return a;
}