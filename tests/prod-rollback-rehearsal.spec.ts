import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';

const workflow=readFileSync('.github/workflows/prod-rollback-rehearsal.yml','utf8');
const runbook=readFileSync('docs/PROD_ROLLBACK_RUNBOOK.md','utf8');

test('rollback rehearsal is manual, PROD-configured and never publishes live',()=>{
 expect(workflow).toContain('workflow_dispatch:');
 expect(workflow).toContain('target_sha:');
 expect(workflow).toContain('VITE_FENIX_ENV: prod');
 expect(workflow).toContain('cluhljgonannaafpmblx.supabase.co');
 expect(workflow).toContain("! grep -R -F 'hnqlnvakzaywtafeiybt.supabase.co'");
 expect(workflow).toContain('Upload rehearsal artifact only');
 expect(workflow).not.toContain('git push');
 expect(workflow).not.toContain('contents: write');
 expect(workflow).not.toContain('Publish canonical PROD snapshot');
});

test('rollback procedure preserves main as source of truth and uses normal gates',()=>{
 expect(runbook).toContain('`main` remains the single source of truth for PROD.');
 expect(runbook).toContain('reverting the offending commit(s) on `main`');
 expect(runbook).toContain('PRE-PROD build, Browser QA and smoke to be green');
 expect(runbook).toContain('`PROD Live Deploy` to be green');
 expect(runbook).toContain('`PROD Runtime Smoke` to be green');
 expect(runbook).toContain('Never reapply the failed change directly in PROD.');
});
