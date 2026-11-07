/** CUT21 safe bootstrap. Not a deployable JARVIS gateway; all requests denied.
 * Even an accidental deployment has no public workers.dev or custom domain route.
 * No credential access or D1 query. Only cutover after B2/B3/Vault/B10 physical gates.
 */
export default {async fetch(){return new Response(JSON.stringify({status:'DENIED',reason:'JARVIS_LAB_NOT_AUTHORIZED'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}};
