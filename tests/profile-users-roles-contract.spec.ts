import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const profile=fs.readFileSync('src/ProfileShell.tsx','utf8');
const client=fs.readFileSync('src/supabase.ts','utf8');

test.describe('Mi Perfil · usuarios · roles',()=>{
 test('perfil editable conserva identidad profesional y redes',()=>{
  for(const field of ['display_name','username','birth_date','contact_email','phone','job_title','zone','bio','avatar_url','linkedin','instagram','facebook','x_twitter','tiktok','youtube','threads','telegram','website']) expect(profile).toContain(field);
  expect(profile).toContain("method:'PATCH'");
 });

 test('cambio de clave usa el proveedor de autenticacion',()=>{
  expect(profile).toContain('supabase.auth.updateUser');
  expect(profile).toContain('autoComplete="new-password"');
 });

 test('gestion de usuarios usa la API administrativa autenticada',()=>{
  expect(client).toContain('fetchUserAdminApi');
  expect(profile).toContain("action:'create_user'");
  expect(profile).toContain("action:'update_user'");
  expect(profile).toContain("action:'reset_password'");
 });

 test('roles de negocio permanecen acotados',()=>{
  expect(profile).toContain("['Direccion','Financiero','Visitador']");
  expect(profile).toContain("['Financiero','Visitador']");
  expect(profile).toContain('canCreateDirector');
  expect(profile).toContain('isSuperAdmin');
 });

 test('objetivos y correcciones siguen conectados',()=>{
  expect(profile).toContain("'/goals'");
  expect(profile).toContain("action:'set_goal'");
  expect(profile).toContain('resource:\'perfil\'');
 });
});
