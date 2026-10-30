import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { runFactoryRequest } from './fact001-request-runner.mjs';

const VERSION = 'mission-fact001-scaffold-bridge-v1';
const TARGETS = Object.freeze({
  M16: Object.freeze(['CONSOLE-001','ACTGW-001']),
  M18: Object.freeze(['WEB-001','APPBOOT-001']),
});

function safeMission(value) {
  const id = String(value || '').trim().toUpperCase();
  if (!/^M\d{2}$/.test(id)) throw new Error('MISSION_ID_INVALID');
  return id;
}

function safeRoot(value) {
  const root = path.resolve(value);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function fact001TargetsForMission(missionId) {
  return Object.freeze([...(TARGETS[safeMission(missionId)] || [])]);
}

export function runMissionFact001ScaffoldV1({ mission_id, company_id='fenix', out_root='artifacts/mission-fact001-scaffold-v1' } = {}) {
  const missionId = safeMission(mission_id);
  const targets = fact001TargetsForMission(missionId);
  if (!targets.length) {
    return Object.freeze({
      schema_version:'1.0.0', state_type:'CEREBRO_MISSION_FACT001_SCAFFOLD_BRIDGE_V1', version:VERSION,
      mission_id:missionId, company_id, status:'NOT_APPLICABLE', target_engines:[], generated_file_count:0,
      additional_cost_eur:0, prod_authorized:false, prod_write_authorized:false, trading_access:false
    });
  }

  const root = safeRoot(out_root);
  const results = [];
  for (const engineId of targets) {
    const requestId = `${VERSION}:${missionId}:${engineId}`;
    const request = {
      schema_version:'1.0.0', request_id:requestId, company_id, engine_id:engineId,
      environment:'SCAFFOLD', version:'0.1.0', intent:'CREATE_SCAFFOLD', additional_cost_eur:0,
      prod_authorized:false, prod_write_authorized:false, trading_access:false, external_code_execution:false
    };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-mission-fact001-'));
    const requestFile = path.join(tempDir, 'request.json');
    try {
      fs.writeFileSync(requestFile, `${JSON.stringify(request,null,2)}\n`, 'utf8');
      const targetDir = path.join(root, missionId, engineId);
      const result = runFactoryRequest({ requestFile, outDir: targetDir });
      results.push(Object.freeze({ engine_id:engineId, target_dir:targetDir, ...result }));
    } finally {
      fs.rmSync(tempDir, { recursive:true, force:true });
    }
  }

  const generatedFileCount = results.reduce((sum, r) => sum + Number(r.generated_file_count || 0), 0);
  const report = {
    schema_version:'1.0.0', state_type:'CEREBRO_MISSION_FACT001_SCAFFOLD_BRIDGE_V1', version:VERSION,
    mission_id:missionId, company_id, status:'FACT001_SCAFFOLDS_GENERATED', target_engines:targets,
    generated_file_count:generatedFileCount, results,
    bridge_fingerprint:digest(JSON.stringify(results.map(r=>({engine_id:r.engine_id,bundle_sha256:r.bundle_sha256})))),
    next_gate:'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED',
    additional_cost_eur:0, prod_authorized:false, prod_write_authorized:false, trading_access:false
  };
  fs.mkdirSync(path.join(root, missionId), { recursive:true });
  fs.writeFileSync(path.join(root, missionId, 'bridge-result.json'), `${JSON.stringify(report,null,2)}\n`, 'utf8');
  return Object.freeze(report);
}
