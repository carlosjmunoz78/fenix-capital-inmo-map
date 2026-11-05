#!/usr/bin/env node
/**
 * CUT27 Cloudflare EU LAB operator entrypoint.
 *
 * Read-only by default. Run on an authenticated cloud workstation/runner,
 * never with a token pasted in chat, CLI arguments or git configuration.
 * Secret scope: Cloudflare D1 Write on ONE approved account, short expiry.
 *
 * Inspect:
 *   CLOUDFLARE_API_TOKEN_JARVIS=<protected-environment> node provision-eu-d1-cli.mjs
 *
 * Explicit create (only after independent FREE account/cost check):
 *   JARVIS_EU_CREATE_APPROVED=YES ... node provision-eu-d1-cli.mjs --create
 *
 * Does NOT run in GitHub CI, create a public Worker, alter DNS, migrate schema,
 * enroll an owner, or promote production. No automatic retries.
 */
import {createJarvisEuD1Provisioner} from '../core/jarvis-cloudflare-eu-d1-provisioner.mjs';

const args=process.argv.slice(2);
if(args.some(a=>a!=='--create')){
 console.error('CUT27_INVALID_MODE');
 process.exitCode=2;
}else{
 const mode=args.includes('--create')?'create':'inspect';
 const token=process.env.CLOUDFLARE_API_TOKEN_JARVIS;
 if(!token){
  console.error('CUT27_NEEDS_PROTECTED_CLOUDFLARE_TOKEN');
  process.exitCode=2;
 }else{
  try{
   const adapter=createJarvisEuD1Provisioner({
    enabled:true,environment:'LAB',fetchImpl:fetch,apiToken:token
   });
   const result=await adapter.run({mode,
    approved:mode==='create'&&process.env.JARVIS_EU_CREATE_APPROVED==='YES',
    confirmation:mode==='create'?'CREATE_JARVIS_EU_LAB':undefined});
   // Whitelist only non-secret attributes. Do not print cloud response.
   console.log(JSON.stringify({
    state:result.state,
    environment:result.environment,
    deployAllowed:false,prod:'NO_GO',
    ...(result.databaseId?{databaseId:result.databaseId}:{})
   }));
   if(!['NEW_EU_D1_CREATED_UNMIGRATED','EXISTING_EU_VERIFIED_NO_WRITE',
         'MISSING_EU_D1_NO_WRITE'].includes(result.state))
    process.exitCode=1;
  }catch{
   console.error('CUT27_SECURE_ADAPTER_UNAVAILABLE');
   process.exitCode=2;
  }
 }
}
