import assert from 'node:assert/strict';
import handler,{verifiedReadOnlyMode} from '../../../api/cerebro-agent-directory.ts';
const previous=process.env.VERCEL_ENV,priorFetch=globalThis.fetch;
const host='app.fenixcapital.es',preview='fenix-capital-preprod-mwpwnh2ik.vercel.app';
const goodHeaders=h=>({host:h,authorization:'Bearer '+'a'.repeat(42),apikey:'p'.repeat(25),origin:'https://'+h});
function mockRes(){
 const obj={code:0,headers:{},body:null,status(n){this.code=n;return this},
  setHeader(k,v){this.headers[k]=v},json(v){this.body=v;return this}};
 return obj;
}
async function run({hostname=host,env='production',method='GET',url='/api/cerebro-agent-directory?company_id=fenix&kind=ALL&limit=2',headers=null}={}){
 process.env.VERCEL_ENV=env;const res=mockRes();
 await handler({method,url,headers:headers||goodHeaders(hostname)},res);
 return res;
}
try{
 assert.equal(verifiedReadOnlyMode(host,'production'),'OWNER_PROD_READONLY');
 assert.equal(verifiedReadOnlyMode(host,'preview'),null);
 assert.equal(verifiedReadOnlyMode(preview,'preview'),'PREVIEW_ONLY_SERVER_VERIFIED');
 assert.equal(verifiedReadOnlyMode(preview,'production'),null);
 assert.equal(verifiedReadOnlyMode('evil.example','production'),null);
 let authorizedCalls=0;
 globalThis.fetch=async(url,options)=>{
  authorizedCalls++;
  assert.match(String(url),/fenix-app-gateway\/session\/context$/);
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  return {status:200,json:async()=>({context:{actor_code:'CARLOS-ADMIN'}})};
 };
 const prod=await run();
 assert.equal(prod.code,200);
 assert.equal(prod.body.status,'OK');
 assert.equal(prod.body.transport,'OWNER_PROD_READONLY');
 assert.equal(prod.body.company_id,'fenix');
 assert.equal(prod.body.read_only,true);
 assert.equal(prod.body.executed,false);
 assert.equal(prod.body.counts.total_runtime_instances,null);
 assert.equal(prod.body.page.total,2506);
 assert.equal(prod.body.records.length,2);
 assert.equal(prod.headers['Cache-Control'],'private, no-store, max-age=0');
 const pr=await run({hostname:preview,env:'preview'});
 assert.equal(pr.code,200);
 assert.equal(pr.body.transport,'PREVIEW_ONLY_SERVER_VERIFIED');
 assert.equal(pr.body.page.total,2506);
 const count=authorizedCalls;
 for(const bad of [
  {hostname:preview,env:'production'},
  {hostname:host,env:'preview'},
  {hostname:'evil.example',env:'production'},
  {method:'POST'},
  {url:'/api/cerebro-agent-directory?company_id=other'},
  {url:'/api/cerebro-agent-directory?company_id=fenix&limit=10000'}
 ]){
  const out=await run(bad);
  assert.notEqual(out.code,200);
 }
 assert.equal(authorizedCalls,count,'denied requests must not call owner resolver');
 const missingAuth=await run({headers:{host}});
 assert.equal(missingAuth.code,401);
 globalThis.fetch=async()=>({status:200,json:async()=>({context:{actor_code:'OTHER_USER'}})});
 const wrongOwner=await run();
 assert.equal(wrongOwner.code,403);
 assert.equal(wrongOwner.body.reason,'OWNER_NOT_VERIFIED');
 globalThis.fetch=async()=>{throw new Error('SYNTHETIC_UPSTREAM_FAILURE')};
 const failClosed=await run();
 assert.equal(failClosed.code,503);
 assert.equal(failClosed.body.reason,'OWNER_RESOLVER_UNAVAILABLE');
 console.log('OWNER-PROD-READONLY: PASS / 2506 indexed / correct tenant and preview-only gates / all denied mutations and foreign identity');
}finally{
 if(previous===undefined)delete process.env.VERCEL_ENV;
 else process.env.VERCEL_ENV=previous;
 globalThis.fetch=priorFetch;
}
