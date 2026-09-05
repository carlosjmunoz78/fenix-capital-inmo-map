import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('el gateway productivo de directorio valida identidad y escribe solo mediante la RPC server',()=>{
  const src=fs.readFileSync('supabase/functions/fenix-directory-actions/index.ts','utf8');
  expect(src).toContain("auth.auth.getUser");
  expect(src).toContain("fenix_prod_actor_context_by_auth_server");
  expect(src).toContain("ctx.data?.role!=='Direccion'");
  expect(src).toContain("fenix_prod_directory_sync_server");
  expect(src).toContain("if(req.method==='OPTIONS')");
  expect(src).not.toContain('fenix-directory-actions-test');
});

test('notarias y registros usan resolver central y gateway PROD sin bloqueo',()=>{
  const shell=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
  const runtime=fs.readFileSync('src/supabase.ts','utf8');
  const guard=fs.readFileSync('src/ProductionWriteSafetyGuard.tsx','utf8');
  expect(shell).toContain("fetchEnvironmentApi<any>('fenix-directory-actions'");
  expect(shell).not.toContain('fenix-directory-actions-test');
  expect(runtime).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':String(import.meta.env.VITE_FUNCTION_SUFFIX||'')");
  expect(guard).not.toContain("'/notarias/nueva'");
  expect(guard).not.toContain("'/registros-propiedad/nuevo'");
});
