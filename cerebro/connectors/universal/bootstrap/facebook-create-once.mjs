/**
 * Single-purpose, one-shot GitHub Actions bootstrap for the isolated FB D1.
 * Not an MCP client, not a CEREBRO Gateway session. Never mark dual acceptance.
 * GitHub ledger is a durable reservation and blocks automatic retries.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { GitHubRefLedger, fingerprintOf } from './github-ledger.mjs';
import { CloudflareOfficialApi } from '../src/cloudflare.mjs';
import { CLOUDFLARE_ACCOUNT_ID, FACEBOOK_D1, getCapability } from '../src/catalog.mjs';
import { checkCloudflareReadOnly } from '../preflight/cloudflare-readonly.mjs';

const KEY='github-actions:iam:fenix-owner-lab:fenix-capital:LAB:facebook-eu-create-v0';
const CONTEXT={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'};
const TARGET={name:FACEBOOK_D1,jurisdiction:'eu',confirm_isolated:true};
const ACTION=getCapability('cloudflare.d1.create-facebook-lab-eu');
const EXPECTED_BASE_BRANCH='cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109';
const verifiedPlanEvidence={
  account_id:'e39a57e1ac42650ca5a6d5307cf0ac8e',
  plan:'Workers Free',observed_date:'2026-11-09',source:'Cloudflare authenticated Billing/Subscriptions UI',
  evidence_path:'cerebro/connectors/universal/docs/CHATGPT_PRIVATE_PLUGIN_EVIDENCE_2026-11-09.md'
};

export class FacebookCreateError extends Error {constructor(code){super(code);this.code=code;}}
export function allowFreeMutation({now=new Date(),evidence=verifiedPlanEvidence,preflight}){
  const today=now.toISOString().slice(0,10);
  return today===evidence?.observed_date && evidence?.plan==='Workers Free' &&
    evidence?.account_id===CLOUDFLARE_ACCOUNT_ID && evidence?.source==='Cloudflare authenticated Billing/Subscriptions UI' &&
    preflight?.verified_token_active===true && preflight?.verified_account_d1_scope===true &&
    preflight?.verified_account_workers_scope===true &&
    preflight?.facebook_d1_exists===false && Number.isInteger(preflight?.d1_count) &&
    preflight.d1_count>=0 && preflight.d1_count<10 && preflight.writes_executed===false;
}

export async function runFacebookOnce({env=process.env,http=globalThis.fetch,now=new Date(),ledger,api,preflightFn=checkCloudflareReadOnly}={}){
  const branch=env.GITHUB_REF_NAME, repo=env.GITHUB_REPOSITORY;
  if(branch!==EXPECTED_BASE_BRANCH || repo!=='carlosjmunoz78/fenix-capital-inmo-map' || env.GITHUB_EVENT_NAME!=='push')throw new FacebookCreateError('UNAUTHORIZED_RUN_CONTEXT');
  if(env.CEREBRO_FACEBOOK_D1_WRITE_ARMED!=='YES_LAB_ONLY_2026_11_09')throw new FacebookCreateError('NOT_ARMED');
  if(!env.CEREBRO_CLOUDFLARE_API_TOKEN||!env.GITHUB_TOKEN)throw new FacebookCreateError('MISSING_SECRETS');
  const preflight=await preflightFn({token:env.CEREBRO_CLOUDFLARE_API_TOKEN,http});
  if(!allowFreeMutation({now,preflight}))throw new FacebookCreateError('FREE_GATE_NOT_ATTESTED');
  const store=ledger??new GitHubRefLedger({token:env.GITHUB_TOKEN,repo,baseCommit:env.GITHUB_SHA,http});
  if(store.durable!==true)throw new FacebookCreateError('DURABLE_LEDGER_REQUIRED');
  const identity={client_id:'github-actions-bootstrap',actor_id:'fenix-owner-authorized',identity_ref:'iam:fenix-owner-lab'};
  const operation={capability:ACTION.id,scope:CONTEXT,input:TARGET};
  const fingerprint=fingerprintOf(operation);
  const claimed=await store.claim(KEY,fingerprint);
  if(claimed.status==='CONFLICT')throw new FacebookCreateError('INTENT_CONFLICT');
  if(claimed.status==='PENDING')throw new FacebookCreateError('PREVIOUS_UNCERTAIN_INTENT_RECONCILE_MANUALLY');
  if(claimed.status==='REPLAY')return {status:'ALREADY_COMPLETED_PERSISTED',uuid:claimed.result.uuid};
  if(claimed.status!=='CLAIMED')throw new FacebookCreateError('LEDGER_UNEXPECTED_STATUS');
  // A write may have happened by the time a response arrives, therefore never auto-retry on errors.
  const cloudflare=api??new CloudflareOfficialApi({tokenProvider:async()=>env.CEREBRO_CLOUDFLARE_API_TOKEN,http});
  const output=await cloudflare.perform({action:ACTION,input:TARGET,identity,scope:CONTEXT});
  if(!['COMPLETED','ALREADY_EXISTS_VERIFIED'].includes(output.status) || output.name!==FACEBOOK_D1||output.jurisdiction!=='eu'||!output.uuid)throw new FacebookCreateError('D1_NOT_VERIFIED');
  await store.complete(KEY,fingerprint,output);
  return {status:output.status,uuid:output.uuid,jurisdiction:output.jurisdiction,name:output.name,verified:true};
}

async function main(){
 try{
  const result=await runFacebookOnce();
  console.log(`CF_FACEBOOK_CREATE_STATUS=${result.status}`);
  console.log(`CF_FACEBOOK_D1_UUID=${result.uuid}`); // nonsecret resource identifier
  console.log('CF_FACEBOOK_WORKER_DEPLOYED=false');
  console.log('CF_FACEBOOK_DB_MIGRATED=false');
  console.log('CF_FACEBOOK_PUBLIC_ROUTES=false');
 }catch(e){
  console.error(`CF_FACEBOOK_CREATE_BLOCKED=${e?.code??'UNKNOWN'}`);
  console.error('CF_FACEBOOK_AUTOMATIC_RETRY=FORBIDDEN');
  process.exitCode=1;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();