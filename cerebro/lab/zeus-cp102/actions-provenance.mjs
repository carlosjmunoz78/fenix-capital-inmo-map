const repo='carlosjmunoz78/fenix-capital-inmo-map';
const workflowPath='.github/workflows/cerebro-rsi-learning-control-plane-v0.yml';
const stateBranch='cerebro-rsi-learning-state-v0';

// Inputs must be read by the server from GitHub's run, attempt jobs and job
// logs endpoints. A caller-supplied assertion is not a provider attestation.
export function verifyActionsPublication({run,workflow,job,lines,stateCommit,sourceHead,expectedJobId}) {
  if (!/^[0-9a-f]{40}$/.test(stateCommit) || !/^[0-9a-f]{40}$/.test(sourceHead) ||
      !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 ||
      workflow.id!==403468557 || run.workflow_id!==workflow.id || workflow.path!==workflowPath ||
      run.path!==workflowPath || run.repository!==repo || run.head_repository!==repo ||
      run.head_branch!=='main' || run.head_sha!==sourceHead || !['schedule','workflow_run'].includes(run.event) ||
      run.status!=='completed' || run.conclusion!=='success' ||
      job.name!=='run-preprod-control-plane' || job.id!==expectedJobId ||
      job.run_id!==run.id || job.run_attempt!==run.run_attempt || job.head_sha!==run.head_sha ||
      job.status!=='completed' || job.conclusion!=='success') throw Error('ACTIONS_SCOPE_OR_ATTEMPT_DENIED');

  const created=lines.map(line=>line.match(/\[detached HEAD ([a-f0-9]{8,40})\]/)?.[1]).filter(Boolean);
  const pushed=lines.map(line=>line.match(/\b[a-f0-9]{8,40}\.\.([a-f0-9]{8,40})\s+HEAD -> ([a-z0-9-]+)$/))
    .filter(match=>match && match[2]===stateBranch).map(match=>match[1]);
  if (created.length!==1 || pushed.length!==1 || !stateCommit.startsWith(created[0]) ||
      !stateCommit.startsWith(pushed[0])) throw Error('ACTIONS_STATE_PUBLICATION_DENIED');
  return {runId:run.id,attempt:run.run_attempt,workflowId:run.workflow_id,jobId:job.id,stateCommit,publicationPrefix:pushed[0]};
}
