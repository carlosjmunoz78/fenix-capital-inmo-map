// Small fixed order. No source ciphertext or URLs arrive from caller.
export const INDEX_SHA='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
export const PREVIOUS_SHA='e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65';
export const ORDER={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.next_batch.plan_live_index',request_id:'FACT001-NOTION-SECOND-BATCH-LIVE-20261111',offset:25,max_items:25,previous_zip_sha256:PREVIOUS_SHA,index_sha256:INDEX_SHA};
export function assertOrder(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||JSON.stringify(Object.keys(x).sort())!==JSON.stringify(Object.keys(ORDER).sort())||Object.entries(ORDER).some(([k,v])=>x[k]!==v))throw Error('ORDER_DENIED');
 return true;
}