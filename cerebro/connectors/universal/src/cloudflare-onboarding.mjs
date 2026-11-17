// FACT-001 · Universal Cloudflare onboarding planner, provider-agnostic department names.
// Internal CEREBRO units are NOT external social network accounts or API integrations.
// Pure deterministic planning; no API calls, DNS mutations, credentials or deployments.
export const CLOUDFLARE_ACCOUNT_ID='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const RESOURCES=Object.freeze({
 compute:{provider:'workers',capability:'worker',permission:'Workers Scripts Write'},
 website:{provider:'pages',capability:'pages_project',permission:'Pages Write'},
 relational:{provider:'d1',capability:'database',permission:'D1 Write'},
 cache:{provider:'kv',capability:'namespace',permission:'Workers KV Storage Write'},
 objects:{provider:'r2',capability:'bucket',permission:'Workers R2 Storage Write'},
 async_jobs:{provider:'queues',capability:'queue',permission:'Queues Write'},
 private_access:{provider:'access',capability:'application',permission:'Access: Apps and Policies Write'}
});
export const FACTORY_ARTIFACTS=Object.freeze([
 'manifest','config','data_contracts','permissions','policies','events','jobs','api',
 'tests','evaluation','tribunal','observability','costs','backup','rollback','rebuild',
 'documentation','training_hooks'
]);
const goodSlug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,40}$/.test(v)&&!v.endsWith('-')&&!v.includes('--');
const validEngineId=v=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9-]{1,40}$/.test(v)&&!v.endsWith('-')&& !v.includes('--');
const validVersion=v=>typeof v==='string'&&/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(v);
const isPlain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const sorted=x=>[...x].sort();
const same=(x,y)=>JSON.stringify(sorted(x))===JSON.stringify(sorted(y));
const TYPES=Object.freeze(['department','engine','website','company']);
const ENVIRONMENTS=Object.freeze(['LAB','PREPROD','PROD']);
export const PRIORITY=Object.freeze(['compute','website','relational','cache','objects','async_jobs','private_access']);
export function createCloudflareOnboardingPlan(request){
 const fields=['company_id','engine_id','environment','version','unit_type','unit_slug','required_resources'];
 if(!isPlain(request)||!same(Object.keys(request),fields))throw Error('INVALID_FACTORY_REQUEST');
 const {company_id,engine_id,environment,version,unit_type,unit_slug,required_resources}=request;
 if(!goodSlug(company_id)||!validEngineId(engine_id)||!goodSlug(unit_slug)||!ENVIRONMENTS.includes(environment)||!validVersion(version)||!TYPES.includes(unit_type))
  throw Error('INVALID_FACTORY_4D_SCOPE');
 if(!Array.isArray(required_resources)||required_resources.length<1||new Set(required_resources).size!==required_resources.length||
   required_resources.some(r=>!Object.prototype.hasOwnProperty.call(RESOURCES,r)))throw Error('INVALID_RESOURCE_REQUIREMENTS');
 if(unit_type==='website'&&!required_resources.some(r=>['website','compute'].includes(r)))throw Error('WEBSITE_HOSTING_REQUIRED');
 const prefix='cerebro-'+company_id+'-'+unit_slug+'-'+environment.toLowerCase();
 if(prefix.length>63)throw Error('RESOURCE_NAME_TOO_LONG');
 const resources=PRIORITY.filter(r=>required_resources.includes(r)).map((type,index)=>Object.freeze({
  resource_id:type+'-'+String(index+1).padStart(2,'0'),
  type,
  provider:RESOURCES[type].provider,
  name:prefix+(type==='compute'?'-worker':type==='website'?'-web':'-'+type.replace('_','-')),
  permission:RESOURCES[type].permission,
  mode:'PLAN_ONLY',
  environment,
  ownership:{company_id,engine_id,environment,version,unit_slug},
  lifecycle:['INVENTORY','DEPENDENCY_MAP','SNAPSHOT','CONTRACT','ISOLATED_CREATE',
   'VERIFY','PROMOTION_GATE','ROLLBACK_TEST','MONITOR','REBUILD']
 }));
 if(resources.some(r=>r.name.length>63))throw Error('RESOURCE_NAME_TOO_LONG');
 return Object.freeze({
  schema_version:'1.0.0',
  account_id:CLOUDFLARE_ACCOUNT_ID,
  scope:{company_id,engine_id,environment,version},
  unit:{type:unit_type,slug:unit_slug},
  status:'DEFINED_NOT_DEPLOYED',
  artifact_scaffold:[...FACTORY_ARTIFACTS],
  resources,
  shared_runtime:true,
  new_server_per_engine:false,
  external_social_network_authorization_required:false,
  // This plan never authorizes an external platform action or publishes content.
  website_domain_binding:'DISABLED_UNTIL_OWNERSHIP_AND_DNS_ROLLBACK',
  provider_writes_enabled:false,
  additional_cost_ceiling_eur:0,
  must_attest:['inventory','resource_ownership','dependency_map','backup_restore',
   'policy_grant','quota_and_cost','isolated_preprod','tests','tribunal',
   'rollback','rebuild','observability'],
  human_exception_codes:['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE',
   'HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT',
   'CUSTOMER_HUMAN_REQUEST']
 });
}
export function reconcileCloudflareOnboarding(plan,inventory){
 if(plan?.status!=='DEFINED_NOT_DEPLOYED'||plan.account_id!==CLOUDFLARE_ACCOUNT_ID||!Array.isArray(plan.resources))
  throw Error('INVALID_ONBOARDING_PLAN');
 if(!isPlain(inventory)||inventory.account_id!==CLOUDFLARE_ACCOUNT_ID||inventory.verified!==true||!Array.isArray(inventory.resources))
  throw Error('TRUSTED_PROVIDER_INVENTORY_REQUIRED');
 const results=[];
 for(const item of plan.resources){
  const matches=inventory.resources.filter(r=>r&&r.type===item.type&&r.name===item.name);
  let state='CREATE_CANDIDATE';
  if(matches.length>1)state='BLOCKED_AMBIGUOUS_INVENTORY';
  else if(matches.length===1){
   const r=matches[0],o=r.ownership;
   state=isPlain(o)&&Object.entries(item.ownership).every(([k,v])=>o[k]===v)&&r.account_id===plan.account_id?
    'REUSE_OWNED':'BLOCKED_EXISTING_RESOURCE';
  }
  results.push({type:item.type,name:item.name,state});
 }
 return {status:results.some(r=>r.state.startsWith('BLOCKED'))?'BLOCKED':'PLAN_RECONCILED',
  resources:results,may_execute:false};
}
