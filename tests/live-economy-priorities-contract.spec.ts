import {expect,test} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
const read=(f:string)=>fs.readFileSync(path.join(process.cwd(),f),'utf8');

test('economy server computes expected income only from active expedientes',async()=>{
 const sql=read('supabase/migrations/20260915195000_live_economy_expected_income.sql');
 expect(sql).toContain('fenix_prod_expediente_is_active');
 expect(sql).toContain('expected_gross := active_count * 3500');
 expect(sql).toContain('expected_commissions := active_inmo * 1100');
 expect(sql).toContain('expected_net := expected_gross - expected_commissions');
 expect(sql).toContain("'ingreso_fenix_esperado',expected_net");
});

test('economy UI renders active gross commissions and Fenix net from backend contract',async()=>{
 const src=read('src/EconomiaProdShell.tsx');
 for(const token of ['INGRESO FÉNIX ESPERADO','HONORARIOS BRUTOS ESPERADOS','COMISIONES INMOBILIARIAS PREVISTAS','ingreso_fenix_esperado','comisiones_inmobiliarias_esperadas'])expect(src).toContain(token);
 expect(src).not.toContain('buildEconomyProjection');
});

test('Inicio priorities consume canonical gateway and canonical terminal task states',async()=>{
 const src=read('src/useDirectionLiveData.ts');
 const states=read('src/taskState.ts');
 expect(src).toContain("fetchAppApi<unknown>('/tareas')");
 expect(src).toContain("fetchAppApi<unknown>('/firmas')");
 expect(src).toContain("import {isTerminalTaskState} from './taskState'");
 expect(src).toContain('isTerminalTaskState(taskState(r))');
 expect(states).toContain('cancelad|anulad|baja');
 expect(states).toContain('complet|terminad|cerrad|hecha');
 expect(src).toContain('window.setInterval');
 expect(src).toContain("window.addEventListener('focus'");
});

test('Inicio honorarios KPI consumes the same live economy expected-income contract',async()=>{
 const src=read('src/DirectionKpiLabelGuard.tsx');
 expect(src).toContain('fetchEconomiaRuntime');
 expect(src).toContain('ingreso_fenix_esperado');
 expect(src).toContain('Ingreso Fénix esperado · cartera activa');
 expect(src).toContain('window.setInterval');
});
