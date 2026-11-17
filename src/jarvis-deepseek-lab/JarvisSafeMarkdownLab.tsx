/* LAB ONLY: sin dangerouslySetInnerHTML, sin DOM HTML inyectado.
 * Adaptación de patrones de DeepSeek chat-demo MIT (Copyright 2026 DeepSeek).
 */
import {useMemo,type ReactNode} from 'react';
import {useThrottledJarvisMarkdown} from './useThrottledJarvisMarkdown';
import {safeExternalChatHref} from './deepseekUiUtils';
import {parseInlineSafe,parseSafeMarkdown,type MarkdownBlock} from './markdownSafe';
import './jarvis-markdown-lab.css';

function inline(value:string):ReactNode[]{
 return parseInlineSafe(value).map((part,key)=>{
  if(part.type==='strong')return <b key={key}>{part.value}</b>;
  if(part.type==='em')return <em key={key}>{part.value}</em>;
  if(part.type==='code')return <code key={key}>{part.value}</code>;
  if(part.type==='link'){
   const href=safeExternalChatHref(part.href);
   return href?<a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">{part.value}</a>:<span key={key}>{part.value}</span>;
  }
  return <span key={key}>{part.value}</span>;
 });
}
function block(item:MarkdownBlock,key:number):ReactNode{
 if(item.kind==='heading'){
  const content=inline(item.content);
  if(item.level===1)return <h3 key={key}>{content}</h3>;
  if(item.level===2)return <h4 key={key}>{content}</h4>;
  return <h5 key={key}>{content}</h5>;
 }
 if(item.kind==='code')return <pre key={key}><code>{item.content}</code></pre>;
 if(item.kind==='quote')return <blockquote key={key}>{inline(item.content)}</blockquote>;
 if(item.kind==='list'){
  const children=item.items.map((value,i)=><li key={i}>{inline(value)}</li>);
  return item.ordered?<ol key={key}>{children}</ol>:<ul key={key}>{children}</ul>;
 }
 return <p key={key}>{inline(item.content)}</p>;
}
export default function JarvisSafeMarkdownLab({content,streaming=false}:{content:string;streaming?:boolean}){
 const visible=useThrottledJarvisMarkdown(content,streaming);
 const blocks=useMemo(()=>parseSafeMarkdown(visible),[visible]);
 return <div className="jarvis-safe-markdown-lab" data-jarvis-markdown-lab="true">{blocks.map(block)}</div>;
}
