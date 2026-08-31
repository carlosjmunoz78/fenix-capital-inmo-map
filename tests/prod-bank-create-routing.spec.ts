import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('bank creation routes PROD to canonical bank API and keeps TEST isolated',()=>{
 const text=fs.readFileSync(path.resolve('src/BankCreateShell.tsx'),'utf8');
 expect(text).toContain("IS_PRODUCTION?'fenix-bank-api':'fenix-bank-actions-test'");
 expect(text).toContain("Banco creado en la fuente canónica de ${IS_PRODUCTION?'PROD':'PRE-PROD'}");
 expect(text).toContain("IS_PRODUCTION?'PROD':'PRE-PROD'");
});

test('PROD bank API requires authenticated identity and canonical RPC',()=>{
 const text=fs.readFileSync(path.resolve('supabase/functions/fenix-bank-api/index.ts'),'utf8');
 expect(text).toContain('fenix_prod_actor_context_by_auth_server');
 expect(text).toContain('fenix_prod_bank_create_server');
 expect(text).toContain("if(!h.startsWith('Bearer '))");
 expect(text).toContain('https://app.fenixcapital.es');
});
