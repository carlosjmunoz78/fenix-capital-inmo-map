import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('L6 internal chat is mounted and uses authenticated server-derived actor identity',async()=>{
  const main=read('src/main.tsx');
  const source=read('src/ChatShell.tsx');
  expect(main).toContain("import ChatShell from './ChatShell';");
  expect(main).toContain('<ChatShell />');
  expect(source).toContain("supabase.rpc('fenix_prod_chat_list_user'");
  expect(source).toContain("supabase.rpc('fenix_prod_chat_send_user'");
  expect(source).not.toContain('p_actor_code');
  expect(source).not.toContain('sender_actor_code:');
});

test('L6 internal chat is idempotent and bounded',async()=>{
  const source=read('src/ChatShell.tsx');
  expect(source).toContain('chat-${crypto.randomUUID()}');
  expect(source).toContain('maxLength={4000}');
  expect(source).toContain('body.length>4000');
  expect(source).toContain('window.setInterval(()=>void load(true),15000)');
});

test('L6 chat copy explicitly avoids canonical business side effects',async()=>{
  const source=read('src/ChatShell.tsx');
  expect(source).toContain('no modifican expedientes ni tareas');
  expect(source).not.toContain("fetchAppApi<unknown>('/expedientes'");
  expect(source).not.toContain("fetchAppApi<unknown>('/tareas'");
});
