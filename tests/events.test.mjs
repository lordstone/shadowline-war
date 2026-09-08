
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act} from '../src/engine.js';
import {actionEvents} from '../src/events.js';
test('invasion identifies target, shows returning garrison without revealing opponent secrets',()=>{
 const s=createGame({strategies:false});s.raid=true;
 const field=s.fields.find(f=>f.owner===1),a={type:'attack',field:field.id},r=act(s,0,a);
 assert.equal(r.ok,true);const events=actionEvents(s,r.state,a,0);
 assert.equal(events[0].kind,'invasion');assert.equal(events[0].field,field.id);
 assert.ok(events[0].map.every(f=>!('garrison' in f)));
 assert.deepEqual(events[1].cards,[{hidden:true}]);
 const own=actionEvents(s,r.state,a,1);assert.equal(own[1].cards[0].id,field.garrison[0].id);
});
test('new cards have private faces and own-hand new markers; harvest lists locations',()=>{
 let s=createGame({strategies:false});s.players[0].strategies=['conscription'];
 let a={type:'strategy',id:'conscription'},r=act(s,0,a);
 const mine=actionEvents(s,r.state,a,0).find(e=>e.kind==='cards');
 assert.equal(mine.cards.length,1);assert.deepEqual(mine.newIds,[mine.cards[0].id]);
 const other=actionEvents(s,r.state,a,1).find(e=>e.kind==='cards');
 assert.deepEqual(other.cards,[{hidden:true}]);assert.deepEqual(other.newIds,[]);
 a={type:'pass'};r=act(s,0,a);
 assert.match(actionEvents(s,r.state,a,0).find(e=>e.kind==='resources').detail,/首都/);
});
test('strategy purchase produces a priced acquisition event',()=>{
 const s=createGame({strategies:false});s.opt.strategies=true;s.players[0].supply=10;s.strategyMarket=['conscription'];s.strategyDeck=['spy'];s.strategyDiscard=[];s.strategyLocked=[[],[]];s.marketBought=false;
 const a={type:'buy_strategy',id:'conscription'},r=act(s,0,a);assert.equal(r.ok,true);
 const event=actionEvents(s,r.state,a,0)[0];assert.equal(event.kind,'purchase');assert.equal(event.strategy.id,'conscription');assert.match(event.detail,/4 点补给/);
});
