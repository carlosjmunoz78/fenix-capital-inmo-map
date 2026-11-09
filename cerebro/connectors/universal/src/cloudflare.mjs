import { CLOUDFLARE_ACCOUNT_ID, FACEBOOK_D1 } from './catalog.mjs';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SAFE_ID=/^[a-zA-Z0-9_-]+$/;
function assertId(v, label, pattern=SAFE_ID){if(typeof v!=='string'||!pattern.test(v))throw new Error(`INVALID_${label.toUpperCase()}`);return v;}
const noSecretError=new Error('AUTH_NOT_AVAILABLE');noSecretError.code='AUTH_NOT_AVAILABLE';
export class CloudflareOfficialApi {
 constructor({tokenProvider, http=fetch, accountId=CLOUDFLARE_ACCOUNT_ID, origin='https://api.cloudflare.com/client/v4'}={}){
  if(typeof tokenProvider!=='function') throw new Error('vault-backed token provider required');
  if(typeof http!=='function')throw new Error('HTTP implementation required');
  if(accountId!==CLOUDFLARE_ACCOUNT_ID)throw new Error('ACCOUNT_SCOPE_CONFLICT');
  this.tokenProvider=tokenProvider;this.http=http;this.accountId=accountId;this.origin=origin;
 }
 async request(method,pathname,{params,body,identity,permission}={}){
  if(!pathname.startsWith('/')||pathname.startsWith('//')||pathname.includes('..')||pathname.includes('://'))throw new Error('INVALID_PATH');
  const token=await this.tokenProvider({identity, permission});
  if(typeof token!=='string'||!token.trim())throw noSecretError;
  const url=new URL(`${this.origin}${pathname}`);
  for(const [k,v] of Object.entries(params??{}))url.searchParams.set(k,String(v));
  const res=await this.http(url,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  // Do not expose upstream error bodies; they may contain sensitive information.
  if(!res.ok){const e=new Error('UPSTREAM_HTTP_ERROR');e.code=`HTTP_${res.status}`;throw e;}
  const json=await res.json();
  if(json?.success!==true){const e=new Error('CLOUDFLARE_RESULT_FAILED');e.code='API_FAILED';throw e;}
  return json;
 }
 async listAllD1(identity){
  const databases=[];let page=1;
  for(;;){
   const res=await this.request('GET',`/accounts/${this.accountId}/d1/database`,{params:{page,per_page:100},identity,permission:'D1 Read'});
   const part=res.result??[];if(!Array.isArray(part))throw new Error('D1_INVALID_RESPONSE');
   databases.push(...part);const info=res.result_info??{};
   if(page >= (info.total_pages??Math.ceil((info.total_count??databases.length)/100)) || part.length===0)break;
   if(++page>10000)throw new Error('D1_PAGINATION_LIMIT');
  }
  return databases;
 }
 async perform({action,input,identity,scope}){
  const id=action.id;
  if(id==='cloudflare.d1.create-facebook-lab-eu')return this.#createFacebookD1(identity,input,scope);
  if(id==='cloudflare.d1.list')return {status:'COMPLETED',data:(await this.listAllD1(identity)).map(d=>({name:d.name,uuid:d.uuid,jurisdiction:d.jurisdiction}))};
  if(id==='cloudflare.d1.query-facebook-readonly'){
   if(scope.environment!=='LAB')throw new Error('ENV_DENIED');
   const db=assertId(input.database_id,'database_id',UUID);
   const databases=await this.listAllD1(identity);if(!databases.some(x=>x.name===FACEBOOK_D1&&x.uuid===db&&x.jurisdiction==='eu'))throw new Error('D1_SCOPE_DENIED');
   if(typeof input.sql!=='string'||!/^\s*SELECT\b/i.test(input.sql)||/;|--|\/\*|\b(PRAGMA|ATTACH|DROP|INSERT|UPDATE|DELETE|CREATE|ALTER|REPLACE)\b/i.test(input.sql))throw new Error('READONLY_SQL_REQUIRED');
   const result=await this.request('POST',`/accounts/${this.accountId}/d1/database/${db}/query`,{body:{sql:input.sql,params:input.params??[]},identity,permission:'D1 Read'});
   return {status:'COMPLETED',data:result.result};
  }
  if(id==='cloudflare.account.read')return this.#simple(action,identity,`/accounts/${this.accountId}`);
  if(id==='cloudflare.zones.list')return this.#simple(action,identity,'/zones', {account_id:this.accountId});
  if(id==='cloudflare.dns.list')return this.#simple(action,identity,`/zones/${assertId(input.zone_id,'zone_id')}/dns_records`);
  if(id==='cloudflare.d1.get')return this.#simple(action,identity,`/accounts/${this.accountId}/d1/database/${assertId(input.database_id,'database_id',UUID)}`);
  const workerName=input.worker_name===undefined? '':assertId(input.worker_name,'worker_name');
  const paths={
   'cloudflare.workers.list':`/accounts/${this.accountId}/workers/scripts`,
   'cloudflare.workers.versions':`/accounts/${this.accountId}/workers/scripts/${workerName}/versions`,
   'cloudflare.workers.secrets':`/accounts/${this.accountId}/workers/scripts/${workerName}/secrets`,
   'cloudflare.workers.domains':`/accounts/${this.accountId}/workers/domains`,
   'cloudflare.kv.namespaces':`/accounts/${this.accountId}/storage/kv/namespaces`,
   'cloudflare.r2.buckets':`/accounts/${this.accountId}/r2/buckets`,
   'cloudflare.pages.projects':`/accounts/${this.accountId}/pages/projects`,
   'cloudflare.rulesets.list':`/zones/${assertId(input.zone_id,'zone_id')}/rulesets`,
   'cloudflare.access.apps':`/accounts/${this.accountId}/access/apps`
  };
  if(!Object.hasOwn(paths,id))throw new Error('UNSUPPORTED_CAPABILITY');
  return this.#simple(action,identity,paths[id]);
 }
 async #simple(action,identity,path,params){const output=await this.request('GET',path,{params,identity,permission:action.permission});return {status:'COMPLETED',data:output.result};}
 async #createFacebookD1(identity,input,scope){
  if(scope.environment!=='LAB')throw new Error('ENV_DENIED');
  if(input.name!==FACEBOOK_D1||input.jurisdiction!=='eu'||input.confirm_isolated!==true)throw new Error('TARGET_DENIED');
  const old=(await this.listAllD1(identity)).filter(x=>x.name===FACEBOOK_D1);
  if(old.length){const d=old[0];if(old.length!==1||!UUID.test(d.uuid)||d.jurisdiction!=='eu')throw new Error('D1_COLLISION_OR_WRONG_JURISDICTION');return {status:'ALREADY_EXISTS_VERIFIED',uuid:d.uuid,name:d.name,jurisdiction:d.jurisdiction};}
  const result=await this.request('POST',`/accounts/${this.accountId}/d1/database`,{body:{name:FACEBOOK_D1,jurisdiction:'eu',read_replication:{mode:'disabled'}},identity,permission:'D1 Write'});
  const uuid=result.result?.uuid;if(!UUID.test(uuid))throw new Error('CREATED_WITHOUT_UUID');
  const verified=(await this.listAllD1(identity)).filter(x=>x.name===FACEBOOK_D1);
  if(verified.length!==1||verified[0].uuid!==uuid||verified[0].jurisdiction!=='eu')throw new Error('CREATION_VERIFICATION_FAILED');
  return {status:'COMPLETED',uuid,name:FACEBOOK_D1,jurisdiction:'eu',verified:true};
 }
}
