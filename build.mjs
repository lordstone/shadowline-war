
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const modules={
 'shadow/three-core':'vendor/three.core.min.js',
 'shadow/three':'vendor/three.module.min.js',
 'shadow/game-config':'src/game-config.js',
 'shadow/data':'src/data.js',
 'shadow/engine':'src/engine.js',
 'shadow/scene':'src/battlefield.js',
 'shadow/events':'src/events.js',
 'shadow/geography':'src/map-geography.js',
 'shadow/i18n':'src/i18n/index.js',
 'shadow/i18n-zh':'src/i18n/zh.js',
 'shadow/i18n-en':'src/i18n/en.js',
 'shadow/app':'src/app.js'
};
const replacements={
 './three.core.min.js':'shadow/three-core',
 '../vendor/three.module.min.js':'shadow/three',
 './game-config.js':'shadow/game-config',
 '../game-config.js':'shadow/game-config',
 './data.js':'shadow/data',
 './engine.js':'shadow/engine',
 './events.js':'shadow/events',
 './battlefield.js':'shadow/scene',
 './map-geography.js':'shadow/geography',
 './i18n/index.js':'shadow/i18n',
 './i18n/zh.js':'shadow/i18n-zh',
 './i18n/en.js':'shadow/i18n-en',
 './zh.js':'shadow/i18n-zh',
 './en.js':'shadow/i18n-en'
};
const tutorialImages={};
for(const name of ['01-map.png','02-occupy.png','03-battle.png','04-supply.png','05-draw.png','05-market.png','06-strategy.png','07-victory.png'])tutorialImages[name]='data:image/png;base64,'+(await fs.readFile(path.join(root,'assets/tutorial',name))).toString('base64');
const imports={};
for(const [name,file] of Object.entries(modules)){
 let source=await fs.readFile(path.join(root,file),'utf8');
 for(const [from,to] of Object.entries(replacements))source=source.replaceAll("'"+from+"'","'"+to+"'").replaceAll('"'+from+'"','"'+to+'"');
 if(file==='src/app.js')for(const [image,data] of Object.entries(tutorialImages))source=source.replaceAll('./assets/tutorial/'+image,data);
 if(file==='src/app.js')source=source.replaceAll('./assets/icons/shadowline-32.png','data:image/png;base64,'+(await fs.readFile(path.join(root,'assets/icons','shadowline-32.png'))).toString('base64'));
 imports[name]='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
const css=await fs.readFile(path.join(root,'src/style.css'),'utf8');
for(const size of [32,180]){
 const icon='data:image/png;base64,'+(await fs.readFile(path.join(root,'assets/icons','shadowline-'+size+'.png'))).toString('base64');
 html=html.replace('./assets/icons/shadowline-'+size+'.png',icon);
}
html=html.replace(/<link rel="manifest"[^>]*>/,'');
html=html.replace(/<link rel="stylesheet" href="\.\/src\/style\.css(?:\?v=[^"]+)?">/,'<style>'+css+'</style>');
html=html.replace(/<script type="module" src="\.\/src\/app\.js(?:\?v=[^"]+)?"><\/script>/,'<script type="importmap">'+JSON.stringify({imports})+'</script><script type="module">import "shadow/app";</script>');
await fs.writeFile(path.join(root,'暗线战争.html'),html);
console.log('Built standalone offline HTML: '+Buffer.byteLength(html)+' bytes');
