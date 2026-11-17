/**
 * CEREBRO NIA — isolated Cloudflare LAB, no GitHub Actions dependency.
 * No public route; no workers.dev; no preview URL; no scheduled cron.
 * Only manual scheduled test after a separate encrypted Cloudflare secret is set.
 * No changes to CEREBRO, Notion, PROD, existing Cloudflare Workers, D1 or DNS.
 */
const PAGE_ID = '41a81b1a-756d-815a-b877-f0d264a6a0d4';
const EXPECTED_TITLE = 'NIA · Uso responsable de Notion Business en CEREBRO';
const ROOT = 'https://api.notion.com/v1/';
const normalId = v => String(v ?? '').replace(/-/g, '').toLowerCase();

function stop(code) {
  console.log('NIA_CLOUDFLARE_LAB_PROOF=' + code);
  return code;
}

async function readNiaOnce(env) {
    const token = env.CEREBRO_NIA_NOTION_READ_TOKEN;
    if (typeof token !== 'string' || token.trim().length < 15)
      return stop('BLOCKED_CLOUDFLARE_SECRET_MISSING');
    const headers = { Authorization: 'Bearer ' + token.trim(), 'Notion-Version': '2022-06-28', Accept: 'application/json' };
    const get = async path => {
      try {
        return await globalThis.fetch(ROOT + path, {
          method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(10000)
        });
      } catch (error) {
        // No exception messages, payloads, URLs or secrets are logged.
        const name = error?.name === 'TypeError' ? 'TYPE' :
          error?.name === 'TimeoutError' ? 'TIMEOUT' :
          error?.name === 'AbortError' ? 'ABORT' : 'OTHER';
        const msg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
        const category = /abort|timeout/.test(msg) ? 'TIME_LIMIT' :
          /blocked|forbidden|not allowed|disallowed|prohibit/.test(msg) ? 'PLATFORM_RESTRICTED' :
          /network|connection|failed|dns|host/.test(msg) ? 'NETWORK_CONNECTION' :
          /not a function|unsupported|unimplemented/.test(msg) ? 'RUNTIME_API' : 'UNKNOWN';
        console.log('NIA_FETCH_EXCEPTION=' + name + '_' + category);
        return null;
      }
    };
    const pageResponse = await get('pages/' + PAGE_ID);
    if (!pageResponse) return stop('BLOCKED_NOTION_NETWORK');
    if (pageResponse.status !== 200)
      return stop('BLOCKED_PAGE_HTTP_' + pageResponse.status);
    let page;
    try { page = await pageResponse.json(); } catch { return stop('BLOCKED_PAGE_JSON'); }
    const title = Array.isArray(page?.properties?.title?.title)
      ? page.properties.title.title.map(x => x?.plain_text || x?.text?.content || '').join('')
      : '';
    if (normalId(page?.id) !== normalId(PAGE_ID) || title !== EXPECTED_TITLE || page.archived === true || page.in_trash === true)
      return stop('BLOCKED_PAGE_IDENTITY');
    console.log('NIA_CLOUDFLARE_PAGE_READ=PASS');
    const blocksResponse = await get('blocks/' + PAGE_ID + '/children?page_size=1');
    if (!blocksResponse) return stop('BLOCKED_BLOCKS_NETWORK');
    if (blocksResponse.status !== 200) return stop('BLOCKED_BLOCKS_HTTP_' + blocksResponse.status);
    let blocks;
    try { blocks = await blocksResponse.json(); } catch { return stop('BLOCKED_BLOCKS_JSON'); }
    if (!Array.isArray(blocks?.results) || blocks.results.length < 1)
      return stop('BLOCKED_BLOCKS_NOT_READABLE');
    console.log('NIA_CLOUDFLARE_BLOCK_READ=PASS');
    return stop('PASS_DEDICATED_NOTION_TOKEN_READONLY');
}

export default {
  async fetch() {
    return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  },
  async scheduled(_controller, env) {
    if (env.NIA_ENABLED !== 'true') return stop('OFF');
    return readNiaOnce(env);
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const body = message.body;
      const now = Date.now();
      const permitted = batch.queue === 'cerebro-nia-one-shot-proof-lab' &&
        body?.type === 'NIA_READONLY_CHECK_V1' &&
        body?.page_id === PAGE_ID && body?.single_use === true &&
        Number.isSafeInteger(body?.issued_at_ms) &&
        Number.isSafeInteger(body?.expires_at_ms) &&
        now >= body.issued_at_ms && now <= body.expires_at_ms &&
        body.expires_at_ms - body.issued_at_ms > 0 &&
        body.expires_at_ms - body.issued_at_ms <= 120000;
      if (!permitted) {
        console.log('NIA_PRIVATE_QUEUE_GATE=BLOCKED_INVALID_REQUEST');
        message.ack();
        continue;
      }
      const result = await readNiaOnce(env);
      console.log('NIA_PRIVATE_QUEUE_GATE=' + result);
      message.ack();
    }
  }
};
