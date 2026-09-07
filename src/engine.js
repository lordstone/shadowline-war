
import {MAPS,STRATEGIES,SUITS,defaults,strategyById} from './data.js';
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296}
export function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
export function makeDeck(){const d=[];for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)d.push({id:suit*13+rank-1,rank,suit});d.push({id:52,rank:14,suit:4},{id:53,rank:15,suit:4});return d}
export function face(c){return c.rank===15?'大王':c.rank===14?'小王':({1:'A',11:'J',12:'Q',13:'K'}[c.rank]||String(c.rank))}
export function power(cards){
 if(!cards.length)return [0,0,0,0];
 const r=cards.map(c=>Math.min(c.rank+(c.boost||0),c.rank>13?15:13)).sort((a,b)=>b-a);
 const ordinary=r.every(x=>x<=13), three=r.length===3;
 const flush=three&&ordinary&&cards.every(c=>c.suit===cards[0].suit);
 const straight=three&&ordinary&&r[0]-1===r[1]&&r[1]-1===r[2];
 if(three&&ordinary&&r[0]===r[2])return [6,r[0],0,0];
 if(flush&&straight)return [5,r[0],0,0];
 if(straight)return [4,r[0],0,0];
 if(flush)return [3,...r];
 if(three&&ordinary&&(r[0]===r[1]||r[1]===r[2]))return [2,r[1],r[0]===r[1]?r[2]:r[0],0];
 return [1,r[0]||0,r[1]||0,r[2]||0];
}
export function compare(a,b){const x=power(a),y=power(b);for(let i=0;i<4;i++){if(x[i]!==y[i])return Math.sign(x[i]-y[i])}return 0}
export function handName(cards){return ['未出牌','高牌','对子','同花','顺子','同花顺','三条'][power(cards)[0]]}
export function opened(s,p){return s.battle?.lines[p].filter(c=>c.open)||[]}
export function leading(s){if(!s.battle)return null;return compare(opened(s,s.battle.attacker),opened(s,s.battle.defender))>0?s.battle.attacker:s.battle.defender}
export function cardLocations(s){return [...s.deck,...s.players.flatMap(p=>[...p.hand,...p.reserve]),...s.fields.flatMap(f=>f.garrison),...(s.battle?s.battle.lines.flat():[])]}
export function validate(s){
 const all=cardLocations(s),ids=all.map(c=>c.id);
 if(new Set(ids).size!==ids.length)throw Error('重复牌');
 if(all.length!==54+s.generated)throw Error('牌数不守恒 '+all.length);
 if(s.players.some(p=>p.hand.some(c=>c.boost)))throw Error('临时晋升未清除');
 if(s.battle?.lines.some(l=>l.length>3))throw Error('战线超过三张');
 if(!['draft','campaign','defend','attack','counter','over'].includes(s.phase))throw Error('未知阶段');
 return true;
}
export function createGame(options={}){
 const opt={...defaults,...options};opt.seed=Number(opt.seed)>>>0;
 const s={version:1,opt,rng:opt.seed,phase:'draft',active:opt.first===1?1:0,round:1,skirmish:0,generated:0,
 players:[{name:'苍岚军团',hand:[],reserve:[],strategies:[],supply:2,wins:0},{name:opt.mode==='ai'?'赤烬 · 战术 AI':'赤烬军团',hand:[],reserve:[],strategies:[],supply:2,wins:0}],
 deck:[],fields:structuredClone(MAPS.find(m=>m.id===opt.map)?.fields||MAPS[0].fields),
 battle:null,log:[],winner:null,reason:'',draft:[[],[]],drafted:[false,false],turn:1,strategyUsed:false,supplyUsed:false,raid:false,knowledge:[{},{}]};
 s.deck=shuffle(s,makeDeck());for(let i=0;i<12;i++)for(let p=0;p<2;p++)s.players[p].hand.push(s.deck.pop());
 if(opt.rules==='campaign'){for(const f of s.fields.filter(f=>f.capital))f.garrison.push({...s.players[f.owner].hand.pop(),open:false});}
 else s.fields=[];
 const available=STRATEGIES.filter(c=>opt.rules==='campaign'||c.phase==='battle');
 for(let p=0;p<2;p++)s.draft[p]=shuffle(s,[...available]).slice(0,3).map(c=>c.id);
 s.active=0;
 if(!opt.strategies){s.drafted=[true,true];begin(s)}
 log(s,'行动准备完毕。明牌决定火力，暗牌保留变数。');validate(s);return s;
}
function log(s,msg){s.log.unshift({round:s.round,text:msg});s.log=s.log.slice(0,70)}
function clean(c){const {open,boost,...rest}=c;return rest}
function replenish(s){
 let need=true;while(s.deck.length&&need){need=false;for(const p of [s.active,1-s.active])if(s.players[p].hand.length<12&&s.deck.length){s.players[p].hand.push(clean(s.deck.pop()));need=true}}
}
function exhausted(s){
 if(s.deck.length)return false;
 const e=s.players.map(p=>p.hand.length===0);
 if(e[0]||e[1]){finish(s,e[0]&&e[1]?null:e[0]?1:0,'公共牌库耗尽，暗牌手牌耗尽');return true}return false;
}
function score(s,p){return s.players[p].reserve.length+s.fields.filter(f=>f.owner===p).length*3}
function finish(s,winner,reason){s.phase='over';s.winner=winner;s.reason=reason;s.battle=null;log(s,winner===null?'战局结束：双方平局。':s.players[winner].name+'赢得大局。')}
function begin(s){s.active=s.opt.first===1?1:0;if(s.opt.rules==='classic')startBattle(s,1-s.active,s.active,null);else{s.phase='campaign';income(s)}}
function income(s){s.players[s.active].supply=Math.min(30,s.players[s.active].supply+s.fields.filter(f=>f.owner===s.active&&f.blockedUntil<s.round).reduce((n,f)=>n+(f.type==='oil'?2:1),0))}
function nextCampaign(s){
 s.active=1-s.active;s.turn++;s.round=Math.floor((s.turn-1)/2)+1;s.phase='campaign';s.strategyUsed=false;s.supplyUsed=false;s.raid=false;
 if(exhausted(s))return;
 if(s.round>s.opt.maxRounds){const a=score(s,0),b=score(s,1);finish(s,a===b?null:a>b?0:1,'达到回合上限：比较公开牌数 + 每块领地 3 分');return}
 income(s);
}
function startBattle(s,attacker,defender,field){
 if(field){const f=s.fields.find(x=>x.id===field);s.players[defender].hand.push(...f.garrison.map(clean));f.garrison=[]}
 s.skirmish++;s.battle={attacker,defender,field,lines:[[],[]],strategyUsed:[false,false]};s.phase='defend';s.active=defender;s.strategyUsed=false;log(s,'第 '+s.skirmish+' 次交锋：'+s.players[defender].name+'先部署防线。');
}
function settle(s,winner){
 const b=s.battle;
 for(let p=0;p<2;p++){
 const open=b.lines[p].filter(c=>c.open).map(clean),hidden=b.lines[p].filter(c=>!c.open).map(clean);
 s.players[p].hand.push(...hidden);s.players[winner===null?p:winner].reserve.push(...open);
 }
 if(winner!==null){s.players[winner].wins++;log(s,s.players[winner].name+'赢得交锋，收取双方明牌。')}
 else log(s,'双方停火，各自回收战线。');
 s.battle=null;s.active=b.attacker;
 if(b.field){
 const f=s.fields.find(x=>x.id===b.field);
 if(winner===b.attacker){f.owner=winner;log(s,s.players[winner].name+'夺取'+f.label+'。')}
 // The occupation marker is a recovered real card, never duplicated.
 const owner=f.owner;
 if(s.players[owner].reserve.length)f.garrison.push({...s.players[owner].reserve.pop(),open:true});
 else if(s.players[owner].hand.length)f.garrison.push({...s.players[owner].hand.pop(),open:false});
 if(winner===b.attacker&&f.capital){finish(s,winner,'夺取敌方首都');return}
 }
 replenish(s);
 if(exhausted(s))return;
 if(s.opt.rules==='campaign')nextCampaign(s);
 else{
 s.round++;s.turn++;if(s.round>s.opt.maxRounds){const a=score(s,0),b=score(s,1);finish(s,a===b?null:a>b?0:1,'达到交锋上限：比较公开战利品数');return}
 startBattle(s,b.defender,b.attacker,null);
 }
}
export function reachable(s,p,f){return s.raid||s.fields.some(x=>x.owner===p&&x.links.includes(f.id))}
function target(s,id){return s.fields.find(x=>x.id===id)}
function strategyError(s,p,id,fieldId){
 const c=strategyById(id);if(!c||!s.players[p].strategies.includes(id))return '没有这张策略卡。';
 const campaign=s.phase==='campaign';
 if(c.phase==='campaign'&&!campaign)return '这张策略卡只能在地图行动阶段使用。';
 if(c.phase==='battle'&&s.phase!=='counter')return '这张策略卡只能在双方部署后的对抗阶段使用。';
 if(campaign?s.strategyUsed:s.battle.strategyUsed[p])return '本回合已经使用过策略卡。';
 const enemy=1-p,f=target(s,fieldId),line=s.battle?.lines[p]||[],other=s.battle?.lines[enemy]||[];
 if(['conscription','paratrooper'].includes(id)&&!s.deck.length)return '公共牌库已空。';
 if(id==='meds_team'&&!s.players[p].reserve.length)return '没有可回收的公开牌。';
 if(id==='isr'&&(!f||f.owner!==enemy||!f.garrison.some(c=>!c.open)))return '请先选择有暗牌驻军的敌方据点。';
 if(['spy','scouting'].includes(id)&&!other.some(c=>!c.open))return '敌方战线没有暗牌。';
 if(id==='paratrooper'&&line.length>=3)return '战线已满，最多 3 张。';
 if(id==='rank_up'&&!line.some(c=>c.open&&c.rank+(c.boost||0)<13))return '没有可晋升的普通明牌。';
 if(id==='revolution'&&(!f||f.owner!==null))return '请先选择中立据点。';
 if(id==='economic_sanctions'&&(!f||f.owner!==enemy))return '请先选择敌方据点。';
 return null;
}
export function canStrategy(s,p,id,fieldId){return p===s.active&&s.phase!=='over'?strategyError(s,p,id,fieldId):'尚未轮到你行动。'}
function strategy(s,p,id,fieldId){
 const error=strategyError(s,p,id,fieldId);if(error)return error;
 const pl=s.players[p],enemy=1-p,f=target(s,fieldId),pick=a=>a[Math.floor(random(s)*a.length)];
 pl.strategies.splice(pl.strategies.indexOf(id),1);
 if(s.phase==='campaign')s.strategyUsed=true;else s.battle.strategyUsed[p]=true;
 log(s,pl.name+'使用「'+strategyById(id).name+'」。');
 switch(id){
 case 'conscription':pl.hand.push(clean(s.deck.pop()));break;
 case 'meds_team':pl.hand.push(clean(pl.reserve.splice(Math.floor(random(s)*pl.reserve.length),1)[0]));break;
 case 'spy':{const c=pick(s.battle.lines[enemy].filter(c=>!c.open));s.knowledge[p][c.id]=true;break}
 case 'isr':pick(f.garrison.filter(c=>!c.open)).open=true;break;
 case 'paratrooper':s.battle.lines[p].push({...clean(s.deck.pop()),open:true});if(leading(s)===p)settle(s,p);break;
 case 'rank_up':{const c=pick(s.battle.lines[p].filter(c=>c.open&&c.rank+(c.boost||0)<13));c.boost=(c.boost||0)+1;if(leading(s)===p)settle(s,p);break}
 case 'scouting':pick(s.battle.lines[enemy].filter(c=>!c.open)).open=true;s.active=1-leading(s);break;
 case 'peace_talk':settle(s,null);break;
 case 'revolution':f.owner=p;f.garrison.push({id:54+s.generated++,rank:1,suit:Math.floor(random(s)*4),open:true});nextCampaign(s);break;
 case 'blitzkrieg':settle(s,leading(s));break;
 case 'international_support':pl.supply=Math.min(30,pl.supply+1+Math.floor(random(s)*13));break;
 case 'airborne_raid':s.raid=true;break;
 case 'economic_sanctions':f.blockedUntil=s.round+Math.floor(random(s)*13)+1;break;
 }
 return null;
}
function apply(s,p,a){
 if(s.phase==='over')return '大局已经结束。';
 if(p!==s.active)return '尚未轮到你行动。';
 if(a.type==='resign'){if(s.battle){for(let q=0;q<2;q++)s.players[q].hand.push(...s.battle.lines[q].map(clean))}finish(s,1-p,'对方投降');return null}
 if(s.phase==='draft'){
 if(a.type!=='draft'||!s.draft[p].includes(a.id))return '请选择一张提供的策略卡。';
 s.players[p].strategies=[a.id];s.drafted[p]=true;if(s.drafted.every(Boolean))begin(s);else s.active=1-p;return null;
 }
 if(a.type==='strategy')return strategy(s,p,a.id,a.field);
 if(s.phase==='campaign'){
 if(a.type==='supply'){
 if(s.supplyUsed)return '每个地图回合只能补给一次。';if(s.players[p].supply<2||!s.deck.length)return '需要 2 点补给和非空公共牌库。';
 s.players[p].supply-=2;s.players[p].hand.push(clean(s.deck.pop()));s.supplyUsed=true;log(s,s.players[p].name+'补充了一张暗牌。');return null;
 }
 if(a.type==='pass'){log(s,s.players[p].name+'结束地图行动。');nextCampaign(s);return null}
 const f=target(s,a.field);
 if(!f||f.owner===p)return '请选择中立或敌方据点。';
 if(!reachable(s,p,f))return '目标必须与己方领地相邻。';
 if(a.type==='occupy'){
 if(f.owner!==null)return '该据点已有驻军，需要发起进攻。';
 const c=s.players[p].hand.find(c=>c.id===a.card);if(!c)return '请选择 1 张手牌作为暗牌驻军。';
 s.players[p].hand=s.players[p].hand.filter(x=>x.id!==c.id);f.owner=p;f.garrison=[{...c,open:false}];
 log(s,s.players[p].name+'占领'+f.label+'。');nextCampaign(s);return null;
 }
 if(a.type==='attack'){if(f.owner===null)return '中立据点请使用占领。';startBattle(s,p,1-p,f.id);return null}
 return '地图行动无效。';
 }
 if(['defend','attack'].includes(s.phase)){
 if(a.type==='fold'){settle(s,1-p);return null}
 if(a.type!=='deploy'||!Array.isArray(a.cards)||a.cards.length<1||a.cards.length>3)return '每次部署必须选择 1–3 张牌。';
 if(new Set(a.cards.map(c=>c.id)).size!==a.cards.length)return '不能重复部署同一张牌。';
 if(!a.cards.some(c=>c.open))return '至少部署 1 张明牌。';
 const line=a.cards.map(c=>{const h=s.players[p].hand.find(h=>h.id===c.id);return h?{...h,open:!!c.open}:null});
 if(line.some(c=>!c))return '只能部署自己的手牌。';
 if(s.phase==='attack'&&compare(line.filter(c=>c.open),opened(s,1-p))<=0)return '进攻方的明牌牌力必须严格大于防守方。';
 s.players[p].hand=s.players[p].hand.filter(c=>!line.some(x=>x.id===c.id));s.battle.lines[p]=line;
 log(s,s.players[p].name+'部署 '+line.filter(c=>c.open).length+' 明 / '+line.filter(c=>!c.open).length+' 暗。');
 if(s.phase==='defend'){s.phase='attack';s.active=s.battle.attacker}
 else{s.phase='counter';s.active=s.battle.defender}
 return null;
 }
 if(s.phase==='counter'){
 if(a.type==='fold'){settle(s,1-p);return null}
 if(a.type!=='reveal'||!Array.isArray(a.ids)||a.ids.length<1||a.ids.length>2||new Set(a.ids).size!==a.ids.length)return '请选择 1 或 2 张暗牌翻开。';
 const line=s.battle.lines[p];
 if(a.ids.some(id=>!line.some(c=>c.id===id&&!c.open)))return '只能翻开己方尚未揭示的战线牌。';
 for(const c of line)if(a.ids.includes(c.id))c.open=true;
 log(s,s.players[p].name+'翻开 '+a.ids.length+' 张暗牌。');
 if(leading(s)===p)settle(s,p);
 else if(!line.some(c=>!c.open)){log(s,'暗牌耗尽，仍被压制。');settle(s,1-p)}
 // If still suppressed with one hidden card left, the same side must reveal or fold.
 return null;
 }
 return '未知行动。';
}
export function act(state,player,action){
 const next=structuredClone(state);
 const error=apply(next,player,action);if(error)return {ok:false,error,state};
 validate(next);return {ok:true,state:next};
}
export function viewFor(s,p){
 const v=structuredClone(s),mask=()=>({hidden:true});
 v.rng=0;v.opt.seed=0;
 v.deck=v.deck.map(mask);
 v.players[1-p].hand=v.players[1-p].hand.map(mask);
 v.players[1-p].strategies=v.players[1-p].strategies.map(()=>'?');
 v.draft[1-p]=v.draft[1-p].map(()=>'?');
 v.knowledge[1-p]={};
 for(const f of v.fields)if(f.owner!==p)f.garrison=f.garrison.map(c=>c.open?c:mask(c));
 if(v.battle)v.battle.lines[1-p]=v.battle.lines[1-p].map(c=>c.open||s.knowledge[p][c.id]?c:mask(c));
 return v;
}
export function deployments(hand){
 const result=[];
 // Every subset and visible mask of up to three cards; deterministic and bounded for large hands.
 const h=hand.slice(0,24);
 for(let i=0;i<h.length;i++){
 const one=[h[i]];add(one);
 for(let j=i+1;j<h.length;j++){const two=[h[i],h[j]];add(two);for(let k=j+1;k<h.length;k++)add([h[i],h[j],h[k]])}
 }
 function add(cs){for(let mask=1;mask<(1<<cs.length);mask++)result.push(cs.map((c,i)=>({...c,open:!!(mask&(1<<i))})))}
 return result;
}
export function aiAction(s,p,level='normal'){
 // Decisions use only the masked public observation and this player's own cards.
 const v=viewFor(s,p),pl=v.players[p],b=v.battle;
 if(v.phase==='draft')return {type:'draft',id:v.draft[p].find(id=>['rank_up','paratrooper','revolution','conscription'].includes(id))||v.draft[p][0]};
 if(v.phase==='campaign'){
 const targets=v.fields.filter(f=>f.owner!==p&&reachable(v,p,f));
 const enemy=targets.filter(f=>f.owner===1-p).sort((a,b)=>Number(b.capital)-Number(a.capital));
 const neutral=targets.filter(f=>f.owner===null).sort((a,b)=>(b.type==='oil')-(a.type==='oil'));
 const focus=enemy[0]||neutral[0];
 for(const id of pl.strategies){
 const f=id==='revolution'?v.fields.find(x=>x.owner===null):id==='isr'?v.fields.find(x=>x.owner===1-p&&x.garrison.some(c=>c.hidden)):focus;
 // Availability is evaluated against own/visible resources, no hidden ranks.
 if(!canStrategy(s,p,id,f?.id)&&['conscription','meds_team','revolution','international_support','economic_sanctions','isr'].includes(id))return {type:'strategy',id,field:f?.id};
 }
 if(pl.hand.length<10&&pl.supply>=2&&!v.supplyUsed&&v.deck.length)return {type:'supply'};
 if(enemy.length&&(pl.hand.length>=3||!neutral.length))return {type:'attack',field:enemy[0].id};
 if(neutral.length&&pl.hand.length>1)return {type:'occupy',field:neutral[0].id,card:[...pl.hand].sort((a,b)=>a.rank-b.rank)[0].id};
 if(enemy.length&&pl.hand.length)return {type:'attack',field:enemy[0].id};
 return {type:'pass'};
 }
 if(v.phase==='defend'||v.phase==='attack'){
 let choices=deployments(pl.hand);
 if(v.phase==='attack')choices=choices.filter(l=>compare(l.filter(c=>c.open),opened(v,1-p))>0);
 if(!choices.length)return {type:'fold'};
 const strength=cs=>{const t=power(cs);return t[0]*40+t[1]*2+t[2]*.12+t[3]*.01};
 const metric=l=>{
 const open=l.filter(c=>c.open),hidden=l.filter(c=>!c.open),cost=open.reduce((n,c)=>n+c.rank,0);
 if(level==='easy')return -cost-hidden.length*2+strength(open)*.05;
 const potential=strength(l)-strength(open);
 return v.phase==='attack'?-cost+hidden.length*2+potential*.16-l.length:strength(open)*.28-cost*.45+potential*.22+hidden.length*2;
 };
 choices.sort((a,b)=>metric(b)-metric(a));
 return {type:'deploy',cards:choices[0].map(c=>({id:c.id,open:c.open}))};
 }
 if(v.phase==='counter'){
 const hidden=b.lines[p].filter(c=>!c.open),own=b.lines[p].filter(c=>c.open),enemy=b.lines[1-p].filter(c=>c.open);
 const wins=cs=>compare(cs,enemy)>(p===b.attacker?0:-1);
 for(const id of pl.strategies){
 if(canStrategy(s,p,id))continue;
 if(id==='rank_up'||id==='paratrooper'||id==='spy'||id==='scouting'||(id==='peace_talk'&&!wins([...own,...hidden])))return {type:'strategy',id};
 }
 let options=hidden.map(c=>[c]);if(hidden.length>=2)options.push(hidden.slice(0,2));
 options.sort((a,b)=>a.length-b.length||a.reduce((n,c)=>n+c.rank,0)-b.reduce((n,c)=>n+c.rank,0));
 const best=options.find(cs=>wins([...own,...cs]));
 return best?{type:'reveal',ids:best.map(c=>c.id)}:{type:'fold'};
 }
 return {type:'pass'};
}
export function timeoutAction(s,p){
 if(s.phase==='draft')return {type:'draft',id:s.draft[p][0]};
 if(s.phase==='campaign')return {type:'pass'};
 if(s.phase==='defend'){const c=[...s.players[p].hand].sort((a,b)=>a.rank-b.rank)[0];return c?{type:'deploy',cards:[{id:c.id,open:true}]}:{type:'fold'}}
 return {type:'fold'};
}
