/**
 * JARVIS V2 · Voice-surface identity policy · LAB-only, zero I/O.
 * Does NOT synthesize, invoke a paid provider, store credentials, or enable PROD.
 * CEREBRO /cerebro is JARVIS even though it is hosted inside App Fénix.
 * Every other Fénix App screen keeps ANA. Unknown surfaces fail closed.
 */
export type CerebroVoiceView='JARVIS'|'OPERATIVA'|'NEURONAL'|'NAVEGADOR'|'V0';
export type VoiceOwner='JARVIS_V2'|'ANA'|'DENY';
export type VoiceSurfaceResult=Readonly<{
  owner:VoiceOwner;
  profileId:string|null;
  preset:string|null;
  rate:number|null;
  pitchSemitones:number|null;
  state:'LAB_PREPARED_PROVIDER_NOT_CONNECTED'|'LEGACY_ANA_PRESERVED'|'DENIED';
  canSynthesize:false;
  providerCalled:false;
  spentEuro:0;
  prodAuthorized:false;
}>;
const APPROVED_VIEW_IDS=new Set<string>(['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR','V0']);
const deny=():VoiceSurfaceResult=>Object.freeze({owner:'DENY',profileId:null,preset:null,rate:null,pitchSemitones:null,state:'DENIED',canSynthesize:false,providerCalled:false,spentEuro:0,prodAuthorized:false});
export function resolveCerebroVoiceSurface(input:{
  pathname:string;
  view?:CerebroVoiceView|string|null;
  host:'FENIX_APP'|'CEREBRO_CONSOLE'|string;
  companyId:string;
}):VoiceSurfaceResult {
  if(!input||typeof input!=='object'||typeof input.companyId!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(input.companyId))return deny();
  const path=typeof input.pathname==='string'?(input.pathname.replace(/\/+$/,'')||'/'):null;
  if(path==='/cerebro'){
    if(!APPROVED_VIEW_IDS.has(String(input.view??'JARVIS')))return deny();
    if(input.host!=='FENIX_APP'&&input.host!=='CEREBRO_CONSOLE')return deny();
    return Object.freeze({
      owner:'JARVIS_V2',profileId:'JARVIS_V2_CLARA_ES_ES',
      preset:'MAS_CLARA_1_10X',rate:1.10,pitchSemitones:0.6,
      state:'LAB_PREPARED_PROVIDER_NOT_CONNECTED',canSynthesize:false,
      providerCalled:false,spentEuro:0,prodAuthorized:false
    });
  }
  if(input.host==='FENIX_APP'&&path!==null&&path.startsWith('/')&&!path.startsWith('//')){
    return Object.freeze({owner:'ANA',profileId:'ANA_FENIX_FINANCE_ES_ES_V1',
      preset:null,rate:null,pitchSemitones:null,state:'LEGACY_ANA_PRESERVED',
      canSynthesize:false,providerCalled:false,spentEuro:0,prodAuthorized:false});
  }
  return deny();
}
