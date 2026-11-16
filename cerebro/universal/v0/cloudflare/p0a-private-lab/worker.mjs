/** CEREBRO P0-A · Private Workflow, no HTTP execution and no scheduled triggers. */
import {WorkflowEntrypoint} from 'cloudflare:workers';
import {runLabP0ACycle} from './cycle.mjs';
const blocked=status=>({status,environment:'LAB',owner_auth_test:'NOT_RUN',
  no_users_created:true,prod_execution:'DISABLED',temp_user_cleanup:'NOT_NEEDED'});
export class CerebroP0AAuthWorkflow extends WorkflowEntrypoint {
  async run(event,step){
    if(this.env.CEREBRO_P0A_ENABLED!=='true')return blocked('BLOCKED_DISABLED');
    if(event?.payload?.intent!=='LAB_AUTH_E2E_ONE_SHOT')
      return blocked('BLOCKED_NO_EXPLICIT_ONE_SHOT_INTENT');
    return step.do('p0a-lab-one-shot-private',
      {retries:{limit:0,delay:'1 second',backoff:'constant'},timeout:'120 seconds'},
      async()=>runLabP0ACycle(this.env));
  }
}
export default {
  fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});}
};
