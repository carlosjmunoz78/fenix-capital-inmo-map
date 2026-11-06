import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publishJarvisOmniState,clearJarvisOmniState,getJarvisOmniState,
 setJarvisActiveInterface,getJarvisActiveInterface,JARVIS_OMNI_POLICY,setJarvisActiveProject,getJarvisInterfaceHint} from '../src/jarvisOmniSession.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
test('CUT39 all four interfaces share one bounded in-memory state, not runtime credentials',()=>{
 const sample={ready:true,sending:false,voiceActive:true,voiceListening:true,
 voiceSpeaking:false,turns:[{role:'user',text:'hola'},{role:'cerebro',text:'listo'}],
 observedAt:1000};
 publishJarvisOmniState(sample);
 for(const key of ['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR']){
  setJarvisActiveInterface(key);
  assert.equal(getJarvisActiveInterface(),key);
  assert.equal(getJarvisOmniState().turns[1].text,'listo');
  assert.equal(getJarvisOmniState().voiceActive,true);
 }
 assert.throws(()=>setJarvisActiveInterface('OTRO'));
 assert.equal(JARVIS_OMNI_POLICY.storage,'MEMORY_ONLY');
 assert.equal(JARVIS_OMNI_POLICY.actions_require_gateway,true);
 assert.equal(JARVIS_OMNI_POLICY.model_direct_access,false);
 assert.equal(JARVIS_OMNI_POLICY.persistent_full_history_verified,false);
 clearJarvisOmniState();
 assert.equal(getJarvisOmniState().turns.length,0);
});
test('CUT39 transcript projection bounds lines and length and cannot be modified by a reader',()=>{
 publishJarvisOmniState({ready:false,sending:false,voiceActive:false,voiceListening:false,
  voiceSpeaking:false,observedAt:2000,
  turns:Array.from({length:35},(_,i)=>({role:i%2?'user':'cerebro',
   text:'a'.repeat(1600),mediaUrl:'javascript:bad()'}))});
 const a=getJarvisOmniState();
 assert.equal(a.turns.length,24);
 assert.equal(a.turns[0].text.length,1500);
 assert.equal(a.turns[0].mediaUrl,null);
 a.turns[0].text='tampered';
 assert.notEqual(getJarvisOmniState().turns[0].text,'tampered');
 clearJarvisOmniState();
});
test('CUT39 core remains mounted in every sibling surface and user keeps the original Browser tool',()=>{
 const host=read('src/CerebroConsoleHost.tsx');
 assert.ok(host.includes('jarvis-core-mounted'));
 assert.ok(host.includes("hidden={primaryView!=='JARVIS'}"));
 assert.ok(host.includes("primaryView!=='JARVIS'?<JarvisOmniDock"));
 assert.ok(host.includes("primaryView==='NAVEGADOR'?<CerebroBrowserConsole"));
 assert.ok(host.includes("primaryView==='OPERATIVA'?"));
 assert.ok(host.includes("primaryView==='NEURONAL'?"));
 const css=read('src/jarvis-omni-dock.css');
 assert.ok(css.includes('.jarvis-core-mounted[hidden]'));
});
test('CUT39 assistant uses the same authenticated core with no direct model or privileged backend',()=>{
 const core=read('src/CerebroConsoleShell.tsx');
 const dock=read('src/JarvisOmniDock.tsx');
 assert.ok(core.includes('publishJarvisOmniState('));
 assert.ok(core.includes('clearJarvisOmniState()'));
 assert.ok(core.includes("data?.actor_code==='CARLOS-ADMIN'"));
 assert.ok(core.includes('data.authenticated_transport===true'));
 assert.ok(dock.includes('sendJarvisComposerMessage(text)'));
 assert.ok(dock.includes("'.jarvis-core-mounted .cerebro-voice-main'"));
 assert.ok(dock.includes('createVoiceRecognition()'));
 assert.ok(dock.includes("disabled={!state.ready||state.sending||!text.trim()}"));
 assert.ok(!dock.includes('api.deepseek.com'));
 assert.ok(!dock.includes('OPENAI_API_KEY'));
});

test('CUT39 UI context never grants actions or impersonates verified server identity',()=>{
 setJarvisActiveInterface('JARVIS');
 setJarvisActiveProject('PROJECT-123');
 let hint=getJarvisInterfaceHint();
 assert.equal(hint.project_id,'PROJECT-123');
 assert.equal(hint.source,'UNTRUSTED_CLIENT_UI_HINT');
 assert.equal(hint.company_scope,'fenix');
 assert.throws(()=>setJarvisActiveProject('../../.env'));
 setJarvisActiveInterface('NAVEGADOR');
 hint=getJarvisInterfaceHint();
 assert.equal(hint.surface,'NAVEGADOR');
 assert.equal(hint.project_id,null);
 setJarvisActiveProject(null);
});
test('CUT39 registry is explicit about missing production authority and historical completeness',()=>{
 const registry=JSON.parse(read('cerebro/registry/jarvis-universal-interlocutor-cut39.v1.json'));
 assert.equal(registry.state,'CODE_TESTED_NOT_PUBLISHED');
 assert.equal(registry.authority_model,'EXISTING_CEREBRO_GATEWAY_ONLY');
 assert.equal(registry.knowledge_sources.find(x=>x.source_id==='ENGINE_REGISTRY').registered_engines,179);
 assert.equal(registry.knowledge_sources.find(x=>x.source_id==='DEEPSEEK_STUDY').state,'ISOLATED_LAB_CANDIDATES_ONLY_NOT_APPLIED_TO_RUNTIME');
 assert.equal(registry.conversation.longitudinal_memory,'SERVER_MEMORY_RPC_CODE_EXISTS_NOT_ALL_HISTORY_VERIFIED');
 assert.equal(registry.action_authority.unrestricted_execution,false);
 assert.equal(registry.release_gates.can_change_prod,false);
 assert.deepEqual(registry.ui_surfaces.map(x=>x.id),['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR']);
});

test('CUT40 Operativa has one shared core and no hidden duplicate conversation',()=>{
 const operative=read('src/CerebroOperativeConsole.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 assert.equal((host.match(/<CerebroJarvisWorkConsole/g)||[]).length,1);
 assert.doesNotMatch(operative,/<CerebroConsoleShell\s*\/>/);
 assert.doesNotMatch(operative,/operativa-core-bridge/);
 assert.doesNotMatch(operative,/requestSubmit\(/);
 assert.ok(operative.includes('sendJarvisComposerMessage('));
 assert.ok(operative.includes('.jarvis-core-mounted .cerebro-voice-main'));
 assert.ok(operative.includes('Verifica permisos y empresa en el Gateway'));
 assert.ok(operative.includes(".cerebro-chat-form textarea:not(:disabled)"));
});
test('CUT40 server authority is independent of UI company label or model state',()=>{
 const policy=JSON.parse(read('cerebro/registry/jarvis-universal-interlocutor-cut39.v1.json'));
 assert.equal(policy.authority_model,'EXISTING_CEREBRO_GATEWAY_ONLY');
 assert.equal(policy.action_authority.unrestricted_execution,false);
 const operative=read('src/CerebroOperativeConsole.tsx');
 assert.ok(!operative.includes('DEEPSEEK_API_KEY'));
 assert.ok(!operative.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
