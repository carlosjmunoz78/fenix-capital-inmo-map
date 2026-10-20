const nativeFetch = globalThis.fetch;

const repo = process.env.GITHUB_REPOSITORY ?? '';
const token = process.env.GITHUB_TOKEN ?? '';
const canonicalWorkflowFiles = Object.freeze([
  'cerebro-human-intelligence-owner100-v1.yml',
  'cerebro-human-intelligence-promotion-readiness-v1.yml',
  'cerebro-session-context-regression-guard.yml',
  'cerebro-multichannel-conversation-unification-v1.yml',
  'cerebro-rsi-universal-learning-ingress-v0.yml',
  'cerebro-rsi-learning-control-plane-v0.yml',
  'cerebro-rsi-real-domain-evidence-wiring-v0.yml',
  'cerebro-rsi-b3-old-new-evaluation-tribunal-v0.yml',
  'prod-rollback-rehearsal.yml'
]);

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function dedupeRuns(runs) {
  const byId = new Map();
  for (const run of runs) {
    const key = String(run?.id ?? `${run?.name ?? ''}:${run?.head_sha ?? ''}:${run?.updated_at ?? ''}`);
    if (!byId.has(key)) byId.set(key, run);
  }
  return [...byId.values()];
}

async function loadCanonicalWorkflowRuns() {
  if (!repo || !token) return [];
  const output = [];
  for (const workflowFile of canonicalWorkflowFiles) {
    const url = `https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?per_page=20`;
    try {
      const response = await nativeFetch(url, { headers: headers() });
      if (!response.ok) {
        console.error(`WARN: Knowledge100 targeted workflow evidence read failed: ${response.status} workflow=${workflowFile}`);
        continue;
      }
      const body = await response.json();
      if (Array.isArray(body.workflow_runs)) output.push(...body.workflow_runs);
    } catch (error) {
      console.error(`WARN: Knowledge100 targeted workflow evidence read failed: workflow=${workflowFile} error=${error?.message ?? 'unknown'}`);
    }
  }
  return dedupeRuns(output);
}

let supplementalPromise = null;
function getSupplementalRuns() {
  supplementalPromise ??= loadCanonicalWorkflowRuns();
  return supplementalPromise;
}

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : String(input?.url ?? input);
  const response = await nativeFetch(input, init);
  const isPrimaryActionsPage = /\/actions\/runs\?per_page=100&page=1(?:&|$)/.test(url);
  if (!isPrimaryActionsPage || !response.ok) return response;

  try {
    const body = await response.clone().json();
    const baseRuns = Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
    const supplemental = await getSupplementalRuns();
    const merged = dedupeRuns([...baseRuns, ...supplemental]);
    return new Response(JSON.stringify({ ...body, workflow_runs: merged }), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error(`WARN: Knowledge100 supplemental evidence merge failed: ${error?.message ?? 'unknown'}`);
    return response;
  }
};

await import('./knowledge-100-v0.mjs');
