/** Plug-in LAB connector for any future CEREBRO UI. An interface is a client, never an authority. */
import {createUniversalSdkV0} from './interface-sdk.mjs';
export const UNIVERSAL_INTERFACE_TYPES_V0=Object.freeze(['OPERATIVA','JARVIS','NEURONAL','NAVEGADOR','APP','MOBILE']);
export function createUniversalInterfaceAutoConnectV0({interface_id,request,getSessionToken,company_id='fenix',environment='LAB'}={}){
 if(!UNIVERSAL_INTERFACE_TYPES_V0.includes(interface_id))throw Error('INTERFACE_NOT_REGISTERED_IN_CONTRACT');
 if(typeof request!=='function'||typeof getSessionToken!=='function')throw Error('AUTHENTICATED_TRANSPORT_REQUIRED');
 if(environment!=='LAB'||company_id!=='fenix')throw Error('LAB_FENIX_ONLY');
 async function sdk(){
  const session_token=await getSessionToken();
  if(typeof session_token!=='string'||session_token.length<20||session_token.length>8192||/\s/.test(session_token))throw Error('AUTH_SESSION_REQUIRED');
  return createUniversalSdkV0({request,session_token,company_id,environment});
 }
 return Object.freeze({
  interface_id,environment,company_id,mode:'READ_ONLY_NO_EXECUTION',
  async connect(){
   const client=await sdk();
   const handshake=await client.listCapabilities();
   if(handshake?.status!=='OK'||handshake.source!=='REPOSITORY_SNAPSHOT_NOT_LIVE'||!Array.isArray(handshake.capabilities))throw Error('GATEWAY_CONTRACT_NOT_VERIFIED');
   return Object.freeze({connected:true,interface_id,source:'FACT001_REGISTRY_SNAPSHOT',capabilities:handshake.capabilities.filter(x=>x?.policy==='READ_ONLY'&&x?.side_effects==='NONE').map(x=>x.capability_id),prod_authorized:false});
  },
  async readWorkActivity(){return(await sdk()).listWorkActivity();},
  async readOwnerSources(){return(await sdk()).listOwnerSources();},
  async readDependencyStatus(){return(await sdk()).getDependencyStatus();},
  async assessOperation(operation){return(await sdk()).assessOperation(operation);},
  async readJob001Controls(){return(await sdk()).getJob001Controls();},
  async getEngineStatus(engine_id){return(await sdk()).getEngineStatus(engine_id);}
 });
}
