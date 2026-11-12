// FACT-001 isolated Recovery D1 heartbeat queue admission. No arbitrary provider or SQL.
export const GATEWAY_D1_ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const GATEWAY_D1_DATABASE='1305f791-7c44-47f9-946b-f330a09c88aa';
export const GATEWAY_D1_VAULT='cerebro_cf_gateway_recovery_d1_write_lab_20261111';
export const GATEWAY_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
export const GATEWAY_SIGNED_ID='FACT001-CF-GW-SIGNED-20261111-001';
export const GATEWAY_SESSION_ID='FACT001-CF-GW-SESSION-20261111-001';
const fields=['company_id','engine_id','environment','version','operation','request_id','max_cost_eur'];
export function assertGatewayQueueOrder(body,mode){
 if(!body||typeof body!=='object'||Array.isArray(body)||
   JSON.stringify(Object.keys(body).sort())!==JSON.stringify(fields.slice().sort())||
   Object.entries(GATEWAY_SCOPE).some(([k,v])=>body[k]!==v)||body.operation!=='fact001.lab.heartbeat'||
   body.max_cost_eur!==0||!['signed','owner'].includes(mode)||
   body.request_id!==(mode==='signed'?GATEWAY_SIGNED_ID:GATEWAY_SESSION_ID))
  throw Error('GATEWAY_QUEUE_ORDER_DENIED');
 return body.request_id;
}
export const INSERT_HEARTBEAT=`INSERT INTO fact001_runner_jobs_v1
 (id,company_id,engine_id,environment,version,client_id,operation,payload_hash)
 VALUES (?1,'fenix-capital','FACT-001','LAB','1.0.0','cerebro','fact001.lab.heartbeat',?2)
 ON CONFLICT(id) DO NOTHING RETURNING id,state,attempts`;
export const GET_HEARTBEAT=`SELECT id,company_id,engine_id,environment,version,client_id,operation,payload_hash,state,attempts
 FROM fact001_runner_jobs_v1 WHERE id=?1 LIMIT 1`;
export const CONFIG_QUERY=`SELECT enabled,max_jobs_per_tick FROM fact001_runner_config_v1 WHERE id=1`;
