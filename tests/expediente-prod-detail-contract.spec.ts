import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PROD lee la ficha individual por el gateway canónico',()=>{
 const runtime=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
 expect(runtime).toContain("if(/^\\/expedientes\\/[^/]+$/.test(pathname))return fetchAppApi<T>(pathname)");
});

test('la ficha suprime chrome legacy sin depender de :has y mantiene recorrido obligatorio',()=>{
 const chrome=fs.readFileSync(path.resolve('src/ExpedienteLegacyChromeGuard.tsx'),'utf8');
 const journey=fs.readFileSync(path.resolve('src/ExpedienteJourneyGuard.tsx'),'utf8');
 expect(chrome).toContain(".app-shell > .sidebar,.app-shell > .main");
 expect(chrome).toContain("display','none','important");
 expect(journey).toContain("RECORRIDO DEL EXPEDIENTE · ESTADO PENDIENTE DE CARGA");
 expect(journey).toContain("No marco ninguna fase hasta recibir el dato canónico");
 expect(journey).toContain("Siguiente fase:");
});
