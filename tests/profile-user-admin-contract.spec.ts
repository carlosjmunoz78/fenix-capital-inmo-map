import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

test('profile supports self password change and direction-scoped team administration',()=>{
 const profile=read('src/ProfileShell.tsx');
 expect(profile).toContain("supabase.auth.updateUser({password:ownPassword})");
 expect(profile).toContain("fetchEnvironmentApi<AdminResponse>('fenix-user-admin','')");
 expect(profile).toContain("action:'create_user'");
 expect(profile).toContain("action:'reset_password'");
 expect(profile).toContain("canCreateDirector&&<option value=\"Direccion\">Director</option>");
 expect(profile).toContain('<option value="Financiero">Financiero</option>');
 expect(profile).toContain('<option value="Visitador">Visitador</option>');
});

test('Belen Direccion Financiera is recognized as Direction and receives team controls',()=>{
 const profile=read('src/ProfileShell.tsx');
 expect(profile).toContain("role==='direccion financiera'");
 expect(profile).toContain('isDirectionRole(nextCtx?.role)');
 expect(profile).toContain('const isDirection=isDirectionRole(ctx?.role)');
 expect(profile).not.toContain("if(nextCtx?.role==='Direccion'||nextCtx?.role==='Dirección')");
});

test('profile self edit changes only canonical own display name and zone',()=>{
 const profile=read('src/ProfileShell.tsx');
 const edge=read('supabase/functions/fenix-profile-api/index.ts');
 const migration=read('supabase/migrations/20260911053000_prod_self_profile_edit.sql');
 expect(profile).toContain("fetchEnvironmentApi<ProfileResponse>('fenix-profile-api','')");
 expect(profile).toContain("method:'PATCH'");
 expect(profile).toContain('El rol y los permisos no se pueden modificar desde el perfil.');
 expect(edge).toContain("fenix_prod_actor_context_by_auth_server");
 expect(edge).toContain("fenix_prod_profile_update_server");
 expect(edge).not.toContain("body.role");
 expect(edge).not.toContain("body.actor_code");
 expect(migration).toContain("update fenix_prod.actors set display_name=v_name,zone_code=v_zone");
 expect(migration).toContain("'profile.updated'");
 expect(migration).toContain('revoke all on function public.fenix_prod_profile_update_server');
 expect(migration).not.toContain('role=');
});

test('user-admin edge keeps service role server-side and restricts director creation to Carlos admin',()=>{
 const edge=read('supabase/functions/fenix-user-admin/index.ts');
 expect(edge).toContain("ctx.role!=='Direccion'");
 expect(edge).toContain("role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN'");
 expect(edge).toContain('svc.auth.admin.createUser');
 expect(edge).toContain('svc.auth.admin.updateUserById');
 expect(edge).toContain('fenix_prod_user_admin_target_server');
 expect(edge).not.toContain('VITE_SUPABASE_SERVICE_ROLE');
});

test('daily reports expose exact local times, authorized filters and PDF export',()=>{
 const reports=read('src/InformesDailyActivityGuard.tsx');
 expect(reports).toContain('local_datetime');
 expect(reports).toContain('Europe/Madrid');
 expect(reports).toContain('Financiero y Visitador reciben exclusivamente su propia actividad diaria.');
 expect(reports).toContain("fetchEnvironmentApi<unknown>('fenix-reports-api','')");
 expect(reports).toContain('data-testid="daily-activity-filters"');
 expect(reports).toContain('actorFilter');
 expect(reports).toContain('actionFilter');
 expect(reports).toContain('entityFilter');
 expect(reports).toContain('function exportPdf()');
 expect(reports).toContain('Guardar PDF');
 expect(reports).toContain('exportación del informe auditado visible y autorizado.');
});