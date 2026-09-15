import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('floating controls keep microphone calculator chat vertical order',async()=>{
 const calc=read('src/CalculatorLabelGuard.tsx');
 const audio=read('src/audio-transcription.css');
 const routes=read('src/RouteAccessGuard.tsx');
 expect(audio).toContain('bottom:130px');
 expect(calc).toContain("styleLauncher(el,'76px')");
 expect(calc).toContain("styleLauncher(link,'22px')");
 expect(calc).toContain("link.textContent='💬'");
 expect(calc).toContain("const SIZE='46px'");
 expect(calc).toContain("const ORANGE='#ff5a1f'");
 expect(routes).toContain("'/chat'");
});

test('global voice actions expose the four required Ana modes with scoped context',async()=>{
 const voice=read('src/AudioTranscriptionGuard.tsx');
 for(const token of ["id:'ana'","label:'Hablar con Ana'","id:'knowledge'","label:'Dar conocimiento'","id:'correct'","label:'Corregir a Ana'","id:'task'","label:'Tarea'"])expect(voice).toContain(token);
 expect(voice).toContain("scope_type:scope.type");
 expect(voice).toContain("base.set('scope_code',scope.code)");
 expect(voice).toContain("base.set('correction',composed)");
 expect(voice).toContain("base.set('knowledge',composed)");
});

test('Ana screen keeps persistent knowledge and conversation while global shortcuts cover ordinary use',async()=>{
 const knowledge=read('src/AnaKnowledgeBlock.tsx');
 const contextual=read('src/AnaUniversalGuard.tsx');
 expect(knowledge).toContain("if(location.pathname!=='/ana')return");
 expect(knowledge).toContain("if(location.pathname!=='/ana'||!mount)return null");
 expect(knowledge).toContain('DAR CONOCIMIENTO A ANA');
 expect(contextual).not.toContain('>Correcciones</button>');
});

test('Ana screen includes a real persistent conversation composer and stream',async()=>{
 const chat=read('src/AnaChatBlock.tsx');
 const main=read('src/main.tsx');
 expect(chat).toContain("location.pathname==='/ana'");
 expect(chat).toContain("fenix_prod_chat_list_user");
 expect(chat).toContain("fenix_prod_chat_send_user");
 expect(chat).toContain('CONVERSACIÓN CON ANA');
 expect(main).toContain("import AnaChatBlock from './AnaChatBlock'");
 expect(main).toContain('<AnaChatBlock />');
});

test('executive bank ranking fails closed without an explicit canonical score',async()=>{
 const source=read('src/DirectionExecutiveOverviewGuard.tsx');
 expect(source).toContain('explicitRankingScore');
 expect(source).toContain("ranking_score");
 expect(source).toContain("return{status:items.length?200:204,items}");
 expect(source).toContain('Ranking pendiente de señal canónica');
 expect(source).not.toContain('40-Math.min(index,10)');
});

test('bank top three mounts directly in expediente detail and uses live signals',async()=>{
 const source=read('src/ExpedienteBankRankingProdGuard.tsx');
 expect(source).toContain("document.querySelector('.detail-next-action')");
 expect(source).not.toContain("document.querySelector('.exp-ana-runtime-main')");
 expect(source).toContain('/bancos-candidatos');
 expect(source).toContain('/envios-banco');
 expect(source).toContain('/ofertas');
 expect(source).toContain('slice(0,3)');
});

test('structured reports can open without a PDF and PDFs remain separate',async()=>{
 const source=read('src/InformesShell.tsx');
 expect(source).toContain('expanded');
 expect(source).toContain("'Abrir informe →'");
 expect(source).toContain('Abrir PDF ↗');
 expect(source).toContain('Object.entries(r)');
});

test('expediente master detail visibly preserves required data and mounts PROD participants plus document accordions',async()=>{
 const source=read('src/ExpedienteRequiredDataGuard.tsx').toLocaleLowerCase('es');
 for(const token of ['cliente','origen','inmobiliaria','financ','visitador','precio','financiación','aport','ratio','ahorro','banco','estado','riesg','próxima','document','hist']) expect(source).toContain(token);
 const raw=read('src/ExpedienteRequiredDataGuard.tsx');
 expect(raw).toContain("import ExpedientePeopleProdGuard from './ExpedientePeopleProdGuard'");
 expect(raw).toContain("import ExpedientePeopleAccordionGuard from './ExpedientePeopleAccordionGuard'");
 expect(raw).toContain('<ExpedientePeopleProdGuard/>');
 expect(raw).toContain('<ExpedientePeopleAccordionGuard/>');
 const prodPeople=read('src/ExpedientePeopleProdGuard.tsx');
 expect(prodPeople).toContain("const roles=['Titular comprador','Avalista','Coprestatario','Vendedor','Propietario','Representante','Otro']");
 expect(prodPeople).toContain('exp-person-documents');
 const main=read('src/main.tsx');
 expect(main).toContain("import ExpedienteRequiredDataGuard from './ExpedienteRequiredDataGuard'");
 expect(main).toContain('<ExpedienteRequiredDataGuard />');
});

test('bank detail visibly exposes required commercial and operational knowledge',async()=>{
 const source=read('src/BancoDetailShell.tsx').toLocaleLowerCase('es');
 for(const token of ['hipoteca','financi','vincul','tasador','contact','velocidad','aprob','expediente','hist','valor','not']) expect(source).toContain(token);
});

test('direction KPI drilldown hides normal destination content while active and cleans marker',async()=>{
 const source=read('src/DirectionKpiDrilldownGuard.tsx');
 expect(source).toContain("root.setAttribute('data-kpi-drilldown','true')");
 expect(source).toContain("x.removeAttribute('data-kpi-drilldown')");
 expect(source).toContain(".ops-root[data-kpi-drilldown=\"true\"]");
});

test('Honorarios drilldown fails closed until a canonical pending-fees contract exists',async()=>{
 const source=read('src/DirectionKpiDrilldownGuard.tsx');
 expect(source).not.toContain('fetchEconomiaRuntime');
 expect(source).not.toContain("fetchNotionRuntime<unknown>('/economia')");
 expect(source).toContain("if(key==='honorarios-pendientes')return{status:204,data:null}");
 expect(source).toContain('No se usan movimientos contables como sustituto');
});

test('participant GET merges canonical labor profile into existing people response',async()=>{
 const source=read('supabase/functions/fenix-expediente-people/index.ts');
 expect(source).toContain("fenix_prod_exp_people_server");
 expect(source).toContain("fenix_prod_exp_labor_profile_server");
 expect(source).toContain('mergeLabor(r,labor)');
 expect(source).toContain('byId.get(String(p?.id??p?.cliente_code??\'\'))');
 for(const token of ['tipo_contrato','modalidad_contrato','fecha_inicio','fecha_fin','jornada','categoria_profesional','numero_pagas']){
  const migration=read('supabase/migrations/20260914162500_explicit_participant_labor_profile.sql');
  expect(migration).toContain(token);
 }
});
