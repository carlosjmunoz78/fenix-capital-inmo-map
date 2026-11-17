/**
 * CEREBRO OS · FACT-001 · physical LAB integration proof:
 * Console V0 -> ACTGW-001 -> authenticated CEREBRO adapter -> Universal Core -> Cloudflare API GET.
 * Additive test harness only: NOT deployed to CEREBRO PROD, not a network listener, no mutation methods.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CerebroGatewayV0 } from '../../../console/gateway.mjs';
import { ActionGatewayV1 } from '../../../gateway/action-gateway-v1.mjs';
import { bindConsoleToActionGatewayV1 } from '../../../console/action-gateway-binding-v1.mjs';
import { CloudflareOfficialApi } from '../src/cloudflare.mjs';
import { UniversalConnectorCore, inMemoryIdempotency, createAuditSink } from '../src/core.mjs';
import { makeCerebroAdapter } from '../src/clients.mjs';
import { labFacebookPolicy, cloudflareFreeCostGuard } from '../src/policy.mjs';
import { CLOUDFLARE_ACCOUNT_ID, FACEBOOK_D1 } from '../src/catalog.mjs';

const COMPANY = 'fenix-capital';
const CORE_SCOPE = Object.freeze({company_id:COMPANY,engine_id:'FACT-001',environment:'LAB',version:'0.1.0'});
const CAPABILITIES=Object.freeze([
  ['cloudflare.fact001.d1.list','cloudflare.d1.list','d1_count'],
  ['cloudflare.fact001.workers.list','cloudflare.workers.list','workers_count']
]);
const DENIED=Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',executed:false,detail:'Trusted CEREBRO LAB authorization required'});
const isPlainObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;

export async function runCerebroActgwCloudflareReadOnlyLab({token,http=globalThis.fetch,attestGateway,log=console}={}){
  if(typeof token!=='string'||!token.trim())throw Error('TOKEN_SECRET_MISSING');
  if(typeof http!=='function'||typeof attestGateway!=='function')throw Error('TRUSTED_EXECUTION_REQUIRED');
  // Attestation originates from the trusted runtime, NEVER from model/order payload.
  const assertion=await attestGateway();
  if(!isPlainObject(assertion)||assertion.client_id!=='cerebro'||assertion.account_id!==CLOUDFLARE_ACCOUNT_ID||assertion.environment!=='LAB'||assertion.authorized!==true)
    throw Error('GATEWAY_IDENTITY_DENIED');

  const audit=createAuditSink();
  const cloudflare=new CloudflareOfficialApi({
    tokenProvider:async ({identity})=>{
      if(identity?.client_id!=='cerebro'||identity.identity_ref!=='iam:fenix-owner-lab')throw Error('VAULT_IDENTITY_DENIED');
      return token;
    },http
  });
  const core=new UniversalConnectorCore({cloudflare,authorize:labFacebookPolicy,idempotency:inMemoryIdempotency(),audit:audit.record,costGuard:cloudflareFreeCostGuard});
  const cerebro=makeCerebroAdapter({core,authenticate:async gatewayContext=>
    gatewayContext===assertion?{actor_id:'owner-lab',identity_ref:'iam:fenix-owner-lab'}:null
  });
  const actionGateway=new ActionGatewayV1();
  for(const [actionName,coreName] of CAPABILITIES){
    actionGateway.registerCapability(actionName,async({context,payload})=>{
      if(context.company_id!==COMPANY||context.engine_id!=='ACTGW-001'||context.environment!=='PREPROD'||!isPlainObject(payload)||Object.keys(payload).length!==0)
        return DENIED;
      return cerebro.execute({context:CORE_SCOPE,capability:coreName,input:{}},assertion);
    });
  }
  const consoleGateway=new CerebroGatewayV0({environment:'PREPROD',version:'0.1.0'});
  bindConsoleToActionGatewayV1({consoleGateway,actionGateway});
  const session_id='fact001-cloudflare-ci-readonly';
  consoleGateway.createSession({session_id,company_id:COMPANY});
  const results=[];
  for(let i=0;i<CAPABILITIES.length;i++){
    const [name]=CAPABILITIES[i];
    const r=await consoleGateway.execute({session_id,command:'action.execute',payload:{
      authorized:true,capability:name,payload:{},risk:'LOW',idempotency_key:`cf-fact001-physical-readonly-${i}`,estimated_additional_cost_eur:0,
      requires_prod_write:false,autonomous_prod:false,trading_access:false
    }});
    if(r.status!=='ACTION_EXECUTED'||r.result?.status!=='COMPLETED'||!Array.isArray(r.result.data))throw Error('ACTGW_CLOUDFLARE_E2E_DENIED');
    results.push(r.result.data);
  }
  const records=audit.list();
  if(records.length!==CAPABILITIES.length||records.some(x=>x.client_id!=='cerebro'||x.company_id!==COMPANY||x.environment!=='LAB'||x.outcome!=='COMPLETED'))
    throw Error('CORE_AUDIT_CONTRACT_DENIED');
  if(actionGateway.auditLog().filter(x=>x.type==='ACTION_EXECUTED').length!==CAPABILITIES.length)throw Error('ACTGW_AUDIT_CONTRACT_DENIED');
  if(consoleGateway.auditLog().filter(x=>x.type==='COMMAND_EXECUTED').length!==CAPABILITIES.length)throw Error('CONSOLE_AUDIT_CONTRACT_DENIED');
  const outcome=Object.freeze({
    status:'ISOLATED_CEREBRO_GATEWAY_LAB_REAL_GET_VERIFIED',client_id:'cerebro',company_id:COMPANY,
    account_bound:true,d1_count:results[0].length,workers_count:results[1].length,
    facebook_d1_exists:results[0].some(x=>x.name===FACEBOOK_D1),
    console_commands:CAPABILITIES.length,action_gateway_commands:CAPABILITIES.length,core_audits:records.length,
    cloudflare_reads:CAPABILITIES.length,cloudflare_writes:0,prod_deployed:false
  });
  log.log('CF_CEREBRO_LAB_E2E='+outcome.status);
  for(const [key,value] of Object.entries(outcome)){
    if(['status','company_id','client_id'].includes(key))continue;
    log.log(`CF_CEREBRO_${key.toUpperCase()}=${value}`);
  }
  return outcome;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    // This assertion only proves GitHub Actions LAB runner identity; it is NOT a PROD JWT or a deployed CEREBRO Gateway credential.
    const outcome=await runCerebroActgwCloudflareReadOnlyLab({
      token:process.env.CEREBRO_CLOUDFLARE_API_TOKEN,
      attestGateway:async()=>{
        if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!=='carlosjmunoz78/fenix-capital-inmo-map'||process.env.GITHUB_REF!=='refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109')return null;
        return {client_id:'cerebro',account_id:CLOUDFLARE_ACCOUNT_ID,environment:'LAB',authorized:true};
      }
    });
    if(process.env.GITHUB_STEP_SUMMARY){
      const {appendFileSync}=await import('node:fs');
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### CEREBRO Console → ACTGW → FACT-001 → Cloudflare LAB\n\nResult: ${outcome.status}. D1: ${outcome.d1_count}, Workers: ${outcome.workers_count}. Core/ACTGW/Console audit: ${outcome.core_audits}/${outcome.action_gateway_commands}/${outcome.console_commands}. Writes: **0**. Production deployment: **NO**.\n`);
    }
  }catch(error){
    const code=new Set(['TOKEN_SECRET_MISSING','TRUSTED_EXECUTION_REQUIRED','GATEWAY_IDENTITY_DENIED','ACTGW_CLOUDFLARE_E2E_DENIED','CORE_AUDIT_CONTRACT_DENIED','ACTGW_AUDIT_CONTRACT_DENIED','CONSOLE_AUDIT_CONTRACT_DENIED']).has(error?.message)?error.message:'CEREBRO_CLOUDFLARE_LAB_BLOCKED';
    console.error('CF_CEREBRO_E2E_FAILURE_CODE='+code);
    process.exitCode=1;
  }
}