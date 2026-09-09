import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PROD lee la ficha individual desde workspace canónico con fallback seguro',()=>{
 const runtime=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
 expect(runtime).toContain("const workspace=await fetchAppApi<any>(`/expedientes/${encodeURIComponent(code)}/workspace`)");
 expect(runtime).toContain('titulares:counts.titulares??exp.titulares??null');
 expect(runtime).toContain('inmobiliaria:inmo?.nombre_alias??inmo?.nombre??exp.inmobiliaria_code??null');
 expect(runtime).toContain('return fetchAppApi<T>(pathname);');
});

test('la ficha mantiene chrome global visible y conserva recorrido obligatorio',()=>{
 const chrome=fs.readFileSync(path.resolve('src/ExpedienteLegacyChromeGuard.tsx'),'utf8');
 const uniform=fs.readFileSync(path.resolve('src/OperationalUniformityGuard.tsx'),'utf8');
 const journey=fs.readFileSync(path.resolve('src/ExpedienteJourneyGuard.tsx'),'utf8');
 expect(chrome).toContain("import ExpedienteRenameGuard from './ExpedienteRenameGuard'");
 expect(chrome).toContain('return <ExpedienteRenameGuard/>');
 expect(chrome).not.toContain('display:none!important');
 expect(uniform).not.toContain('if(expedienteDetail)return null');
 expect(journey).toContain("RECORRIDO DEL EXPEDIENTE · ESTADO PENDIENTE DE CARGA");
 expect(journey).toContain("No marco ninguna fase hasta recibir el dato canónico");
 expect(journey).toContain("Siguiente fase:");
 expect(journey).toContain("section.remove()");
});
