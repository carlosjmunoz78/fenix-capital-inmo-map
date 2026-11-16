/* JARVIS LAB. Parser visible de subconjunto Markdown seguro; sin interpretar HTML.
 * Referencia de separación parser/render: DeepSeek chat-demo (MIT 2026).
 * No incluye GFM completo, KaTeX ni Mermaid. No requiere dependencias. */
export type InlineChunk =
 | {type:'text'|'strong'|'em'|'code';value:string}
 | {type:'link';value:string;href:string};
export type MarkdownBlock =
 | {kind:'paragraph'|'quote';content:string}
 | {kind:'heading';level:1|2|3;content:string}
 | {kind:'list';ordered:boolean;items:string[]}
 | {kind:'code';language:string;content:string};
const MAX_CHARS=120000;
const INLINE=/\[([^\]\n]{1,200})\]\(([^)\s]{1,2048})\)|\*\*([^*\n]{1,2000})\*\*|\x60([^\x60\n]{1,2000})\x60|\*([^*\n]{1,2000})\*|https?:\/\/[^\s<>()\[\]]+/g;

export function parseInlineSafe(value:string):InlineChunk[]{
 const chunks:InlineChunk[]=[];let cursor=0;
 for(const match of value.matchAll(INLINE)){
  const at=match.index??0;
  if(at>cursor)chunks.push({type:'text',value:value.slice(cursor,at)});
  const [raw,label,href,strong,code,em]=match;
  if(label!==undefined&&href!==undefined)chunks.push({type:'link',value:label,href});
  else if(strong!==undefined)chunks.push({type:'strong',value:strong});
  else if(code!==undefined)chunks.push({type:'code',value:code});
  else if(em!==undefined)chunks.push({type:'em',value:em});
  else{
   const cleaned=raw.replace(/[.,;:!?]+$/,'');
   if(cleaned)chunks.push({type:'link',value:cleaned,href:cleaned});
   if(cleaned!==raw)chunks.push({type:'text',value:raw.slice(cleaned.length)});
  }
  cursor=at+raw.length;
 }
 if(cursor<value.length)chunks.push({type:'text',value:value.slice(cursor)});
 return chunks.length?chunks:[{type:'text',value}];
}
const fence=(s:string)=>/^\x60{3}([a-zA-Z0-9+#._-]{0,24})\s*$/.exec(s.trim());
const heading=(s:string)=>/^(#{1,3})\s+(.+)$/.exec(s);
const bullet=(s:string)=>/^\s{0,3}[-*]\s+(.+)$/.exec(s);
const numbered=(s:string)=>/^\s{0,3}\d+[.)]\s+(.+)$/.exec(s);
const quote=(s:string)=>/^\s{0,3}>\s?(.*)$/.exec(s);
const special=(s:string)=>!s.trim()||Boolean(fence(s)||heading(s)||bullet(s)||numbered(s)||quote(s));
export function parseSafeMarkdown(source:string):MarkdownBlock[]{
 if(source.length>MAX_CHARS)return[{kind:'paragraph',content:source}];
 const lines=source.replace(/\r\n?/g,'\n').split('\n'),blocks:MarkdownBlock[]=[];let i=0;
 while(i<lines.length){
  const line=lines[i];if(!line.trim()){i++;continue;}
  const f=fence(line);
  if(f){
   const pieces:string[]=[];i++;
   while(i<lines.length&&!/^\x60{3}\s*$/.test(lines[i].trim()))pieces.push(lines[i++]);
   if(i<lines.length)i++;
   blocks.push({kind:'code',language:f[1]||'',content:pieces.join('\n')});continue;
  }
  const h=heading(line);
  if(h){blocks.push({kind:'heading',level:h[1].length as 1|2|3,content:h[2]});i++;continue;}
  const u=bullet(line),n=numbered(line);
  if(u||n){
   const items:string[]=[],ordered=Boolean(n);
   while(i<lines.length){const item=ordered?numbered(lines[i]):bullet(lines[i]);if(!item)break;items.push(item[1]);i++;}
   blocks.push({kind:'list',ordered,items});continue;
  }
  if(quote(line)){
   const items:string[]=[];
   while(i<lines.length){const q=quote(lines[i]);if(!q)break;items.push(q[1]);i++;}
   blocks.push({kind:'quote',content:items.join('\n')});continue;
  }
  const items=[line];i++;
  while(i<lines.length&&!special(lines[i]))items.push(lines[i++]);
  blocks.push({kind:'paragraph',content:items.join('\n')});
 }
 return blocks;
}
