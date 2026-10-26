import http from 'node:http';

const HOST='127.0.0.1';
const PORT=8787;
const VERIFY='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-browser-autologin-canary-preprod';
const PAGE='<!doctype html><html><head><meta charset="utf-8"><title>CEREBRO Local Autologin Canary</title></head><body><main><h1>CEREBRO PREPROD LOGIN CANARY</h1><form method="post" action="'+VERIFY+'"><label>Email <input name="email" type="email" autocomplete="username"></label><label>Password <input name="password" type="password" autocomplete="current-password"></label><button type="submit">Sign in</button></form></main></body></html>';

const server=http.createServer((req,res)=>{
  if(req.url==='/health'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({ok:true,service:'cerebro-autologin-local-canary',environment:'PREPROD',secrets:false,incremental_cost_eur:0}));
    return;
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
  res.end(PAGE);
});
server.listen(PORT,HOST,()=>console.log(JSON.stringify({ok:true,host:HOST,port:PORT,secrets:false})));
