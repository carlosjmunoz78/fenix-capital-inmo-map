import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('floating controls keep calculator microphone chat vertical order',async()=>{
 const calc=read('src/CalculatorLabelGuard.tsx');
 const audio=read('src/audio-transcription.css');
 const routes=read('src/RouteAccessGuard.tsx');
 expect(calc).toContain("styleLauncher(el,'130px')");
 expect(audio).toContain('bottom:76px');
 expect(calc).toContain("styleLauncher(link,'22px')");
 expect(calc).toContain("link.textContent='💬'");
 expect(calc).toContain("const SIZE='46px'");
 expect(calc).toContain("const ORANGE='#ff5a1f'");
 expect(routes).toContain("'/chat'");
});

test('global voice actions do not expose knowledge and keep scoped correction/task context',async()=>{
 const voice=read('src/AudioTranscriptionGuard.tsx');
 expect(voice).not.toContain("id:'knowledge'");
 expect(voice).not.toContain("label:'Dar conocimiento'");
 expect(voice).toContain("scope_type:scope.type");
 expect(voice).toContain("base.set('scope_code',scope.code)");
 expect(voice).toContain("base.set('correction',composed)");
});

test('knowledge is available only on Ana screen and global correction shortcut is removed',async()=>{
 const knowledge=read('src/AnaKnowledgeBlock.tsx');
 const contextual=read('src/AnaUniversalGuard.tsx');
 expect(knowledge).toContain("if(location.pathname!=='/ana')return");
 expect(knowledge).toContain("if(location.pathname!=='/ana'||!mount)return null");
 expect(knowledge).toContain('DAR CONOCIMIENTO A ANA');
 expect(contextual).not.toContain('>Correcciones</button>');
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
