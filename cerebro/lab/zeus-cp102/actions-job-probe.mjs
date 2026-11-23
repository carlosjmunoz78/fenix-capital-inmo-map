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
  console.log(JSON.stringify({ mode: 'REPLAY', identity: 'GITHUB_TOKEN_JOB_ONLY', storage: 'DISPOSABLE_SQLITE',
    first: first.status, retry: retry.status, manifest: first.manifest }));
} catch (error) {
  const code = /^[A-Z][A-Z0-9_]+$/.test(error?.message) ? error.message : 'PROBE_UNEXPECTED_ERROR';
  console.error(code);
  process.exitCode = 1;
} finally {
  sql.close();
}
