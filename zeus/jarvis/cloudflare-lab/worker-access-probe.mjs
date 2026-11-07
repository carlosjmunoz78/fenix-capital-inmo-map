/**
 * CUT30 Cloudflare LAB canary entrypoint. No D1, no B2/B3 grants, no mission.
 * Initial Wrangler deploy with workers_dev=false / routes=[] cannot be reached
 * from the Internet. To expose a probe later, Access must be attached FIRST
 * and its audience/owner secret must be verified in an independent acceptance.
 */
import {createJarvisAccessOwnerCanary} from '../core/jarvis-access-owner-canary.mjs';
const canary=createJarvisAccessOwnerCanary({enabled:true,environment:'LAB'});
export default {fetch(request,env,ctx){return canary.fetch(request,env,ctx)}};
