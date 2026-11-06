import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publishJarvisOmniState,clearJarvisOmniState,getJarvisOmniState,
 setJarvisActiveInterface,getJarvisActiveInterface,JARVIS_OMNI_POLICY} from '../src/jarvisOmniSession.ts';

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
