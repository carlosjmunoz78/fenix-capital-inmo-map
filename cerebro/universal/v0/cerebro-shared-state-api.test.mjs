import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import handler,{validateSharedQuery} from '../../../api/cerebro-shared-state.ts';
const prev=process.env.VERCEL_ENV,oldFetch=globalThis.fetch;
process.env.VERCEL_ENV='production';
const auth='Bearer '+'X'.repeat(45);
const apikey='sb_publishable_contract_test';
const q=(suffix='mode=summary&company_id=fenix')=>'/api/cerebro-shared-state?'+suffix;
const req=(url=q(),method='GET',headers={})=>({method,url,headers:{host:'app.fenixcapital.es',authorization:auth,apikey,accept:'application/json',...headers}});
const res=()=>{let status=200,payload,headers={};return{setHeader(k,v){headers[k]=v},status(s){status=s;return this},json(b){payload=b;return this},get state(){return{status,payload,headers}}}};
function fake({owner=true,feed='LIVE',running=false}={}){
 const calls=[];
 globalThis.fetch=async (url)=>{
  calls.push(String(url));
  if(String(url).includes('/session/context'))return{status:200,json:async()=>({context:{actor_code:owner?'CARLOS-ADMIN':'OTHER'}})};
  if(String(url).includes('/cerebro-console-activity-v0/')){
   if(feed==='HTTP503')return{ok:false,status:503};
   const today=new Date().toISOString();
   return{ok:true,status:200,json:async()=>({status:'OK',source_status:feed==='STALE'?'CACHED':'LIVE',
    observed_at:feed==='STALE'?'2026-01-01T00:00:00Z':today,runs:running?[{
     run_id:12345678,company_id:'fenix',engine_id:'SEO-001',status:'in_progress',updated_at:today,
     html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/12345678',
     environment:'PROD',version:'mock',conclusion:null
    }]:[]})};
  }
  throw Error('UNEXPECTED_NETWORK');
 };
 return calls;
}
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
test('running engine does not turn 191 SEO profiles active by family association',async()=>{
 fake({running:true});const response=res();await handler(req(),response);
 assert.equal(response.state.status,200);
 assert.equal(response.state.payload.overview.verified_running_profiles,0);
 assert.equal(response.state.payload.overview.states.ACTIVO,0);
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
after(()=>{globalThis.fetch=oldFetch;if(prev===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prev});
