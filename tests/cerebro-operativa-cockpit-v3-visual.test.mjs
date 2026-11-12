import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const host=read('src/CerebroConsoleHost.tsx');
const nav=read('src/CerebroInterfaceBar.tsx');
const operative=read('src/CerebroOperativeConsole.tsx');
const cockpit=read('src/CerebroOperativeCockpitV3.tsx');
const css=read('src/cerebro-operative-cockpit-v3.css');

test('Five original navigation destinations remain intact, without replacing the global bar',()=>{
 for(const item of ["navigate('/inicio')","['JARVIS','Jarvis']","['OPERATIVA','Operativa']","['NEURONAL','Neuronal']","['NAVEGADOR','Navegador']"])
   assert.ok(nav.includes(item),item);
 assert.ok(host.includes('<CerebroInterfaceBar view={primaryView} onViewChange={changeView}/>'));
});
test('Cockpit is explicit opt-in and original Operativa is unchanged by default',()=>{
 assert.ok(host.includes("get('visual_lab')==='cockpit-v3'"));
 assert.ok(host.includes('visualPreview?<CerebroOperativeConsole visualPreview/>:<CerebroOperativeConsole/>'));
 assert.ok(operative.includes("visualPreview=false"));
 assert.ok(operative.includes('if(visualPreview)return <CerebroOperativeCockpitV3'));
 assert.ok(operative.includes('return <main className="operativa-premium"'));
 assert.ok(operative.includes('fetchCerebroActivity()'));
 assert.ok(operative.includes('<CerebroConsoleShell/>'));
 assert.ok(operative.includes("'.operativa-core-bridge .cerebro-chat-form'")||
   operative.includes("'.cerebro-chat-form'"));
});
test('Real command handlers and voice state drive the animated core, not a playback fake',()=>{
 for(const pattern of [
  'onSubmit={()=>submit()}','onToggleVoice={toggleVoice}',
  'onToggleDictation={toggleDictation}','snapshot={snapshot}',
  'onOpenRun={setSelectedRun}',
  'snapshot.voiceSpeaking','snapshot.voiceListening','snapshot.sending',
  'composer.trim()','running>0','onSubmit()','aria-label="Enviar instrucción"'
 ])assert.ok((operative+cockpit).includes(pattern),pattern);
 assert.ok(css.includes('.op3-pulse.is-speaking .op3-core'));
 assert.ok(css.includes('.op3-pulse.is-working .op3-ring-a'));
 assert.ok(css.includes('.op3-pulse.is-typing .op3-ring-a'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test('Context tabs open functional in-page detail views, with no misleading unverified metrics',()=>{
 for(const item of ['entidades','proyectos','motores','trabajos','evidencias','decisiones']){
   assert.ok(cockpit.includes("'"+item+"'"));
 }
 assert.ok(cockpit.includes('onClick={()=>selectPanel(key)}'));
 assert.ok(cockpit.includes('onClick={()=>onOpenRun(run)}'));
 assert.ok(cockpit.includes('Sin inventario de proyectos verificado'));
 assert.ok(cockpit.includes('Fases internas no verificadas')||
   cockpit.includes('fases internas no verificadas'));
 assert.ok(!cockpit.includes('98%'));
 assert.ok(!cockpit.includes('100%'));
 assert.ok(!cockpit.includes('Motores activos: 13'));
});
test('New component reads existing activity and does not create a second credential path',()=>{
 assert.ok(cockpit.includes('import type {CerebroActivityRun}'));
 assert.ok(!cockpit.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!cockpit.includes('localStorage'));
 assert.ok(!cockpit.includes('sessionStorage'));
 assert.ok(!cockpit.includes('fetch('));
 assert.ok(!cockpit.includes('dangerouslySetInnerHTML'));
 assert.ok(cockpit.includes('validLink(run)'));
 assert.ok(cockpit.includes('github.com'));
});
