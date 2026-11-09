import { OPERA_CAPABILITIES } from './opera-catalog.mjs';
// Declarative, versioned capability catalog. A capability listed as PLANNED is NEVER executable.
export const CLOUDFLARE_ACCOUNT_ID = 'e39a57e1ac42650ca5a6d5307cf0ac8e';
export const FACEBOOK_D1 = 'cerebro-facebook-autoqual-lab';
export const FACEBOOK_WORKER = 'cerebro-facebook-autoqual-lab';
export const CLIENTS = Object.freeze(['chatgpt', 'cerebro']);
export const DIMENSIONS = Object.freeze(['company_id', 'engine_id', 'environment', 'version']);

const def = (id, method, path, permission, status='IMPLEMENTED_LAB', sideEffect=false) => ({
  id, method, path, permission, status, sideEffect
});
export const CAPABILITIES = Object.freeze([
  def('cloudflare.account.read', 'GET', '/accounts/{account_id}', 'Account Settings Read'),
  def('cloudflare.zones.list', 'GET', '/zones', 'Zone Read'),
  def('cloudflare.dns.list', 'GET', '/zones/{zone_id}/dns_records', 'DNS Read'),
  def('cloudflare.workers.list', 'GET', '/accounts/{account_id}/workers/scripts', 'Workers Scripts Read'),
  def('cloudflare.d1.list', 'GET', '/accounts/{account_id}/d1/database', 'D1 Read'),
  def('cloudflare.d1.get', 'GET', '/accounts/{account_id}/d1/database/{database_id}', 'D1 Read'),
  def('cloudflare.d1.create-facebook-lab-eu', 'POST', '/accounts/{account_id}/d1/database', 'D1 Write', 'IMPLEMENTED_LAB', true),
  def('cloudflare.d1.query-facebook-readonly', 'POST', '/accounts/{account_id}/d1/database/{database_id}/query', 'D1 Read', 'IMPLEMENTED_LAB', false),
  def('cloudflare.d1.apply-facebook-migration', 'POST', '/accounts/{account_id}/d1/database/{database_id}/query', 'D1 Write', 'PARTIAL_NOT_ENABLED', true),
  def('cloudflare.workers.deploy-facebook-off', 'WRANGLER', 'cloudflare/facebook-autoqual-lab/wrangler.lab.jsonc', 'Workers Scripts Write', 'PARTIAL_NOT_ENABLED', true),
  def('cloudflare.workers.versions', 'GET', '/accounts/{account_id}/workers/scripts/{worker_name}/versions', 'Workers Scripts Read'),
  def('cloudflare.workers.secrets', 'GET', '/accounts/{account_id}/workers/scripts/{worker_name}/secrets', 'Workers Scripts Read'),
  def('cloudflare.workers.domains', 'GET', '/accounts/{account_id}/workers/domains', 'Workers Scripts Read'),
  def('cloudflare.kv.namespaces', 'GET', '/accounts/{account_id}/storage/kv/namespaces', 'Workers KV Storage Read'),
  def('cloudflare.r2.buckets', 'GET', '/accounts/{account_id}/r2/buckets', 'Workers R2 Storage Read'),
  def('cloudflare.pages.projects', 'GET', '/accounts/{account_id}/pages/projects', 'Cloudflare Pages Read'),
  def('cloudflare.rulesets.list', 'GET', '/zones/{zone_id}/rulesets', 'Zone WAF Read'),
  def('cloudflare.access.apps', 'GET', '/accounts/{account_id}/access/apps', 'Access: Apps and Policies Read'),
  def('cloudflare.analytics.account', 'GRAPHQL', '/graphql', 'Account Analytics Read', 'PARTIAL_NOT_ENABLED'),
  def('cloudflare.dns.update', 'PATCH', '/zones/{zone_id}/dns_records/{record_id}', 'DNS Write', 'PLANNED_PROD_GATED', true),
  def('cloudflare.workers.update-secret', 'PUT', '/accounts/{account_id}/workers/scripts/{worker_name}/secrets', 'Workers Scripts Write', 'PLANNED_NOT_ENABLED', true),
  def('cloudflare.workers.rollback', 'POST', '/accounts/{account_id}/workers/scripts/{worker_name}/deployments', 'Workers Scripts Write', 'PLANNED_NOT_ENABLED', true),
  def('cloudflare.d1.backup', 'POST', '/accounts/{account_id}/d1/database/{database_id}/export', 'D1 Read', 'PLANNED_NOT_ENABLED'),
  ...OPERA_CAPABILITIES
]);
export function getCapability(id) { return CAPABILITIES.find(cap=>cap.id===id) ?? null; }
export function inventory() { return CAPABILITIES.map(({id,permission,status,sideEffect})=>({id,permission,status,side_effect:sideEffect})); }