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

test('user-admin edge keeps service role server-side and restricts director creation to Carlos admin',()=>{
 const edge=read('supabase/functions/fenix-user-admin/index.ts');
 expect(edge).toContain("ctx.role!=='Direccion'");
 expect(edge).toContain("role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN'");
 expect(edge).toContain('svc.auth.admin.createUser');
 expect(edge).toContain('svc.auth.admin.updateUserById');
 expect(edge).toContain('fenix_prod_user_admin_target_server');
 expect(edge).not.toContain('VITE_SUPABASE_SERVICE_ROLE');
});

test('daily reports expose exact local times and role-scoped wording',()=>{
 const reports=read('src/InformesDailyActivityGuard.tsx');
 expect(reports).toContain('local_datetime');
 expect(reports).toContain('Europe/Madrid');
 expect(reports).toContain('Financiero y Visitador reciben exclusivamente su propia actividad diaria.');
 expect(reports).toContain("fetchEnvironmentApi<unknown>('fenix-reports-api','')");
});
