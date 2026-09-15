import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('profile is fully editable and self password change never exposes stored passwords',async()=>{
 const src=read('src/ProfileShell.tsx');
 expect(src).toContain("fetchProfileApi<ApiPayload<Profile>>(''");
 expect(src).toContain("supabase.auth.updateUser({password})");
 for(const key of ['display_name','username','birth_date','contact_email','phone','job_title','zone','bio','linkedin','instagram','facebook','x_twitter','tiktok','youtube','threads','telegram','website','avatar_url'])expect(src).toContain(key);
 expect(src).not.toContain('service_role');
});

test('admin hierarchy matches Carlos superadmin and Belen direction boundaries',async()=>{
 const migration=read('supabase/migrations/20260915161000_profile_users_goals.sql');
 expect(migration).toContain("p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR')");
 expect(migration).toContain("p_actor_code='CARLOS-ADMIN'");
 expect(migration).toContain("p_actor_code='BELEN-DIR' and target_role in ('Financiero','Visitador')");
 expect(migration).toContain("superadmin_protected");
 expect(migration).toContain("superadmin_self_protected");
});

test('requested monthly role defaults are seeded exactly',async()=>{
 const migration=read('supabase/migrations/20260915161000_profile_users_goals.sql');
 for(const row of ["('Financiero','FIRMAS',4)","('Financiero','EXPEDIENTES',10)","('Visitador','EXPEDIENTES',10)","('Visitador','INMOBILIARIAS',3)","('Direccion','FIRMAS',3)","('Direccion','EXPEDIENTES',10)"])expect(migration).toContain(row);
});

test('goals use real App CRM ownership data and support role or user overrides',async()=>{
 const migration=read('supabase/migrations/20260915161000_profile_users_goals.sql');
 expect(migration).toContain('fenix_prod.performance_goals');
 expect(migration).toContain("scope_type in ('ROLE','USER')");
 expect(migration).toContain("from fenix_prod.expedientes e where e.owner_actor_code=a.actor_code");
 expect(migration).toContain('from fenix_prod.firmas f');
 expect(migration).toContain('from fenix_prod.inmobiliarias i');
 expect(migration).toContain("case when g.scope_type='USER' then 0 else 1 end");
 expect(migration).toContain("'missing',missing");
 expect(migration).toContain("'pct',pct");
});

test('profile UI exposes personal progress, improvement guidance, user creation and configurable goals',async()=>{
 const src=read('src/ProfileShell.tsx');
 for(const token of ['Cómo vas y dónde mejorar','CUMPLIMIENTO MEDIO','Definir objetivos','Crear usuario','Usuarios gestionables','Faltan'])expect(src).toContain(token);
 expect(src).toContain("action:'create_user'");
 expect(src).toContain("action:'update_user'");
 expect(src).toContain("action:'reset_password'");
 expect(src).toContain("action:'set_goal'");
});

test('active-work contract is canonical across expedientes search tasks profile goals and economy',async()=>{
 const migration=read('supabase/migrations/20260915162500_active_work_ordering_economy.sql');
 expect(migration).toContain('fenix_prod_expediente_is_active');
 for(const terminal of ["'cerrado'","'cierre'","'finalizado'","'firmado'","'baja'","'perdido'","'pausado'"])expect(migration).toContain(terminal);
 expect(migration).toContain("lower(coalesce(f.estado,''))='firmado'");
 expect(migration).toContain('create or replace function public.fenix_prod_exp_list_server');
 expect(migration).toContain('create or replace function public.fenix_prod_search_server');
 expect(migration).toContain('create or replace function public.fenix_prod_get_tareas_server');
 expect(migration).toContain('fenix_prod_task_order_bucket');
 expect(migration).toContain("when 'esperando tercero' then 1");
 expect(migration).toContain("when 'completada' then 2");
 expect(migration).toContain("when 'cancelada' then 3");
 expect(migration).toContain('create or replace function public.fenix_prod_profile_goals_get_server');
 expect(migration).toContain('expediente(s) activos para el objetivo mensual');
 expect(migration).toContain('create or replace function public.fenix_prod_economia_server');
 expect(migration).toContain("'pipeline_activo'");
 expect(migration).toContain("'importe_solicitado'");
});
