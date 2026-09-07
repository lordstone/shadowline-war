
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await fs.readFile(new URL('../暗线战争.html',import.meta.url),'utf8');
const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
assert.ok(match,'Import map is present');
const {imports}=JSON.parse(match[1]);
const modules=new Map();
for(const [id,uri] of Object.entries(imports)){
 assert.ok(uri.startsWith('data:text/javascript;base64,'));
 modules.set(id,new vm.SourceTextModule(Buffer.from(uri.split(',')[1],'base64').toString('utf8'),{identifier:id}));
}
await modules.get('shadow/app').link(id=>{
 assert.ok(modules.has(id),'Every dependency is bundled: '+id);return modules.get(id);
});
assert.equal(modules.size,6);
assert.ok(!/<link[^>]+href=/.test(html));
assert.ok(!/src="https?:/.test(html));
console.log('PASS: all six standalone modules parse and link; no external scripts or styles required.');
