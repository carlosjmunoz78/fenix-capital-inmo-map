import test from 'node:test';
import assert from 'node:assert/strict';
import {observeFact001CloudflareWorkerLabV0 as observe} from './fact001-provider-readback-lab.mjs';
const name='cerebro-fact001-managed-lab-rproof261116';
const version='10801551-eb14-4ce1-b947-1032cdda565c';
const TOKEN='a'.repeat(32),NOW=1794855339700;
const fake=(overrides={})=>{
 const requested=[];
 const fetchImpl=async(url,init)=>{
  requested.push({url,method:init.method});
  if(init.method!=='GET')throw Error('MUTATION_FORBIDDEN');
  const loc=new URL(url);
  let body={success:true,result:null};
  if(loc.pathname.endsWith('/workers/scripts'))
   body.result=overrides.scripts??[{id:name}];
  else if(loc.pathname.endsWith('/workers/routes'))
   body.result=overrides.routes??[];
  else if(loc.pathname.endsWith('/workers/domains'))
   body.result=overrides.domains??[];
  else if(loc.pathname.endsWith('/'+name)){
   return {status:overrides.scriptStatus??200};
  }else if(loc.pathname.endsWith('/subdomain'))
   body.result=overrides.subdomain??{enabled:false,previews_enabled:false};
  else if(loc.pathname.endsWith('/schedules'))
   body.result=overrides.schedules??{schedules:[]};
  else if(loc.pathname.endsWith('/settings'))
   body.result=overrides.settings??{bindings:[]};
  else if(loc.pathname.endsWith('/deployments'))
   body.result=overrides.deployments??{deployments:[{versions:[{version_id:version}]}]};
  else throw Error('UNEXPECTED_PROVIDER_URL');
  if(overrides.http403&&loc.pathname.endsWith(overrides.http403))return {status:403};
  return {status:200,json:async()=>body};
 };
 return {fetchImpl,requested};
};
test('private create readback requires real provider inventory, GET, routes, domains, version and 0 bindings',async()=>{
 const {fetchImpl,requested}=fake();
 const r=await observe({token:TOKEN,name,operation:'worker.create_private',fetchImpl,clock:()=>NOW});
 assert.equal(r.status,'PROVIDER_READBACK');
 assert.equal(r.provider.exists,true);
 assert.equal(r.provider.workers_dev_enabled,false);
 assert.equal(r.provider.version_id,version);
 assert.equal(r.readback.observed_at_ms,NOW);
 assert.equal(r.prod_promotion_allowed,false);
 assert.equal(requested.length,8);
 assert(requested.every(x=>x.method==='GET'));
 assert(requested.every(x=>x.url.startsWith('https://api.cloudflare.com/client/v4/')));
});
test('deleted worker requires absence in list AND HTTP 404; does not invent deleted settings',async()=>{
 const {fetchImpl,requested}=fake({scripts:[],scriptStatus:404});
 const r=await observe({token:TOKEN,name,operation:'worker.delete_private',fetchImpl,clock:()=>NOW});
 assert.equal(r.status,'PROVIDER_READBACK');
 assert.equal(r.provider.exists,false);
 assert.equal(r.provider.script_get_http_status,404);
 assert.equal(Object.hasOwn(r.provider,'workers_dev_enabled'),false);
 assert.equal(requested.length,4);
});
test('fail closed when any provider route, custom domain, binding, cron or public preview appears',async()=>{
 for(const o of [
  {routes:[{script:name}]},{domains:[{service:name}]},
  {settings:{bindings:[{name:'TOKEN',type:'secret_text'}]}},
  {subdomain:{enabled:true,previews_enabled:false}},
  {subdomain:{enabled:false,previews_enabled:true}},
  {schedules:{schedules:[{cron:'* * * * *'}]}},
  {deployments:{deployments:[]}}
 ]){
  const r=await observe({token:TOKEN,name,operation:'worker.create_private',fetchImpl:fake(o).fetchImpl,clock:()=>NOW});
  assert.equal(r.status,'NOT_CERTIFIED');
 }
});
test('fail closed on missing permissions, suspicious inventory or false deletion',async()=>{
 for(const o of [
  {http403:'/workers/routes'}, {domains:[{}]}, {routes:[{}]},
  {scripts:[{id:'another-worker'}]}, {scriptStatus:404}
 ]){
  const r=await observe({token:TOKEN,name,operation:'worker.create_private',fetchImpl:fake(o).fetchImpl,clock:()=>NOW});
  assert.equal(r.status,'NOT_CERTIFIED');
 }
 const d=await observe({token:TOKEN,name,operation:'worker.delete_private',
  fetchImpl:fake({scripts:[],scriptStatus:200}).fetchImpl,clock:()=>NOW});
 assert.equal(d.status,'NOT_CERTIFIED');
 assert.equal((await observe({token:TOKEN,name:'cerebro-jarvis-lab-eu',
  operation:'worker.delete_private',fetchImpl:fake().fetchImpl,clock:()=>NOW})).status,'NOT_CERTIFIED');
});
