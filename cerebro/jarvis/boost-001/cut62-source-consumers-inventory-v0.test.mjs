import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CONTRACT_SYMBOLS,scopeForPath,analyzeFile,inventoryWorkingTree} from './cut62-source-consumers-inventory-v0.mjs';

test('inventory searches bounded exact company, onboarding, engine, learning and marketing APIs',()=>{
 assert.ok(LEGACY_CONTRACT_SYMBOLS.length>=12);
 assert.ok(LEGACY_CONTRACT_SYMBOLS.includes('cerebro_lrn001_record_preprod'));
 assert.ok(LEGACY_CONTRACT_SYMBOLS.includes('cerebro_company_onboarding_start_preprod'));
});
test('classify three App/Edge/runtime surfaces, distinguishing actual deployed source',()=>{
 assert.equal(scopeForPath('src/cerebroConsoleApi.ts'),'FRONTEND_SRC');
 assert.equal(scopeForPath('supabase/functions/fenix-app-gateway/index.ts'),'EDGE_REPO_SOURCE');
 assert.equal(scopeForPath('cerebro/console/gateway.mjs'),'CEREBRO_RUNTIME_OR_SCHEMA');
 assert.equal(scopeForPath('other/file.ts'),'SKIPPED');
});
test('exact direct contract and generic RPC invocation tracked separately',()=>{
 const row=analyzeFile('src/x.ts',"await supabase.rpc(dynamicName); const a='cerebro_company_register_preprod';");
 assert.equal(row.direct_literal_company_contract_reference,true);
 assert.deepEqual(row.direct_contract_symbols,['cerebro_company_register_preprod']);
 assert.ok(row.generic_suspected_surfaces.includes('SUPABASE_RPC_DYNAMIC_SURFACE'));
 const indirect=analyzeFile('src/y.ts','const r=await supabase.rpc(dynamicFunctionName)');
 assert.equal(indirect.direct_contract_symbols.length,0);
 assert.ok(indirect.generic_suspected_surfaces.includes('SUPABASE_RPC_DYNAMIC_SURFACE'));
});
test('no secret values, snippets or direct production approval in scanner output',()=>{
 const r=analyzeFile('src/test.ts',"const MY_PASSWORD='never-print-this'; await supabase.functions.invoke('test');");
 assert.ok(!JSON.stringify(r).includes('never-print-this'));
 assert.ok(!Object.keys(r).includes('source'));
 const report=inventoryWorkingTree();
 assert.ok(report.tracked_code_files_considered>100);
 assert.equal(report.credentials_logged,false);
 assert.equal(report.source_snippets_logged,false);
 assert.equal(report.compiled_app_deployment_parity_verified,false);
 assert.equal(report.deployed_edge_code_fully_scanned,false);
 assert.equal(report.prod_authorized,false);
 assert.equal(report.physical_prod_backup_verified,false);
 assert.equal(report.owner_b2b3_e2e_verified,false);
 assert.equal(report.repositories_scanned,1);
 assert.match(report.scan_integrity_sha256,/^[0-9a-f]{64}$/);
});
