import fs from 'node:fs';
import crypto from 'node:crypto';

const expected={
 'public/cerebro-visual/candidate-v1425.html':'50011d4e3323502a4fcc496b61b5b1a1c5f958ae',
 'public/cerebro-visual/runtime/base-v147.html':'50b321b3b2433175b11aa92cb9957882ed30ed6d',
 'public/cerebro-visual/runtime/reference-global-polish-v1.js':'09d77d52a428859ca7605a896335cf6d0ffca1a5',
 'public/cerebro-visual/runtime/reference-global-polish-v2.js':'f85c583f1579efe5749e662b7296c7362bb6adb2',
 'public/cerebro-visual/runtime/reference-global-polish-v3.js':'c25cfbb1069e34136f939932e3b216e9cc3f68e8',
 'public/cerebro-visual/runtime/reference-polish-v8.js':'c4862c454df1dbb20b366e39d3e864dbd24a77f9',
 'public/cerebro-visual/runtime/reference-polish-v11.js':'10caeb6874046994bc53a9ce96ccbc456551766b',
 'public/cerebro-visual/runtime/reference-polish-v13.js':'5d72347edccce58d3d9da0134af0436469e5ded3',
 'public/cerebro-visual/runtime/reference-polish-v14.js':'622a2f75764475cb8a96127c581c3bdd0e9116b9',
 'public/cerebro-visual/runtime/reference-polish-v15.js':'d49bd537239319ced07665fdfd38d4f9e312bb9d',
 'public/cerebro-visual/runtime/reference-polish-v16.js':'ac64d97a50899dcc778b1d642ab79be86ad7a818',
 'public/cerebro-visual/runtime/reference-polish-v17.js':'4ee18823f1430f16dd106024a0d5cf5040ee78ca',
 'public/cerebro-visual/runtime/reference-polish-v18.js':'fffee21d12bd7f07256a8203b2ea2261fac50045'
};

function gitBlobSha(path){
 const data=fs.readFileSync(path);
 return crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
}
function must(text,needle,label){if(!text.includes(needle))throw new Error(`Missing ${label}: ${needle}`)}

for(const[path,sha]of Object.entries(expected)){
 if(!fs.existsSync(path))throw new Error(`Recovered Neural asset missing: ${path}`);
 const actual=gitBlobSha(path);
 if(actual!==sha)throw new Error(`Recovered Neural asset drift: ${path} expected ${sha} got ${actual}`);
}

const candidate=fs.readFileSync('public/cerebro-visual/candidate-v1425.html','utf8');
const host=fs.readFileSync('src/CerebroConsoleHost.tsx','utf8');
const neural=fs.readFileSync('src/CerebroNeuralView.tsx','utf8');
const css=fs.readFileSync('src/cerebro-console-host.css','utf8');

must(candidate,"runtimeRoot='/cerebro-visual/runtime/'",'local vendored runtime root');
must(candidate,"version:\\'v1.4.25\\'",'canonical recovered version');
must(candidate,"environment:\\'LAB_PREPROD\\'",'original environment');
must(candidate,'prod_authorized:false','original no-authority contract');
must(candidate,"base:\\'v1.4.7\\'",'original visual base');
must(candidate,"rollback:\\'v1.4.7\\'",'original visual rollback');
must(candidate,"runtime:\\'LOCAL_VENDORED\\'",'no remote fallback runtime');
must(host,"type CerebroView='V0'|'OPERATIVA'|'NEURAL';",'shared three-view selector');
must(host,"view==='NEURAL'?<CerebroNeuralView/>",'Neural mount');
must(host,'<CerebroConsoleShell/>','single shared authenticated core');
must(neural,'/cerebro-visual/candidate-v1425.html','exact recovered visual candidate');
must(css,'.cerebro-host-v0.is-neural-overlay','same V0 conversation and voice core over Neural');

console.log(`CEREBRO NEURAL V1.4.25 recovery: OK · ${Object.keys(expected).length} exact Git blobs`);
