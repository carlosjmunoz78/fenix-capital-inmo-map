import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PROD expediente exposes persistent intervinientes controls',()=>{
 const guard=fs.readFileSync('src/prod-expediente-people-guard.ts','utf8');
 const html=fs.readFileSync('index.html','utf8');
 expect(guard).toContain('INTERVINIENTES');
 expect(guard).toContain('Añadir persona');
 expect(guard).toContain('Editar datos');
 expect(guard).toContain('Abrir contacto');
 expect(guard).toContain('Cerrar una ficha solo la contrae');
 expect(guard).toContain('/contactos/${encodeURIComponent(p.id)}');
 expect(html).toContain('/src/prod-expediente-people-guard.ts');
 expect(html.indexOf('/src/prod-expediente-people-guard.ts')).toBeLessThan(html.indexOf('/src/main.tsx'));
});

test('person document upload uses comprador scope, not general expediente scope',()=>{
 const guard=fs.readFileSync('src/prod-expediente-people-guard.ts','utf8');
 expect(guard).toContain('&comprador=${encodeURIComponent(p.id)}&upload=1');
 expect(guard).not.toContain('&contacto=${encodeURIComponent(p.id)}&upload=1');
});

test('operation role update is explicitly scoped to current expediente',()=>{
 const guard=fs.readFileSync('src/prod-expediente-people-guard.ts','utf8');
 const edge=fs.readFileSync('supabase/functions/fenix-expediente-people/index.ts','utf8');
 const sql=fs.readFileSync('supabase/expediente_people_prod_role_scope_fix_20260907.sql','utf8');
 expect(guard).toContain("action:'update',client_code:p.id,expediente_code:code,changes");
 expect(edge).toContain('p_exp_code:b.expediente_code??null');
 expect(sql).toContain('where expediente_code=p_exp_code and cliente_code=p_client_code and active');
});

test('canonical contact editor preserves numeric zero values and avoids duplicate async mounts',()=>{
 const guard=fs.readFileSync('src/prod-expediente-people-guard.ts','utf8');
 expect(guard).toContain("profile[k]??''");
 expect(guard).toContain('const contactLoads=new Set<string>()');
 expect(guard).toContain('contactLoads.has(id)');
 expect(guard).toContain('contactLoads.add(id)');
 expect(guard).toContain('contactLoads.delete(id)');
});

test('PROD people API uses authenticated canonical server functions and supports lists',()=>{
 const edge=fs.readFileSync('supabase/functions/fenix-expediente-people/index.ts','utf8');
 expect(edge).toContain('fenix_prod_exp_people_server');
 expect(edge).toContain('fenix_prod_exp_person_create_server');
 expect(edge).toContain('fenix_prod_exp_person_update_server');
 expect(edge).toContain('fenix_prod_contact_get_server');
 expect(edge).toContain('fenix_prod_contact_list_assign_server');
 expect(edge).toContain('auth.auth.getUser');
 expect(edge).toContain("'Access-Control-Allow-Methods':'GET,POST,OPTIONS'");
});

test('canonical contact can be edited and assigned to a list without leaving the ficha',()=>{
 const guard=fs.readFileSync('src/prod-expediente-people-guard.ts','utf8');
 expect(guard).toContain('TRABAJAR CONTACTO');
 expect(guard).toContain('Guardar contacto');
 expect(guard).toContain('+ Nueva lista');
 expect(guard).toContain("action:'list_assign'");
 expect(guard).toContain("action:'update'");
});
