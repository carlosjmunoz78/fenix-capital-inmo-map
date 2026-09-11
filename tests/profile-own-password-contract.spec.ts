import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('perfil permite cambiar solo la contraseña de la cuenta autenticada sin persistir secretos',()=>{
 const source=readFileSync('src/ProfileShell.tsx','utf8');
 expect(source).toContain("supabase.auth.updateUser({password:newPassword})");
 expect(source).toContain('Cambiar mi contraseña');
 expect(source).toContain('La contraseña nunca se registra en el Diario ni en ningún informe.');
 expect(source).toContain("if(newPassword.length<8)");
 expect(source).toContain("if(newPassword!==confirmPassword)");
 expect(source).not.toContain('localStorage.setItem(`password');
 expect(source).not.toContain('sessionStorage.setItem(`password');
 expect(source).not.toContain('fetchAppApi(\'/password\'');
});

test('perfil completo es editable y persiste en fuente canónica sin permitir editar RBAC',()=>{
 const source=readFileSync('src/ProfileShell.tsx','utf8');
 const migration=readFileSync('supabase/migrations/20260911102000_actor_profiles_editable.sql','utf8');
 expect(source).toContain('data-testid="editable-profile-form"');
 expect(source).toContain("supabase.rpc('fenix_prod_profile_get_user'");
 expect(source).toContain("supabase.rpc('fenix_prod_profile_update_user'");
 expect(source).toContain('aria-label="Nombre visible"');
 expect(source).toContain('aria-label="Nombre de usuario"');
 expect(source).toContain('aria-label="Fecha de nacimiento"');
 expect(source).toContain('aria-label="Email de contacto"');
 expect(source).toContain('aria-label="Email de acceso"');
 expect(source).toContain('aria-label="Teléfono"');
 expect(source).toContain('aria-label="Puesto o cargo"');
 expect(source).toContain('aria-label="Zona"');
 expect(source).toContain('aria-label="Bio"');
 expect(source).toContain('aria-label="LinkedIn"');
 expect(source).toContain('aria-label="Instagram"');
 expect(source).toContain('aria-label="Web"');
 expect(source).toContain('aria-label="Foto o avatar URL"');
 expect(source).toContain('ageFromDate(profile.birth_date)');
 expect(source).toContain("supabase.auth.updateUser({email:profile.login_email.trim()})");
 expect(migration).toContain('create table if not exists fenix_prod.actor_profiles');
 expect(migration).toContain('actor_profiles_username_ci_uidx');
 expect(migration).toContain('auth_user_id=auth.uid()');
 expect(migration).toContain('update fenix_prod.actors set display_name=new_name');
 expect(migration).toContain("'profile.updated'");
 expect(migration).toContain('alter table fenix_prod.actor_profiles enable row level security');
 expect(migration).toContain('revoke all on fenix_prod.actor_profiles from public,anon,authenticated');
 expect(source).not.toContain('aria-label="Rol"');
});
