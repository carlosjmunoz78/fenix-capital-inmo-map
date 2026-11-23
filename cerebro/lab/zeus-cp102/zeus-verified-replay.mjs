const scope = { company_id: 'fenix', engine_id: 'LRN-001', environment: 'PREPROD', version: '0.6.0' };
const fields = [
  'company_id','engine_id','environment','version','lock_key','source_commit','source_blob',
  'source_sha256','source_run_id','source_job_id','observed_at','execution_state',
  'health_state','autonomy_state','promotion_allowed','additional_cost_eur',
];
const exactScope = value => value && Object.entries(scope).every(([k,v]) => value[k] === v);
const safe = value => value && value.additional_cost_eur === 0 && value.prod_authorized === false &&
  value.prod_write_authorized === false && value.trading_access === false;
const equal = (a,b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(k => Object.hasOwn(b,k) && equal(a[k],b[k]));
};
async function readPinned(bytes, hash) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 262144) throw Error('INVALID_SOURCE');
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest('SHA-256',copy);
  if (Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('') !== hash) {
    throw Error('SOURCE_INTEGRITY_DENIED');
  }
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(copy));
}
const bind = (db,sql,...params) => db.prepare(sql).bind(...params);
const cursorName = 'fenix:LRN-001:PREPROD:daily';
const resultTable = 'zeus_lrn_observations_v1';

// The manifest is trusted deployment configuration, never an HTTP payload.
// This entry point only accepts previously verified, exact historical commits.
export async function replayVerifiedLrn({
  db, approved, readRevision, enabled = false, provenance,
}) {
  if (!enabled) return {status:'OFF'};
  const cursor = await bind(db,'SELECT position FROM zeus_lrn_replay_cursor_v1 WHERE id=?',cursorName).first();
  if (!Number.isSafeInteger(cursor?.position) || cursor.position < 0) throw Error('INVALID_CURSOR');
  const source = approved[cursor.position];
  if (!source) return {status:'CAUGHT_UP',position:cursor.position};
  const blobs = await readRevision(source.commit);
  const summary = await readPinned(blobs.summary,source.summarySha256);
  const result = await readPinned(blobs.result,source.resultSha256);
  const evidence = result.evidence;
  if (![summary.control_plane,summary.learning,result,evidence].every(exactScope) ||
      ![summary,summary.control_plane,summary.learning,result,evidence].every(safe) ||
      summary.status !== 'GREEN' || summary.learning.status !== 'GREEN' ||
      summary.control_plane.github_run_id !== source.run ||
      result.state_type !== 'CEREBRO_LRN_HORIZON_RESULT' || result.status !== 'GREEN' ||
      result.cadence !== 'DAILY' || result.task !== 'LEARNING_METRICS_AND_FAILURE_SCAN' ||
      result.lock_key !== source.lock || evidence.heartbeat_status !== 'GREEN' ||
      evidence.raw_customer_data_included !== false ||
      !Number.isFinite(Date.parse(result.completed_at)) ||
      result.completed_at !== evidence.observed_at ||
      result.completed_at !== summary.learning.cycle_finished_at ||
      !summary.horizons.completed.some(entry => equal(result,entry))) throw Error('RECEIPT_SCOPE_OR_CYCLE_DENIED');

  const params = [...Object.values(scope),result.lock_key,source.commit,source.blob,source.resultSha256,
    source.run,source.job,result.completed_at,'COMPLETED','GREEN_AT_OBSERVATION','PREPROD_POLICY_ONLY',0,0];
  const placeholders = fields.map(()=>'?').join(',');
  const rowMatches = 'SELECT 1 FROM '+resultTable+' WHERE '+fields.map(k=>k+'=?').join(' AND ');
  const guard = provenance === undefined ? '' : `
    AND NOT EXISTS (SELECT 1 FROM zeus_lrn_provenance_v1 WHERE lock_key=? AND manifest<>?)`;
  const manifestMatches = provenance === undefined ? '' : `
    AND EXISTS (SELECT 1 FROM zeus_lrn_provenance_v1 WHERE lock_key=? AND manifest=?)`;
  const manifestParams = provenance === undefined ? [] : [result.lock_key, provenance];
  const statements = [
    bind(db,`INSERT INTO ${resultTable} (${fields.join(',')}) SELECT ${placeholders}
      WHERE EXISTS (SELECT 1 FROM zeus_lrn_replay_cursor_v1 WHERE id=? AND position=?)${guard}
      ON CONFLICT(company_id,engine_id,environment,lock_key) DO NOTHING`,...params,cursorName,cursor.position,...manifestParams),
  ];
  if (provenance !== undefined) {
    statements.push(bind(db,`INSERT INTO zeus_lrn_provenance_v1 (lock_key,manifest) SELECT ?,?
      WHERE EXISTS (SELECT 1 FROM zeus_lrn_replay_cursor_v1 WHERE id=? AND position=?)
      AND EXISTS (${rowMatches}) ON CONFLICT(lock_key) DO NOTHING`,
      ...manifestParams,cursorName,cursor.position,...params));
  }
  statements.push(bind(db,`UPDATE zeus_lrn_replay_cursor_v1 SET position=position+1
      WHERE id=? AND position=? AND EXISTS (${rowMatches})${manifestMatches}`,
    cursorName,cursor.position,...params,...manifestParams));
  const resultBatch = await db.batch(statements);
  if (resultBatch.at(-1)?.meta?.changes === 1) return {status:'ADVANCED',position:cursor.position+1,inserted:resultBatch[0]?.meta?.changes === 1};
  const after = await bind(db,'SELECT position FROM zeus_lrn_replay_cursor_v1 WHERE id=?',cursorName).first();
  if (after?.position > cursor.position && await bind(db,rowMatches+manifestMatches,...params,...manifestParams).first()) {
    return {status:'ALREADY_PROCESSED',position:after.position,inserted:false};
  }
  throw Error('PROJECTION_OR_CURSOR_CONFLICT');
}
