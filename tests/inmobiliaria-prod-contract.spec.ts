import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('inmobiliaria PROD usa B2B actions canónicas',async()=>{
 const src=fs.readFileSync('src/InmobiliariaCreateShell.tsx','utf8');
 expect(src).toContain("if(IS_PRODUCTION||role==='Visitador')");
 expect(src).toContain("fetchB2BActionsApi<CreateResponse>('/inmobiliarias/create'");
 expect(src).toContain("fetchB2BActionsApi<CreateResponse>('/contactos/create'");
});

test('PRE-PROD conserva el alta legacy solo fuera de producción',async()=>{
 const src=fs.readFileSync('src/InmobiliariaCreateShell.tsx','utf8');
 expect(src).toContain('fenix-notion-actions-test/inmobiliarias/create');
 expect(src.indexOf("if(IS_PRODUCTION||role==='Visitador')")).toBeGreaterThan(src.indexOf('fenix-notion-actions-test/inmobiliarias/create'));
});
