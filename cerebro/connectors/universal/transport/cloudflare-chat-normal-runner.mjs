/**
 * FACT-001 · Cloudflare via ChatGPT normal → GitHub Actions → Cloudflare API.
 * ALLOWED OPERATION: fixed account read-only inventory and permissions.
 * No arbitrary URLs, paths, scripts, SQL, or mutations from request data.
 */
import {readFileSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {checkCloudflareReadOnly, ACCOUNT_ID} from '../preflight/cloudflare-readonly.mjs';
import {auditCloudflareAccountScopes} from '../preflight/cloudflare-account-scope-readonly.mjs';

const EXPECTED=Object.freeze({
  company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
  version:'1.0.0',client_id:'chatgpt-normal',account_id:ACCOUNT_ID,
  operation:'account_readonly_audit'
});
const REQUEST_KEYS=Object.freeze([...Object.keys(EXPECTED),'request_id'].sort());
const REQUEST_PATTERN=/^CFN-[0-9]{8}-[0-9]{3}$/;

export function parseAuthorizedOrder(input){
  if(input===null||typeof input!=='object'||Array.isArray(input))throw Error('ORDER_SCHEMA_DENIED');
  if(JSON.stringify(Object.keys(input).sort())!==JSON.stringify(REQUEST_KEYS))throw Error('ORDER_FIELDS_DENIED');
  for(const [key,value] of Object.entries(EXPECTED))if(input[key]!==value)throw Error('ORDER_SCOPE_DENIED');
  if(typeof input.request_id!=='string'||!REQUEST_PATTERN.test(input.request_id))throw Error('ORDER_ID_DENIED');
  return Object.freeze({...input});
}

export async function runReadOnlyOrder(input,{token,http=globalThis.fetch}={}){
  const order=parseAuthorizedOrder(input);
  if(typeof token!=='string'||token.trim()==='')throw Error('AUTH_SECRET_MISSING');
  const inventory=await checkCloudflareReadOnly({token,http});
  const audit=await auditCloudflareAccountScopes({token,http});
  if(!inventory.verified_token_active||!audit.account_id_verified||audit.mutations!==0||inventory.writes_executed!==false)throw Error('PROOF_INCONSISTENT');
  return Object.freeze({
    schema:'cerebro.fact001.cloudflare.chat-normal.readonly-receipt.v1',
    request_id:order.request_id,
    company_id:order.company_id,engine_id:order.engine_id,environment:order.environment,
    version:order.version,client_id:order.client_id,account_id:order.account_id,
    operation:order.operation,
    authenticated:true,
    inventory:{d1_count:inventory.d1_count,facebook_d1_exists:inventory.facebook_d1_exists,facebook_d1_jurisdiction:inventory.facebook_d1_jurisdiction,workers_read_ok:inventory.verified_account_workers_scope,d1_read_ok:inventory.verified_account_d1_scope},
    permissions:audit.scopes,
    audited_get_requests:audit.requests, // excludes separate D1 inventory pagination preflight
    writes:0,token_value_in_output:false,secret_data_in_output:false,
    requested_at_utc:new Date().toISOString()
  });
}

export async function executeLocalEntrypoint({requestFile,outputFile,token,log=console}={}) {
  if(typeof requestFile!=='string'||typeof outputFile!=='string')throw Error('FILES_REQUIRED');
  const req=parseAuthorizedOrder(JSON.parse(readFileSync(requestFile,'utf8')));
  const result=await runReadOnlyOrder(req,{token});
  mkdirSync(dirname(outputFile),{recursive:true});
  writeFileSync(outputFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  log.log(`FACT001_ORDER=${result.request_id}`);
  log.log('FACT001_ACCOUNT_BOUND=true');
  log.log(`FACT001_D1_COUNT=${result.inventory.d1_count}`);
  log.log(`FACT001_FACEBOOK_D1_EXISTS=${result.inventory.facebook_d1_exists}`);
  for(const [key,value] of Object.entries(result.permissions))log.log(`FACT001_SCOPE_${key}=${value}`);
  log.log('FACT001_WRITES=0');
  if(process.env.GITHUB_STEP_SUMMARY){
    const statusRows=Object.entries(result.permissions).map(([k,v])=>`| ${k} | ${v} |`).join('\n');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## FACT-001 Cloudflare · ChatGPT normal → GitHub Actions\n\n**Consulta real, solo lectura.** ID: ${result.request_id}. Cuenta fija: ${result.account_id}.\n\nD1: ${result.inventory.d1_count}; Facebook D1 existe: ${result.inventory.facebook_d1_exists}; escrituras: **0**.\n\n| Servicio | Estado de lectura |\n|---|---|\n${statusRows}\n\nEl fichero de auditoría no contiene credenciales ni datos privados de recursos.\n`);
  }
  return result;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  try{
    await executeLocalEntrypoint({requestFile:resolve(root,'requests/cloudflare-chat-normal-lab.v1.json'),outputFile:resolve(root,'receipts/cloudflare-chat-normal-lab.v1.json'),token:process.env.CEREBRO_CLOUDFLARE_API_TOKEN});
  }catch(error){
    const code=new Set(['ORDER_SCHEMA_DENIED','ORDER_FIELDS_DENIED','ORDER_SCOPE_DENIED','ORDER_ID_DENIED','AUTH_SECRET_MISSING','PROOF_INCONSISTENT','FILES_REQUIRED','TOKEN_NOT_ACTIVE','EXACT_ACCOUNT_CORE_SCOPE_NOT_PROVEN','TOKEN_SECRET_MISSING']).has(error?.message)?error.message:'UPSTREAM_OR_RUNTIME_DENIED';
    console.error('FACT001_BLOCKED='+code);
    process.exitCode=1;
  }
}