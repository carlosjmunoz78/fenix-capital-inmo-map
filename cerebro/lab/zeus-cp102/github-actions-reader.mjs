import { repository } from './learning-ingestor.mjs';

const api = 'https://api.github.com/repos/' + repository;
const origin = 'https://api.github.com';
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'CEREBRO-ZEUS-LAB' };

function assertRepo(repo) {
  if (repo !== repository) throw Error('GITHUB_REPOSITORY_DENIED');
}

// withInstallationToken is a server-side lease callback backed by the existing
// encrypted credential mechanism. There is no anonymous or interactive fallback.
export function githubActionsReader(withInstallationToken, fetch = globalThis.fetch) {
  const request = (path, accept = headers.Accept) => withInstallationToken(token => {
    if (typeof token !== 'string' || token.length === 0) throw Error('GITHUB_INSTALLATION_LEASE_REQUIRED');
    return fetch(api + path, {
      headers: { ...headers, Accept: accept, Authorization: 'Bearer ' + token },
      redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
  });
  async function json(path) {
    const response = await request(path);
    if (!response.ok) throw Error('GITHUB_API_HTTP_' + response.status);
    return response.json();
  }
  return {
    async workflow(repo, id) {
      assertRepo(repo);
      return json('/actions/workflows/' + id);
    },
    async attempt(repo, id, attempt) {
      assertRepo(repo);
      const run = await json('/actions/runs/' + id + '/attempts/' + attempt);
      return { ...run, repository: run.repository?.full_name, head_repository: run.head_repository?.full_name };
    },
    async jobs(repo, id, attempt) {
      assertRepo(repo);
      const page = await json('/actions/runs/' + id + '/attempts/' + attempt + '/jobs?per_page=100');
      if (!Array.isArray(page.jobs) || page.jobs.length !== page.total_count) throw Error('GITHUB_JOBS_INCOMPLETE');
      return page.jobs;
    },
    async log(repo, id) {
      assertRepo(repo);
      let response = await request('/actions/jobs/' + id + '/logs');
      if (response.status === 302) {
        const target = new URL(response.headers.get('location'), origin);
        if (target.protocol !== 'https:' || target.username || target.password || target.port ||
            !/\.(?:blob\.core\.windows\.net|actions\.githubusercontent\.com)$/.test(target.hostname)) {
          throw Error('GITHUB_LOG_REDIRECT_DENIED');
        }
        response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(10000) });
      }
      if (!response.ok || !response.body) throw Error('GITHUB_LOG_HTTP_' + response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      let content = '';
      try {
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          bytes += item.value.byteLength;
          if (bytes > 2 * 1024 * 1024) throw Error('GITHUB_LOG_TOO_LARGE');
          content += decoder.decode(item.value, { stream: true });
        }
        return (content + decoder.decode()).split(/\r?\n/);
      } finally {
        await reader.cancel();
      }
    },
    async head(repo, branch) {
      assertRepo(repo);
      return (await json('/git/ref/heads/' + encodeURIComponent(branch))).object.sha;
    },
    async resolveCommit(repo, prefix) {
      assertRepo(repo);
      if (!/^[0-9a-f]{8,40}$/.test(prefix)) throw Error('GITHUB_PREFIX_DENIED');
      return (await json('/commits/' + prefix)).sha;
    },
    async isAncestor(repo, commit, head) {
      assertRepo(repo);
      if (commit === head) return true;
      const comparison = await json('/compare/' + commit + '...' + head + '?per_page=1');
      return comparison.merge_base_commit?.sha === commit && comparison.behind_by === 0;
    },
    async file(repo, commit, path) {
      assertRepo(repo);
      const file = await json('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + commit);
      if (file.type !== 'file' || file.path !== path || file.encoding !== 'base64' ||
          !Number.isSafeInteger(file.size) || file.size < 0 || file.size > 262144 ||
          typeof file.content !== 'string' || file.content.length > 380000) throw Error('GITHUB_FILE_DENIED');
      const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
      if (bytes.length !== file.size) throw Error('GITHUB_FILE_SIZE_MISMATCH');
      return { sha: file.sha, bytes };
    },
  };
}
