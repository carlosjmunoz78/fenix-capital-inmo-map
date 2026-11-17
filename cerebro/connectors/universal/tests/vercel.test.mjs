import test from 'node:test';
import assert from 'node:assert/strict';
import {UniversalConnectorCore,inMemoryIdempotency,createAuditSink} from '../src/core.mjs';
import {makeChatGPTAdapter,makeCerebroAdapter} from '../src/clients.mjs';
import {createVercelAdapter} from '../src/vercel.mjs';
import {VERCEL_LAB_PROJECT_ID,VERCEL_LAB_PROJECT_NAME,VERCEL_TEAM_ID} from '../src/vercel-catalog.mjs';
import {CAPABILITIES} from '../src/catalog.mjs';
const CTX={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const ACTOR={actor_id:'owner',identity_ref:'iam:fenix-owner-lab'};
const fresh='cerebro-fact001-vercel-next-lab-20261110';
function service(){
 const projects=[{id:VERCEL_LAB_PROJECT_ID,name:VERCEL_LAB_PROJECT_NAME,framework:null,updatedAt:1,enablePreviewFeedback:false}];
 const calls=[];
 async function request({method,path,body}){
  calls.push({method,path,body});const url=new URL(path,'https://api.vercel.com');
  if(url.searchParams.get('teamId')!==VERCEL_TEAM_ID)throw Error('WRONG_TEAM');
  if(url.pathname==='/v10/projects'&&method==='GET')return {projects:projects.map(p=>({...p}))};
  if(url.pathname==='/v10/projects'&&method==='POST'){
   const p={id:'prj_synthetic_lab_test',name:body.name,framework:null,updatedAt:2};
   projects.push(p);return {...p};
  }
  if(url.pathname.startsWith('/v9/projects/')&&method==='GET'){
   const id=decodeURIComponent(url.pathname.slice('/v9/projects/'.length));
   return projects.find(p=>p.id===id||p.name===id)??{error:{code:'not_found'}};
  }
  if(url.pathname.startsWith('/v9/projects/')&&method==='PATCH'){
   const id=decodeURIComponent(url.pathname.slice('/v9/projects/'.length));
   const p=projects.find(x=>x.id===id);if(!p)throw Error('PROJECT_NOT_FOUND');
   Object.assign(p,body);p.updatedAt++;return {...p};
  }
  if(url.pathname==='/v6/deployments'&&method==='GET')return {deployments:[{id:'dpl_test_labsafe',name:VERCEL_LAB_PROJECT_NAME,target:'preview',state:'READY'}]};
  if(url.pathname==='/v13/deployments/dpl_test_labsafe'&&method==='GET')return {deployment:{id:'dpl_test_labsafe',project:{id:VERCEL_LAB_PROJECT_ID},target:'preview',state:'READY'}};
  throw Error('UNEXPECTED_API');
 }
 return {request,calls,projects};
}
function make({service:s=service(),durable=true,priceOk=true}={}){
 const audit=createAuditSink();const v=createVercelAdapter({request:s.request});
 const idem=inMemoryIdempotency();if(durable)idem.durable=true;
 const core=new UniversalConnectorCore({vercel:v,authorize:async({identity,scope,action})=>identity.identity_ref==='iam:fenix-owner-lab'&&scope.environment==='LAB'&&action.id.startsWith('vercel.'),idempotency:idem,audit:audit.record,costGuard:async()=>priceOk});
 const chatgpt=makeChatGPTAdapter({core,authenticate:async()=>ACTOR});
 const cerebro=makeCerebroAdapter({core,authenticate:async()=>ACTOR});
 return {audit,chatgpt,cerebro,s};
}
const task=(capability,input={},idempotency_key)=>({context:CTX,capability,input,idempotency_key});
test('Vercel adapter requires injected trusted transport, not plaintext secrets',()=>{
 assert.throws(()=>createVercelAdapter(),/TRUSTED_VERCEL_TRANSPORT_REQUIRED/);
});
test('catalog lists Vercel LAB and blocks deployment writes / destructive ops',()=>{
 for(const id of ['vercel.projects.list','vercel.project.create-lab','vercel.project.update-lab','vercel.deployments.list'])assert.ok(CAPABILITIES.some(x=>x.id===id&&x.status==='IMPLEMENTED_LAB'));
 for(const id of ['vercel.deployment.create-preview-lab','vercel.deployment.rollback','vercel.project.delete','vercel.billing.manage'])assert.ok(CAPABILITIES.some(x=>x.id===id&&x.status!=='IMPLEMENTED_LAB'));
});
test('both clients perform identical authorized Vercel inventory via separate identities',async()=>{
 const f=make();const a=await f.chatgpt.callTool({name:'vercel.projects.list',arguments:{...CTX}},{});
 const b=await f.cerebro.execute(task('vercel.projects.list'),{});
 assert.equal(a.status,'COMPLETED');assert.equal(b.status,'COMPLETED');
 assert.equal(a.data.projects[0].id,VERCEL_LAB_PROJECT_ID);
 assert.deepEqual(f.audit.list().map(e=>e.client_id),['chatgpt','cerebro']);
});
test('CEREBRO creates a strictly-named LAB project and never links Git/domains',async()=>{
 const f=make();const a=await f.cerebro.execute(task('vercel.project.create-lab',{name:fresh},'vercel-createlab-1'),{});
 assert.equal(a.status,'COMPLETED');assert.equal(a.data.name,fresh);
 const created=f.s.calls.filter(c=>c.method==='POST');assert.equal(created.length,1);
 assert.equal(created[0].body.skipGitConnectDuringLink,true);
 assert.equal(created[0].body.framework,null);
 assert.ok(!('gitRepository' in created[0].body));assert.ok(!('target' in created[0].body));
 const b=await f.cerebro.execute(task('vercel.project.create-lab',{name:fresh},'vercel-createlab-1'),{});
 assert.deepEqual(a,b);assert.equal(f.s.calls.filter(c=>c.method==='POST').length,1);
});
test('same project exists after a new idempotency key: read-confirm, no new write',async()=>{
 const f=make();f.s.projects.push({id:'prj_existing',name:fresh,framework:null});
 const r=await f.chatgpt.callTool({name:'vercel.project.create-lab',arguments:{...CTX,input:{name:fresh},idempotency_key:'vercel-createlab-2'}},{});
 assert.equal(r.status,'ALREADY_EXISTS_VERIFIED');
 assert.equal(f.s.calls.filter(c=>c.method==='POST').length,0);
});
test('arbitrary project names, Git source, app domain and other fields refused before write',async()=>{
 const f=make();
 for(const input of [
  {name:'fenix-capital-preprod'},
  {name:'cerebro-fact001-test-lab-20261110',gitRepository:{repo:'owner/prod',type:'github'}},
  {name:'cerebro-fact001-test-lab-20261110',teamId:'other'},
  {name:'cerebro-fact001-test-lab-20261110',url:'https://other'}
 ]){const out=await f.cerebro.execute(task('vercel.project.create-lab',input,'bad-'+f.s.calls.length),{});
 assert.equal(out.status,'HUMAN_REQUIRED');}
 assert.equal(f.s.calls.filter(c=>c.method==='POST').length,0);
});
test('can safely update and revert the exact LAB project only',async()=>{
 const f=make();
 const a=await f.cerebro.execute(task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:true},'upd-1'),{});
 assert.equal(a.status,'COMPLETED');
 const b=await f.chatgpt.callTool({name:'vercel.project.update-lab',arguments:{...CTX,input:{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:false},idempotency_key:'upd-2'}},{});
 assert.equal(b.status,'COMPLETED');
 assert.equal(f.s.projects[0].enablePreviewFeedback,false);
 assert.equal(f.s.calls.filter(c=>c.method==='PATCH').length,2);
});
test('attempt to mutate Fénix App project is categorically denied before I/O',async()=>{
 const f=make();const before=f.s.calls.length;
 const out=await f.cerebro.execute(task('vercel.project.update-lab',{idOrName:'prj_4ElVl8e2KzrHS7r5yvBGBban1DXV',enablePreviewFeedback:true},'upd-app'),{});
 assert.equal(out.status,'HUMAN_REQUIRED');assert.equal(f.s.calls.length,before);
});
test('preview deployment creation remains blocked after first non-Git deployed as production',async()=>{
 const f=make();const out=await f.cerebro.execute(task('vercel.deployment.create-preview-lab',{projectId:VERCEL_LAB_PROJECT_ID},'dep-no'),{});
 assert.equal(out.status,'HUMAN_REQUIRED');assert.equal(f.s.calls.length,0);
});
test('reads scoped LAB deployment details, denies foreign deployment',async()=>{
 const f=make();
 const a=await f.cerebro.execute(task('vercel.deployment.get',{deploymentId:'dpl_test_labsafe'}),{});
 assert.equal(a.status,'COMPLETED');assert.equal(a.data.projectId,VERCEL_LAB_PROJECT_ID);
 const list=await f.chatgpt.callTool({name:'vercel.deployments.list',arguments:{...CTX,input:{projectId:VERCEL_LAB_PROJECT_ID}}},{});
 assert.equal(list.status,'COMPLETED');assert.equal(list.data.deployments[0].target,'preview');
 const bad=await f.cerebro.execute(task('vercel.deployments.list',{projectId:'prj_foreign'}),{});
 assert.equal(bad.status,'HUMAN_REQUIRED');
});
test('service identity, PROD write and money limit stop without Vercel API calls',async()=>{
 const f=make({priceOk:false});
 const out=await f.cerebro.execute(task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:true},'cost-block'),{});
 assert.equal(out.reason,'MONEY_LIMIT');assert.equal(f.s.calls.length,0);
 const badScope=await f.cerebro.execute({...task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:true},'prod-block'),context:{...CTX,environment:'PROD'}},{});
 assert.equal(badScope.reason,'HIGH_RISK');assert.equal(f.s.calls.length,0);
});
test('write denied if durable idempotency store is missing',async()=>{
 const f=make({durable:false});
 const out=await f.cerebro.execute(task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:true},'nodurable'),{});
 assert.equal(out.reason,'POLICY_CONFLICT');assert.equal(f.s.calls.length,0);
});
test('separate clients do not share mutation idempotency namespaces',async()=>{
 const f=make();
 const t=task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:false},'shared-1');
 assert.equal((await f.cerebro.execute(t,{})).status,'COMPLETED');
 assert.equal((await f.chatgpt.callTool({name:t.capability,arguments:{...CTX,input:t.input,idempotency_key:'shared-1'}},{})).status,'COMPLETED');
 assert.equal(f.s.calls.filter(c=>c.method==='PATCH').length,2);
});
test('audit payload contains no credential or mutation body',async()=>{
 const f=make();await f.cerebro.execute(task('vercel.project.update-lab',{idOrName:VERCEL_LAB_PROJECT_ID,enablePreviewFeedback:true},'audit-1'),{});
 const log=JSON.stringify(f.audit.list());
 assert.ok(!log.includes('Bearer'));assert.ok(!log.includes('enablePreviewFeedback'));assert.ok(!log.includes('VERCEL_TOKEN'));
});
