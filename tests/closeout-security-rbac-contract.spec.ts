import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

test('staff administration is server-authoritative, limited to Carlos and Belen, and creator-scoped',()=>{
 const api=read('supabase/functions/fenix-user-admin/index.ts');
 const sql=read('supabase/migrations/20260911101500_prod_staff_provenance_and_audit.sql');
 const ui=read('src/StaffAdminPanel.tsx');
 expect(api).toContain("const ADMIN_ACTORS=new Set(['CARLOS-ADMIN','BELEN-DIR'])");
 expect(api).toContain("ctx.role!=='Direccion'||!ADMIN_ACTORS.has");
 expect(api).toContain("if(role==='Direccion'&&ctx.actor_code!=='CARLOS-ADMIN')");
 expect(api).toContain('fenix_prod_user_admin_target_server');
 expect(api).toContain('fenix_prod_user_admin_register_server');
 expect(sql).toContain("p_actor_code not in ('CARLOS-ADMIN','BELEN-DIR')");
 expect(sql).toContain('created_by_actor_code=p_actor_code');
 expect(sql).toContain('t.created_by_actor_code is distinct from p_actor_code');
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

test('editable profile remains self-scoped and does not make role or permissions editable',()=>{
 const sql=read('supabase/migrations/20260911102000_actor_profiles_editable.sql');
 const ui=read('src/ProfileShell.tsx');
 expect(sql).toContain('auth_user_id=auth.uid()');
 expect(sql).toContain('where actor_code=me');
 expect(sql).toContain('revoke all on fenix_prod.actor_profiles from public,anon,authenticated');
 expect(sql).toContain('alter table fenix_prod.actor_profiles enable row level security');
 expect(sql).toContain("'profile_update'");
 expect(sql).toContain("'profile-self-service'");
 expect(ui).not.toContain('aria-label="Rol"');
 expect(ui).not.toContain("field('role'");
 expect(ui).toContain("supabase.rpc('fenix_prod_profile_update_user'");
});

test('private and group chat is membership-scoped on every list send and attachment path',()=>{
 const sql=read('supabase/migrations/20260911100500_chat_conversations_v2.sql');
 const fix=read('supabase/migrations/20260911100600_chat_conversations_v2_list_fix.sql');
 const ui=read('src/ChatShell.tsx');
 expect(sql).toContain('chat_conversation_members');
 expect(sql).toContain('conversation_code=p_conversation_code and actor_code=me');
 expect(sql).toContain("return jsonb_build_object('ok',false,'status',403,'error','forbidden')");
 expect(sql).toContain('sender_actor_code=me');
 expect(sql).toContain('message_not_owned');
 expect(sql).toContain("bucket_id='fenix-prod-chat'");
 expect(sql).toContain('cm.actor_code=me.actor_code');
 expect(fix).toContain('self.actor_code=me');
 expect(ui).not.toContain('service_role');
 expect(ui).toContain("supabase.rpc('fenix_prod_chat_list_v2_user'");
 expect(ui).toContain("supabase.rpc('fenix_prod_chat_send_v2_user'");
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