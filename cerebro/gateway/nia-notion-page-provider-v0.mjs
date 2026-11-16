/**
 * Fixed-target, read-only Notion API provider for NIA Skill discovery.
 * Host supplies its existing IAM/Vault token provider; never persist credentials.
 * NOT an AI session, autonomous task, worker, cron or external service.
 */
export const NIA_NOTION_PAGE_ID = '41a81b1a756d815ab877f0d264a6a0d4';
const NOTION_URL = 'https://api.notion.com/v1/pages/' + NIA_NOTION_PAGE_ID;
const NORMALIZED_ID = NIA_NOTION_PAGE_ID.replace(/-/g, '');

export function createNiaPageReadProviderV0({
  token_provider,
  fetch_impl = globalThis.fetch,
  timeout_ms = 12000
} = {}) {
  if (typeof token_provider !== 'function') throw new TypeError('token_provider must be a function');
  if (typeof fetch_impl !== 'function') throw new TypeError('fetch_impl must be a function');
  if (!Number.isSafeInteger(timeout_ms) || timeout_ms < 1000 || timeout_ms > 12000)
    throw new TypeError('timeout_ms out of bounds');

  return Object.freeze({
    async readSkillPage(id) {
      if (typeof id !== 'string' || id.replace(/-/g, '').toLowerCase() !== NORMALIZED_ID)
        throw new Error('NIA_PAGE_ID_OUT_OF_SCOPE');
      // The existing IAM/Vault owner is the only allowed credential source.
      const secret = await token_provider();
      if (typeof secret !== 'string' || secret.trim().length < 15)
        throw new Error('NIA_NOTION_TOKEN_UNAVAILABLE');
      let response;
      try {
        response = await fetch_impl(NOTION_URL, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + secret.trim(),
            'Notion-Version': '2022-06-28',
            Accept: 'application/json'
          },
          redirect: 'error',
          signal: AbortSignal.timeout(timeout_ms)
        });
      } catch {
        throw new Error('NIA_NOTION_NETWORK_UNAVAILABLE');
      }
      if (!response || response.status !== 200)
        throw new Error('NIA_NOTION_PAGE_ACCESS_DENIED');
      let page;
      try { page = await response.json(); } catch {
        throw new Error('NIA_NOTION_INVALID_RESPONSE');
      }
      // Minimal response to ACTGW: no page body, PII or tenant data.
      return {
        id: page?.id ?? null,
        archived: page?.archived === true,
        in_trash: page?.in_trash === true,
        properties: {
          title: {
            title: Array.isArray(page?.properties?.title?.title)
              ? page.properties.title.title.map(e => ({plain_text: e?.plain_text ?? e?.text?.content ?? ''}))
              : []
          }
        }
      };
    }
  });
}
