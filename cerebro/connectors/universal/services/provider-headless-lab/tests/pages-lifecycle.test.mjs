import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPagesLifecycle,ACCOUNT,NAME} from '../pages-lifecycle.mjs';
const token='FAKE_NEVER_A_REAL_CLOUDFLARE_TOKEN_0123456789';
function fixture({blockedCreate=false,ambiguousCreate=false,foreignDomain=false,deleteFails=false,existing=false}={}){
 const calls=[];
 let exists=existing, wasCreated=false;
 const response=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
 const json=result=>({success:true,errors:[],messages:[],result});
 const project=()=>({name:NAME,subdomain:NAME+'.pages.dev',source:null,domains:foreignDomain?[NAME+'.pages.dev','app.fenixcapital.es']:[NAME+'.pages.dev'],latest_deployment:null});
 const http=async(url,options)=>{
  const path=new URL(url).pathname,method=options.method;calls.push({path,method});
  assert.equal(new URL(url).origin,'https://api.cloudflare.com');
  assert.equal(options.headers.Authorization,'Bearer '+token);
  if(method==='GET')return exists?response(200,json(project())):response(404,{success:false});
  if(method==='POST'){
   assert.deepEqual(JSON.parse(options.body),{name:NAME,production_branch:'main'});
   if(blockedCreate)return response(403,{success:false});
   exists=true;wasCreated=true;
   if(ambiguousCreate)return {ok:false,status:500,json:async()=>({})};
   return response(200,json(project()));
  }
  if(method==='DELETE'){
   if(deleteFails)return response(500,{success:false});
   exists=false;return response(200,json(null));
  }
  throw Error('WRONG_METHOD');
 };
 return {http,calls,exists:()=>exists,wasCreated:()=>wasCreated};
}
test('signed service can create, read and delete exactly one disposable Pages project',async()=>{
 const f=fixture();
 const o=await verifyPagesLifecycle({token,http:f.http});
 assert.equal(o.status,'CLOUDFLARE_PAGES_LAB_CREATE_READ_DELETE_VERIFIED');
 assert.equal(o.credential_exposed,false);assert.equal(o.production_resources_modified,0);
 assert.equal(o.external_domains_modified,0);assert.equal(o.deployments_created,0);
 assert.equal(f.exists(),false);
 assert.deepEqual(f.calls.map(c=>c.method),['GET','POST','GET','GET','DELETE','GET']);
 const urls=f.calls.filter(c=>c.method==='DELETE');
 assert.equal(urls.length,1);assert.ok(urls[0].path.endsWith('/pages/projects/'+NAME));
});
test('cannot delete pre-existing project even if its name matches the disposable target',async()=>{
 const f=fixture({existing:true});await assert.rejects(()=>verifyPagesLifecycle({token,http:f.http}),/ALREADY_EXISTS/);
 assert.equal(f.exists(),true);assert.equal(f.calls.filter(c=>c.method==='DELETE').length,0);
});
test('no mutation when the provider denies creation',async()=>{
 const f=fixture({blockedCreate:true});await assert.rejects(()=>verifyPagesLifecycle({token,http:f.http}),/PAGES_HTTP_403/);
 assert.equal(f.exists(),false);assert.equal(f.calls.filter(c=>c.method==='DELETE').length,0);
});
test('ambiguous provider 500 after actually creating triggers safe reconciliation and cleanup',async()=>{
 const f=fixture({ambiguousCreate:true});await assert.rejects(()=>verifyPagesLifecycle({token,http:f.http}),/PAGES_HTTP_500/);
 assert.equal(f.wasCreated(),true);assert.equal(f.exists(),false);
 assert.equal(f.calls.filter(c=>c.method==='DELETE').length,1);
});
test('foreign/custom domain blocks deletion, leaving object for manual incident response',async()=>{
 const f=fixture({foreignDomain:true});await assert.rejects(()=>verifyPagesLifecycle({token,http:f.http}),/CUSTOM_DOMAINS_PRESENT/);
 assert.equal(f.exists(),true);assert.equal(f.calls.filter(c=>c.method==='DELETE').length,0);
});
test('failed cleanup never reports green',async()=>{
 const f=fixture({deleteFails:true});await assert.rejects(()=>verifyPagesLifecycle({token,http:f.http}),/PAGES_HTTP_500/);
 assert.equal(f.exists(),true);
});
test('fake or malformed credential denied before contacting API',async()=>{
 const f=fixture();await assert.rejects(()=>verifyPagesLifecycle({token:'',http:f.http}),/CREDENTIAL_UNAVAILABLE/);
 assert.equal(f.calls.length,0);
});
