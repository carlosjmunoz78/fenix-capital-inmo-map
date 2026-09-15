import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const profile=fs.readFileSync('src/ProfileShell.tsx','utf8');
const existing=fs.readFileSync('tests/profile-users-goals-contract.spec.ts','utf8');

test.describe('Mi Perfil · usuarios · roles',()=>{
 test('perfil editable conserva identidad profesional y redes',()=>{
  for(const field of ['display_name','username','birth_date','contact_email','phone','job_title','zone','bio','avatar_url','linkedin','instagram','facebook','x_twitter','tiktok','youtube','threads','telegram','website']) expect(profile).toContain(field);
  expect(profile).toContain("method:'PATCH'");
 });

 test('cambio de clave usa Supabase Auth y nunca service role en cliente',()=>{
  expect(profile).toContain('supabase.auth.updateUser');
  expect(profile).toContain('autoComplete="new-password"');
  expect(profile).not.toContain('service_role');
 });

 test('gestion de usuarios conserva alta actualizacion reset y objetivos',()=>{
  for(const action of ["action:'create_user'","action:'update_user'","action:'reset_password'","action:'set_goal'"]) expect(profile).toContain(action);
 });

 test('roles de negocio permanecen acotados y Direccion no se concede desde UI ordinaria',()=>{
  expect(profile).toContain("['Direccion','Financiero','Visitador']");
  expect(profile).toContain("['Financiero','Visitador']");
  expect(profile).toContain('canCreateDirector');
  expect(profile).toContain('isSuperAdmin');
 });

 test('el contrato canonico existente ya cubre jerarquia metas y datos reales',()=>{
  for(const token of ['superadmin_protected','scope_type in','fenix_prod.performance_goals','create_user','reset_password']) expect(existing).toContain(token);
 });
});
