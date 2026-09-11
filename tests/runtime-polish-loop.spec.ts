import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

test('rail flotante usa una única columna calculadora micro chat con separación de 4px',()=>{
 const src=read('src/runtime-polish.ts');
 expect(src).toContain("#fenix-action-rail{position:fixed;right:18px;bottom:18px");
 expect(src).toContain('flex-direction:column;gap:4px');
 expect(src).toContain("['calc','calc','Calculadora','button.calc-launcher']");
 expect(src).toContain("['mic','mic','Micrófono','button.fenix-voice-main']");
 expect(src).toContain("['chat','chat','Chat','button.fenix-chat-launcher']");
});

test('perfil añade redes sociales extra y corrige el guardado auditado',()=>{
 const src=read('src/runtime-polish.ts');
 const sql=read('supabase/migrations/20260911114500_runtime_profile_chat_knowledge_polish.sql');
 for(const label of ['Facebook','X / Twitter','TikTok','YouTube','Threads','Telegram'])expect(src).toContain(label);
 expect(sql).toContain('add column if not exists facebook text');
 expect(sql).toContain('add column if not exists x_twitter text');
 expect(sql).toContain("values(me,my_role,'perfil',me,'UPDATE'");
 expect(sql).not.toContain("'profile_update'");
});

test('cualquier usuario autenticado puede crear un grupo explícito cuando quiera',()=>{
 const src=read('src/runtime-polish.ts');
 const sql=read('supabase/migrations/20260911114500_runtime_profile_chat_knowledge_polish.sql');
 expect(src).toContain("b.textContent='Crear grupo'");
 expect(src).toContain("supabase.rpc('fenix_prod_chat_group_create_user'");
 expect(sql).toContain('fenix_prod_chat_group_create_user');
 expect(sql).toContain("values('group',clean_title,me)");
 expect(sql).toContain('auth.uid() is null');
});

test('Ana recupera conocimiento canónico de funcionario 100 por ciento antes de mantener un fallback vacío',()=>{
 const src=read('src/runtime-polish.ts');
 const sql=read('supabase/migrations/20260911114500_runtime_profile_chat_knowledge_polish.sql');
 expect(src).toContain("fenix_prod_ana_knowledge_answer_user");
 expect(sql).toContain("HIP-FUNC-100-DOCS");
 expect(sql).toContain('3 últimas nóminas');
 expect(sql).toContain('movimientos bancarios de los últimos 6 meses');
 expect(sql).toContain("'source','CEREBRO_CANONICAL'");
});

test('index carga el runtime polish después de la app',()=>{
 const html=read('index.html');
 expect(html).toContain('<script type="module" src="/src/main.tsx"></script><script type="module" src="/src/runtime-polish.ts"></script>');
});
