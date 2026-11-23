import { verifyActionsPublication } from './actions-provenance.mjs';
import { replayVerifiedLrn } from './zeus-verified-replay.mjs';

export const repository = 'carlosjmunoz78/fenix-capital-inmo-map';
export const branch = 'cerebro-rsi-learning-state-v0';
const workflowId = 403468557;
const root = 'cerebro/runtime/rsi-learning-state';
const scope = Object.freeze({ company_id: 'fenix', engine_id: 'LRN-001', environment: 'PREPROD', version: '0.6.0' });
const utf8 = new TextEncoder();

async function digest(algorithm, bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest(algorithm, bytes)), b => b.toString(16).padStart(2, '0')).join('');
}

async function gitBlob(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 262144) throw Error('INVALID_SOURCE_BYTES');
  const prefix = utf8.encode('blob ' + bytes.length + '\0');
  const input = new Uint8Array(prefix.length + bytes.length);
  input.set(prefix);
  input.set(bytes, prefix.length);
  return digest('SHA-1', input);
}

// The GitHub port is bound by the server. Calls use an installation lease inside
// that port. Neither the port nor the cursor position comes from an HTTP request.
export async function ingestLearningPublication({ db, github, runId, attempt, stateCommit, position, enabled = false }) {
  if (!enabled) return { status: 'OFF' };
  if (![runId, attempt].every(n => Number.isSafeInteger(n) && n > 0) ||
      !Number.isSafeInteger(position) || position < 0 || !/^[0-9a-f]{40}$/.test(stateCommit)) {
    throw Error('INVALID_PUBLICATION_REFERENCE');
  }

  const [workflow, run, jobs] = await Promise.all([
    github.workflow(repository, workflowId),
    github.attempt(repository, runId, attempt),
    github.jobs(repository, runId, attempt),
  ]);
  if (run.id !== runId || run.run_attempt !== attempt) throw Error('ACTIONS_ATTEMPT_MISMATCH');
  const publishers = jobs.filter(item => item.name === 'run-preprod-control-plane');
  if (publishers.length !== 1) throw Error('ACTIONS_PUBLISHER_AMBIGUOUS');
  const [job] = publishers;
  if (!Number.isSafeInteger(job.id) || job.id <= 0) throw Error('ACTIONS_JOB_ID_INVALID');
  const [lines, head] = await Promise.all([github.log(repository, job.id), github.head(repository, branch)]);
  if (!/^[0-9a-f]{40}$/.test(head) || !await github.isAncestor(repository, stateCommit, head)) {
    throw Error('DURABLE_BRANCH_MEMBERSHIP_DENIED');
  }

  async function readFile(path) {
    const file = await github.file(repository, stateCommit, path);
    const bytes = Uint8Array.from(file.bytes);
    if (await gitBlob(bytes) !== file.sha) throw Error('GIT_BLOB_MISMATCH');
    return { path, bytes, sha: file.sha, sha256: await digest('SHA-256', bytes) };
  }

  const summary = await readFile(root + '/last-control-plane-run.json');
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(summary.bytes));
  const attestation = verifyActionsPublication({
    run, workflow, job, lines, stateCommit, expectedJobId: job.id,
    sourceHead: parsed.control_plane.source_head_sha,
  });
  const { publicationPrefix, ...verifiedRun } = attestation;
  if (await github.resolveCommit(repository, publicationPrefix) !== stateCommit) throw Error('PUBLICATION_SHA_DENIED');
  const daily = parsed.horizons.completed.filter(entry =>
    entry.cadence === 'DAILY' && entry.task === 'LEARNING_METRICS_AND_FAILURE_SCAN');
  if (parsed.control_plane.github_run_id !== String(runId)) throw Error('SUMMARY_RUN_MISMATCH');
  if (daily.length === 0) return { status: 'NO_DAILY_RESULT' };
  if (daily.length !== 1 || !/^[0-9a-f]{64}$/.test(daily[0].lock_key)) throw Error('DAILY_RESULT_AMBIGUOUS');
  const lock = daily[0].lock_key;
  const result = await readFile(root + '/data/fenix/LRN-001/orchestration-results/' + lock + '.json');
  const manifest = {
    schema: 'zeus-lrn-provenance/v1', repository, branch, scope,
    ...verifiedRun, sourceHead: run.head_sha, lock_key: lock,
    summary: { path: summary.path, git_blob: summary.sha, sha256: summary.sha256 },
    result: { path: result.path, git_blob: result.sha, sha256: result.sha256 },
  };

  const storage = await replayVerifiedLrn({
    db, enabled: true, provenance: JSON.stringify(manifest),
    approved: { [position]: { commit: stateCommit, blob: result.sha, run: String(runId),
      job: String(job.id), lock, summarySha256: summary.sha256, resultSha256: result.sha256 } },
    readRevision: async () => ({ summary: summary.bytes, result: result.bytes }),
  });
  if (storage.status === 'CAUGHT_UP') {
    const persisted = await db.prepare('SELECT manifest FROM zeus_lrn_provenance_v1 WHERE lock_key=?').bind(lock).first();
    if (persisted?.manifest !== JSON.stringify(manifest)) throw Error('CURSOR_PROVENANCE_MISMATCH');
  }
  return { ...storage, manifest };
}
