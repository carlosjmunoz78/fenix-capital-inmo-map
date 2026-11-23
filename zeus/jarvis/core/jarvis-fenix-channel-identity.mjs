/** Fenix login -> ZEUS owner principal bridge. Channel authentication, NOT a global identity database. */
const OWNER_ACTOR = 'CARLOS-ADMIN';
function nonempty(x){return typeof x==='string'&&x.trim().length>0&&x.length<=200;}
export class FenixOwnerChannelIdentityProvider {
  constructor({authClient,contextClient,resolveCompanies}){
    if(!authClient?.auth?.getUser||!authClient?.auth?.getClaims||!contextClient?.rpc||typeof resolveCompanies!=='function')throw new TypeError('IDENTITY_ADAPTERS_REQUIRED');
    this.authClient=authClient;this.contextClient=contextClient;this.resolveCompanies=resolveCompanies;
  }
  async verify(accessToken){
    if(!nonempty(accessToken)||accessToken.length<10)throw new Error('AUTH_DENIED');
    const [{data:userData,error:userError},{data:claimData,error:claimError}]=await Promise.all([
      this.authClient.auth.getUser(accessToken),
      this.authClient.auth.getClaims(accessToken)
    ]);
    const user=userData?.user, claims=claimData?.claims;
    if(userError||claimError||!nonempty(user?.id)||!claims||claims.sub!==user.id||!nonempty(claims.session_id))throw new Error('AUTH_DENIED');
    const {data:ctx,error:contextError}=await this.contextClient.rpc('fenix_prod_actor_context_by_auth_server',{p_auth_user_id:user.id});
    if(contextError||ctx?.ok!==true||ctx?.actor_code!==OWNER_ACTOR)throw new Error('OWNER_ROOT_REQUIRED');
    const companies=await this.resolveCompanies({authUserId:user.id,actorCode:OWNER_ACTOR});
    if(!Array.isArray(companies)||!companies.length||companies.some(x=>!nonempty(x)||x==='*'))throw new Error('COMPANY_SCOPE_DENIED');
    return Object.freeze({subject:user.id,ownerId:`zeus-owner:${user.id}`,sessionId:claims.session_id,roles:['OWNER_ROOT'],authorizedCompanies:[...new Set(companies)]});
  }
}