export type NavItem={label:string;route:string;resource?:string};

export const MASTER_NAVIGATION_ORDER:NavItem[]=[
  {label:'Inicio',route:'/inicio'},
  {label:'Expedientes',route:'/expedientes'},
  {label:'Bancos',route:'/bancos'},
  {label:'Contactos',route:'/contactos'},
  {label:'Inmobiliarias',route:'/inmobiliarias'},
  {label:'Tasaciones',route:'/tasaciones'},
  {label:'Firmas',route:'/firmas'},
  {label:'Documentación',route:'/documentacion'},
  {label:'Financieros',route:'/financieros'},
  {label:'Visitadores',route:'/visitadores'},
  {label:'Obras Nuevas',route:'/obras-nuevas'},
  {label:'Herencias',route:'/herencias'},
  {label:'Agenda',route:'/agenda'},
  {label:'Economía',route:'/economia'},
  {label:'Informes',route:'/informes'},
  {label:'Notarías',route:'/notarias'},
  {label:'Registros de la Propiedad',route:'/registros-propiedad'},
  {label:'Comunicaciones',route:'/comunicaciones'},
  {label:'Notificaciones',route:'/notificaciones'}
];

const masterByRoute=new Map(MASTER_NAVIGATION_ORDER.map(item=>[item.route,item]));
const masterIndex=new Map(MASTER_NAVIGATION_ORDER.map((item,index)=>[item.route,index]));
const directionSidebarExcludedRoutes=new Set(['/buscar','/perfil']);

export function normalizeNavigation(data:unknown):NavItem[]{
  if(!data||typeof data!=='object')return[];
  const items=(data as{items?:unknown[]}).items;
  if(!Array.isArray(items))return[];
  return items.map(item=>{
    if(typeof item==='string')return{label:item.replace(/^\//,'')||'Inicio',route:item};
    if(item&&typeof item==='object'){
      const raw=item as Record<string,unknown>;
      if(typeof raw.route==='string')return{
        label:typeof raw.label==='string'&&raw.label.trim()?raw.label.trim():raw.route.replace(/^\//,''),
        route:raw.route.trim(),
        resource:typeof raw.resource==='string'?raw.resource:undefined
      };
    }
    return null;
  }).filter((item):item is NavItem=>Boolean(item&&item.route));
}

export function isDirectionNavigation(items:NavItem[]){
  const routes=new Set(items.map(item=>item.route));
  return routes.has('/financieros')&&routes.has('/economia')&&routes.has('/comunicaciones');
}

export function orderAuthorizedNavigation(items:NavItem[]):NavItem[]{
  if(!isDirectionNavigation(items))return items;
  return items
    .map(item=>{
      const canonical=masterByRoute.get(item.route);
      return canonical?{...item,label:canonical.label}:item;
    })
    .sort((a,b)=>{
      const ai=masterIndex.get(a.route);
      const bi=masterIndex.get(b.route);
      if(ai===undefined&&bi===undefined)return 0;
      if(ai===undefined)return 1;
      if(bi===undefined)return -1;
      return ai-bi;
    });
}

export function directionSidebarNavigation(items:NavItem[]):NavItem[]{
  return orderAuthorizedNavigation(items).filter(item=>!directionSidebarExcludedRoutes.has(item.route));
}
