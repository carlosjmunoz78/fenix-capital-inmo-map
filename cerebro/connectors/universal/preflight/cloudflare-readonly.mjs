/**
 * FACT-001 Cloudflare Universal read-only physical attestation.
 * Performs ONLY HTTP GET to official Cloudflare API using an injected GitHub Actions secret.
 * Do not add mutation endpoints. Fail closed; never print upstream responses or credentials.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const ACCOUNT_ID = 'e39a57e1ac42650ca5a6d5307cf0ac8e';
export const FACEBOOK_D1_NAME = 'cerebro-facebook-autoqual-lab';
const API = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 15000;

export class PreflightError extends Error {
  constructor(code) { super(code); this.name='PreflightError'; this.code=code; }
}
async function readCloudflare(path, token, http) {
  if (!path.startsWith('/') || path.includes('..') || path.startsWith('//')) throw new PreflightError('INVALID_PATH');
  let response;
  try {
    response = await http(`${API}${path}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept':'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch { throw new PreflightError('NETWORK_OR_TIMEOUT'); }
  if (!response?.ok) throw new PreflightError(`HTTP_${response?.status ?? 'UNKNOWN'}`);
  let body;
  try {body=await response.json();} catch {throw new PreflightError('INVALID_JSON');}
  if (!body || body.success !== true) throw new PreflightError('API_SUCCESS_FALSE');
  return body;
}
export async function checkCloudflareReadOnly({ token, http=globalThis.fetch }={}) {
  if (typeof token !== 'string' || !token.trim()) throw new PreflightError('TOKEN_SECRET_MISSING');
  if (typeof http !== 'function') throw new PreflightError('HTTP_CLIENT_MISSING');
  const verify=await readCloudflare('/user/tokens/verify',token,http);
  if (verify.result?.status !== 'active') throw new PreflightError('TOKEN_NOT_ACTIVE');
  const databases=[];
  let totalCount=null;
  for (let page=1;page<=100;page++) {
    const response=await readCloudflare(`/accounts/${ACCOUNT_ID}/d1/database?page=${page}&per_page=100`,token,http);
    const chunk=response.result;
    const metadata=response.result_info;
    if (!Array.isArray(chunk) || !Number.isInteger(metadata?.total_count) || metadata.total_count<0 || metadata.total_count>10000) {
      throw new PreflightError('D1_PAGINATION_UNTRUSTED');
    }
    if (totalCount===null) totalCount=metadata.total_count;
    if (totalCount!==metadata.total_count || chunk.length>100) throw new PreflightError('D1_PAGINATION_CHANGED');
    databases.push(...chunk);
    if (databases.length===totalCount) break;
    if (chunk.length===0 || databases.length>totalCount || page===100) throw new PreflightError('D1_PAGINATION_INCOMPLETE');
  }
  const duplicates=databases.filter(x=>x?.name===FACEBOOK_D1_NAME);
  if (duplicates.length>1) throw new PreflightError('D1_FACEBOOK_NAME_COLLISION');
  const workers=await readCloudflare(`/accounts/${ACCOUNT_ID}/workers/scripts`,token,http);
  if (!Array.isArray(workers.result)) throw new PreflightError('WORKERS_LIST_RESPONSE_INVALID');
  return Object.freeze({
    verified_token_active: true,
    verified_account_d1_scope: true,
    verified_account_workers_scope: true,
    d1_count: databases.length,
    facebook_d1_exists: duplicates.length===1,
    facebook_d1_jurisdiction: duplicates.length===1 ? (duplicates[0].jurisdiction??'UNAVAILABLE'): 'NOT_APPLICABLE',
    // API list is not a Free plan subscription attestation.
    free_plan_attested: false,
    d1_free_reference_limit: 10,
    free_db_slots_under_documented_reference_limit: Math.max(0,10-databases.length),
    writes_executed: false
  });
}
async function main() {
  try {
    const result=await checkCloudflareReadOnly({token:process.env.CEREBRO_CLOUDFLARE_API_TOKEN});
    const lines=[
      `CF_TOKEN_ACTIVE=${result.verified_token_active}`,
      `CF_ACCOUNT_D1_READ=${result.verified_account_d1_scope}`,
      `CF_ACCOUNT_WORKERS_READ=${result.verified_account_workers_scope}`,
      `CF_D1_DATABASE_COUNT=${result.d1_count}`,
      `CF_FACEBOOK_D1_EXISTS=${result.facebook_d1_exists}`,
      `CF_FACEBOOK_D1_JURISDICTION=${result.facebook_d1_jurisdiction}`,
      `CF_D1_FREE_REFERENCE_SLOTS=${result.free_db_slots_under_documented_reference_limit}`,
      'CF_PLAN_FREE_ATTESTED=false',
      'CF_MUTATIONS=0'
    ];
    for (const line of lines) console.log(line);
    if(process.env.GITHUB_STEP_SUMMARY) {
      const {appendFileSync}=await import('node:fs');
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### FACT-001 Cloudflare LAB: read-only API attestation\n\n${lines.map(line=>'- '+line).join('\n')}\n\nNo writes, no secret values, no public URLs.\n`);
    }
  } catch(error) {
    const code=error instanceof PreflightError ? error.code : 'UNEXPECTED_ERROR';
    console.error(`CF_READ_ONLY_PREFLIGHT_BLOCKED=${code}`);
    process.exitCode=1;
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();