// CEREBRO OS | Cloudflare provider physical control canary | LAB ONLY
// No HTTP routes, secrets, bindings, queues, external network, model calls or mutations.
const HEADERS={'content-type':'text/plain; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
export default Object.freeze({
 async fetch() {
  return new Response('Not Found',{status:404,headers:HEADERS});
 },
 async scheduled(controller) {
  // A schedule invocation is intentionally nonproductive and affects no external resource.
  // Cloudflare Worker's native cron can be enabled/disabled independently by the provider.
  if(typeof controller?.cron!=='string')return;
  console.log('CEREBRO_OPERATIVA_CF_LAB_CANARY_SCHEDULE_RECEIVED',
   JSON.stringify({cron:controller.cron,scheduledTime:controller.scheduledTime,
    engine_id:'LAB-CF-CANARY-001',environment:'LAB',external_actions:0}));
 }
});
