import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente PROD usa alta atómica y evidencia productiva',async()=>{
 const src=fs.readFileSync('src/ExpedienteCreateShell.tsx','utf8');
 expect(src).toContain("supabase.rpc('fenix_prod_exp_create'");
 expect(src).toContain('p_payload_operacion:payloadOperacion');
 expect(src).toContain('intervinientes:people.map');
 expect(src).toContain("IS_PRODUCTION?'fenix-evidence-api':'fenix-evidence-api-test'");
 expect(src).toContain("IS_PRODUCTION?'fenix-prod-documents':'fenix-preprod-documents-test'");
 expect(src).toContain("if(IS_PRODUCTION)");
});

test('la rama PRE-PROD conserva sus contratos aislados',async()=>{
 const src=fs.readFileSync('src/ExpedienteCreateShell.tsx','utf8');
 expect(src).toContain('fenix-notion-actions-test/expedientes/create');
 expect(src).toContain('fenix-comprador-action-test/expedientes/');
});
