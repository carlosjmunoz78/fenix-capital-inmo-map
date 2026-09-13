const RAW_URL=(import.meta.env.VITE_CEREBRO_CONSOLE_URL as string|undefined)?.trim()||'';

export function cerebroConsoleUrl():string|null{
  if(!RAW_URL)return null;
  try{
    const url=new URL(RAW_URL);
    if(url.protocol!=='https:')return null;
    return url.toString();
  }catch{return null;}
}

export function cerebroConsoleLinkEnabled():boolean{
  return Boolean(cerebroConsoleUrl());
}

// Fail-closed by design: ProfileShell must not expose a dead or non-HTTPS
// CEREBRO link until a deployable Console URL is explicitly configured.
