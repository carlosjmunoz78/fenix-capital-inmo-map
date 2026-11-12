import test from 'node:test';
import assert from 'node:assert/strict';
import {UniversalConnectorCore,inMemoryIdempotency,createAuditSink} from '../src/core.mjs';
import {OperaGovernedProvider} from '../src/opera.mjs';
import {makeChatGPTAdapter,makeCerebroAdapter} from '../src/clients.mjs';
import {OPERA_CAPABILITIES} from '../src/opera-catalog.mjs';
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.2.0'};
const actor={actor_id:'owner',identity_ref:'iam:fenix-owner-lab'};
const date=Date.parse('2026-11-09T17:00:00Z');
function fixture({badBinding=false,write=false}={}) {
 const called=[];const audit=createAuditSink();
 const toolkit={
  list_tabs:async o=>(called.push(['list_tabs',o]),[{tab_id:123,title:'Hello'}])[1],
  tab_content:async o=>(called.push(['tab_content',o]),[{text:'safe'}])[1],
  screenshot:async o=>(called.push(['screenshot',o]),{content_type:'image/png'})[1],
  history:async o=>(called.push(['history',o]),[{title:'A'}])[1],
  go_to_page:async o=>(called.push(['go_to_page',o]),[{tab_id:124}])[1],
  close_tab:async o=>(called.push(['close_tab',o]),{closed:true})[1]
 };
 const opera=new OperaGovernedProvider({toolkit,now:()=>date,resolveBrowserBinding:async({identity,scope})=>({
  browser_id:'browser-connector-registered-by-host',company_id:badBinding?'wrong':scope.company_id,
  environment:scope.environment,client_id:identity.client_id,identity_ref:identity.identity_ref,
  allowed_origins:['https://example.com','https://fenixcapital.es'],attested:true,expires_at:'2026-11-09T17:10:00Z'
 })});
 const core=new UniversalConnectorCore({opera,idempotency:{...inMemoryIdempotency(),durable:write},audit:audit.record,authorize:async()=>true,costGuard:async()=>true});
 return {called,audit,core,chatgpt:makeChatGPTAdapter({core,authenticate:async()=>actor}),cerebro:makeCerebroAdapter({core,authenticate:async()=>actor})};
}
const call=(name,input={},key)=>({name,arguments:{...scope,input,...(key?{idempotency_key:key}:{})}});
test('Opera registry includes current six tool names and future Browser-1 commands disabled',()=>{
 const ids=new Set(OPERA_CAPABILITIES.filter(c=>c.status==='IMPLEMENTED_LAB').map(c=>c.id));
 assert.deepEqual([...ids].sort(),['opera.tabs.close','opera.tabs.history','opera.tabs.list','opera.tabs.navigate','opera.tabs.read','opera.tabs.screenshot']);
 assert.ok(OPERA_CAPABILITIES.find(c=>c.id==='opera.browser.click').status!=='IMPLEMENTED_LAB');
});
test('Same core routes Opera through ChatGPT and CEREBRO independently with separate verified bindings',async()=>{
 const f=fixture();
 const a=await f.chatgpt.callTool(call('opera.tabs.list'),{});
 const b=await f.cerebro.execute({context:scope,capability:'opera.tabs.read',input:{tab_id:123}},{});
 assert.equal(a.status,'COMPLETED');assert.equal(b.status,'COMPLETED');
 assert.deepEqual(f.called.map(x=>x[0]),['list_tabs','tab_content']);
 assert.deepEqual(f.audit.list().map(x=>x.client_id),['chatgpt','cerebro']);
 assert.deepEqual(f.audit.list().map(x=>x.outcome),['COMPLETED','COMPLETED']);
});
test('Fail closed if browser resolver identity scope invalid or client not authenticated',async()=>{
 const f=fixture({badBinding:true});
 assert.equal((await f.chatgpt.callTool(call('opera.tabs.list'),{})).status,'HUMAN_REQUIRED');
 assert.deepEqual(f.called,[]);
 const c=makeChatGPTAdapter({core:f.core,authenticate:async()=>null});
 assert.equal((await c.callTool(call('opera.tabs.list'),{})).status,'HUMAN_REQUIRED');
});
test('Client cannot provide browser id or credential field; no tool invoked',async()=>{
 const f=fixture();
 for(const input of [{browser_id:'wrong'},{password:'hello'},{nested:{token:'abc'}}]){
  const r=await f.chatgpt.callTool(call('opera.tabs.list',input),{});assert.equal(r.status,'HUMAN_REQUIRED');
 }
 assert.deepEqual(f.called,[]);
});
test('Unsupported click/form input never executes even if toolkit has some method',async()=>{
 const f=fixture();
 const r=await f.chatgpt.callTool(call('opera.browser.click',{selector:'#x'},'click-1'),{});
 assert.equal(r.status,'HUMAN_REQUIRED');assert.deepEqual(f.called,[]);
});
test('Navigate/close require durable idempotency, cost guard and valid HTTPS origin; read remains available',async()=>{
 const f=fixture();
 assert.equal((await f.chatgpt.callTool(call('opera.tabs.navigate',{url:'https://example.com/hi'},'nav-1'),{})).status,'HUMAN_REQUIRED');
 assert.deepEqual(f.called,[]);
 const g=fixture({write:true});
 assert.equal((await g.chatgpt.callTool(call('opera.tabs.navigate',{url:'https://unapproved.com'},'nav-2'),{})).status,'HUMAN_REQUIRED');
 assert.deepEqual(g.called,[]);
 const ok=await g.chatgpt.callTool(call('opera.tabs.navigate',{url:'https://example.com/a',tab_id:123},'nav-3'),{});
 assert.equal(ok.status,'COMPLETED');
 assert.equal(g.called.length,1);
 assert.equal(g.called[0][1].browser_id,'browser-connector-registered-by-host');
 const again=await g.chatgpt.callTool(call('opera.tabs.navigate',{url:'https://example.com/a',tab_id:123},'nav-3'),{});
 assert.deepEqual(again,ok);assert.equal(g.called.length,1);
});
test('Browser history limited to 30 days, tab index must be safe',async()=>{
 const f=fixture();
 for(const [name,input] of [['opera.tabs.history',{startDaysAgo:200}],['opera.tabs.read',{tab_id:'123'}]]){
  assert.equal((await f.chatgpt.callTool(call(name,input),{})).status,'HUMAN_REQUIRED');
 }
 assert.deepEqual(f.called,[]);
});
test('No browser content, token or screenshot returned in audit logs',async()=>{
 const f=fixture(); await f.chatgpt.callTool(call('opera.tabs.screenshot',{tab_id:123}),{});
 assert.ok(!JSON.stringify(f.audit.list()).includes('image/png'));
});