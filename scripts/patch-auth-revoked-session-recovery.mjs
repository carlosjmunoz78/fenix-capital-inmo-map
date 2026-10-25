import fs from 'node:fs';

const path='src/App.tsx';
let source=fs.readFileSync(path,'utf8');

const from=`    Promise.all([\n      fetchAppApi<SessionContextPayload>('/session/context'),\n      fetchAppApi<NavData>('/navigation')\n    ]).then(([c,n])=>{\n      setCtx(c.status===200?unwrapSessionContext(c.data):null);\n      setNav(n.status===200?n.data:null);\n    }).finally(()=>setWorkspaceReady(true));`;

const to=`    Promise.all([\n      fetchAppApi<SessionContextPayload>('/session/context'),\n      fetchAppApi<NavData>('/navigation')\n    ]).then(async ([c,n])=>{\n      if(c.status===401 || n.status===401){\n        const {data:{user},error}=await supabase.auth.getUser();\n        if(!user || error){\n          setBrowserSessionMarker(false);\n          await supabase.auth.signOut({scope:'local'});\n          setCtx(null);setNav(null);setSession(null);\n          return;\n        }\n      }\n      setCtx(c.status===200?unwrapSessionContext(c.data):null);\n      setNav(n.status===200?n.data:null);\n    }).finally(()=>setWorkspaceReady(true));`;

const count=source.split(from).length-1;
if(count!==1)throw new Error(`revoked-session recovery: expected exactly one workspace fetch block, got ${count}`);
source=source.replace(from,to);
fs.writeFileSync(path,source);
console.log('Applied revoked-session recovery patch.');
