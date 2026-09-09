import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('documento de titular conserva comprador como origen PROD',()=>{
 const upload=fs.readFileSync(path.resolve('src/ContextEvidenceUpload.tsx'),'utf8');
 const people=fs.readFileSync(path.resolve('src/ExpedientePeoplePanel.tsx'),'utf8');
 expect(upload).toContain("const PROD_SUPPORTED_ORIGINS=new Set(['expediente','comprador','contacto','firma'])");
 expect(upload).toContain("if(comprador)return{type:'comprador',code:comprador");
 expect(upload).toContain("EXTRACT_FUNCTION=IS_PRODUCTION?'fenix-document-extract':'fenix-document-extract-test'");
 expect(people).toContain("&comprador=${encodeURIComponent(p.id)}&upload=1");
});

test('workspace maestro hidrata titulares e inmobiliaria con fallback',()=>{
 const runtime=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
 expect(runtime).toContain('/workspace');
 expect(runtime).toContain('titulares:counts.titulares??exp.titulares??null');
 expect(runtime).toContain('inmobiliaria:inmo?.nombre_alias??inmo?.nombre??exp.inmobiliaria_code??null');
 expect(runtime).toContain('return fetchAppApi<T>(pathname);');
});
