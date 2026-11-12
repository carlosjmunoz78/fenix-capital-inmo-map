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
const liveCss=read('src/cerebro-operative-live-console.css');
const universe=read('src/cerebroOperativaLabUniverseApi.ts');
const views=read('src/CerebroOperativaUniverseViews.tsx');

test('Five original navigation destinations remain intact, without replacing the global bar',()=>{
 for(const item of ["navigate('/inicio')","['JARVIS','Jarvis']","['OPERATIVA','Operativa']","['NEURONAL','Neuronal']","['NAVEGADOR','Navegador']"])
   assert.ok(nav.includes(item),item);
 assert.ok(host.includes('<CerebroInterfaceBar view={primaryView} onViewChange={changeView}/>'));
});
test('Cockpit is explicit opt-in and original Operativa is unchanged by default',()=>{
 assert.ok(host.includes("get('visual_lab')==='cockpit-v3'"));
 assert.ok(host.includes("import CerebroOperativeConsole from './CerebroOperativeLiveConsole';"));
 assert.ok(host.includes("import CerebroOperativeLabConsole from './CerebroOperativeConsole';"));
 assert.ok(host.includes('visualPreview?<CerebroOperativeLabConsole visualPreview/>:<CerebroOperativeConsole/>'));
 const live=read('src/CerebroOperativeLiveConsole.tsx');
 const hook=read('src/useCerebroOperativaChat.ts');
 assert.ok(live.includes('Conversación con CEREBRO'));
 assert.ok(live.includes('className="operativa-dialogue-log"'));
 assert.ok(live.includes('aria-label="Mensaje para CEREBRO"'));
 assert.ok(hook.includes('postCerebroConsoleChat'));
 assert.ok(hook.includes('voiceNeedsManualConfirmation'));
 assert.ok(!live.includes('<CerebroConsoleShell/>'));
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
 assert.ok(cockpit.includes('<CerebroOperativaUniverseViews'));
 assert.ok(views.includes('projects.map'));
 assert.ok(views.includes('catalog.map'));
 assert.ok(views.includes('scaffolded.map'));
 assert.ok(views.includes('Sin acceso verificado')||views.includes('No hay acceso verificado'));
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

test('Owner LAB universe reads only through the existing owner session; source status must be explicit',()=>{
 assert.ok(operative.includes('fetchOwnerUniverseLab(company,controller.signal)'));
 assert.ok(operative.includes('if(!visualPreview)return'));
 assert.ok(operative.includes('universeRecord?.company===company'));
 assert.ok(universe.includes("cerebro-console-gateway-v36-followups-lab/owner-universe"));
 assert.ok(universe.includes('supabase.auth.getSession()'));
 assert.ok(universe.includes('Authorization:'));
 assert.ok(universe.includes("company!=='all'"));
 assert.ok(universe.includes("COMPANY_NOT_VERIFIED"));
 assert.ok(universe.includes('raw.live_writes!==false'));
 assert.ok(universe.includes('raw.prod_execution_enabled!==false'));
 assert.ok(!universe.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!universe.includes('localStorage'));
 assert.ok(!universe.includes('sessionStorage'));
 assert.ok(!universe.includes("method:'POST'"));
 assert.ok(!universe.includes('dangerouslySetInnerHTML'));
});
test('Source-specific engine, project and company states do not grant PROD permissions',()=>{
 assert.ok(views.includes("registry?.status==='OK'"));
 assert.ok(views.includes("factory?.status==='OK'"));
 assert.ok(views.includes('Registro PREPROD')||views.includes('registro PREPROD'));
 assert.ok(views.includes('no certifica ejecución'));
 assert.ok(views.includes('no deben sumarse'));
 assert.ok(views.includes('Sin vínculo verificado'));
});

test('DOM observation stays inside the existing V0 bridge and unchanged voice state does not trigger render loops',()=>{
 assert.ok(operative.includes("previous.ready===next.ready&&previous.sending===next.sending"));
 assert.ok(operative.includes("previous.voiceListening===next.voiceListening&&previous.voiceSpeaking===next.voiceSpeaking?previous:next"));
 assert.ok((operative.match(/observer\.observe\(document\.querySelector<HTMLElement>\('\.operativa-core-bridge'\)\|\|document\.body/g)||[]).length>=2);
 assert.ok(operative.includes("setChatMirror(previous=>{"));
 assert.ok(!operative.includes("observer.observe(document.body,"));
});

test('Existing live company conversation and the new V3 are different intentional mount targets',()=>{
 const live=read('src/CerebroOperativeLiveConsole.tsx');
 assert.ok(live.includes('useCerebroOperativaChat()'));
 assert.ok(live.includes('operativa-dialogue'));
 assert.ok(liveCss.includes('.operativa-dialogue>.operativa-jarvis-composer'));
 assert.ok(liveCss.includes('position:relative'));
 assert.ok(!live.includes('visualPreview='));
 assert.ok(host.includes("get('visual_lab')==='cockpit-v3'"));
});
