/**
 * JARVIS Message Presentation Contract V1.
 * Componente de SOLO presentación, sin identidad, permisos ni ejecución.
 * Compatible con la respuesta del Gateway actual; útil también en LAB
 * para adaptar texto ya presentado por Console sin abrir otra conexión.
 */
import type {CerebroConsoleChatResponse} from '../cerebroConsoleApi';

export type JarvisPresentationSource='gateway-response'|'legacy-console-lab';
export type JarvisAssistantViewModel=Readonly<{
  role:'cerebro';
  text:string;
  source:JarvisPresentationSource;
}>;

export function fromGatewayResponse(
 response:Pick<CerebroConsoleChatResponse,'message'>|null|undefined
):JarvisAssistantViewModel|null{
 if(typeof response?.message!=='string'||!response.message.trim())return null;
 return {role:'cerebro',text:response.message,source:'gateway-response'};
}

/** Puente transitorio: no acredita el transporte; solo lee la respuesta visible. */
export function fromLegacyConsoleText(text:unknown):JarvisAssistantViewModel|null{
 if(typeof text!=='string'||!text.trim())return null;
 return {role:'cerebro',text,source:'legacy-console-lab'};
}
