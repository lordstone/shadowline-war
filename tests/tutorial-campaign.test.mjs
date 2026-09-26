import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {TUTORIAL_SCENARIO} from '../src/tutorial-config.js';
import {createTutorialGame,tutorialAct,tutorialAIAction,tutorialSteps,currentTutorialStep} from '../src/tutorial-campaign.js';
import {createGame,validate,cardLocations,upgradeState} from '../src/engine.js';

const actionFor=step=>({type:step.action,...(['attack','occupy'].includes(step.action)?{field:step.target}:{}),...(step.strategy?{id:step.strategy}:{}),...(step.cards?{[step.action==='reveal'?'ids':'cards']:step.cards}:{})});

test('tutorial scenario data matches the generated source',async()=>{
 const source=JSON.parse(await readFile(new URL('../config/tutorial-scenario.yaml',import.meta.url),'utf8'));
 assert.deepEqual(TUTORIAL_SCENARIO,source);
 assert.equal(tutorialSteps.length,14);
});

test('guided campaign follows real legal actions, conserves cards, and wins the capital',()=>{
 let state=createTutorialGame();
 assert.deepEqual(state,createTutorialGame());
 assert.equal(state.opt.rules,'campaign');assert.equal(state.opt.mode,'ai');
 assert.equal(state.baseDeckSize,54);assert.equal(cardLocations(state).length,54);
 const trace=[];
 for(let i=0;i<30&&state.phase!=='over';i++){
  const step=currentTutorialStep(state),actor=state.active,action=actor===1?tutorialAIAction(state):actionFor(step);
  assert.ok(action,'action at '+i);
  const illegal=tutorialAct(state,actor,{type:'resign'});assert.equal(illegal.ok,false);assert.deepEqual(illegal.state,state);
  const result=tutorialAct(state,actor,action);assert.equal(result.ok,true,JSON.stringify({i,step:step?.id,phase:state.phase,error:result.error}));
  trace.push({actor,action:action.type,step:step?.id,phase:result.state.phase});state=result.state;
  validate(state);assert.equal(cardLocations(state).length,54);
  const resumed=upgradeState(structuredClone(JSON.parse(JSON.stringify(state))));assert.deepEqual(resumed,state);
 }
 assert.equal(state.phase,'over');assert.equal(state.winner,0);assert.equal(state.reason.includes('首都'),true);
 assert.equal(state.tutorial.completed,true);
 assert.equal(state.fields.find(field=>field.id==='g').owner,0);
 assert.ok(trace.some(entry=>entry.actor===1&&entry.action==='attack'));
 assert.ok(trace.some(entry=>entry.action==='supply'));
 assert.ok(trace.some(entry=>entry.action==='occupy'));
 assert.ok(trace.some(entry=>entry.step==='rank_up'));
 assert.ok(trace.some(entry=>entry.step==='airborne_raid'));
});

test('ordinary campaign setup remains unaffected by guided scenario',()=>{
 const normal=createGame({map:'rift',rules:'campaign',strategies:false,seed:114});
 assert.equal(normal.opt.scenario,undefined);assert.equal(normal.tutorial,undefined);
 assert.equal(normal.fields.filter(field=>field.owner!==null).length,2);validate(normal);
});
