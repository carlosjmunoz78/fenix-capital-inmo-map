import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JarvisProjectHubV1 } from './jarvis-project-hub-v1.mjs';
import { CerebroJarvisGatewayV1 } from '../console/jarvis-project-hub-binding-v1.mjs';

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-project-hub-'));

try {
  const hub = new JarvisProjectHubV1({ state_dir: stateDir });
  const projects = hub.listProjects();

  assert.equal(projects.length, 19, '18 canonical numbered projects + AUDITORIAS');
  assert.equal(projects[0].project_id, 'PRJ-AUDITORIAS');
  assert.deepEqual(projects.slice(1).map(project => project.project_id), Array.from({ length: 18 }, (_, index) => `PRJ-${String(index + 1).padStart(3, '0')}`));

  for (const project of projects) {
    assert.equal(project.company_id, 'fenix');
    assert.equal(project.engine_id, 'PROJECT-001');
    assert.equal(project.environment, 'PREPROD');
    assert.equal(project.version, 'v1');
    assert.ok(project.editors.includes('CARLOS'));
    assert.ok(project.editors.includes('JARVIS'));
    assert.ok(Array.isArray(project.subprojects));
  }

  assert.equal(hub.getProject('PRJ-002').status, 'PARCIAL');
  assert.equal(hub.getProject('PRJ-013').status, 'HECHO');
  assert.equal(hub.getProject('PRJ-016').autonomy_state, 'DISABLED_CANDIDATE');

  const custom = hub.createProject({
    actor: 'CARLOS',
    project: {
      project_id: 'PRJ-CUSTOM-001',
      title: 'Proyecto creado por Carlos',
      objective: 'Demostrar creación humana gobernada.',
      subprojects: ['Subproyecto A']
    }
  });
  assert.equal(custom.owner, 'CARLOS');
  assert.ok(custom.order > 18);

  const updated = hub.updateProject({
    actor: 'JARVIS',
    project_id: 'PRJ-CUSTOM-001',
    patch: { status: 'PARCIAL', objective: 'Actualizado por JARVIS con procedencia.' }
  });
  assert.equal(updated.status, 'PARCIAL');

  assert.throws(() => hub.updateProject({
    actor: 'JARVIS',
    project_id: 'PRJ-001',
    patch: { prod_authorized: true }
  }), /cannot grant authority/);

  assert.throws(() => hub.updateProject({
    actor: 'CARLOS',
    project_id: 'PRJ-001',
    patch: { trading_access: true }
  }), /cannot grant authority/);

  assert.throws(() => hub.updateProject({
    actor: 'JARVIS',
    project_id: 'PRJ-001',
    patch: { company_id: 'other-company' }
  }), /immutable project field/);

  const auditBefore = hub.listAudits();
  const oldEvidenceCount = auditBefore.immutable_evidence.length;
  const audit = hub.recordAudit({
    actor: 'JARVIS',
    category: 'AUD-RUNTIME',
    summary: 'Reconciliación de prueba con evidencia inmutable.',
    evidence_refs: ['TEST-EVIDENCE'],
    evidence: { check: 'GREEN', prod_authorized: false, trading_access: false }
  });
  assert.equal(audit.type, 'AUDIT_RECORDED');

  const auditAfter = hub.listAudits();
  assert.equal(auditAfter.immutable_evidence.length, oldEvidenceCount + 1);
  assert.equal(auditAfter.current_summary.text, 'Reconciliación de prueba con evidencia inmutable.');
  assert.ok(auditAfter.summary_revisions.length > auditBefore.summary_revisions.length);
  assert.ok(hub.revisions().length >= 3);

  const rebuilt = new JarvisProjectHubV1({ state_dir: stateDir });
  assert.equal(rebuilt.getProject('PRJ-CUSTOM-001').status, 'PARCIAL');
  assert.equal(rebuilt.listAudits().current_summary.text, 'Reconciliación de prueba con evidencia inmutable.');

  const gateway = new CerebroJarvisGatewayV1({ project_state_dir: path.join(stateDir, 'gateway') });
  assert.equal(gateway.queryProjects().length, 19);
  assert.equal(gateway.contract().project_hub.canonical_projects, 18);
  assert.equal(gateway.contract().project_hub.prod_authorized, false);
  assert.equal(gateway.contract().project_hub.trading_access, false);

  console.log('GREEN_JARVIS_PROJECT_HUB_V1');
} finally {
  fs.rmSync(stateDir, { recursive: true, force: true });
}
