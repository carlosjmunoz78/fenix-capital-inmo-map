import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('daily and weekly reports use backend role scope and canonical activity log',()=>{
 const sql=readFileSync('supabase/migrations/20260911112000_role_scoped_daily_weekly_reports.sql','utf8');
 expect(sql).toContain("v_scope_kind:=case when r='Direccion' then 'company' else 'actor' end");
 expect(sql).toContain("v_scope_actor:=case when r='Direccion' then null else p_actor_code end");
 expect(sql).toContain("r not in ('Direccion','Financiero','Visitador')");
 expect(sql).toContain('from fenix_prod.activity_log l');
 expect(sql).toContain('refresh_daily_report_snapshot_v1(d,new.actor_code)');
 expect(sql).toContain('refresh_weekly_report_snapshot_v1(w,new.actor_code)');
 expect(sql).toContain("'periods',jsonb_build_array('daily','weekly')");
 expect(sql).toContain("'Informe diario de toda la empresa");
 expect(sql).toContain("'Mi informe diario");
 expect(sql).toContain("'Informe semanal de toda la empresa");
 expect(sql).toContain("'Mi informe semanal");
});

test('report screen displays server-authorized daily and weekly activity without client scope escalation',()=>{
 const ui=readFileSync('src/InformesShell.tsx','utf8');
 expect(ui).toContain("fetchEnvironmentApi<unknown>('fenix-reports-api',path)");
 expect(ui).toContain("first(selected,['scope_kind'])==='company'?'Toda la empresa':'Solo mi actividad'");
 expect(ui).toContain('el alcance lo determina el servidor, no esta pantalla');
 expect(ui).toContain('Ver detalle →');
 expect(ui).not.toContain('scope_actor_code=');
});

test('staff account administration uses canonical audited backend without exposing passwords',()=>{
 const api=readFileSync('supabase/functions/fenix-user-admin/index.ts','utf8');
 expect(api).toContain('fenix_prod_user_admin_register_server');
 expect(api).toContain('fenix_prod_user_admin_target_server');
 expect(api).toContain('fenix_prod_user_admin_audit_reset_server');
 expect(api).toContain('auth.admin.createUser');
 expect(api).toContain('auth.admin.updateUserById');
 expect(api).not.toContain('changed_fields:{password:');
 expect(api).not.toContain('metadata:{password');
});
