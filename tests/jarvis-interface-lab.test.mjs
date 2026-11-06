import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {rememberJarvisConversation,recallJarvisConversation,clearJarvisConversation,
 isJarvisConversationAvailable,JARVIS_UI_MEMORY_POLICY} from '../src/jarvisConversationMemory.ts';
import {sendJarvisComposerMessage,JARVIS_COMPOSER_SEND_EVENT} from '../src/jarvisComposerBridge.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const ownerA='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ownerB='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
function source(path){return readFileSync(join(root,path),'utf8')}

test('JARVIS conversation is owner-scoped and stored only in tab memory',()=>{
 assert.equal(JARVIS_UI_MEMORY_POLICY.storage,'TAB_IN_MEMORY_ONLY');
 assert.equal(JARVIS_UI_MEMORY_POLICY.pending_actions_persist,false);
 assert.equal(recallJarvisConversation(ownerA).length,0);
 rememberJarvisConversation(ownerA,[{role:'user',text:'Hola, Jarvis'},
  {role:'cerebro',text:'Estoy aquí'}],1000);
 assert.equal(recallJarvisConversation(ownerA,1001).length,2);
 assert.equal(isJarvisConversationAvailable(ownerA,1001),true);
 rememberJarvisConversation(ownerB,[{role:'user',text:'Otra cuenta'}],2000);
 assert.deepEqual(recallJarvisConversation(ownerA,2001),[]);
 assert.equal(recallJarvisConversation(ownerB,2001)[0].text,'Otra cuenta');
 clearJarvisConversation(ownerB);
 assert.equal(recallJarvisConversation(ownerB,2002).length,0);
});
test('JARVIS memory expires, bounds number of messages and strips non-https links',()=>{
 const turns=Array.from({length:40},(_,index)=>({role:index%2?'user':'cerebro',
  text:'x'.repeat(1600),mediaUrl:'javascript:alert(1)'}));
 rememberJarvisConversation(ownerA,turns,5000);
 const latest=recallJarvisConversation(ownerA,5001);
 assert.equal(latest.length,24);
 assert.equal(latest[0].text.length,1500);
 assert.equal(latest[0].mediaUrl,null);
 assert.equal(recallJarvisConversation(ownerA,5*60*60*1000).length,0);
});
test('JARVIS composer bridge cannot send blank, oversized or unacknowledged messages',()=>{
 assert.equal(sendJarvisComposerMessage('Hola'),false);
 const oldWindow=globalThis.window;
 const oldCustomEvent=globalThis.CustomEvent;
 const observed=[];
 class FauxEvent{constructor(type,options){this.type=type;this.detail=options.detail}}
 globalThis.CustomEvent=FauxEvent;
 globalThis.window={dispatchEvent(ev){observed.push(ev);if(ev.type===JARVIS_COMPOSER_SEND_EVENT)ev.detail.accepted=true;}};
 try{
  assert.equal(sendJarvisComposerMessage('   '),false);
  assert.equal(sendJarvisComposerMessage('x'.repeat(4001)),false);
  assert.equal(sendJarvisComposerMessage('  Hola JARVIS  '),true);
  assert.equal(observed.length,1);
  assert.equal(observed[0].detail.message,'Hola JARVIS');
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldCustomEvent===undefined)delete globalThis.CustomEvent;else globalThis.CustomEvent=oldCustomEvent;
 }
});
test('CUT38 presence sends through authenticated core, not hidden form or a direct model API',()=>{
 const portal=source('src/JarvisOperativaComposerPortal.tsx');
 const core=source('src/CerebroConsoleShell.tsx');
 const stylesheet=source('src/jarvis-composer-presence.css');
 assert.ok(portal.includes('sendJarvisComposerMessage(clean)'));
 assert.ok(!portal.includes('form.requestSubmit()'));
 assert.ok(portal.includes('aria-label="Mensaje para Jarvis"'));
 assert.ok(portal.includes("data-jarvis-state={currentState}"));
 assert.ok(portal.includes('toggleDictation'));
 assert.ok(portal.includes('toggleVoice'));
 assert.ok(portal.includes("placeholder=\"Escribe aquí a JARVIS…\""));
 assert.ok(core.includes('JARVIS_COMPOSER_SEND_EVENT'));
 assert.ok(core.includes("postCerebroConsoleChat(clean"));
 assert.ok(core.includes('recallJarvisConversation(session.user.id)'));
 assert.ok(core.includes("window.setInterval(onReconnect,30_000)"));
 assert.ok(stylesheet.includes('.jarvis-composer-presence'));
 assert.ok(!portal.includes('api.deepseek.com'));
 assert.ok(!portal.includes('DEEPSEEK_API_KEY'));
});
test('CUT38 Gateway policy remains owner-only and fail closed',()=>{
 const core=source('src/CerebroConsoleShell.tsx');
 assert.ok(core.includes("data?.actor_code==='CARLOS-ADMIN'"));
 assert.ok(core.includes('data.authenticated_transport===true'));
 assert.ok(core.includes('data.direct_model_access===false'));
 assert.ok(core.includes('data.prod_execution_enabled===false'));
 assert.ok(core.includes('data.live_writes===false'));
 assert.ok(core.includes('!chatReadyRef.current||sendingRef.current'));
});
