import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const MODULE_FILE=fileURLToPath(import.meta.url);
const PROJECT_ROOT=resolve(dirname(MODULE_FILE),'..');
const WEB_ENTRIES=['index.html','manifest.webmanifest','assets','src','vendor'];
const SLOT_ENTRIES=[...WEB_ENTRIES,'暗线战争.html'];
const SAFE_REF=/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SLUG=/^[0-9]+\.[0-9]+$/;

export function readChannels(path=join(PROJECT_ROOT,'deploy/channels.json')){
 const config=JSON.parse(readFileSync(path,'utf8'));
 validateRef(config.release,'release');validateRef(config.preview,'preview');
 assert.ok(Array.isArray(config.versions),'versions must be an array');
 const slugs=new Set();
 for(const version of config.versions){
  assert.match(version.slug,SAFE_SLUG,'invalid version slug');
  assert.ok(!slugs.has(version.slug),'duplicate version slug '+version.slug);slugs.add(version.slug);
  validateRef(version.ref,'version '+version.slug);
 }
 return config;
}

export function validateRef(ref,label='ref'){
 assert.equal(typeof ref,'string',label+' must be a string');
 assert.match(ref,SAFE_REF,label+' contains unsupported characters');
 assert.ok(!ref.includes('..')&&!ref.includes('@{')&&!ref.endsWith('/'),label+' is unsafe');
 return ref;
}

function safeEmptyDir(path){
 const target=resolve(path),root=resolve('/'),cwd=resolve(process.cwd());
 assert.notEqual(target,root,'refusing to clear filesystem root');
 assert.notEqual(target,cwd,'refusing to clear current directory');
 assert.ok(basename(target).length>1,'unsafe output directory');
 rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});
}

function copyEntries(source,destination,entries){
 mkdirSync(destination,{recursive:true});
 for(const entry of entries){const from=join(source,entry);if(existsSync(from))cpSync(from,join(destination,entry),{recursive:true})}
 assert.ok(existsSync(join(destination,'index.html')),'site source is missing index.html');
}

function git(repo,args,options={}){
 return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
}

function resolvedGitRef(repo,ref){
 const immutable=ref==='HEAD'||/^[0-9a-f]{7,40}$/i.test(ref)||ref.startsWith('refs/');
 for(const candidate of immutable?[ref,'origin/'+ref]:['origin/'+ref,ref]){try{git(repo,['rev-parse','--verify','--end-of-options',candidate+'^{commit}']);return candidate}catch{}}
 throw new Error('unknown deployment ref: '+ref);
}

function exportRef(repo,ref,destination){
 validateRef(ref);const resolved=resolvedGitRef(repo,ref);
 const rootEntries=new Set(git(repo,['ls-tree','--name-only',resolved]).split('\n'));
 const entries=WEB_ENTRIES.filter(entry=>rootEntries.has(entry));
 assert.ok(entries.includes('index.html'),ref+' is not a playable web revision');
 const temp=mkdtempSync(join(tmpdir(),'shadowline-pages-')),archive=join(temp,'site.tar');
 try{
  execFileSync('git',['-C',repo,'archive','--format=tar','--output',archive,resolved,'--',...entries],{stdio:'pipe'});
  mkdirSync(destination,{recursive:true});execFileSync('tar',['-xf',archive,'-C',destination],{stdio:'pipe'});
 }finally{rmSync(temp,{recursive:true,force:true})}
}

function refMetadata(repo,ref){
 const resolved=resolvedGitRef(repo,ref),sha=git(repo,['rev-parse',resolved+'^{commit}']);
 let version='';
 try{version=JSON.parse(git(repo,['show',resolved+':package.json'])).version||''}catch{}
 return {ref,sha,version};
}

const htmlEscape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function versionsIndex(entries){
 const cards=entries.map(item=>'<a class="version" href="./'+encodeURIComponent(item.slug)+'/"><strong>v'+htmlEscape(item.slug)+'</strong><span>'+htmlEscape(item.version||item.ref)+'</span><code>'+htmlEscape(item.sha.slice(0,7))+'</code></a>').join('');
 return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>暗线战争 · 历史版本</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#081117;color:#dce2dc}body{max-width:760px;margin:auto;padding:48px 22px}h1{letter-spacing:.08em}p{color:#8fa3ab}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:28px}.version{display:flex;flex-direction:column;gap:7px;padding:18px;border:1px solid #354650;border-radius:4px;background:#111c23;color:inherit;text-decoration:none}.version:hover{border-color:#d8bb82}.version strong{font-size:21px;color:#d8bb82}.version span{font-size:12px}.version code{font-size:10px;color:#72cdd4}</style></head><body><h1>暗线战争 · 历史版本</h1><p>每个 minor 版本是独立的可玩快照，存档按 URL 来源隔离。</p><div class="grid">'+cards+'</div></body></html>';
}

export function assemblePages({releaseDir,previewDir,repoDir=PROJECT_ROOT,outputDir,config=readChannels()}){
 safeEmptyDir(outputDir);copyEntries(releaseDir,outputDir,SLOT_ENTRIES);copyEntries(previewDir,join(outputDir,'preview'),SLOT_ENTRIES);
 const versions=[];
 for(const item of config.versions){
  const destination=join(outputDir,'versions',item.slug);exportRef(repoDir,item.ref,destination);
  versions.push({slug:item.slug,...refMetadata(repoDir,item.ref)});
 }
 mkdirSync(join(outputDir,'versions'),{recursive:true});
 writeFileSync(join(outputDir,'versions/index.html'),versionsIndex(versions));
 writeFileSync(join(outputDir,'.nojekyll'),'');
 const deployment={generatedAt:new Date().toISOString(),release:refMetadata(repoDir,config.release),preview:refMetadata(repoDir,config.preview),versions};
 writeFileSync(join(outputDir,'deployment.json'),JSON.stringify(deployment,null,2)+'\n');
 return deployment;
}

function arg(name){const index=process.argv.indexOf('--'+name);return index>=0?process.argv[index+1]:null}

if(process.argv[1]&&resolve(process.argv[1])===MODULE_FILE){
 const config=readChannels(arg('config')||join(PROJECT_ROOT,'deploy/channels.json'));
 if(arg('release-ref'))config.release=validateRef(arg('release-ref'),'release override');
 if(arg('preview-ref'))config.preview=validateRef(arg('preview-ref'),'preview override');
 const releaseDir=arg('release'),previewDir=arg('preview'),outputDir=arg('output'),repoDir=arg('repo')||PROJECT_ROOT;
 assert.ok(releaseDir&&previewDir&&outputDir,'usage: assemble-pages --release DIR --preview DIR --output DIR [--repo DIR]');
 const deployment=assemblePages({releaseDir,previewDir,repoDir,outputDir,config});
 process.stdout.write(JSON.stringify(deployment,null,2)+'\n');
}
