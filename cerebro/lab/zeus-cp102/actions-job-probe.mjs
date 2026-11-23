import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { githubActionsReader } from './github-actions-reader.mjs';
import { ingestLearningPublication } from './learning-ingestor.mjs';

const token = process.env.ZEUS_JOB_TOKEN;
if (!token) throw Error('GITHUB_JOB_TOKEN_MISSING');
const github = githubActionsReader(callback => callback(token));
const sql = new DatabaseSync(':memory:');
for (const schema of ['zeus_lrn_observations_v1.sql', 'replay-cursor.sql', 'lrn-provenance.sql']) {
  sql.exec(readFileSync(new URL(schema, import.meta.url), 'utf8'));
}
const db = {
  prepare: query => ({ bind: (...values) => ({
    first: async () => sql.prepare(query).get(...values),
    write: () => ({ meta: sql.prepare(query).run(...values) }),
  }) }),
  batch: async statements => {
    sql.exec('BEGIN IMMEDIATE');
    try {
      const result = statements.map(statement => statement.write());
      sql.exec('COMMIT');
      return result;
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  },
};
try {
  const input = { db, github, enabled: true, runId: 45150907763, attempt: 1, position: 0,
    stateCommit: '565f5d75b82a1fcd5d196386ea930a672f101000' };
  const first = await ingestLearningPublication(input);
  const retry = await ingestLearningPublication(input);
  if (first.status !== 'ADVANCED' || retry.status !== 'CAUGHT_UP') throw Error('REPLAY_CURSOR_NOT_VERIFIED');
  const endpoint = 'https://cerebro-zeus-lrn-oidc-cp103-lab.carlosj-munozcabeza.workers.dev/v1/replay';
  const oidcUrl = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  oidcUrl.searchParams.set('audience', 'cerebro-zeus-lrn-cp103-lab');
  const oidc = await fetch(oidcUrl, { headers: {
    Authorization: 'Bearer ' + process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
  }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!oidc.ok) throw Error('OIDC_ISSUE_FAILED');
  const jwt = (await oidc.json()).value;
  if (typeof jwt !== 'string' || !jwt) throw Error('OIDC_TOKEN_MISSING');
  async function send(manifest, bearer) {
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers.Authorization = 'Bearer ' + bearer;
    return fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(manifest),
      redirect: 'error', signal: AbortSignal.timeout(12000) });
  }
  if ((await send(first.manifest)).status !== 403) throw Error('UNAUTHENTICATED_REJECTION_FAILED');
  const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
  console.log(JSON.stringify({ oidc_scope: {
    aud: claims.aud, issuer: claims.iss, repository: claims.repository, repository_id: claims.repository_id,
    repository_owner_id: claims.repository_owner_id, ref: claims.ref, subject: claims.sub,
    workflow_ref: claims.workflow_ref, workflow_sha: claims.workflow_sha, sha: claims.sha, event: claims.event_name,
    runner: claims.runner_environment, attempt_type: typeof claims.run_attempt, run_type: typeof claims.run_id,
    lifetime: claims.exp - claims.iat, has_nbf: Number.isSafeInteger(claims.nbf),
  } }));
  const tamper = await send({ ...first.manifest, lock_key: '0'.repeat(64) }, jwt);
  if (tamper.status !== 422) throw Error('TAMPERING_REJECTION_HTTP_' + tamper.status);
  const stored = await send(first.manifest, jwt);
  if (!stored.ok) throw Error('D1_WRITE_HTTP_' + stored.status);
  const ack = await stored.json();
  const duplicate = await send(first.manifest, jwt);
  if (!duplicate.ok) throw Error('D1_RETRY_HTTP_' + duplicate.status);
  const dedup = await duplicate.json();
  if (ack.changes.join(',') !== '1,1,1' || dedup.changes.join(',') !== '0,0,0' ||
      ack.position !== 1 || dedup.position !== 1 || ack.run !== process.env.GITHUB_RUN_ID ||
      ack.attempt !== process.env.GITHUB_RUN_ATTEMPT) throw Error('D1_ACK_MISMATCH');
  console.log(JSON.stringify({ mode: 'REPLAY', identity: 'GITHUB_ACTIONS_OIDC', storage: 'D1_WORKER_BINDING',
    ack, dedup, negative: [403, 422], manifest: first.manifest }));
} catch (error) {
  const code = /^[A-Z][A-Z0-9_]+$/.test(error?.message) ? error.message : 'PROBE_UNEXPECTED_ERROR';
  console.error(code);
  process.exitCode = 1;
} finally {
  sql.close();
}
