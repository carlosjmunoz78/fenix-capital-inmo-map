import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('task creation routes PROD to fenix-task-api and keeps TEST isolated',()=>{
  const text=fs.readFileSync(path.resolve('src/TaskCreateShell.tsx'),'utf8');
  expect(text).toContain("IS_PRODUCTION?'fenix-task-api':'fenix-notion-actions-test/tareas/create'");
  expect(text).toContain("'idempotency-key':crypto.randomUUID()");
  expect(text).toContain("name:'Dirección',role:'Direccion'");
  expect(text).toContain("IS_PRODUCTION?'PROD':'PRE-PROD'");
});

test('PROD task API requires authenticated identity and uses canonical RPC',()=>{
  const text=fs.readFileSync(path.resolve('supabase/functions/fenix-task-api/index.ts'),'utf8');
  expect(text).toContain("fenix_prod_actor_context_by_auth_server");
  expect(text).toContain("fenix_prod_task_create_server");
  expect(text).toContain("if(!h.startsWith('Bearer '))");
  expect(text).toContain("https://app.fenixcapital.es");
});
