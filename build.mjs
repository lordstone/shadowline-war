
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const modules={
 'shadow/three-core':'vendor/three.core.min.js',
 'shadow/three':'vendor/three.module.min.js',
 'shadow/data':'src/data.js',
 'shadow/engine':'src/engine.js',
 'shadow/scene':'src/battlefield.js',
 'shadow/events':'src/events.js',
 'shadow/geography':'src/map-geography.js',
 'shadow/app':'src/app.js'
};
const replacements={
 './three.core.min.js':'shadow/three-core',
 '../vendor/three.module.min.js':'shadow/three',
 './data.js':'shadow/data',
 './engine.js':'shadow/engine',
 './events.js':'shadow/events',
 './battlefield.js':'shadow/scene',
 './map-geography.js':'shadow/geography'
};
const imports={};
for(const [name,file] of Object.entries(modules)){
 let source=await fs.readFile(path.join(root,file),'utf8');
 for(const [from,to] of Object.entries(replacements))source=source.replaceAll("'"+from+"'","'"+to+"'").replaceAll('"'+from+'"','"'+to+'"');
 imports[name]='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
const css=await fs.readFile(path.join(root,'src/style.css'),'utf8');
html=html.replace(/<link rel="stylesheet" href="\.\/src\/style\.css(?:\?v=[^"]+)?">/,'<style>'+css+'</style>');
html=html.replace(/<script type="module" src="\.\/src\/app\.js(?:\?v=[^"]+)?"><\/script>/,'<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module">import "shadow/app";</script>');
await fs.writeFile(path.join(root,'暗线战争.html'),html);
console.log('Built standalone offline HTML: '+Buffer.byteLength(html)+' bytes');
