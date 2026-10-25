import fs from 'node:fs';

const path='src/App.tsx';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(from,to,label){
  const count=source.split(from).length-1;
  if(count!==1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  source=source.replace(from,to);
}

replaceOnce(
`};\n\nfunction resolveLogin(value:string){`,
`};\n\nconst BROWSER_SESSION_COOKIE='fenix-session-active';\nconst BROWSER_SESSION_MIGRATION_KEY='fenix-browser-session-cookie-v1';\n\nfunction hasBrowserSessionMarker(){\n  if(sessionStorage.getItem('fenix-session-active')==='1')return true;\n  return document.cookie.split(';').some(part=>part.trim()===BROWSER_SESSION_COOKIE+'=1');\n}\n\nfunction setBrowserSessionMarker(active:boolean){\n  if(active){\n    sessionStorage.setItem('fenix-session-active','1');\n    document.cookie=BROWSER_SESSION_COOKIE+'=1; Path=/; SameSite=Lax; Secure';\n    return;\n  }\n  sessionStorage.removeItem('fenix-session-active');\n  document.cookie=BROWSER_SESSION_COOKIE+'=; Path=/; Max-Age=0; SameSite=Lax; Secure';\n}\n\nfunction resolveLogin(value:string){`,
'insert browser session marker helpers');

replaceOnce(
`      const activeThisBrowser=sessionStorage.getItem('fenix-session-active')==='1';`,
`      const activeThisBrowser=hasBrowserSessionMarker();`,
'use shared browser marker');

replaceOnce(
`      if(data.session && !remembered && !activeThisBrowser){\n        await supabase.auth.signOut();\n        if(mounted){setSession(null);setAuthReady(true);}\n        return;\n      }`,
`      if(data.session && !remembered && !activeThisBrowser){\n        const migrationDone=localStorage.getItem(BROWSER_SESSION_MIGRATION_KEY)==='1';\n        if(!migrationDone){\n          const {data:{user},error}=await supabase.auth.getUser();\n          if(user && !error){\n            setBrowserSessionMarker(true);\n            localStorage.setItem(BROWSER_SESSION_MIGRATION_KEY,'1');\n            if(mounted){setSession(data.session);setAuthReady(true);}\n            return;\n          }\n        }\n        await supabase.auth.signOut({scope:'local'});\n        if(mounted){setSession(null);setAuthReady(true);}\n        return;\n      }`,
'migrate legacy session without global revocation');

replaceOnce(
`    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{\n      setSession(next);`,
`    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{\n      setSession(next);\n      if(event==='SIGNED_OUT')setBrowserSessionMarker(false);`,
'clear browser marker on signed out');

replaceOnce(
`    localStorage.setItem('fenix-remember-device',rememberDevice?'true':'false');\n    if(rememberDevice) sessionStorage.removeItem('fenix-session-active');\n    else sessionStorage.setItem('fenix-session-active','1');`,
`    localStorage.setItem('fenix-remember-device',rememberDevice?'true':'false');\n    localStorage.setItem(BROWSER_SESSION_MIGRATION_KEY,'1');\n    setBrowserSessionMarker(!rememberDevice);`,
'persist browser marker on login');

replaceOnce(
`    sessionStorage.setItem('fenix-session-active','1');`,
`    localStorage.setItem(BROWSER_SESSION_MIGRATION_KEY,'1');\n    setBrowserSessionMarker(true);`,
'persist browser marker after password recovery');

replaceOnce(
`    if(recoveryLinkVerified) await supabase.auth.signOut();`,
`    if(recoveryLinkVerified){\n      setBrowserSessionMarker(false);\n      await supabase.auth.signOut({scope:'local'});\n    }`,
'local signout leaving password recovery');

replaceOnce(
`    sessionStorage.removeItem('fenix-session-active');\n    setCtx(null);setNav(null);setWorkspaceReady(false);setPassword('');setShowPassword(false);\n    await supabase.auth.signOut();`,
`    setBrowserSessionMarker(false);\n    setCtx(null);setNav(null);setWorkspaceReady(false);setPassword('');setShowPassword(false);\n    await supabase.auth.signOut({scope:'local'});`,
'local explicit logout');

fs.writeFileSync(path,source);
console.log('Applied deterministic auth cross-tab session patch.');
