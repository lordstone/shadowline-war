import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=path.join(root,'config/game-balance.yaml');
const outputPath=path.join(root,'src/game-config.js');
const source=await fs.readFile(sourcePath,'utf8');
let config;
try{config=JSON.parse(source)}catch(error){throw new Error('game-balance.yaml must use YAML 1.2 JSON syntax: '+error.message)}

const positive=(value,label,allowZero=false)=>{if(!Number.isInteger(value)||(allowZero?value<0:value<1))throw new Error(label+' must be '+(allowZero?'a non-negative':'a positive')+' integer')};
if(config.schemaVersion!==1)throw new Error('Unsupported game balance schema version');
for(const [key,value] of Object.entries(config.defaults))if(['timer','eventSeconds','seed','first','maxRounds'].includes(key))positive(value,'defaults.'+key,true);
for(const section of ['deck','campaign','battle'])if(!config[section]||typeof config[section]!=='object')throw new Error('Missing '+section+' section');
for(const [key,value] of Object.entries(config.deck))positive(value,'deck.'+key);
for(const [key,value] of Object.entries(config.campaign))if(typeof value==='number')positive(value,'campaign.'+key);
const ids=new Set();
for(const card of config.strategies||[]){
 if(!card.id||ids.has(card.id))throw new Error('Strategy ids must be present and unique: '+card.id);
 ids.add(card.id);positive(card.price,'strategies.'+card.id+'.price');
 if(!['campaign','battle'].includes(card.phase))throw new Error('Invalid strategy phase: '+card.id);
 for(const [key,value] of Object.entries(card.effect||{}))positive(value,'strategies.'+card.id+'.effect.'+key);
}
if(ids.size<13)throw new Error('Expected the complete strategy card set');

const output='// Generated from config/game-balance.yaml by tools/generate-game-config.mjs. Do not edit.\n'+
 'export const GAME_CONFIG='+JSON.stringify(config,null,2)+';\n';
if(process.argv.includes('--check')){
 const current=await fs.readFile(outputPath,'utf8').catch(()=>null);
 if(current!==output)throw new Error('src/game-config.js is stale; run npm run config:generate');
 console.log('PASS: generated game configuration matches config/game-balance.yaml');
}else{
 await fs.writeFile(outputPath,output);
 console.log('Generated src/game-config.js from config/game-balance.yaml');
}
