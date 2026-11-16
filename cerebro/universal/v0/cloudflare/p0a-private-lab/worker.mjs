/** CEREBRO OPERATIVA P0-A PRIVATE LAB · initial fail-closed transport probe.
 * No public fetch execution, no secrets, no Auth side effects, no scheduled/queue triggers.
 * Workflow instances are invoked only through the authenticated Cloudflare account API.
 */
import {WorkflowEntrypoint} from 'cloudflare:workers';
export class CerebroP0AAuthWorkflow extends WorkflowEntrypoint {
  async run(_event, step) {
    return await step.do('p0a-preflight-disabled', {retries:{limit:0,delay:'1 second',backoff:'constant'},timeout:'60 seconds'}, async () => ({
      status:'BLOCKED_AUTH_NOT_CONFIGURED',
      environment:'LAB',
      project_ref:'hnqlnvakzaywtafeiybt',
      owner_auth_test:'NOT_RUN',
      no_users_created:true,
      prod_execution:'DISABLED',
      temp_user_cleanup:'NOT_NEEDED'
    }));
  }
}
export default {
  fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});}
};
