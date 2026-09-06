import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260906002000_prod_document_access_live_upload_v3.sql','utf8');

test('document access v3 never reuses a dangling intelligence upload id', async () => {
  expect(sql).toContain("'contract_version',3");
  expect(sql).toContain('from fenix_prod.document_intelligence_runs r');
  expect(sql).not.toMatch(/select\s+r\.extraction\s*,\s*r\.status\s*,\s*r\.updated_at\s*,\s*r\.upload_id/i);
  expect(sql).toContain('join fenix_prod.document_upload_sessions us on us.storage_path=dv.storage_path');
  expect(sql).toContain("us.status='completed'");
  expect(sql).toContain('where dv.document_id=d.id');
});

test('document access v3 preserves existing RBAC and service-role-only ACL', async () => {
  expect(sql).toContain("if v_role='Direccion' then allowed:=true");
  expect(sql).toContain("elsif v_role='Financiero' and d.expediente_id is not null and d.owner_actor_code=p_actor_code then allowed:=true");
  expect(sql).toContain("elsif v_role='Visitador' and d.inmobiliaria_id is not null and d.owner_actor_code=p_actor_code and d.sensibilidad='B2B' then allowed:=true");
  expect(sql).toContain('revoke all on function public.fenix_prod_document_access_server(text,text) from public,anon,authenticated');
  expect(sql).toContain('grant execute on function public.fenix_prod_document_access_server(text,text) to service_role');
});
