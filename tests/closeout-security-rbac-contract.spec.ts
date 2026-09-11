import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

test('staff administration is server-authoritative and creator-scoped',()=>{
 const api=read('supabase/functions/fenix-user-admin/index.ts');
 const ui=read('src/StaffAdminPanel.tsx');
 expect(api).toContain("if(ctx.role!=='Direccion')");
 expect(api).toContain("if(role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN')");
 expect(api).toContain('fenix_prod_user_admin_target_server');
 expect(api).toContain('fenix_prod_user_admin_register_server');
 expect(ui).toContain("actor==='CARLOS-ADMIN'?['Director','Financiero','Visitador']:actor==='BELEN-DIR'?['Financiero','Visitador']:[]");
 expect(ui).not.toContain('auth.admin.createUser');
 expect(ui).not.toContain('auth.admin.updateUserById');
});

test('password changes never persist or audit raw credentials',()=>{
 const api=read('supabase/functions/fenix-user-admin/index.ts');
 const profile=read('src/ProfileShell.tsx');
 expect(profile).toContain('supabase.auth.updateUser({password');
 expect(api).toContain('auth.admin.updateUserById');
 for(const src of [api,profile]){
  expect(src).not.toContain('localStorage.setItem(\'password\'');
  expect(src).not.toContain('sessionStorage.setItem(\'password\'');
  expect(src).not.toContain('changed_fields:{password:');
  expect(src).not.toContain('metadata:{password');
 }
});

test('reports keep scope on the backend: Direccion company, Financiero and Visitador actor-only',()=>{
 const sql=read('supabase/migrations/20260911112000_role_scoped_daily_weekly_reports.sql');
 const ui=read('src/InformesShell.tsx');
 expect(sql).toContain("v_scope_kind:=case when r='Direccion' then 'company' else 'actor' end");
 expect(sql).toContain("v_scope_actor:=case when r='Direccion' then null else p_actor_code end");
 expect(sql).toContain("r not in ('Direccion','Financiero','Visitador')");
 expect(ui).not.toContain('scope_actor_code=');
 expect(ui).toContain('el alcance lo determina el servidor, no esta pantalla');
});

test('sensitive administration stays behind authenticated edge functions and no service key ships to client source',()=>{
 const api=read('supabase/functions/fenix-user-admin/index.ts');
 const supabaseClient=read('src/supabase.ts');
 expect(api).toContain("const h=req.headers.get('authorization')||''");
 expect(api).toContain("if(!h.startsWith('Bearer '))");
 expect(api).toContain('auth.auth.getUser');
 expect(supabaseClient).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
 expect(supabaseClient).not.toContain('service_role');
});
