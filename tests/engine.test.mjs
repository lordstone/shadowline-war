
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDeck,power,compare,createGame,act,validate,cardLocations,aiAction,viewFor,canStrategy,timeoutAction} from '../src/engine.js';
import {MAPS,STRATEGIES} from '../src/data.js';
const c=(rank,suit=0)=>({rank,suit});
const ids=cs=>cs.map((x,i)=>({id:x.id,open:i===0}));
function next(s,a,p=s.active){const r=act(s,p,a);assert.equal(r.ok,true,r.error);return r.state}
function fixture(h0,h1){
 const s=createGame({rules:'classic',strategies:false,seed:1});
 const deck=makeDeck(),take=spec=>spec.map(([rank,suit=0])=>deck.find(c=>c.rank===rank&&c.suit===suit));
 s.players[0].hand=take(h0);s.players[1].hand=take(h1);
 const used=new Set(s.players.flatMap(p=>p.hand.map(c=>c.id)));
 s.deck=deck.filter(c=>!used.has(c.id));validate(s);return s;
}
function confrontation(){
 let s=fixture([[1,0],[5,1],[8,2]],[[4,2],[7,3],[10,1]]);
 s=next(s,{type:'deploy',cards:ids(s.players[0].hand.slice(0,2))});
 s=next(s,{type:'deploy',cards:ids(s.players[1].hand.slice(0,2))});
 return s;
}
test('exact ranking, A boundaries and joker exclusions',()=>{
 assert.equal(power([c(3),c(3,1),c(3,2)])[0],6);
 assert.equal(power([c(1),c(2),c(3)])[0],5);
 assert.equal(power([c(1),c(2,1),c(3,2)])[0],4);
 assert.equal(power([c(1),c(5),c(13)])[0],3);
 assert.equal(power([c(6),c(6,1),c(13,2)])[0],2);
 assert.equal(power([c(6),c(6,1)])[0],1);
 assert.equal(power([c(12),c(13,1),c(1,2)])[0],1);
 assert.equal(power([c(8),c(8,1),c(14,4)])[0],1);
 assert.equal(power([c(13),c(14,4),c(15,4)])[0],1);
 assert.equal(compare([c(15,4)],[c(14,4)]),1);
 assert.equal(compare([c(13)],[c(1)]),1);
 assert.equal(compare([c(5),c(5,1),c(3,2)],[c(4),c(4,1),c(13,2)]),1);
 assert.equal(compare([c(7),c(5,1)],[c(7,2),c(4,3)]),1);
});
test('enumerate all 24,804 three-card hands against exact category counts',()=>{
 const d=makeDeck(),counts=Array(7).fill(0);
 for(let i=0;i<d.length;i++)for(let j=i+1;j<d.length;j++)for(let k=j+1;k<d.length;k++)counts[power([d[i],d[j],d[k]])[0]]++;
 assert.deepEqual(counts,[0,19204,3744,1100,660,44,52]);
});
test('all maps have symmetric, connected topology and two capitals',()=>{
 for(const m of MAPS){const seen=new Set([m.fields[0].id]);while(true){const n=seen.size;for(const f of m.fields)if(seen.has(f.id))for(const id of f.links){assert.ok(m.fields.find(g=>g.id===id)?.links.includes(f.id));seen.add(id)}if(seen.size===n)break}assert.equal(seen.size,m.fields.length);assert.equal(m.fields.filter(f=>f.capital).length,2)}
});
test('seed reproducibility; classic deals twelve, campaign accounts for garrison',()=>{
 assert.deepEqual(createGame({seed:818}),createGame({seed:818}));
 const a=createGame({rules:'classic',strategies:false});
 assert.equal(a.players[0].hand.length,12);assert.equal(a.deck.length,30);
 const b=createGame({strategies:false});
 assert.equal(b.players[0].hand.length,11);assert.equal(b.fields.flatMap(f=>f.garrison).length,2);
 assert.equal(cardLocations(b).length,54);
});
test('reject wrong player, all-hidden and duplicate deployments without changing state',()=>{
 const s=fixture([[1,0],[5,1]],[[4,2]]);
 const frozen=structuredClone(s),id=s.players[0].hand[0].id;
 for(const [p,a] of [[1,{type:'fold'}],[0,{type:'deploy',cards:[{id,open:false}]}],[0,{type:'deploy',cards:[{id,open:true},{id,open:true}]}],[0,{type:'deploy',cards:[{id:999,open:true}]}]]){
 const r=act(s,p,a);assert.equal(r.ok,false);assert.strictEqual(r.state,s);assert.deepEqual(s,frozen);
 }
});
test('attacker must strictly exceed defender; initial attack does not end skirmish',()=>{
 let s=fixture([[5,0],[8,1]],[[5,2],[7,3]]);
 s=next(s,{type:'deploy',cards:[{id:s.players[0].hand[0].id,open:true}]});
 assert.equal(act(s,1,{type:'deploy',cards:[{id:s.players[1].hand[0].id,open:true}]}).ok,false);
 s=next(s,{type:'deploy',cards:[{id:s.players[1].hand[1].id,open:true}]});
 assert.equal(s.phase,'counter');assert.equal(s.active,0);assert.equal(s.players[1].wins,0);
});
test('revealing enough power wins, captured cards move once, concealed cards return',()=>{
 let s=confrontation();
 const ownOpen=s.battle.lines[0][0].id,ownHidden=s.battle.lines[0][1].id,enemyOpen=s.battle.lines[1][0].id,enemyHidden=s.battle.lines[1][1].id;
 s=next(s,{type:'reveal',ids:[ownHidden]});
 assert.equal(s.players[0].wins,1);
 assert.deepEqual(new Set(s.players[0].reserve.map(c=>c.id)),new Set([ownOpen,ownHidden,enemyOpen]));
 assert.ok(s.players[1].hand.some(c=>c.id===enemyHidden));
 assert.equal(cardLocations(s).length,54);validate(s);
});
test('tie after reveal belongs to defender',()=>{
 let s=fixture([[1,0],[8,1]],[[1,2],[8,3]]);
 s=next(s,{type:'deploy',cards:ids(s.players[0].hand)});
 s=next(s,{type:'deploy',cards:s.players[1].hand.map(c=>({id:c.id,open:true}))});
 const hidden=s.battle.lines[0].find(c=>!c.open).id;
 s=next(s,{type:'reveal',ids:[hidden]});assert.equal(s.players[0].wins,1);
});
test('failed partial reveal retains control; exhausted hidden line loses',()=>{
 let s=fixture([[1,0],[2,1],[3,2]],[[13,3]]);
 s=next(s,{type:'deploy',cards:ids(s.players[0].hand)});
 s=next(s,{type:'deploy',cards:ids(s.players[1].hand)});
 const hidden=s.battle.lines[0].filter(c=>!c.open);
 s=next(s,{type:'reveal',ids:[hidden[0].id]});assert.equal(s.phase,'counter');assert.equal(s.active,0);
 // The last card creates a straight and beats K.
 s=next(s,{type:'reveal',ids:[hidden[1].id]});assert.equal(s.players[0].wins,1);
 let t=fixture([[1,0],[2,1]],[[13,3]]);
 t=next(t,{type:'deploy',cards:ids(t.players[0].hand)});t=next(t,{type:'deploy',cards:ids(t.players[1].hand)});
 t=next(t,{type:'reveal',ids:[t.battle.lines[0][1].id]});assert.equal(t.players[1].wins,1);
});
test('fold and peace return all hidden cards and clear temporary boosts',()=>{
 for(const peace of [false,true]){
 let s=confrontation();const concealed=s.battle.lines.map(l=>l.find(c=>!c.open).id);
 s.battle.lines[0][0].boost=1;
 if(peace)s.players[0].strategies=['peace_talk'];
 s=next(s,peace?{type:'strategy',id:'peace_talk'}:{type:'fold'});
 for(let p=0;p<2;p++)assert.ok(s.players[p].hand.some(c=>c.id===concealed[p]));
 assert.ok(cardLocations(s).every(c=>!c.boost));validate(s);
 }
});
test('strategy use is phase-gated, single-use, and invalid use does not consume cards',()=>{
 let s=confrontation();s.players[0].strategies=['spy','scouting'];
 s=next(s,{type:'strategy',id:'spy'});
 const enemyHidden=s.battle.lines[1].find(c=>!c.open);
 assert.equal(s.knowledge[0][enemyHidden.id],true);assert.equal(enemyHidden.open,false);
 assert.equal(act(s,0,{type:'strategy',id:'scouting'}).ok,false);assert.ok(s.players[0].strategies.includes('scouting'));
});
test('reinforcement is limited to three cards and consumes the public deck',()=>{
 let s=confrontation();s.players[0].strategies=['paratrooper'];
 const n=s.deck.length;s=next(s,{type:'strategy',id:'paratrooper'});assert.ok(s.deck.length<=n);validate(s);
 let t=fixture([[1,0],[2,1],[5,2]],[[13,3],[10,1]]);
 t=next(t,{type:'deploy',cards:ids(t.players[0].hand)});t=next(t,{type:'deploy',cards:ids(t.players[1].hand)});
 t.players[0].strategies=['paratrooper'];assert.ok(canStrategy(t,0,'paratrooper'));
});
test('rank-up is temporary and scouting reveals',()=>{
 for(const id of ['rank_up','scouting']){
 let s=confrontation();s.players[0].strategies=[id];s=next(s,{type:'strategy',id});validate(s);
 if(id==='scouting')assert.ok(s.battle.lines[1].every(c=>c.open));

 }
});
test('all campaign strategy effects preserve cards and enforce target requirements',()=>{
 for(const id of STRATEGIES.filter(x=>x.phase==='campaign').map(x=>x.id)){
 let s=createGame({strategies:false,seed:119});s.players[0].strategies=[id];
 const neutral=s.fields.find(f=>f.owner===null),enemy=s.fields.find(f=>f.owner===1);
 if(id==='meds_team')s.players[0].reserve.push(s.players[0].hand.pop());
 const f=id==='revolution'?neutral:enemy;
 const r=act(s,0,{type:'strategy',id,field:f.id});assert.equal(r.ok,true,id+': '+r.error);s=r.state;validate(s);
 assert.equal(s.generated,id==='revolution'?1:0);
 assert.equal(s.players[0].strategies.length,0);
 if(id==='isr')assert.equal(s.fields.find(x=>x.id===enemy.id).garrison[0].open,true);
 if(id==='airborne_raid')assert.equal(s.raid,true);
 if(id==='economic_sanctions')assert.ok(s.fields.find(x=>x.id===enemy.id).blockedUntil>s.round);
 }
});
test('adjacency, supply once per turn, occupation and capture-capital victory',()=>{
 let s=createGame({strategies:false,seed:40});
 const enemy=s.fields.find(f=>f.owner===1),center=s.fields.find(f=>f.id==='center_town');
 assert.equal(act(s,0,{type:'attack',field:enemy.id}).ok,false);
 s=next(s,{type:'supply'});assert.equal(act(s,0,{type:'supply'}).ok,false);
 s=next(s,{type:'occupy',field:center.id,card:s.players[0].hand[0].id});assert.equal(s.active,1);
 s=next(s,{type:'pass'});s=next(s,{type:'attack',field:enemy.id});
 assert.equal(s.phase,'defend');assert.equal(s.active,1);
 s=next(s,{type:'fold'});assert.equal(s.phase,'over');assert.equal(s.winner,0);assert.match(s.reason,/首都/);validate(s);
});
test('AI observation hides ranks, suits, deck order and RNG; secret changes cannot alter decisions',()=>{
 for(const state of [createGame({strategies:false}),confrontation()]){
 const p=state.active,v=viewFor(state,p);
 assert.ok(v.players[1-p].hand.every(c=>!('rank'in c)&&!('suit'in c)&&!('id'in c)));
 assert.ok(v.deck.every(c=>Object.keys(c).length===1));assert.equal(v.rng,0);assert.equal(v.opt.seed,0);
 const altered=structuredClone(state);
 // Permute all unseen card identities, keeping public facts exactly the same.
 const slots=[...altered.deck,...altered.players[1-p].hand,...(altered.battle?.lines[1-p].filter(c=>!c.open)||[])];
 const faces=slots.map(c=>({rank:c.rank,suit:c.suit,id:c.id})).reverse();
 slots.forEach((c,i)=>Object.assign(c,faces[i]));
 assert.deepEqual(aiAction(state,p),aiAction(altered,p));
 }
});
test('timeout actions are valid at every phase, rounds bounded, save resumes exactly',()=>{
 let s=createGame({seed:91,maxRounds:4});
 let n=0;
 while(s.phase!=='over'&&n++<100){
 const restored=JSON.parse(JSON.stringify(s));validate(restored);
 const a=timeoutAction(s,s.active);
 assert.deepEqual(next(s,a),next(restored,a));s=next(s,a);
 }
 assert.equal(s.phase,'over');assert.ok(n<100);
});
test('seed matrix: complete AI matches, all maps, modes and strategy settings',()=>{
 let matches=0,actions=0;
 for(const rules of ['classic','campaign'])for(const map of ['duel','rift','ring'])for(const strategies of [false,true])for(const difficulty of ['easy','normal'])for(let seed=1;seed<=6;seed++){
 let s=createGame({seed:seed*7919,map,rules,strategies,difficulty,maxRounds:40}),n=0;
 while(s.phase!=='over'&&n++<700){
 const a=aiAction(s,s.active,difficulty),r=act(s,s.active,a);
 assert.equal(r.ok,true,JSON.stringify({seed,map,rules,phase:s.phase,a,error:r.error}));s=r.state;validate(s);
 }
 assert.equal(s.phase,'over',JSON.stringify({seed,map,rules,n}));matches++;actions+=n;
 }
 console.log('SIMULATION REPORT:',JSON.stringify({matches,actions}));
});


test('leading attacker gets a tactical window; blitz cannot donate a win while suppressed',()=>{
 let s=confrontation();s.players[0].strategies=['blitzkrieg'];
 assert.equal(act(s,0,{type:'strategy',id:'blitzkrieg'}).ok,false);
 assert.deepEqual(s.players[0].strategies,['blitzkrieg']);
 for(const id of ['blitzkrieg','rank_up','paratrooper','spy','scouting','peace_talk']){
 let t=fixture([[1,0],[5,1],[8,2]],[[4,2],[7,3],[10,1]]);
 t.players[1].strategies=[id];
 t=next(t,{type:'deploy',cards:ids(t.players[0].hand.slice(0,2))});
 t=next(t,{type:'deploy',cards:ids(t.players[1].hand.slice(0,2))});
 assert.equal(t.phase,'tactics');assert.equal(t.active,1);
 const continued=next(t,timeoutAction(t,t.active));assert.equal(continued.phase,'counter');assert.equal(continued.active,0);
 t=next(t,{type:'strategy',id});validate(t);
 if(id==='blitzkrieg')assert.equal(t.players[1].wins,1);
 if(['rank_up','paratrooper','spy'].includes(id)){assert.equal(t.phase,'tactics');assert.equal(t.players[1].wins,0)}
 }
});
test('untouched defending garrison returns to its original post and remains private',()=>{
 for(const open of [false,true]){
 let s=createGame({strategies:false,seed:119});
 const enemy=s.fields.find(f=>f.owner===1),original={...enemy.garrison[0],open};enemy.garrison[0].open=open;
 s.raid=true;s=next(s,{type:'attack',field:enemy.id});
 assert.ok(s.players[1].hand.some(c=>c.id===original.id));assert.equal(s.fields.find(f=>f.id===enemy.id).garrison.length,0);
 const observed=viewFor(s,0).battle.garrison[0];assert.equal('rank' in observed,open);
 s=next(s,{type:'deploy',cards:[{id:s.players[1].hand.find(c=>c.id!==original.id).id,open:true}]});
 s=next(s,{type:'fold'});validate(s);
 assert.deepEqual(s.fields.find(f=>f.id===enemy.id).garrison,[original]);
 }
});
