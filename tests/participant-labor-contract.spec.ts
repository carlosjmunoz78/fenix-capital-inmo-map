import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('participant labor fields remain explicit and are not overloaded',async()=>{
 const people=read('src/ExpedientePeopleProdGuard.tsx');
 for(const key of ['tipo_contrato','modalidad_contrato','fecha_inicio','fecha_fin','jornada','categoria_profesional','numero_pagas'])expect(people).toContain(key);
 expect(people).toContain('situacion_laboral');
 expect(people).not.toContain("situacion_laboral:p.tipo_contrato");
});

test('document extraction normalizes only semantically equivalent labor aliases',async()=>{
 const source=read('src/operationalDocumentExtraction.ts');
 for(const key of ['tipo_contrato','modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas'])expect(source).toContain(`['${key}'`);
 expect(source).not.toContain("['situacion_laboral',['tipo_contrato'");
});

test('participant and document sections stay compact by default',async()=>{
 const people=read('src/ExpedientePeopleProdGuard.tsx');
 expect(people).toContain('exp-person-toggle');
 expect(people).toContain('exp-person-documents');
 expect(people).toMatch(/open|expanded|collapsed|details|summary/);
});

test('floating controls keep microphone calculator chat vertical order',async()=>{
 const calc=read('src/CalculatorLabelGuard.tsx');
 const audio=read('src/audio-transcription.css');
 expect(audio).toContain('bottom:130px');
 expect(calc).toContain("styleLauncher(el,'76px')");
 expect(calc).toContain("styleLauncher(button,'22px')");
 expect(calc).toContain("const SIZE='46px'");
 expect(calc).toContain("const ORANGE='#ff5a1f'");
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
 expect(source).toContain('Abrir informe');
 expect(source).toContain('Abrir PDF');
 expect(source).toContain('Object.entries(r)');
});
