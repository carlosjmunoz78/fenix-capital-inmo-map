import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('Carlos and Belen have the exact staff creation matrix and creator-scoped password changes',()=>{
 const api=readFileSync('supabase/functions/fenix-user-admin/index.ts','utf8');
 const panel=readFileSync('src/StaffAdminPanel.tsx','utf8');
 const migration=readFileSync('supabase/migrations/20260911101500_prod_staff_provenance_and_audit.sql','utf8');
 expect(api).toContain("const ADMIN_ACTORS=new Set(['CARLOS-ADMIN','BELEN-DIR'])");
 expect(api).toContain("ctx.role!=='Direccion'||!ADMIN_ACTORS.has");
 expect(api).toContain("if(role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN')");
 expect(api).toContain("['Direccion','Financiero','Visitador'].includes(role)");
 expect(api).toContain("fenix_prod_user_admin_register_server");
 expect(api).toContain("fenix_prod_user_admin_target_server");
 expect(api).toContain('auth.admin.createUser');
 expect(api).toContain('auth.admin.updateUserById');
 expect(api).toContain('fenix_prod_user_admin_audit_reset_server');
 expect(api).not.toContain('metadata:{password');
 expect(api).not.toContain('changed_fields:{password');
 expect(migration).toContain('created_by_auth_user_id uuid');
 expect(migration).toContain('created_by_actor_code text');
 expect(migration).toContain('created_by_actor_code=p_actor_code');
 expect(migration).toContain('t.created_by_actor_code is distinct from p_actor_code');
 expect(panel).toContain("actor==='CARLOS-ADMIN'?['Director','Financiero','Visitador']:actor==='BELEN-DIR'?['Financiero','Visitador']:[]");
 expect(panel).toContain("role==='Director'?'Direccion':role");
 expect(panel).toContain('Solo puedes cambiar la contraseña de una persona creada por ti.');
});

test('Director maps to canonical Direccion role and Belen is blocked from creating it',()=>{
 const api=readFileSync('supabase/functions/fenix-user-admin/index.ts','utf8');
 const panel=readFileSync('src/StaffAdminPanel.tsx','utf8');
 expect(panel).toContain("role==='Director'?'Direccion':role");
 expect(api).toContain("if(role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN')");
});