const CANONICAL_PROD_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/';
const RAW_URL=(import.meta.env.VITE_CEREBRO_CONSOLE_URL as string|undefined)?.trim()||CANONICAL_PROD_URL;

export function cerebroConsoleUrl():string|null{
  if(!RAW_URL)return null;
  try{
    const url=new URL(RAW_URL);
    if(url.protocol!=='https:')return null;
    if(!url.pathname.endsWith('/'))url.pathname=`${url.pathname}/`;
    return url.toString();
  }catch{return null;}
}


function usePreviewGateway():boolean{
 if(typeof window==='undefined')return false;
 return /^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/.test(window.location.hostname)
  &&new URLSearchParams(window.location.search).get('visual_lab')==='cockpit-v3';
}

export function cerebroConsoleEndpoint(path:string):string|null{
 if(usePreviewGateway()&&['health','preferences','chat'].includes(path))return '/api/cerebro-preview-gateway?resource='+encodeURIComponent(path);
  const base=cerebroConsoleUrl();
  if(!base)return null;
  const clean=path.replace(/^\/+/, '');
  try{return new URL(clean,base).toString();}catch{return null;}
}

export function cerebroConsoleLinkEnabled():boolean{
  return Boolean(cerebroConsoleUrl());
}

// The environment variable remains the explicit override. When it is absent,
// the authenticated owner-only PROD Console uses its canonical Supabase Gateway.
// No secret is embedded here; the browser still sends the authenticated user JWT.
