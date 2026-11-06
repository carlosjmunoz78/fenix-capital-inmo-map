/**
 * CUT46 · Owner-initiated greeting smoke test through the EXISTING signed Gateway.
 * This is NOT an E2E voice test and NEVER creates/executes an action.
 * The caller must invoke only on a real click with an owner session.
 */
export type JarvisGreetingProbeStatus =
 'PASS'|'AUTH_REQUIRED'|'GATEWAY_UNAVAILABLE'|'PERSONA_MISMATCH';
export type JarvisGreetingProbe={
 status:JarvisGreetingProbeStatus;
 reason:string;
 voice_verified:false;
 autonomous_execution_verified:false;
};
type ResponseShape={status?:string;intent?:string;message?:string;executed?:boolean;action?:unknown};
export type GreetingSend=(message:string)=>Promise<{status:number;data:ResponseShape|null}>;

const forbiddenFamiliarity=/(?:^|[^\p{L}])(?:guapo|guapa|guapete|cariño|colega|crack|bro|tronco|campeón|jajaja)(?:$|[^\p{L}])/iu;
const formalTreatment=/(?:^|[^\p{L}])señor(?:$|[^\p{L}])/iu;
const result=(status:JarvisGreetingProbeStatus,reason:string):JarvisGreetingProbe=>({
 status,reason,voice_verified:false,autonomous_execution_verified:false
});
export async function inspectJarvisGreeting(send:GreetingSend):Promise<JarvisGreetingProbe>{
 try{
  // The Gateway only reads and answers this 4-char greeting:
  // it does not qualify for observation of conversation memory (min 10 chars).
  const response=await send('hola');
  if(response.status===401||response.status===403)
   return result('AUTH_REQUIRED','La sesión del propietario no está autorizada o necesita renovarse.');
  if(response.status!==200||!response.data)
   return result('GATEWAY_UNAVAILABLE','El Gateway no devuelve una respuesta válida para el saludo de prueba.');
  const data=response.data;
  if(data.status!=='OK'||data.intent!=='greeting'||data.executed!==false||
     data.action!==undefined||typeof data.message!=='string'||
     !formalTreatment.test(data.message)||forbiddenFamiliarity.test(data.message))
   return result('PERSONA_MISMATCH','El Gateway contesta, pero la respuesta no cumple el protocolo JARVIS («señor», sin familiaridades).');
  return result('PASS','Saludo ejecutivo verificado mediante la sesión real. Falta certificar micrófono, altavoces y conversación completa.');
 }catch{
  return result('GATEWAY_UNAVAILABLE','Error de conexión al comprobar el saludo con la sesión actual.');
 }
}
