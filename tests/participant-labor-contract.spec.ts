import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('participant labor fields remain explicit and are not overloaded',async()=>{
 const people=read('src/ExpedientePeopleProdGuard.tsx');
 for(const key of ['tipo_contrato','modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas'])expect(people).toContain(key);
 expect(people).toContain('situacion_laboral');
});

test('document extraction normalizes only semantically equivalent labor aliases',async()=>{
 const source=read('src/operationalDocumentExtraction.ts');
 for(const key of ['tipo_contrato','modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas'])expect(source).toContain(`['${key}'`);
 expect(source).not.toContain("['situacion_laboral',['tipo_contrato'");
});
