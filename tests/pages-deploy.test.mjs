import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import test from 'node:test';
import {assemblePages,readChannels,validateRef} from '../tools/assemble-pages.mjs';

const root=resolve(new URL('..',import.meta.url).pathname);

test('deployment channel configuration uses safe unique refs and minor slugs',()=>{
 const config=readChannels();assert.equal(config.release,'release');assert.equal(config.preview,'main');
 assert.deepEqual(config.versions.map(v=>v.slug),['1.16','1.17','1.18','1.19','1.20','1.21']);
 assert.throws(()=>validateRef('../main'),/unsafe|unsupported/);assert.throws(()=>validateRef('main\nother'),/unsupported/);
});

test('site assembly creates release, preview, version index and immutable metadata',()=>{
 const output=mkdtempSync(join(tmpdir(),'shadowline-pages-test-'));
 try{
  const deployment=assemblePages({releaseDir:root,previewDir:root,repoDir:root,outputDir:join(output,'site'),config:{release:'HEAD',preview:'HEAD',versions:[{slug:'1.21',ref:'HEAD'}]}});
  for(const path of ['index.html','preview/index.html','versions/index.html','versions/1.21/index.html','deployment.json','.nojekyll'])assert.doesNotThrow(()=>readFileSync(join(output,'site',path)));
  assert.equal(deployment.release.sha,deployment.preview.sha);assert.equal(deployment.versions[0].slug,'1.21');
  assert.match(readFileSync(join(output,'site/versions/index.html'),'utf8'),/v1\.21/);
 }finally{rmSync(output,{recursive:true,force:true})}
});

test('every configured historical version resolves and assembles as a playable site',()=>{
 const output=mkdtempSync(join(tmpdir(),'shadowline-pages-history-'));
 try{
  const config=readChannels();
  const deployment=assemblePages({releaseDir:root,previewDir:root,repoDir:root,outputDir:join(output,'site'),config});
  assert.deepEqual(deployment.versions.map(version=>version.slug),config.versions.map(version=>version.slug));
  for(const version of deployment.versions){
   assert.match(version.sha,/^[0-9a-f]{40}$/);
   assert.doesNotThrow(()=>readFileSync(join(output,'site','versions',version.slug,'index.html')));
  }
 }finally{rmSync(output,{recursive:true,force:true})}
});
