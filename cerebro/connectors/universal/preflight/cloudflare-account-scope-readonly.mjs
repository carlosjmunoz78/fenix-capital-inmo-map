/**
 * FACT-001 universal Cloudflare account capability preflight.
 * Physical probe is GET-only; it NEVER executes mutations, prints upstream
 * response bodies, headers, account-private metadata, or credentials.
 * Exact account fixed. Missing permission != absence of a Cloudflare product.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const ACCOUNT_ID = 'e39a57e1ac42650ca5a6d5307cf0ac8e';
const ORIGIN = 'https://api.cloudflare.com/client/v4';
const SAFE_ZONE_ID = /^[a-f0-9]{32}$/i;
const CHECKS = Object.freeze([
  ['ACCOUNT', a => `/accounts/${a}`],
  ['D1', a => `/accounts/${a}/d1/database?page=1&per_page=1`],
  ['WORKERS', a => `/accounts/${a}/workers/scripts`],
  ['WORKERS_DOMAINS', a => `/accounts/${a}/workers/domains`],
  ['WORKERS_SETTINGS', a => `/accounts/${a}/workers/account-settings`],
  ['KV', a => `/accounts/${a}/storage/kv/namespaces?page=1&per_page=1`],
  ['R2', a => `/accounts/${a}/r2/buckets?per_page=1`],
  ['PAGES', a => `/accounts/${a}/pages/projects?per_page=1`],
  ['ACCESS', a => `/accounts/${a}/access/apps?per_page=1`],
  ['LOGPUSH', a => `/accounts/${a}/logpush/jobs`]
]);
const ZONE_CHECKS = Object.freeze([
  ['DNS', zone => `/zones/${zone}/dns_records?per_page=1`],
  ['ZONE_SETTINGS', zone => `/zones/${zone}/settings/ssl`],
  ['WAF_RULESETS', zone => `/zones/${zone}/rulesets`],
  ['WORKER_ROUTES', zone => `/zones/${zone}/workers/routes`]
]);
const assertCode = s => /^[A-Z0-9_]+$/.test(s);

export function sanitizeResponseStatus(response, body) {
  if (response.status === 401 || response.status === 403) return 'PERMISSION_BLOCKED';
  if (response.status === 404 || response.status === 400) return 'NOT_AVAILABLE_OR_ENDPOINT';
  if (response.status === 429) return 'RATE_LIMITED';
  if (!response.ok) return 'HTTP_ERROR';
  if (body?.success !== true) return 'API_REJECTED';
  return 'READ_OK';
}

export async function auditCloudflareAccountScopes({token, http = globalThis.fetch, timeoutMs=15000}={}) {
  if (typeof token !== 'string' || !token.trim()) throw new Error('TOKEN_SECRET_MISSING');
  if (typeof http !== 'function') throw new Error('HTTP_ADAPTER_REQUIRED');
  if(!Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>60000) throw new Error('INVALID_TIMEOUT');
  let requests = 0;
  const query=async path => {
    if(typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('..') || /:\/\//.test(path))throw new Error('INVALID_PATH');
    requests++;
    try {
      const response=await http(`${ORIGIN}${path}`,{
        method:'GET',
        headers: {'Authorization': `Bearer ${token}`, 'Accept':'application/json'},
        redirect:'error',
        signal: AbortSignal.timeout(timeoutMs)
      });
      let body=null;
      if (response.ok) {
        try { body = await response.json(); } catch {return {status:'RESPONSE_INVALID'};}
      }
      return {status:sanitizeResponseStatus(response, body), body: response.ok ? body : null};
    } catch { return {status:'NETWORK_OR_TIMEOUT'}; }
  };
  const verification=await query('/user/tokens/verify');
  if(verification.status!=='READ_OK' || verification.body?.result?.status!=='active')throw new Error('TOKEN_NOT_ACTIVE');
  const scopes={TOKEN:'READ_OK'};
  let halted=false;
  for (const [name, makePath] of CHECKS){
    if(halted){scopes[name]='NOT_CHECKED';continue;}
    const result=await query(makePath(ACCOUNT_ID));
    scopes[name]=result.status;
    if(result.status==='RATE_LIMITED')halted=true;
  }
  if(scopes.D1!=='READ_OK' || scopes.WORKERS!=='READ_OK')throw new Error('EXACT_ACCOUNT_CORE_SCOPE_NOT_PROVEN');
  if(!halted){
    const zoneList=await query(`/zones?account.id=${ACCOUNT_ID}&per_page=1&page=1`);
    scopes.ZONES=zoneList.status;
    if(zoneList.status==='RATE_LIMITED')halted=true;
    if(zoneList.status==='READ_OK'){
      const zones=zoneList.body?.result;
      if(!Array.isArray(zones) || zones.some(z=>z?.account?.id!==ACCOUNT_ID))throw new Error('CROSS_ACCOUNT_ZONE_RESPONSE');
      if(zones.length && SAFE_ZONE_ID.test(zones[0]?.id??'')){
        const zoneId=zones[0].id;
        scopes.ZONE_SCOPE='EXACT_ACCOUNT';
        for (const [name,makePath] of ZONE_CHECKS){
          if(halted){scopes[name]='NOT_CHECKED';continue;}
          const r=await query(makePath(zoneId));
          scopes[name]=r.status;
          if(r.status==='RATE_LIMITED')halted=true;
        }
      } else scopes.ZONE_SCOPE='NO_ZONE_IN_FIRST_PAGE';
    }
  } else scopes.ZONES='NOT_CHECKED';
  for(const k of Object.keys(scopes))if(!assertCode(k) || !assertCode(scopes[k]))throw new Error('INTERNAL_STATUS_INVALID');
  return Object.freeze({account_id_verified:true,requests,scopes:Object.freeze(scopes),mutations:0,raw_credentials_logged:false,partial:halted});
}

async function main(){
  try {
    const result=await auditCloudflareAccountScopes({token:process.env.CEREBRO_CLOUDFLARE_API_TOKEN});
    console.log('CF_UNIVERSAL_ACCOUNT_VERIFIED=true');
    console.log(`CF_UNIVERSAL_GET_REQUESTS=${result.requests}`);
    for(const [name,status] of Object.entries(result.scopes))console.log(`CF_SCOPE_${name}=${status}`);
    console.log('CF_UNIVERSAL_MUTATIONS=0');
    if(process.env.GITHUB_STEP_SUMMARY){
      const {appendFileSync}=await import('node:fs');
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### FACT-001 universal Cloudflare GET-only permission audit\n\n${Object.entries(result.scopes).map(([key,status])=>`- ${key}: ${status}`).join('\n')}\n\nNo account resource details or secrets in logs. Requests: ${result.requests}; writes: 0.\n`);
    }
  }catch(error){
    const allowed=new Set(['TOKEN_SECRET_MISSING','TOKEN_NOT_ACTIVE','EXACT_ACCOUNT_CORE_SCOPE_NOT_PROVEN','CROSS_ACCOUNT_ZONE_RESPONSE','INVALID_PATH','HTTP_ADAPTER_REQUIRED','INVALID_TIMEOUT','INTERNAL_STATUS_INVALID']);
    const code=allowed.has(error?.message)?error.message:'UNEXPECTED_FAILURE';
    console.error(`CF_UNIVERSAL_BLOCKED=${code}`);
    process.exitCode=1;
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();