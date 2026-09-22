import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=path.join(root,'config/maps.yaml');
const balancePath=path.join(root,'config/game-balance.yaml');
const outputPath=path.join(root,'src/map-config.js');
const source=await fs.readFile(sourcePath,'utf8');
const balanceSource=await fs.readFile(balancePath,'utf8');
let config;
try{config=JSON.parse(source)}catch(error){throw new Error('maps.yaml must use YAML 1.2 JSON syntax: '+error.message)}
let balance;
try{balance=JSON.parse(balanceSource)}catch(error){throw new Error('game-balance.yaml must use YAML 1.2 JSON syntax: '+error.message)}

const fail=message=>{throw new Error('Invalid map configuration: '+message)};
const pairKey=pair=>pair.slice().sort().join('\0');
const strategies=new Map((balance.strategies||[]).map(card=>[card.id,card]));
const expectedStrategies={classic:[...strategies.values()].filter(card=>card.phase==='battle').map(card=>card.id).sort(),campaign:[...strategies.keys()].sort()};
const offerSize=Math.max(balance.campaign?.marketSize||0,balance.campaign?.draftSize||0);
if(config.schemaVersion!==1)fail('unsupported schema version');
if(!Array.isArray(config.maps)||config.maps.length===0)fail('maps must be a non-empty array');
const mapIds=new Set();
for(const map of config.maps){
 if(typeof map.id!=='string'||!map.id||mapIds.has(map.id))fail('map ids must be present and unique: '+map.id);
 mapIds.add(map.id);
 if(!map.strategyPools||typeof map.strategyPools!=='object')fail(map.id+' must define strategyPools');
 for(const rules of ['classic','campaign']){
  const pool=map.strategyPools[rules];
  if(!pool||typeof pool!=='object'||Array.isArray(pool))fail(map.id+'.strategyPools.'+rules+' must be an object');
  const ids=Object.keys(pool).sort();
  if(JSON.stringify(ids)!==JSON.stringify(expectedStrategies[rules]))fail(map.id+'.strategyPools.'+rules+' must list every compatible strategy exactly once');
  for(const [id,weight] of Object.entries(pool))if(!Number.isInteger(weight)||weight<0)fail(map.id+'.strategyPools.'+rules+'.'+id+' must be a non-negative integer');
  if(Object.values(pool).filter(weight=>weight>0).length<offerSize)fail(map.id+'.strategyPools.'+rules+' needs at least '+offerSize+' positive weights');
 }
 if(!Array.isArray(map.fields)||map.fields.length<2)fail(map.id+' must contain at least two fields');
 const fields=new Map();
 for(const field of map.fields){
  if(typeof field.id!=='string'||!field.id||fields.has(field.id))fail(map.id+' field ids must be present and unique: '+field.id);
  fields.set(field.id,field);
  if(typeof field.label!=='string'||!field.label)fail(map.id+'.'+field.id+' must have a label');
  if(typeof field.type!=='string'||!field.type)fail(map.id+'.'+field.id+' must have a type');
  for(const axis of ['x','y'])if(typeof field[axis]!=='number'||field[axis]<0||field[axis]>100)fail(map.id+'.'+field.id+'.'+axis+' must be between 0 and 100');
  if(!Array.isArray(field.links)||new Set(field.links).size!==field.links.length)fail(map.id+'.'+field.id+'.links must be a unique array');
  if(field.owner!==undefined&&field.owner!==0&&field.owner!==1)fail(map.id+'.'+field.id+'.owner must be 0 or 1');
  for(const flag of ['capital','fortified'])if(field[flag]!==undefined&&typeof field[flag]!=='boolean')fail(map.id+'.'+field.id+'.'+flag+' must be boolean');
 }
 if(map.fields.filter(field=>field.capital).length!==2)fail(map.id+' must have exactly two capitals');
 for(const field of map.fields)for(const linkedId of field.links){
  const linked=fields.get(linkedId);
  if(!linked)fail(map.id+'.'+field.id+' links to missing field '+linkedId);
  if(linkedId===field.id)fail(map.id+'.'+field.id+' cannot link to itself');
  if(!linked.links.includes(field.id))fail(map.id+' link must be bidirectional: '+field.id+' ↔ '+linkedId);
 }
 const reached=new Set([map.fields[0].id]);
 for(let changed=true;changed;){changed=false;for(const id of [...reached])for(const linkedId of fields.get(id).links)if(!reached.has(linkedId)){reached.add(linkedId);changed=true}}
 if(reached.size!==fields.size)fail(map.id+' topology must be connected');
 if(map.historical){
  const control=map.historical.control;
  if(!control||typeof control!=='object'||Object.keys(control).length!==fields.size)fail(map.id+'.historical.control must cover every field');
  for(const [id,owner] of Object.entries(control))if(!fields.has(id)||(owner!==0&&owner!==1))fail(map.id+'.historical.control contains an invalid field or owner: '+id);
 }
 if(map.historicalStrategies&&(!Array.isArray(map.historicalStrategies)||map.historicalStrategies.length!==2||map.historicalStrategies.some(side=>!Array.isArray(side)||side.some(id=>!strategies.has(id)))))fail(map.id+'.historicalStrategies must contain one valid strategy list per side');
 if(map.seaLinks){
  const seen=new Set();
  for(const pair of map.seaLinks){
   if(!Array.isArray(pair)||pair.length!==2||!fields.has(pair[0])||!fields.has(pair[1]))fail(map.id+'.seaLinks must contain valid field pairs');
   const key=pairKey(pair);if(seen.has(key))fail(map.id+'.seaLinks contains a duplicate pair');seen.add(key);
   if(!fields.get(pair[0]).links.includes(pair[1]))fail(map.id+' sea link must also appear in field links: '+pair.join(' ↔ '));
  }
 }
}

const output='// Generated from config/maps.yaml by tools/generate-map-config.mjs. Do not edit.\n'+
 'export const MAP_CONFIG='+JSON.stringify(config,null,2)+';\n';
if(process.argv.includes('--check')){
 const current=await fs.readFile(outputPath,'utf8').catch(()=>null);
 if(current!==output)throw new Error('src/map-config.js is stale; run npm run maps:generate');
 console.log('PASS: generated map configuration matches config/maps.yaml');
}else{
 await fs.writeFile(outputPath,output);
 console.log('Generated src/map-config.js from config/maps.yaml');
}
