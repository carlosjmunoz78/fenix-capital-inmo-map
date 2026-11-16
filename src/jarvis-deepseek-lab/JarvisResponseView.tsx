import type {JarvisAssistantViewModel} from './JarvisResponseContract';
import JarvisSafeMarkdownLab from './JarvisSafeMarkdownLab';
import JarvisMarkdownRenderBoundary from './JarvisMarkdownRenderBoundary';

/**
 * API React directa. Cuando Console exponga la respuesta como prop explícita,
 * se podrá usar esta vista sin observar ni modificar el DOM.
 * No hace llamadas HTTP, no interpreta HTML y no altera el Gateway.
 */
export default function JarvisResponseView({message}:{message:JarvisAssistantViewModel}){
 return <div data-jarvis-response-contract="v1" data-message-source={message.source}>
  <JarvisMarkdownRenderBoundary key={message.text} fallbackText={message.text}>
   <JarvisSafeMarkdownLab content={message.text}/>
  </JarvisMarkdownRenderBoundary>
 </div>;
}
