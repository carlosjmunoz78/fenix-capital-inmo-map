export type EvidenceOriginType='expediente'|'contacto'|'contacto_b2b'|'inmobiliaria'|'tarea'|'tasacion'|'firma'|'documento'|'comunicacion';
export type EvidenceOrigin={type:EvidenceOriginType;code:string;label:string;staging:boolean};

const detail=(path:string,base:string,type:EvidenceOriginType,label:string,newWords=['nuevo','nueva']):EvidenceOrigin|null=>{
 if(path===`${base}/nuevo`||path===`${base}/nueva`)return{type,code:'',label,staging:true};
 const m=path.match(new RegExp(`^${base.replace('/','\\/')}\\/([^/]+)$`));
 if(!m||newWords.includes(m[1].toLowerCase()))return null;
 return{type,code:decodeURIComponent(m[1]),label,staging:false};
};

export function evidenceContextFromPath(pathname:string,search=''):EvidenceOrigin|null{
 const path=pathname.replace(/\/+$/,'')||'/';
 const q=new URLSearchParams(search);
 const comprador=q.get('comprador')||'';const expediente=q.get('expediente')||'';
 if(comprador)return{type:'contacto',code:comprador,label:'esta persona y su expediente',staging:false};
 if(expediente)return{type:'expediente',code:expediente,label:'este expediente',staging:false};
 const defs:Array<[string,EvidenceOriginType,string]>=[
  ['/expedientes','expediente','este expediente'],
  ['/contactos-b2b','contacto_b2b','este contacto de inmobiliaria'],
  ['/contactos','contacto','este contacto'],
  ['/inmobiliarias','inmobiliaria','esta inmobiliaria'],
  ['/tareas','tarea','esta tarea'],
  ['/firmas','firma','esta firma']
 ];
 for(const[base,type,label]of defs){const x=detail(path,base,type,label);if(x)return x;}
 // Tasaciones es hoy una pantalla de listado; solo se activa cuando exista una ruta de ficha real.
 // Documento/Comunicación se habilitan por contexto explícito para no adivinar IDs desde vistas generales.
 const doc=q.get('documento')||'';if(doc)return{type:'documento',code:doc,label:'este documento',staging:false};
 const com=q.get('comunicacion')||'';if(com)return{type:'comunicacion',code:com,label:'esta comunicación',staging:false};
 return null;
}

export const INTELLIGENT_ORIGINS=new Set<EvidenceOriginType>(['expediente','contacto','contacto_b2b','inmobiliaria','tarea','firma','documento','comunicacion']);
