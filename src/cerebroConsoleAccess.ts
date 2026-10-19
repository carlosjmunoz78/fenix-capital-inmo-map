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

export function cerebroConsoleEndpoint(path:string):string|null{
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
