import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('inmobiliaria PROD usa exclusivamente B2B actions canónicas',()=>{
 const src=fs.readFileSync('src/InmobiliariaCreateShell.tsx','utf8');
 expect(src).toContain("fetchB2BActionsApi<CreateResponse>('/inmobiliarias/create'");
 expect(src).toContain("fetchB2BActionsApi<CreateResponse>('/contactos/create'");
 expect(src).toContain("const allowed=ctx?.role==='Direccion'||ctx?.role==='Visitador'");
 expect(src).not.toContain('fenix-notion-actions-test');
 expect(src).not.toContain('IS_PRODUCTION');
});

test('Visitador queda ligado a su identidad y Dirección puede elegir responsable sin rama legacy',()=>{
 const src=fs.readFileSync('src/InmobiliariaCreateShell.tsx','utf8');
 expect(src).toContain("if(context?.role==='Visitador'){setTarget(context.actor_code||'')");
 expect(src).toContain("if(context?.role!=='Direccion'){setTarget('');setAssignees([]);return;}");
 expect(src).toContain("r.status===409&&r.data?.error==='duplicate_inmobiliaria'");
 expect(src).not.toContain('preprod');
 expect(src).not.toContain('notion-actions-test');
});
