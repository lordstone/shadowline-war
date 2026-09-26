import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(await fs.readFile(path.join(root,'config/tutorial-scenario.yaml'),'utf8'));
const maps=JSON.parse(await fs.readFile(path.join(root,'config/maps.yaml'),'utf8'));
const balance=JSON.parse(await fs.readFile(path.join(root,'config/game-balance.yaml'),'utf8'));
const fail=message=>{throw Error('Invalid tutorial scenario: '+message)};
if(source.schemaVersion!==1||source.id!=='tutorial_campaign')fail('schema or id');
const map=maps.maps.find(map=>map.id===source.map);if(!map)fail('map');
if(!Number.isInteger(source.seed)||source.seed<0)fail('seed');
if(JSON.stringify(Object.keys(source.garrisons).sort())!==JSON.stringify(map.fields.map(field=>field.id).sort()))fail('garrisons must cover every field');
const validCards=new Set([...Array(54).keys()]),seen=new Set();
const take=id=>{if(!validCards.has(id)||seen.has(id))fail('invalid or duplicate card '+id);seen.add(id)};
for(const id of [...source.playerHand,...source.aiHand,...source.deckTop])take(id);
if(source.playerHand.length!==balance.deck.initialHand-3)fail('player hand must have nine cards');
for(const field of map.fields){
 const spec=source.garrisons[field.id],limit=field.capital?balance.battle.garrisonLimits.capital:field.fortified?balance.battle.garrisonLimits.fortified:balance.battle.garrisonLimits[field.type]??balance.battle.garrisonLimits.default;
 if(![0,1,null].includes(spec.owner)||!Array.isArray(spec.cards)||spec.cards.length>limit||spec.owner===null&&spec.cards.length)fail('invalid garrison '+field.id);
 if(spec.blockedUntil!==undefined&&(!Number.isInteger(spec.blockedUntil)||spec.blockedUntil<0))fail('invalid blockade '+field.id);
 if(spec.owner!==null&&!field.capital&&!spec.cards.some(card=>card.open))fail('non-capital needs an open defender '+field.id);
 for(const card of spec.cards){if(typeof card.open!=='boolean')fail('card visibility '+field.id);take(card.id)}
}
const strategies=new Set(balance.strategies.map(card=>card.id));
if(source.playerStrategies.some(id=>!strategies.has(id)))fail('strategy id');
if(!Array.isArray(source.strategyMarkets)||source.strategyMarkets.length!==2||source.strategyMarkets.some((market,p)=>!Array.isArray(market)||market.length!==balance.campaign.marketSize||new Set(market).size!==market.length||market.some(id=>!strategies.has(id)||p===0&&source.playerStrategies.includes(id))))fail('fixed strategy markets');
if(!Array.isArray(source.steps)||new Set(source.steps.map(step=>step.id)).size!==source.steps.length)fail('steps');
const aiStages=new Set(source.aiActions.map(entry=>entry.at));if(aiStages.size!==source.aiActions.length||!aiStages.has('opening'))fail('AI stages');
for(const step of source.steps){if(step.target&&!source.garrisons[step.target])fail('step target '+step.id);if(step.strategy&&!strategies.has(step.strategy))fail('step strategy '+step.id);if(step.nextAi&&!aiStages.has(step.nextAi))fail('step transition '+step.id)}
for(const entry of source.aiActions){if(!entry.action?.type||entry.nextAi&&!aiStages.has(entry.nextAi)||entry.nextStep!==undefined&&(!Number.isInteger(entry.nextStep)||entry.nextStep<0||entry.nextStep>=source.steps.length))fail('AI transition '+entry.at)}
const output='// Generated from config/tutorial-scenario.yaml. Do not edit.\nexport const TUTORIAL_SCENARIO='+JSON.stringify(source,null,2)+';\n';
const destination=path.join(root,'src/tutorial-config.js');
if(process.argv.includes('--check')){if(await fs.readFile(destination,'utf8').catch(()=>null)!==output)fail('generated file stale; run npm run tutorial:generate');console.log('PASS: generated tutorial scenario matches source')}
else{await fs.writeFile(destination,output);console.log('Generated tutorial scenario')}
