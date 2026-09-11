import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('Carlos and Belen have the exact staff creation matrix and creator-scoped password changes',()=>{
 const api=readFileSync('supabase/functions/fenix-staff-admin/index.ts','utf8');
 const panel=readFileSync('src/StaffAdminPanel.tsx','utf8');
 const migration=readFileSync('supabase/migrations/20260911101500_prod_staff_provenance_and_audit.sql','utf8');
 expect(api).toContain("actor==='CARLOS-ADMIN'?new Set(['Director','Financiero','Visitador']):new Set(['Financiero','Visitador'])");
 expect(api).toContain("!['CARLOS-ADMIN','BELEN-DIR'].includes(String(ctx.actor_code))");
 expect(api).toContain("if(!allowedRoles(me.actor).has(requested))");
 expect(api).toContain("target.created_by_auth_user_id!==me.user.id");
 expect(api).toContain('auth.admin.createUser');
 expect(api).toContain('auth.admin.updateUserById');
 expect(api).toContain("from('activity_log').insert");
 expect(api).toContain("await audit(me,'INSERT',code");
 expect(api).toContain("await audit(me,'UPDATE',String(target.actor_code),{password_changed:true})");
 expect(api).not.toContain('audit_events');
 expect(api).not.toContain('changed_fields:{password');
 expect(migration).toContain('created_by_auth_user_id uuid');
 expect(migration).not.toContain('audit_events');
 expect(panel).toContain("actor==='CARLOS-ADMIN'?['Director','Financiero','Visitador']:actor==='BELEN-DIR'?['Financiero','Visitador']:[]");
 expect(panel).toContain('Solo puedes cambiar la contraseña de una persona creada por ti.');
});

test('Director maps to existing canonical Direccion role without granting Belen the right to create one',()=>{
 const api=readFileSync('supabase/functions/fenix-staff-admin/index.ts','utf8');
 expect(api).toContain("Director:{role:'Direccion',profile_kind:'Director'}");
 expect(api).toContain("actor==='CARLOS-ADMIN'?new Set(['Director','Financiero','Visitador']):new Set(['Financiero','Visitador'])");
});
