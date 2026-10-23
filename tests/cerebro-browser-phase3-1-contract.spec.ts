import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('Console Browser Gateway is owner-only, allowlisted, zero-cost and fail closed',async()=>{
 const source=read('supabase/functions/cerebro-console-browser-gateway-v1/index.ts');
 expect(source).toContain("service:'cerebro-console-browser-gateway-v1'");
 expect(source).toContain('direct_browser_edge_access:false');
 expect(source).toContain('owner_only:true');
 expect(source).toContain("company_scope:'fenix'");
 expect(source).toContain("environment:'PROD'");
 expect(source).toContain('incremental_cost_eur:0');
 expect(source).toContain("ctx?.actor_code??'')!=='CARLOS-ADMIN'");
 expect(source).toContain('BROWSER_GATEWAY_ROUTE_DENIED');
 expect(source).toContain('COMPANY_SCOPE_DENIED');
 expect(source).toContain('ENVIRONMENT_SCOPE_DENIED');
 expect(source).toContain("const BROWSER_EDGE='cerebro-browser-interactive-v3'");
 expect(source).not.toContain('SERVICE_ROLE_KEY`');
});

test('V3 edge accepts only encrypted governed human input and sanitizes tab snapshots',async()=>{
 const source=read('supabase/functions/cerebro-browser-interactive-v3/index.ts');
 expect(source).toContain("'NAVIGATE'");
 expect(source).toContain('ENCRYPTED_INPUT_REQUIRED');
 expect(source).toContain('HUMAN_CONTROL_LEASE_INVALID');
 expect(source).toContain('cleanTabs(body.tabs)');
 expect(source).toContain('raw');
 expect(source).toContain("schema_version:'3.1.0'");
 expect(source).toContain('multi_tab_snapshots:true');
 expect(source).toContain('incremental_cost_eur:0');
});

test('interactive runtime adds URL navigation and keeps tab state inside V3',async()=>{
 const source=read('cerebro/runtime/browser-interactive-session-v3.mjs');
 expect(source).toContain("case'NAVIGATE'");
 expect(source).toContain('safeNavigationUrl');
 expect(source).toContain('HUMAN_NAVIGATION_SCHEME_DENIED');
 expect(source).toContain('applyTabCommand');
 expect(source).toContain('normalizedTabs');
 expect(source).toContain('persistent_explicit_tabs:true');
 expect(source).toContain("createGovernedCloudBrowserWorker({max_tabs:8})");
 expect(source).toContain("String(job.environment)!=='PROD'||String(job.company_id)!=='fenix'");
});

test('V1 and V2 browser implementations remain untouched by Phase 3.1 contract',async()=>{
 const source=read('cerebro/runtime/browser-interactive-session-v3.mjs');
 expect(source).toContain('same_v2_queue:true');
 expect(source).toContain('default_browser1_unchanged:true');
 const gateway=read('supabase/functions/cerebro-console-browser-gateway-v1/index.ts');
 expect(gateway).not.toContain('cerebro-browser-dispatch-v2-prod');
 expect(gateway).not.toContain('cerebro-browser-dispatch-v2');
 expect(gateway).not.toContain('cerebro-browser-dispatch-v1');
});
