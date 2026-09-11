import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');

test('PROD server actor binding allows trusted service-role RPC fanout while preserving user binding',async()=>{
 const sql=read('supabase/migrations/20260911113000_fix_exp_people_and_ana_micro.sql');
 expect(sql).toContain("auth.role(),'')='service_role'");
 expect(sql).toContain("from fenix_prod.actors where actor_code=p_actor_code and active=true");
 expect(sql).toContain("actor_mismatch");
});

test('Ana micro repairs both insufficient and non-exact fallbacks through canonical knowledge RPC',async()=>{
 const runtime=read('src/runtime-polish.ts');
 expect(runtime).toContain('No encuentro una coincidencia exacta');
 expect(runtime).toContain("fenix_prod_ana_knowledge_answer_user");
 const sql=read('supabase/migrations/20260911113000_fix_exp_people_and_ana_micro.sql');
 expect(sql).toContain('ana_knowledge_cards');
 expect(sql).toContain('score>=2');
 expect(sql).toContain('CEREBRO_CANONICAL');
});
