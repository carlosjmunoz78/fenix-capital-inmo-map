import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runRepositoryActivation} from '../runtime/universal-skill-repository-intake-v1.mjs';

test('a governed MIT web guidance skill reaches FULL_SAFE_PREPROD through readonly internal wrapping',()=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-new-web-skill-'));
  const manifest={schema_version:'1.1.0',technical_name:'new-responsive-visual-guidance',version:'1.0.0',license:'MIT',description:'Responsive accessible web UI visual design guidance for typography, CSS layout and landing pages.',capabilities:[{technical_name:'new-responsive-visual-guidance',description:'Responsive accessible web UI visual design guidance for typography, CSS layout and landing pages.',terms:['website','frontend','ui','responsive','accessibility','typography','css'],declared_domains:['web-wordpress-frontend']}],policy:{external_code_execution:false,prod_write_authorized:false,additional_cost_eur:0}};
  fs.writeFileSync(path.join(repo,'cerebro.skill.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(repo,'SKILL.md'),'# Responsive Visual Guidance\n\nUse responsive web layouts, CSS, typography, accessible frontend UI and reversible design previews. This capability is guidance only and never publishes to production.');
  fs.writeFileSync(path.join(repo,'LICENSE'),'MIT License\n');
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-new-web-skill-work-'));
  const report=runRepositoryActivation({repo_dir:repo,source_locator:'github://example/new-responsive-visual-guidance@'+'a'.repeat(40)+'/skill',company_id:'fenix',root_dir:work,source_run_id:42,source_head_sha:'b'.repeat(40)});
  assert.equal(report.status,'FULL_SAFE_PREPROD');
  assert.equal(report.full_safe_preprod,true);
  assert.equal(report.readonly_semantic_evidence.status,'READONLY_SEMANTIC_EVIDENCE_GREEN');
  assert.ok(report.readonly_semantic_evidence.generated_semantic_evidence_count>0);
  assert.equal(report.auto_engineering.binding_report.full_safe_preprod,true);
  assert.equal(report.auto_engineering.binding_report.independent_tribunal.decision,'PASS');
  assert.equal(report.auto_engineering.binding_report.cost_eur,0);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.prod_mutation_authorized,false);
  assert.equal(report.external_skill_code_execution,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
  assert.ok(report.elapsed_ms<5000);
});
