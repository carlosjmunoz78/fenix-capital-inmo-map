import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFactoryGitOpsCatalog} from '../cerebro/ops/gateway-v36-followups/owner_factory_gitops.ts';

const seed=[
 {engine_id:"FACT-001",name:"Fábrica de Motores CEREBRO",version:"0.1.0",environment:"LAB",status:"DOCUMENTED_PARTIAL"},
 {engine_id:"SEO-001",name:"SEO",version:"0.1.0",environment:"LAB",status:"DEFINED_NOT_BUILT"}
];
const folders=[{type:"dir",name:"SEO-001",path:"cerebro-os/engines/SEO-001"}];
function fixtureFactory({catalog=seed,dirs=folders,http=200}={}){
 const urls=[];
 const requestFetch=async(url,options)=>{
  urls.push({url,options});
  const body=url.includes("raw.githubusercontent.com")?catalog:dirs;
  return new Response(JSON.stringify(body),{status:http,headers:{"content-type":"application/json"}});
 };
 return {requestFetch,urls};
}

test('FACT GitOps live catalog reads only fixed public repository and distinguishes design vs scaffold',async()=>{
 const mock=fixtureFactory();
 const r=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",requestFetch:mock.requestFetch,useCache:false,now:()=>1794511000000});
 assert.equal(r.status,"OK");
 assert.equal(r.source_status,"PUBLIC_GITHUB_LIVE");
 assert.equal(r.catalog.length,2);assert.equal(r.scaffolded.length,1);
 assert.equal(r.catalog[0].declared_state,"DOCUMENTED_PARTIAL");
 assert.equal(r.scaffolded[0].manifest_verified,false);
 assert.equal(r.scaffolded[0].runtime_verified,false);
 assert.equal(r.production_authorized,false);
 assert.equal(r.executed,false);
 assert.equal(r.permissions_granted,false);
 assert.equal(mock.urls.length,2);
 assert.ok(mock.urls.every(({url,options})=>url.startsWith("https://")&&options.method==="GET"));
 assert.ok(mock.urls.every(({options})=>!JSON.stringify(options).includes("Bearer")));
 assert.ok(mock.urls.every(({options})=>options.redirect==="error"));
});

test('No GitOps data accessible to non-owner identity',async()=>{
 const mock=fixtureFactory();
 const r=await readFactoryGitOpsCatalog({actor:"OTHER",requestFetch:mock.requestFetch,useCache:false});
 assert.equal(r.status,"FORBIDDEN");
 assert.equal(mock.urls.length,0);
});

test('HTTP error, malformed engine identity and excessive bytes fail closed',async()=>{
 const bad=fixtureFactory({http:403});
 const rejected=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",requestFetch:bad.requestFetch,useCache:false});
 assert.equal(rejected.status,"SOURCE_UNAVAILABLE");
 assert.deepEqual(rejected.catalog,[]);
 const corrupted=fixtureFactory({catalog:[{engine_id:"../../../../secret"}]});
 const malformed=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",requestFetch:corrupted.requestFetch,useCache:false});
 assert.equal(malformed.status,"SOURCE_UNAVAILABLE");
 const tooLarge=fixtureFactory({catalog:[{engine_id:"FACT-001",name:"X".repeat(260000)}]});
 const large=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",requestFetch:tooLarge.requestFetch,useCache:false});
 assert.equal(large.status,"SOURCE_UNAVAILABLE");
});

test('A new engine appears automatically from the repo directory, without pretending it is active',async()=>{
 const m=fixtureFactory({dirs:[...folders,{type:"dir",name:"NEW-999",path:"cerebro-os/engines/NEW-999"}]});
 const r=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",requestFetch:m.requestFetch,useCache:false});
 assert.equal(r.status,"OK");
 assert.ok(r.scaffolded.some(x=>x.engine_id==="NEW-999"));
 assert.ok(r.scaffolded.every(x=>x.execution_enabled===false));
});

test('Unified owner routes cannot bypass pre-existing server auth; only GET and read-only calls',()=>{
 const code=readFileSync(new URL('../cerebro/ops/gateway-v36-followups/index.ts',import.meta.url),'utf8');
 const auth=code.indexOf('const owner=await authorizedOwner(req);',code.indexOf('fetch: withSupabase'));
 const denied=code.indexOf('if(!owner.ok)return json(req,403',auth);
 for(const suffix of ['owner-factory','owner-universe','owner-registry']){
   const route=code.indexOf('if(req.method==="GET"&&suffix==="'+suffix+'")',auth);
   assert.ok(auth>0&&denied>auth&&route>denied,suffix);
   assert.ok(!code.includes('req.method==="POST"&&suffix==="'+suffix+'"'));
 }
 assert.match(code,/readFactoryGitOpsCatalog\\(\\{actor:owner\\.actor\\}\\)/);
 assert.match(code,/liveOwnerRegistry\\(owner\\.actor/);
 assert.match(code,/verifiedCompanyIds:\\["fenix"\\]/);
 assert.match(code,/prod_execution_enabled:false/);
 assert.match(code,/live_writes:false/);
});
