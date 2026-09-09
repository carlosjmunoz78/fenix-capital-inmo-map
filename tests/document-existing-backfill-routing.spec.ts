import fs from 'node:fs';
import {test,expect} from '@playwright/test';

const source=()=>fs.readFileSync('supabase/functions/fenix-document-existing-backfill/index.ts','utf8');

test('existing backfill keeps authenticated user context and server-only service role',()=>{
 const code=source();
 expect(code).toContain("auth.toLowerCase().startsWith('bearer ')");
 expect(code).toContain("user.rpc('fenix_prod_session_context')");
 expect(code).toContain("['Direccion','Financiero'].includes(role)");
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
