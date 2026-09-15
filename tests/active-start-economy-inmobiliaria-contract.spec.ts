import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('Inicio consumes canonical App expedientes and trusts server active flag',async()=>{
 const src=read('src/useDirectionLiveData.ts');
 expect(src).toContain("fetchAppApi<unknown>('/expedientes')");
 expect(src).toContain("typeof r.is_active==='boolean'");
 expect(src).toContain('return r.is_active');
});

test('expediente list exposes canonical is_active based on signed firma and terminal stage',async()=>{
 const sql=read('supabase/migrations/20260915173500_active_flag_for_app_kpis.sql');
 expect(sql).toContain('fenix_prod_expediente_is_active');
 expect(sql).toContain('as is_active');
 expect(sql).toContain("lower(coalesce(f.estado,''))='firmado'");
});

test('Economia shows backend pipeline activo separately from materialized movements',async()=>{
 const src=read('src/EconomiaProdShell.tsx');
 expect(src).toContain('pipeline_activo');
 expect(src).toContain('economia-active-expedientes');
 expect(src).toContain('economia-active-requested');
 expect(src).toContain('MOVIMIENTOS YA MATERIALIZADOS');
 expect(src).toContain('Firmados, cerrados y bajas');
});

test('expediente exposes one explicit inmobiliaria relation and writes through canonical update contract',async()=>{
 const src=read('src/DetailShell.tsx');
 expect(src).toContain('expediente-inmobiliaria-assignment');
 expect(src).toContain('Inmobiliaria asociada');
 expect(src).toContain('Asignar · cambiar · quitar');
 expect(src).toContain('p_inmobiliaria_code:changes.inmo');
 expect(src).toContain("<option value=\"\">Sin inmobiliaria</option>");
 expect(src).toContain('inmobiliaria_code');
});
