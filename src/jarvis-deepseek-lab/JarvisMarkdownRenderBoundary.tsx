/**
 * LAB opt-in: si la visualización Markdown falla, la respuesta autorizada
 * sigue disponible en texto sin formato, sin HTML ni pérdida de mensajes.
 * No intercepta errores del Gateway, permiso o voz. No registra el contenido.
 */
import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={fallbackText:string;children:ReactNode};
type State={failed:boolean};

export default class JarvisMarkdownRenderBoundary extends Component<Props,State>{
 state:State={failed:false};
 static getDerivedStateFromError():State{return {failed:true};}
 componentDidCatch(_error:Error,_info:ErrorInfo){
  // Intencionadamente sin logging para no filtrar respuestas a telemetría.
 }
 render(){
  if(this.state.failed)return <span data-jarvis-markdown-fallback="true" style={{whiteSpace:'pre-wrap'}}>{this.props.fallbackText}</span>;
  return this.props.children;
 }
}
