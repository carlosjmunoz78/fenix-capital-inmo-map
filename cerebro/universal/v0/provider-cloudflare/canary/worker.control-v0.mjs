// CEREBRO OS · Cloudflare isolated control canary V0.2 · Fénix/LAB ONLY.
// No public route, no outbound network, no queues, no DB, no AI.
// CONTROL_PAUSED is an exact provider binding; absence / malformed value FAILS CLOSED.
const HEADERS=Object.freeze({
 'content-type':'text/plain; charset=utf-8',
 'cache-control':'private, no-store',
 'x-content-type-options':'nosniff'
});
export function readCanaryControl(env){
 const raw=env?.CONTROL_PAUSED;
 return Object.freeze({
  company_id:'fenix',engine_id:'LAB-CF-CANARY-001',
  environment:'LAB',version:'0.2.0',
  provider:'CLOUDFLARE_WORKERS',
  control_config_verified:raw==='true'||raw==='false',
  paused:raw!=='false',
  event_dispatch_enabled:false,
  autonomous_scheduler_connected:false,
  external_actions_enabled:false
 });
}
export function canaryScheduleDecision(event,env){
 const state=readCanaryControl(env);
 if(state.paused)return Object.freeze({...state,status:'PAUSED',accepted:false});
 // This worker is permanently inert even when an operator explicitly resumes its internal flag.
 if(typeof event?.cron!=='string'||!Number.isFinite(Number(event?.scheduledTime)))
  return Object.freeze({...state,status:'DENIED_INVALID_EVENT',accepted:false});
 return Object.freeze({...state,status:'INERT_CONTROL_ON',accepted:true,work_units:0});
}
export default Object.freeze({
 async fetch(){
  return new Response('Not Found',{status:404,headers:HEADERS});
 },
 async scheduled(event,env){
  const decision=canaryScheduleDecision(event,env);
  console.log('CEREBRO_OPERATIVA_CANARY_CONTROL_PROOF',JSON.stringify({
   engine_id:decision.engine_id,environment:decision.environment,version:decision.version,
   status:decision.status,accepted:decision.accepted,external_actions:0,
   scheduled_time:typeof event?.scheduledTime==='number'?event.scheduledTime:null
  }));
  return decision.status;
 }
});
