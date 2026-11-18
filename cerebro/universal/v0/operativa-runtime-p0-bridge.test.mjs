import test from 'node:test';
import assert from 'node:assert/strict';
import handler, {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
const originalFetch=globalThis.fetch;
const originalEnv=process.env.VERCEL_ENV;
process.env.VERCEL_ENV='production';
const now=()=>new Date().toISOString();
const req=(url='/api/cerebro-agent-directory?company_id=fenix&kind=ALL&family=SEO_ENTERPRISE&offset=0&limit=2',
  method='GET')=>({method,url,headers:{host:'app.fenixcapital.es',authorization:'Bearer '+'A'.repeat(35),apikey:'publishable_test_only'}});
const res=()=>{let body,code;return {status(n){code=n;return this},setHeader(){},json(value){body=value;return this},get code(){return code},get body(){return body}}};
function intercept(options={}){
 globalThis.fetch=async (url)=>{
  if(String(url).includes('/session/context'))return {status:200,json:async()=>({context:{actor_code:options.owner===false?'NOT_OWNER':'CARLOS-ADMIN'}})};
  if(String(url).includes('cerebro-console-activity-v0')){
   if(options.activityHttp503)return {ok:false,status:503};
   return {ok:true,status:200,json:async()=>({
    status:'OK',source_status:options.stale?'CACHED':'LIVE',
    observed_at:options.stale?'2026-01-01T00:00:00Z':now(),
    runs:options.runs??[{
      run_id:123456,engine_id:'SEO-001',company_id:'fenix',status:'in_progress',
      updated_at:now(),environment:'PROD',version:'abcdef123456',conclusion:null,
      html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/123456'
    }]
   })};
  }
  throw Error('UNEXPECTED_OUTBOUND_TARGET');
 };
}
test('source registry count stays 2506 logical profiles',()=>{
 assert.equal(buildCerebroAgentDirectoryV0().length,2506);
});
test('unauthorized actor denied BEFORE activity source',async()=>{
 let activityCalls=0;
 globalThis.fetch=async url=>{if(String(url).includes('/session/context'))return {status:200,json:async()=>({actor_code:'OTHER'})};activityCalls++;throw Error('UNAUTHORIZED_EXTERNAL_CALL');};
 const response=res();await handler(req(),response);
 assert.equal(response.code,403);assert.equal(activityCalls,0);
});
test('one motor job observed does not prove associated SEO role is active',async()=>{
 intercept();const response=res();await handler(req(),response);
 assert.equal(response.code,200);assert.equal(response.body.runtime_source.status,'ACTIVO');
 assert.equal(response.body.runtime_source.observed_execution_ids,1);
 assert.equal(response.body.runtime_source.verified_profiles,0);
 assert.equal(response.body.records.length,2);
 for(const r of response.body.records){assert.equal(r.runtime_verified,false);assert.equal(r.runtime_status,'POR_VERIFICAR');assert.equal(r.runtime_observation?.engine_id,'SEO-001');}
});
test('activity HTTP 503 keeps directorio readable and source degraded',async()=>{
 intercept({activityHttp503:true});const response=res();await handler(req(),response);
 assert.equal(response.code,200);assert.equal(response.body.runtime_source.status,'DEGRADADO');
 assert.equal(response.body.runtime_source.error_code,'ACTIVITY_HTTP_503');
 assert.equal(response.body.records.every(r=>r.runtime_verified===false),true);
});
test('stale activity cannot promote any profile',async()=>{
 intercept({stale:true});const response=res();await handler(req(),response);
 assert.equal(response.code,200);assert.equal(response.body.runtime_source.status,'DEGRADADO');
 assert.equal(response.body.runtime_source.error_code,'ACTIVITY_EVIDENCE_STALE_OR_INVALID');
});
test('cross-company request rejected (no activity fetch)',async()=>{
 intercept();const response=res();await handler(req('/api/cerebro-agent-directory?company_id=aion&kind=ALL'),response);
 assert.equal(response.code,400);
});
test('write attempt blocked',async()=>{
 intercept();const response=res();await handler(req(undefined,'POST'),response);
 assert.equal(response.code,405);
});
test.after(()=>{globalThis.fetch=originalFetch;if(originalEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnv});
