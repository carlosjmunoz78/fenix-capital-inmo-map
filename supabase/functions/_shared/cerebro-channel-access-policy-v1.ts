export const CEREBRO_CHANNEL_ACCESS_POLICY_VERSION='1.0.0';

export const ACCESS_PROFILES=Object.freeze({
  FULL_OWNER:'FULL_OWNER',
  FENIX_OPERATIONAL:'FENIX_OPERATIONAL'
} as const);

export type AccessProfile=(typeof ACCESS_PROFILES)[keyof typeof ACCESS_PROFILES];
export type AccessChannel='CONSOLE_TEXT'|'APP_ANA_TEXT'|'TELEGRAM_TEXT'|'TELEGRAM_VOICE'|'APP_ANA_VOICE'|'CONSOLE_VOICE';
export type ScopeClass='FENIX_OPERATIONAL'|'MULTICOMPANY_CONTROL'|'OWNER_PRIVATE'|'SECRETS_CREDENTIALS'|'TRADING_ISOLATED'|'CROSS_COMPANY_PRIVATE';

const PROFILE_BY_CHANNEL:Readonly<Record<AccessChannel,AccessProfile>>=Object.freeze({
  CONSOLE_TEXT:'FULL_OWNER',
  CONSOLE_VOICE:'FULL_OWNER',
  TELEGRAM_TEXT:'FULL_OWNER',
  TELEGRAM_VOICE:'FULL_OWNER',
  APP_ANA_TEXT:'FENIX_OPERATIONAL',
  APP_ANA_VOICE:'FENIX_OPERATIONAL'
});

const OPERATIONAL_DENY=new Set<ScopeClass>([
  'MULTICOMPANY_CONTROL','OWNER_PRIVATE','SECRETS_CREDENTIALS','TRADING_ISOLATED','CROSS_COMPANY_PRIVATE'
]);

function norm(value:unknown){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
}

export function accessProfileForChannel(channel_id:AccessChannel):AccessProfile{
  const profile=PROFILE_BY_CHANNEL[channel_id];
  if(!profile) throw new Error('UNSUPPORTED_CHANNEL');
  return profile;
}

export function classifyRequestedScope(message:unknown):ScopeClass{
  const t=norm(message);
  if(/\b(trading|broker|exchange|orden de mercado|comprar acciones|vender acciones|crypto|criptomoneda|trading lab)\b/.test(t)) return 'TRADING_ISOLATED';
  if(/\b(password|contrasena|clave privada|api key|api-key|secret|secreto|access token|refresh token|token de acceso|credential|credencial|vault)\b/.test(t)) return 'SECRETS_CREDENTIALS';
  if(/\b(multiempresa|multi empresa|company registry|tenant|tenants|alta de empresa|nueva empresa|otra empresa|cambiar de empresa|activar empresa|onboarding de empresa)\b/.test(t)) return 'MULTICOMPANY_CONTROL';
  if(/\b(otra compania|otra compañía|otra sociedad|datos de otra empresa|cruzar empresas|cross company|cross-company|cross tenant|cross-tenant)\b/.test(t)) return 'CROSS_COMPANY_PRIVATE';
  if(/\b(owner only|owner-only|solo carlos|solo el propietario|admin global|administrador global|cuenta personal de carlos|datos privados de carlos|perfil privado de carlos)\b/.test(t)) return 'OWNER_PRIVATE';
  return 'FENIX_OPERATIONAL';
}

export function evaluateChannelAccess({channel_id,user_message,company_id='fenix'}:{channel_id:AccessChannel;user_message:unknown;company_id?:string}){
  const profile=accessProfileForChannel(channel_id);
  const requested_scope=classifyRequestedScope(user_message);
  const denied=profile==='FENIX_OPERATIONAL'&&OPERATIONAL_DENY.has(requested_scope);
  return Object.freeze({
    policy_version:CEREBRO_CHANNEL_ACCESS_POLICY_VERSION,
    channel_id,
    company_id,
    access_profile:profile,
    requested_scope,
    allowed:!denied,
    status:denied?'FORBIDDEN_SCOPE':'ALLOWED',
    reason:denied?'CHANNEL_PROFILE_SCOPE_DENIED':'CHANNEL_PROFILE_SCOPE_ALLOWED',
    authority_expanded:false,
    prod_write_authorized:false,
    trading_bridge_authorized:false,
    secrets_disclosure_authorized:false,
    cross_company_data_authorized:false,
    human_required:false
  });
}

export function deniedChannelResponse(decision:ReturnType<typeof evaluateChannelAccess>){
  if(decision.allowed) return null;
  return Object.freeze({
    status:'FORBIDDEN',
    message:'Esta superficie de Ana está limitada a la operación de Fénix. Ese ámbito requiere un canal FULL_OWNER autorizado.',
    executed:false,
    reason:decision.reason,
    access_profile:decision.access_profile,
    requested_scope:decision.requested_scope,
    human_required:false,
    prod_authority_changed:false,
    prod_write_authorized:false,
    trading_access:false
  });
}
