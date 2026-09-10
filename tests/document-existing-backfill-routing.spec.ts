import fs from 'node:fs';
import {test,expect} from '@playwright/test';

const source=()=>fs.readFileSync('supabase/functions/fenix-document-existing-backfill/index.ts','utf8');

test('existing backfill keeps authenticated user context and server-only service role',()=>{
 const code=source();
 expect(code).toContain("auth.toLowerCase().startsWith('bearer ')");
 expect(code).toContain("user.rpc('fenix_prod_session_context')");
 expect(code).toContain("function normalize(v:unknown)");
 expect(code).toContain("['direccion','financiero'].includes(role)");
 expect(code).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
 expect(code).not.toMatch(/verify_jwt\s*:\s*false/i);
});

test('legacy routing uses exact document DNI only as deterministic participant fallback',()=>{
 const code=source();
 expect(code).toContain('function personByExistingDni');
 expect(code).toContain("run?.extraction?.fields?.documento_identidad");
 expect(code).toContain('matches.length===1?matches[0]:null');
 expect(code).toContain('personFor(name,people)||personByExistingDni(run,people)||(people.length===1?people[0]:null)');
});

test('legacy routing refuses ambiguity and never reprocesses an already applied document',()=>{
 const code=source();
 expect(code).toContain("error:'ambiguous_person'");
 expect(code).toContain("error:'unrecognized_filename'");
 expect(code).toContain("if(run?.status==='applied')continue;");
 expect(code).not.toContain("run?.status==='applied'&&native");
 expect(code).toContain("TARGET='fenix-document-auto-ingest'");
});

test('backfill trusts canonical expediente linkage instead of legacy upload origin',()=>{
 const code=source();
 expect(code).toContain(".eq('expediente_id',exp.data.id)");
 expect(code).toContain("if(!s)continue;");
 expect(code).not.toContain("String(s.origin_type)!=='expediente'");
 expect(code).not.toContain("String(s.origin_code)!==expCode");
});

test('terminal expediente stages are blocked server-side before document mutation',()=>{
 const code=source();
 expect(code).toContain("const TERMINAL=new Set(['firmado','cerrado','cierre','finalizado','baja','perdido','pausado'])");
 expect(code).toContain(".select('id,stage')");
 expect(code).toContain("if(TERMINAL.has(normalize(exp.data.stage)))");
 expect(code).toContain("error:'terminal_stage'");
});

test('comprador identity repair is narrow, deterministic and preserves provenance',()=>{
 const code=source();
 expect(code).toContain("String(c.session?.origin_type)==='comprador'");
 expect(code).toContain("c.run?.status==='needs_review'");
 expect(code).toContain("String(c.run?.error)==='participant_identity_mismatch'");
 expect(code).toContain("people.some(p=>String(p.id||p.contact_code)===String(c.session?.origin_code))");
 expect(code).toContain("!!personByExistingDni(c.run,people)");
 expect(code).toContain("fenix_prod_exp_person_update_server");
 expect(code).toContain("fenix_prod_document_extract_run_update_server");
 expect(code).toContain("source:'existing_extraction'");
 expect(code).toContain("evidence:'document_dni_unique_in_expediente'");
 expect(code).toContain("previous_origin_type");
 expect(code).toContain("previous_origin_code");
 expect(code).toContain("corrected_contact_code");
});

test('identity repair maps only canonical supported participant fields',()=>{
 const code=source();
 expect(code).toContain('function repairChanges');
 expect(code).toContain('x.dni_nie=fields.documento_identidad');
 expect(code).toContain('x.empresa_organismo=fields.empresa');
 expect(code).toContain('x.situacion_laboral=fields.situacion_laboral_actual');
 expect(code).toContain('x.sueldo_neto_mensual=fields.ingresos_netos_mensuales');
 expect(code).toContain('x.deudas_mensuales=fields.cuotas_deuda_mensuales');
 expect(code).toContain('x.ahorro_disponible=fields.ahorros');
});
