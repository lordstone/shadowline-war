import {TUTORIAL_SCENARIO as scenario} from './tutorial-config.js';
import {act,createGame,makeDeck,validate} from './engine.js';

export const TUTORIAL_ID=scenario.id;
export const tutorialSteps=scenario.steps;
const sameCards=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&expected.every(card=>typeof card==='number'?actual.includes(card):actual.some(got=>got.id===card.id&&got.open===card.open));
const matches=(action,script)=>action.type===script.action&&(!script.target||!['attack','occupy'].includes(action.type)||action.field===script.target)&&(!script.strategy||action.id===script.strategy)&&(!script.cards||sameCards(action.ids??action.cards,script.cards));
export function currentTutorialStep(state){return state.tutorial?scenario.steps[state.tutorial.step]||null:null}
export function tutorialHint(state){return state.tutorial?.ai?null:currentTutorialStep(state)}
export function tutorialAIAction(state){
 if(state.active!==1||!state.tutorial?.ai)return null;
 const entry=scenario.aiActions.find(entry=>entry.at===state.tutorial.ai);
 if(!entry)throw Error('Unknown tutorial AI stage: '+state.tutorial.ai);
 return structuredClone(entry.action);
}

export function createTutorialGame(){
 const s=createGame({map:scenario.map,rules:'campaign',mode:'ai',strategies:false,first:1,seed:scenario.seed,timer:0,eventSeconds:1,deployment:'standard'});
 const cards=new Map(makeDeck().map(card=>[card.id,card]));
 const assigned=new Set(),pick=id=>{if(assigned.has(id)||!cards.has(id))throw Error('Invalid tutorial card '+id);assigned.add(id);return {...cards.get(id)}};
 s.players[0].hand=scenario.playerHand.map(pick);s.players[1].hand=scenario.aiHand.map(pick);
 for(const field of s.fields){const spec=scenario.garrisons[field.id];field.owner=spec.owner;field.blockedUntil=spec.blockedUntil||0;field.garrison=spec.cards.map(card=>({...pick(card.id),open:card.open}));}
 const top=scenario.deckTop.map(pick);
 s.deck=[...cards.values()].filter(card=>!assigned.has(card.id)).map(card=>({...card})).concat(top.reverse());
 s.players[0].strategies=[...scenario.playerStrategies];s.players[1].strategies=[];
 s.players[0].supply=4;s.players[1].supply=2;
 s.active=1;s.phase='campaign';s.opt.strategies=true;s.opt.scenario=scenario.id;s.tutorial={step:0,ai:'opening'};
 s.strategyMarkets=structuredClone(scenario.strategyMarkets);s.strategyLocked=[[],[]];s.supplyLedger=[null,null];s.log=[];
 validate(s);return s;
}

export function tutorialAct(state,player,action){
 if(state.opt.scenario!==scenario.id)return act(state,player,action);
 const ai=state.tutorial?.ai,expected=ai?scenario.aiActions.find(entry=>entry.at===ai)?.action:currentTutorialStep(state);
 if(!expected||player!==(ai?1:0)||!(ai?matches(action,{action:expected.type,target:expected.field,strategy:expected.type==='strategy'?expected.id:null,cards:expected.ids??expected.cards}):matches(action,expected)))return {ok:false,error:'tutorial.action_only',state};
 const result=act(state,player,action);if(!result.ok)return result;
 const next=result.state;
 if(ai){
  const transition=scenario.aiActions.find(entry=>entry.at===ai);
  next.tutorial.ai=transition.nextAi||null;
  if(transition.nextStep!==undefined)next.tutorial.step=transition.nextStep;
 }else{
  if(next.phase==='over')next.tutorial.completed=true;
  else if(expected.nextAi)next.tutorial.ai=expected.nextAi;
  else next.tutorial.step++;
 }
 validate(next);return {ok:true,state:next};
}
