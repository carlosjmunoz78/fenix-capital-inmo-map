/** ZEUS owner identity binding: channels authenticate; only ZEUS grants the global identity. LAB adapter. */
const valid = (value, max=200) => typeof value==='string' && value.length>0 && value.length<=max && value.trim()===value && !/[\u0000-\u001f\u007f]/.test(value);
const unique = values => [...new Set(values)];
export class ZeusGlobalIdentityProvider {
  constructor({channels,registry}) {
    if(!(channels instanceof Map) || !registry?.resolve) throw new TypeError('IDENTITY_BINDINGS_REQUIRED');
    this.channels=channels;this.registry=registry;
  }
  async verify(input) {
    // Channel identifier must come from the trusted server route, not from a user-controlled JWT claim.
    // The route may pass a structured token; no token is persisted or logged.
    if(!input || typeof input!=='object' || !valid(input.channel,80) || !valid(input.accessToken,8192)) throw new Error('AUTH_DENIED');
    const adapter=this.channels.get(input.channel);
    if(!adapter?.verify) throw new Error('AUTH_DENIED');
    const channelPrincipal=await adapter.verify(input.accessToken);
    if(!channelPrincipal || !valid(channelPrincipal.subject) || !valid(channelPrincipal.sessionId) ||
       !Array.isArray(channelPrincipal.authorizedCompanies) || !channelPrincipal.authorizedCompanies.length ||
       channelPrincipal.authorizedCompanies.some(c=>!valid(c,100)||c==='*')) throw new Error('AUTH_DENIED');
    const bound=await this.registry.resolve({channel:input.channel,subject:channelPrincipal.subject});
    if(!bound || bound.active!==true || bound.role!=='OWNER_ROOT' || !valid(bound.ownerId) ||
       !Array.isArray(bound.authorizedCompanies) || !bound.authorizedCompanies.length ||
       bound.authorizedCompanies.some(c=>!valid(c,100)||c==='*')) throw new Error('OWNER_ROOT_REQUIRED');
    const scoped=unique(bound.authorizedCompanies.filter(company => valid(company,100) && channelPrincipal.authorizedCompanies.includes(company)));
    if(!scoped.length) throw new Error('COMPANY_SCOPE_DENIED');
    return Object.freeze({ownerId:bound.ownerId,roles:['OWNER_ROOT'],sessionId:channelPrincipal.sessionId,authorizedCompanies:Object.freeze(scoped)});
  }
}