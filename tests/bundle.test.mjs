
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),index=await fs.readFile(new URL('index.html',root),'utf8'),manifest=JSON.parse(await fs.readFile(new URL('manifest.webmanifest',root),'utf8'));
assert.match(index,/rel="icon"[^>]+shadowline-32\.png/);assert.match(index,/rel="apple-touch-icon"[^>]+shadowline-180\.png/);assert.match(index,/rel="manifest"[^>]+manifest\.webmanifest/);
assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
for(const size of [32,180,192,512]){const png=await fs.readFile(new URL('assets/icons/shadowline-'+size+'.png',root));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
const html=await fs.readFile(new URL('../暗线战争.html',import.meta.url),'utf8');
const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
assert.ok(match,'Import map is present');
const {imports}=JSON.parse(match[1]);
const appSource=Buffer.from(imports['shadow/app'].split(',')[1],'base64').toString('utf8');
assert.equal((appSource.match(/data:image\/png;base64,/g)||[]).length,9); // 8 tutorial + 1 brand icon
assert.ok(!appSource.includes('./assets/tutorial/'));
const modules=new Map();
for(const [id,uri] of Object.entries(imports)){
 assert.ok(uri.startsWith('data:text/javascript;base64,'));
 modules.set(id,new vm.SourceTextModule(Buffer.from(uri.split(',')[1],'base64').toString('utf8'),{identifier:id}));
}
await modules.get('shadow/app').link(id=>{
 assert.ok(modules.has(id),'Every dependency is bundled: '+id);return modules.get(id);
});
assert.deepEqual([...modules.keys()].sort(),[
 'shadow/app','shadow/data','shadow/engine','shadow/events','shadow/game-config','shadow/geography','shadow/i18n','shadow/i18n-en','shadow/i18n-zh','shadow/map-config','shadow/scene','shadow/three','shadow/three-core'
].sort());
assert.ok(!/<link[^>]+href="(?!data:)/.test(html));
assert.ok(!/src="https?:/.test(html));
console.log('PASS: web app icons and manifest have valid sizes; all '+modules.size+' standalone modules parse and link; images are embedded with no external scripts or styles required.');
