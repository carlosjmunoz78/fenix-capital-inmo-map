import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../../api/cerebro-owner-bootstrap.ts';

const HOST='fenix-capital-preprod-fix29nyb8.vercel.app';
const KEY='sb_publishable_abcdefghijklmnop1234567890';
const JWT='eyJhbGciOiJIUzI1NiJ9.'+'a'.repeat(80)+'.'+'b'.repeat(45);
const B='Bearer '+JWT;
function request(extra={}){
 return {method:'GET',url:'/api/cerebro-owner-bootstrap?resource=context',
  headers:{host:HOST,authorization:B,apikey:KEY},...extra};
}
async function invoke(req,mock=async()=>{throw Error('Unexpected network call')}){
 const originalFetch=globalThis.fetch;
 const originalEnv=process.env.VERCEL_ENV;
 const calls=[];
 globalThis.fetch=async (url,options)=>{
  calls.push({url,method:options.method,headers:options.headers,cache:options.cache});
  return mock(url,options);
 };
 process.env.VERCEL_ENV='production';
 let status=0,body=null;
 const response={
  headers:{},
  setHeader(k,v){this.headers[k]=v},
  status(s){status=s;return this},
  json(v){body=v;return this}
 };
 try{await handler(req,response);return {status,body,calls,headers:response.headers}}
 finally{globalThis.fetch=originalFetch;if(originalEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=originalEnv;}
}
const okContext={ok:true,status:200,context:{actor_code:'CARLOS-ADMIN',role:'Dirección'}};
const json=(body,status=200)=>({status,json:async()=>body});
test('fails closed outside isolated Vercel staged host, including PROD domain',async()=>{
 for(const host of ['app.fenixcapital.es','evil.example.com','fenix-capital-preprod-abc.vercel.app.evil.net']){
  const r=await invoke(request({headers:{host,authorization:B,apikey:KEY}}));
  assert.equal(r.status,403);assert.equal(r.calls.length,0);
 }
});
test('no mutation, alternate origin, unknown resource or unauthorized bearer reach upstream',async()=>{
 const cases=[
  [request({method:'POST'}),405],
  [request({headers:{host:HOST,origin:'https://attacker.example',authorization:B,apikey:KEY}}),403],
  [request({url:'/api/cerebro-owner-bootstrap?resource=admin'}),404],
  [request({headers:{host:HOST,authorization:'Bearer not-a-token',apikey:KEY}}),401],
  [request({headers:{host:HOST,authorization:B,apikey:'service_role_dangerous'}}),401]
 ];
 for(const [req,status] of cases){const r=await invoke(req);assert.equal(r.status,status);assert.equal(r.calls.length,0);}
});
test('GET context is server-owner-verified and returned unchanged without caching',async()=>{
 const r=await invoke(request(),async()=>json(okContext));
 assert.equal(r.status,200);assert.deepEqual(r.body,okContext);assert.equal(r.calls.length,1);
 assert.match(r.calls[0].url,/fenix-app-gateway\/session\/context$/);
 assert.equal(r.calls[0].method,'GET');assert.equal(r.calls[0].cache,'no-store');
 assert.match(r.headers['Cache-Control'],/no-store/);
});
test('GET navigation revalidates the owner before a second fixed GET',async()=>{
 const navigation={ok:true,items:[{route:'/inicio',label:'Inicio'},{route:'/cerebro',label:'CEREBRO'}]};
 const r=await invoke(request({url:'/api/cerebro-owner-bootstrap?resource=navigation'}),async (url)=>{
  if(url.endsWith('/session/context'))return json(okContext);
  if(url.endsWith('/navigation'))return json(navigation);
  throw Error('Unknown upstream');
 });
 assert.equal(r.status,200);assert.deepEqual(r.body,navigation);assert.equal(r.calls.length,2);
 assert(r.calls.every(x=>x.method==='GET'&&x.cache==='no-store'));
});
test('nonowner and inactive/invalid upstream session cannot fetch navigation',async()=>{
 for(const payload of [{ok:true,context:{actor_code:'FIN-001'}},{ok:false,context:{actor_code:'CARLOS-ADMIN'}}]){
  const r=await invoke(request({url:'/api/cerebro-owner-bootstrap?resource=navigation'}),async()=>json(payload));
  assert.equal(r.status,403);assert.equal(r.calls.length,1);
 }
 const rejected=await invoke(request(),async()=>json({error:'identity_not_linked'},401));
 assert.equal(rejected.status,401);assert.equal(rejected.calls.length,1);
});
test('upstream outages and malformed responses fail closed; no data leaks',async()=>{
 const outage=await invoke(request(),async()=>{throw Error('SECRET upstream failure')});
 assert.equal(outage.status,503);assert(!JSON.stringify(outage.body).includes('SECRET'));
 const malformed=await invoke(request(),async()=>json('not a context'));
 assert.equal(malformed.status,403);
 const invalidNav=await invoke(request({url:'/api/cerebro-owner-bootstrap?resource=navigation'}),async url=>
  url.endsWith('/session/context')?json(okContext):json({ok:false,items:[]})
 );
 assert.equal(invalidNav.status,502);
});
test('different VERCEL_ENV denies staged bridge; never active on normal preview',async()=>{
 const orig=process.env.VERCEL_ENV;
 const origFetch=globalThis.fetch;
 let called=false;
 process.env.VERCEL_ENV='preview';
 globalThis.fetch=async()=>{called=true;throw Error('Should not call')};
 const res={statusCode:0,status(v){this.statusCode=v;return this},setHeader(){},json(){}};
 try{await handler(request(),res);assert.equal(res.statusCode,403);assert.equal(called,false);}
 finally{globalThis.fetch=origFetch;if(orig===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=orig;}
});
