import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import handler,{validateSharedQuery} from '../../../api/cerebro-shared-state.ts';
const prev=process.env.VERCEL_ENV,oldUrl=process.env.VERCEL_URL,oldFetch=globalThis.fetch;
process.env.VERCEL_ENV='production';
const auth='Bearer '+'X'.repeat(45);
const apikey='sb_publishable_contract_test';
const q=(suffix='mode=summary&company_id=fenix')=>'/api/cerebro-shared-state?'+suffix;
const req=(url=q(),method='GET',headers={})=>({method,url,headers:{host:'app.fenixcapital.es',authorization:auth,apikey,accept:'application/json',...headers}});
const res=()=>{let status=200,payload,headers={};return{setHeader(k,v){headers[k]=v},status(s){status=s;return this},json(b){payload=b;return this},get state(){return{status,payload,headers}}}};
function fake({owner=true,feed='LIVE',running=false,attested=false,failed=false}={}){
 const calls=[];
 globalThis.fetch=async (url)=>{
  calls.push(String(url));
  if(String(url).includes('/session/context'))return{status:200,json:async()=>({context:{actor_code:owner?'CARLOS-ADMIN':'OTHER'}})};
  if(String(url).includes('/cerebro-console-activity-v0/')){
   if(feed==='HTTP503')return{ok:false,status:503};
   const today=new Date().toISOString();
   return{ok:true,status:200,json:async()=>({status:'OK',source_status:feed==='STALE'?'CACHED':'LIVE',
    observed_at:feed==='STALE'?'2026-01-01T00:00:00Z':today,runs:running?[{
     run_id:12345678,company_id:'fenix',engine_id:'SEO-001',status:failed?'completed':'in_progress',updated_at:today,
     ...(attested?{profile_key:'AGENT_ROLE:SEO-PF01:DIRECTOR',profile_provenance:'EXPLICIT_EXECUTOR_ATTESTATION'}:{}),
     html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/12345678',
     environment:'PROD',version:'mock',conclusion:failed?'failure':null
    }]:[]})};
  }
  throw Error('UNEXPECTED_NETWORK');
 };
 return calls;
}
test('isolated CI summary accepts only authenticated technical identity on exact stage',async()=>{
 const stage='fenix-capital-preprod-test999.vercel.app';
 process.env.VERCEL_URL=stage;
 const calls=[];
 const tech='0c71641f-ae5e-44ab-b380-09aef0b44f7f';
 globalThis.fetch=async url=>{
  calls.push(String(url));
  if(String(url)==='https://cluhljgonannaafpmblx.supabase.co/auth/v1/user')
   return{status:200,json:async()=>({id:tech,email:'cerebro-e2e@fenixcapital.es',email_confirmed_at:'2026-11-18T12:00:00Z',app_metadata:{provider:'email'}})};
  if(String(url).includes('/session/context'))return{status:403};
  throw Error('UNEXPECTED_NETWORK');
 };
 const technical=req(q('mode=ci_summary&company_id=fenix'),'GET',{host:stage});
 const r=res();await handler(technical,r);
 assert.equal(r.state.status,200);
 assert.equal(r.state.payload.overview.total_profiles,2506);
 assert.equal(r.state.payload.access,'TECHNICAL_CI_READONLY_SUMMARY_ONLY');
 assert.equal(r.state.payload.overview.states.ACTIVO,0);
 assert.equal(r.state.payload.overview.states.POR_VERIFICAR,2477);
 assert.equal(r.state.payload.source_departments.filter(x=>x.family==='SEO_ENTERPRISE'&&x.department_key.startsWith('SEO-D')).length,32);
 assert.equal(calls.length,1);
 const production=res();await handler(req(q('mode=ci_summary&company_id=fenix')),production);
 assert.equal(production.state.status,403);
 assert.equal(calls.length,1);
 const unexpected=res();await handler(req(q('mode=ci_summary&company_id=fenix'),'POST',{host:stage}),unexpected);
 assert.equal(unexpected.state.status,405);
 const data=res();await handler(req(q('mode=profiles&company_id=fenix&limit=1&kind=ALL&family=ALL'),'GET',{host:stage}),data);
 assert.equal(data.state.status,403);
 assert.equal(calls.length,2); // Second request attempts original owner resolver, never grants CI access.
 delete process.env.VERCEL_URL;
});
test('CI summary rejects user with a different UUID or unconfirmed email',async()=>{
 const stage='fenix-capital-preprod-test999.vercel.app';process.env.VERCEL_URL=stage;
 for(const user of [{id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',email:'cerebro-e2e@fenixcapital.es',email_confirmed_at:'2026-11-18'},
  {id:'0c71641f-ae5e-44ab-b380-09aef0b44f7f',email:'cerebro-e2e@fenixcapital.es',email_confirmed_at:null}]){
  globalThis.fetch=async()=>({status:200,json:async()=>user});
  const r=res();await handler(req(q('mode=ci_summary&company_id=fenix'),'GET',{host:stage}),r);
  assert.equal(r.state.status,403);
 }
 delete process.env.VERCEL_URL;
});
test('invalid tenants, unknown fields and duplicate queries are fail-closed',()=>{
 for(const params of ['mode=summary&company_id=aion','mode=summary&company_id=fenix&evil=1',
  'mode=summary&company_id=fenix&company_id=fenix','mode=execute&company_id=fenix',
  'mode=summary&company_id=fenix&limit=9999']){
  assert.throws(()=>validateSharedQuery(new URLSearchParams(params)));
 }
});
test('one shared summary covers all 2506 profiles in their original departments',async()=>{
 const calls=fake();
 const response=res();await handler(req(),response);
 const {status,payload}=response.state;
 assert.equal(status,200);assert.equal(payload.schema,'CEREBRO_SHARED_STATE_V1');
 assert.equal(payload.company_id,'fenix');assert.equal(payload.read_only,true);assert.equal(payload.executed,false);
 assert.equal(payload.overview.total_profiles,2506);assert.equal(payload.overview.departments,8);
 assert.equal(payload.overview.verified_running_profiles,0);assert.equal(payload.overview.states.DEFINIDO,29);
 assert.equal(payload.overview.states.POR_VERIFICAR,2477);
 assert.equal(payload.departments.find(x=>x.department_key==='SEO_ENTERPRISE').total,191);
 assert.equal(payload.departments.find(x=>x.department_key==='SOCIAL_FACEBOOK').total,598);
 assert.equal(calls.filter(x=>x.includes('cerebro-console-activity-v0')).length,1);
 assert.equal(calls.filter(x=>x.includes('/session/context')).length,1);
});
test('source-preserved SEO and UMS departments remain separate from 8 source families',async()=>{
 fake();const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 const units=response.state.payload.source_departments;
 assert.equal(units.filter(x=>x.family==='SEO_ENTERPRISE'&&x.department_key.startsWith('SEO-D')).length,32);
 assert.equal(units.filter(x=>x.family==='MEDIA_STUDIO'&&x.department_key.startsWith('UMS:')).length,48);
 assert.equal(units.reduce((n,x)=>n+x.total,0),48+384+175+11); // UMS department heads/specialists, SEO department roles, 11 canonical roles
});
test('paged shared profile details preserve identifiers, family and original parents',async()=>{
 fake();const response=res();
 await handler(req(q('mode=profiles&company_id=fenix&kind=ALL&family=SEO_ENTERPRISE&offset=0&limit=3')),response);
 assert.equal(response.state.status,200);const b=response.state.payload;
 assert.equal(b.page.total,191);assert.equal(b.records.length,3);
 for(const x of b.records){assert.equal(x.family,'SEO_ENTERPRISE');
  assert.equal(x.shared_state.department_key,'SEO_ENTERPRISE');
  assert.equal(x.shared_state.profile_key,x.kind+':'+x.id);
  assert.equal(x.shared_state.parent_id,x.parent_id);
  assert.equal(x.shared_state.status,'POR_VERIFICAR');
 }
});
test('canonical 179 motors get independent live workflow observations without falsifying specialist activity',async()=>{
 fake({running:true});const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 assert.equal(response.state.payload.engine_activity.registry_count,179);
 assert.equal(response.state.payload.engine_activity.observed_workflow_engines,1);
 assert.equal(response.state.payload.engine_activity.status_counts.ACTIVO,1);
 assert.equal(response.state.payload.overview.states.ACTIVO,0);
 const paged=res();await handler(req(q('mode=engines&company_id=fenix&offset=0&limit=7')),paged);
 assert.equal(paged.state.status,200);
 assert.equal(paged.state.payload.schema,'CEREBRO_ENGINE_ACTIVITY_V1');
 assert.equal(paged.state.payload.page.total,179);
 assert.equal(paged.state.payload.records.length,7);
});
test('running engine does not turn 191 SEO profiles active by family association',async()=>{
 fake({running:true});const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 assert.equal(response.state.payload.overview.verified_running_profiles,0);
 assert.equal(response.state.payload.overview.states.ACTIVO,0);
});
test('one attested specialist run changes only that specialist, preserving 2505 other states',async()=>{
 fake({running:true,attested:true});const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 assert.equal(response.state.payload.overview.verified_running_profiles,1);
 assert.equal(response.state.payload.overview.states.ACTIVO,1);
 assert.equal(response.state.payload.departments.find(x=>x.department_key==='SEO_ENTERPRISE').states.ACTIVO,1);
 const response2=res();await handler(req(q('mode=profiles&company_id=fenix&family=SEO_ENTERPRISE&kind=ALL&offset=0&limit=1')),response2);
 assert.equal(response2.state.payload.records[0].id,'SEO-PF01:DIRECTOR');
 assert.equal(response2.state.payload.records[0].shared_state.status,'ACTIVO');
});
test('a failed attested run updates only the affected profile to FALLANDO, not the whole department',async()=>{
 fake({running:true,attested:true,failed:true});const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 assert.equal(response.state.payload.overview.states.FALLANDO,1);
 assert.equal(response.state.payload.overview.states.ACTIVO,0);
 assert.equal(response.state.payload.departments.find(x=>x.department_key==='SEO_ENTERPRISE').states.FALLANDO,1);
});
test('an outdated or failed common activity source degrades without 2506 fake failures',async()=>{
 for(const feed of ['STALE','HTTP503']){
  fake({feed});const response=res();await handler(req(),response);
  assert.equal(response.state.status,200);
  assert.equal(response.state.payload.source_status,'DEGRADADO');
  assert.equal(response.state.payload.overview.states.FALLANDO,0);
  assert.equal(response.state.payload.overview.verified_running_profiles,0);
 }
});
test('anonymous, technician, cross-tenant, write and foreign origin denied before reading feed',async()=>{
 let calls=fake();
 for(const [request,expected] of [
  [req(q(),'GET',{authorization:''}),401],
  [req(q(),'POST'),405],
  [req(q('mode=summary&company_id=aion')),400],
  [req(q(),'GET',{origin:'https://evil.example'}),403]
 ]){
  let response=res();await handler(request,response);assert.equal(response.state.status,expected);
 }
 assert.equal(calls.length,0);
 calls=fake({owner:false});const denied=res();await handler(req(),denied);
 assert.equal(denied.state.status,403);
 assert.equal(calls.filter(x=>x.includes('/session/context')).length,1);
 assert.equal(calls.filter(x=>x.includes('cerebro-console-activity-v0')).length,0);
});
after(()=>{globalThis.fetch=oldFetch;if(prev===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prev;if(oldUrl===undefined)delete process.env.VERCEL_URL;else process.env.VERCEL_URL=oldUrl});
