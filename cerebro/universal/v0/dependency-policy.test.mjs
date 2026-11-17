import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import registry from '../../registry/engine-registry.v1.json' with { type: 'json' };
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createUniversalInterfaceAutoConnectV0,UNIVERSAL_INTERFACE_TYPES_V0} from './interface-autoconnect.mjs';
import {getLabDependencyStatusV0,assessLabOperationV0,rejectSuspendedTargetV0,STAGING_POLICY_VERSION} from './dependency-policy.mjs';
import handler from '../../../api/cerebro-universal-preview.ts';

const TOKEN='owner-token-staging-suspension-isolated-1234567890'.repeat(9);
const API_KEY='test-publishable-owner-api-key-1234567890';
const HOST='fenix-capital-preprod-staginglock1.vercel.app';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const scopes=['cerebro:universal:read','cerebro:factory:inspect','cerebro:jobs:read','cerebro:command:dryrun'];
const actor={actor_id:'CARLOS-ADMIN',company_ids:['fenix'],scopes};
const gateway=()=>new UniversalGatewayLabV0({registry,authenticate:async token=>token===TOKEN?actor:null});
const hdr={host:HOST,origin:'https://'+HOST,authorization:'Bearer '+TOKEN,apikey:API_KEY};
async function api(req){const out={code:0,body:null},res={setHeader(){},status(v){out.code=v;return res},json(v){out.body=v;return res}};await handler(req,res);return out}
const request=(action,params={company_id:'fenix',environment:'LAB'})=>({method:'POST',headers:hdr,body:{action,params}});

test('owner staging suspension has no automatic reactivation or probes',()=>{
 const x=getLabDependencyStatusV0();
 assert.equal(x.status,'OK');assert.equal(x.source,'OWNER_DIRECTIVE_LAB_POLICY');
 assert.equal(x.policy_version,STAGING_POLICY_VERSION);
 assert.equal(x.wordpress_staging.host,'staging.fenixcapital.es');
 assert.equal(x.wordpress_staging.state,'SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE');
 for(const k of ['can_probe','can_read','can_publish','can_modify','can_auto_resume'])assert.equal(x.wordpress_staging[k],false);
 assert.equal(x.wordpress_staging.requires_explicit_owner_reactivation,true);
 assert.equal(x.supported_execution,false);assert.equal(x.prod_execution_enabled,false);
 assert.equal(x.legacy_cron_enforcement,'NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY');
 assert.throws(()=>getLabDependencyStatusV0({company_id:'aion',environment:'LAB'}),/FENIX_LAB_ONLY/);
 assert.throws(()=>getLabDependencyStatusV0({company_id:'fenix',environment:'PROD'}),/FENIX_LAB_ONLY/);
});
test('every staging-dependent operation is blocked; unknown operations denied',()=>{
 for(const operation of ['WP_STAGING_PROBE','WP_STAGING_PUBLISH','WP_STAGING_WRITE','SEO_STAGING_BRIDGE','SEO_PUBLICATION_DEPENDENT_ON_STAGING']){
  const r=assessLabOperationV0({operation});
  assert.equal(r.status,'BLOCKED_DEPENDENCY');assert.equal(r.reason,'STAGING_SUSPENDED_BY_OWNER');
  assert.equal(r.can_execute,false);assert.equal(r.can_probe,false);
 }
 for(const operation of ['FACT_REGISTRY_READ','OWNER_REGISTRY_READ','JOB001_METADATA_READ','GITHUB_ACTIVITY_READ','FACT_DRYRUN_AUDITED']){
  const r=assessLabOperationV0({operation});
  assert.equal(r.status,'LAB_READ_OR_SIMULATION_ONLY');assert.equal(r.can_execute,false);
 }
 for(const operation of ['PUBLISH_PROD','AUTO_RESUME','WP-STAGING-PUBLISH','UNRECOGNIZED']){
  assert.equal(assessLabOperationV0({operation}).status,'DENIED_UNKNOWN_OPERATION');
 }
});
test('LAB commands cannot accept dynamic target fields or staging operations',()=>{
 for(const key of ['target_url','url','target_host','host','hostname','endpoint','webhook_url','origin','dependency_id','route']){
  assert.throws(()=>rejectSuspendedTargetV0({[key]:'https://staging.fenixcapital.es/'}),/EXTERNAL_DESTINATION_DENIED/);
 }
 assert.throws(()=>rejectSuspendedTargetV0({operation:'WP_STAGING_PUBLISH'}),/STAGING_SUSPENDED_OR_UNKNOWN_OPERATION/);
 assert.equal(rejectSuspendedTargetV0({operation:'FACT_DRYRUN_AUDITED'}),true);
 assert.equal(rejectSuspendedTargetV0({}),true);
});
test('six interface SDKs share owner-scoped staging suspension and no PROD grants',async()=>{
 const g=gateway();
 for(const interface_id of UNIVERSAL_INTERFACE_TYPES_V0){
  const sdk=createUniversalInterfaceAutoConnectV0({interface_id,request:req=>g.handle(req),getSessionToken:async()=>TOKEN});
  const status=await sdk.readDependencyStatus();
  assert.equal(status.wordpress_staging.state,'SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE');
  assert.equal((await sdk.assessOperation('WP_STAGING_WRITE')).status,'BLOCKED_DEPENDENCY');
  assert.equal((await sdk.assessOperation('FACT_REGISTRY_READ')).status,'LAB_READ_OR_SIMULATION_ONLY');
 }
 const wrong=new UniversalGatewayLabV0({registry,authenticate:async()=>({...actor,company_ids:['aion']})});
 await assert.rejects(wrong.handle({session_token:TOKEN,action:'get_dependency_status',params:{company_id:'fenix',environment:'LAB'}}),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(g.handle({session_token:TOKEN,action:'get_dependency_status',params:{company_id:'fenix',environment:'PROD'}}),/ENVIRONMENT_LAB_ONLY/);
});
test('Preview owner-only API returns policy and blocks any external target before network access',async t=>{
 const before=globalThis.fetch,env=process.env.VERCEL_ENV,url=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=before;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=url});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 const calls=[];globalThis.fetch=async(addr,opt)=>{
  calls.push({addr,method:opt.method});
  assert.equal(addr,OWNER,'Never request staging or unexpected provider');
  return new Response(JSON.stringify({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),{status:200});
 };
 const policy=await api(request('get_dependency_status'));
 assert.equal(policy.code,200);assert.equal(policy.body.transport,'PREVIEW_ONLY_SERVER_VERIFIED');
 assert.equal(policy.body.source,'OWNER_DIRECTIVE_LAB_POLICY');assert.equal(policy.body.wordpress_staging.can_probe,false);
 const assess=await api(request('assess_operation',{company_id:'fenix',environment:'LAB',operation:'SEO_STAGING_BRIDGE'}));
 assert.equal(assess.code,200);assert.equal(assess.body.status,'BLOCKED_DEPENDENCY');
 const safe=await api(request('assess_operation',{company_id:'fenix',environment:'LAB',operation:'JOB001_METADATA_READ'}));
 assert.equal(safe.body.status,'LAB_READ_OR_SIMULATION_ONLY');
 const deny=await api(request('submit_command',{company_id:'fenix',environment:'LAB',engine_id:'FACT-001',version:'0.1.0-lab',
  capability_id:'fact.registry.summary',dry_run:true,idempotency_key:'lab-staging-target-rejected-001',payload:{},
  target_url:'https://staging.fenixcapital.es/'}));
 assert.equal(deny.code,404);assert.equal(deny.body.reason,'EXTERNAL_DESTINATION_DENIED');
 assert.deepEqual(calls.map(c=>c.method),['GET','GET','GET']);
});
test('production, invalid bearer and other company fail before network access',async t=>{
 const before=globalThis.fetch,env=process.env.VERCEL_ENV,url=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=before;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=url});
 let network=0;globalThis.fetch=async()=>{network++;throw Error('NETWORK_MUST_NOT_RUN')};
 process.env.VERCEL_ENV='production';process.env.VERCEL_URL=HOST;
 assert.equal((await api(request('get_dependency_status'))).code,403);
 process.env.VERCEL_ENV='preview';
 assert.equal((await api({...request('get_dependency_status'),headers:{...hdr,authorization:'Bearer bad'}})).code,401);
 assert.equal((await api(request('get_dependency_status',{company_id:'aion',environment:'LAB'}))).code,403);
 assert.equal(network,0);
});
test('LAB manifest persists owner directive; Gateway has no staging HTTP client',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.external_dependencies.wordpress_staging.status,'SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE');
 assert.equal(manifest.external_dependencies.wordpress_staging.can_probe,false);
 assert.equal(manifest.external_dependencies.wordpress_staging.can_reactivate_automatically,false);
 for(const file of ['control-plane.mjs','dependency-policy.mjs','../../../api/cerebro-universal-preview.ts']){
  const src=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  assert.equal(/fetch\s*\(\s*['"]https?:\/\/staging\./.test(src),false,'staging probe in '+file);
 }
});
