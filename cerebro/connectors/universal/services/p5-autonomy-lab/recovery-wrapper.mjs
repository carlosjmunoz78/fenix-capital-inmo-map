// FACT-001 P5 composition: old recovery runner is byte-identical and executes unchanged.
// New read-only scheduled P5 module uses the SAME existing cron and D1 runtime.
// Rollback = redeploy original Cloudflare Worker version a9caa600-c26d-4368-b060-57275f983963.
import recovery from './legacy-recovery.mjs';
import {scheduledP5} from './worker.mjs';
export default {
 fetch(request,env,ctx){return recovery.fetch(request,env,ctx);},
 scheduled(controller,env,ctx){
  recovery.scheduled(controller,env,ctx);
  ctx.waitUntil(scheduledP5(env,controller.scheduledTime).then(v=>{
   console.log('FACT001_P5_SCHEDULED='+v.status);
  }).catch(()=>{console.log('FACT001_P5_SCHEDULED=RECONCILE');}));
 }
};
