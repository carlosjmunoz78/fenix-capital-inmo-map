import path from 'node:path';
import os from 'node:os';
import { CerebroGatewayV0 } from './gateway.mjs';
import { JarvisProjectHubV1 } from '../runtime/jarvis-project-hub-v1.mjs';

export class CerebroJarvisGatewayV1 {
  #gateway;
  #projects;

  constructor({ environment = 'PREPROD', version = '0.1.0', project_state_dir } = {}) {
    this.#gateway = new CerebroGatewayV0({ environment, version });
    this.#projects = new JarvisProjectHubV1({
      environment,
      state_dir: project_state_dir || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'ProjectHub')
    });
  }

  get environment() { return this.#gateway.environment; }
  get version() { return this.#gateway.version; }

  createSession(input) { return this.#gateway.createSession(input); }
  selectContext(input) { return this.#gateway.selectContext(input); }
  registerCommand(name, handler) { return this.#gateway.registerCommand(name, handler); }
  setChatAdapter(adapter) { return this.#gateway.setChatAdapter(adapter); }
  execute(input) { return this.#gateway.execute(input); }
  chat(input) { return this.#gateway.chat(input); }
  inspectSession(session_id) { return this.#gateway.inspectSession(session_id); }
  auditLog() { return this.#gateway.auditLog(); }
  queryEngines() { return this.#gateway.queryEngines(); }

  queryProjects({ company_id = 'fenix' } = {}) {
    return this.#projects.listProjects({ company_id });
  }

  createProject({ actor, project }) {
    return this.#projects.createProject({ actor, project });
  }

  updateProject({ actor, project_id, patch }) {
    return this.#projects.updateProject({ actor, project_id, patch });
  }

  queryAudits() {
    return this.#projects.listAudits();
  }

  recordAudit({ actor, category, summary, evidence_refs = [], evidence = null }) {
    return this.#projects.recordAudit({ actor, category, summary, evidence_refs, evidence });
  }

  projectRevisions() {
    return this.#projects.revisions();
  }

  contract() {
    return {
      ...this.#gateway.contract(),
      project_hub: this.#projects.contract(),
      api_intent: [
        'GET /api/projects',
        'POST /api/projects',
        'PATCH /api/projects/:id',
        'GET /api/audits',
        'POST /api/audits'
      ]
    };
  }
}

export const PROJECT_HUB_API_BINDING_V1 = Object.freeze({
  gateway: 'CEREBRO Console V0',
  binding: 'JARVIS Project Hub V1',
  direct_model_access: false,
  project_metadata_only: true,
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
  additional_cost_target_eur: 0
});
