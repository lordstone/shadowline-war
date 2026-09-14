
import {MAPS,STRATEGIES,SUITS,defaults,strategyById} from './data.js';
import {t,strategyText,mapFactions} from './i18n/index.js';
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296}
export function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
export function makeDeck(count=1){
 const d=[];for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)d.push({id:suit*13+rank-1,rank,suit});
 d.push({id:52,rank:14,suit:4},{id:53,rank:15,suit:4});
 for(let copy=1;copy<count;copy++)for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)d.push({id:54+(copy-1)*52+suit*13+rank-1,rank,suit});
 return d;
}
export function resolvedDeckCount(opt,fields){if(opt.deckCount===1||opt.deckCount==='1')return 1;if(opt.deckCount===2||opt.deckCount==='2')return 2;return opt.rules==='campaign'&&fields.length>=12?2:1}
export function face(c){return c.rank===15?t('engine.face.big_joker'):c.rank===14?t('engine.face.small_joker'):({1:'A',11:'J',12:'Q',13:'K'}[c.rank]||String(c.rank))}
function exactPower(cards){
 if(!cards.length)return [0,0,0,0];
 const r=cards.map(c=>Math.min(c.rank+(c.boost||0),c.rank>13?15:13)).sort((a,b)=>b-a);
 const ordinary=r.every(x=>x<=13), three=r.length===3;
 const flush=three&&ordinary&&cards.every(c=>c.suit===cards[0].suit);
 const straight=three&&ordinary&&r[0]-1===r[1]&&r[1]-1===r[2];
 if(three&&ordinary&&r[0]===r[2])return [6,r[0],0,0];
 if(flush&&straight)return [5,r[0],0,0];
 if(straight)return [4,r[0],0,0];
 if(flush)return [3,...r];
 const pair=ordinary&&r.length>=2?r.find((rank,i)=>i<r.length-1&&rank===r[i+1]):undefined;
 if(pair!==undefined)return [2,pair,r.find(rank=>rank!==pair)||0,0];
 return [1,r[0]||0,r[1]||0,r[2]||0];
}
function comparePower(x,y){for(let i=0;i<4;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0}
const evaluationCache=new Map(),EVALUATION_CACHE_LIMIT=32768;
function compareEvaluation(a,b){
 const strength=comparePower(a.value,b.value);if(strength)return strength;
 if(a.wilds!==b.wilds)return Math.sign(b.wilds-a.wilds); // Natural formation wins an otherwise exact tie.
 return Math.sign(a.joker-b.joker); // Big joker wins the same wildcard formation.
}
function exactEvaluation(cards){
 const key=cards.map(c=>[c.rank,c.suit,c.boost||0].join(':')).sort().join('|');
 if(evaluationCache.has(key))return evaluationCache.get(key);
 const jokers=cards.filter(c=>c.rank>13),ordinary=cards.filter(c=>c.rank<=13);
 let best={value:exactPower(cards),wilds:0,joker:Math.max(0,...jokers.map(c=>c.rank))};
 if(jokers.length){
  const assigned=[];
  const search=index=>{
   if(index===jokers.length){
    const candidate={value:exactPower([...ordinary,...assigned]),wilds:jokers.length,joker:Math.max(...jokers.map(c=>c.rank))};
    if(compareEvaluation(candidate,best)>0)best=candidate;return;
   }
   for(let rank=1;rank<=13;rank++)for(let suit=0;suit<4;suit++){assigned[index]={rank,suit,boost:jokers[index].boost||0};search(index+1)}
  };
  search(0);
 }
 if(evaluationCache.size>=EVALUATION_CACHE_LIMIT)evaluationCache.delete(evaluationCache.keys().next().value);
 evaluationCache.set(key,best);return best;
}
function evaluation(cards){
 if(cards.length<=3)return exactEvaluation(cards);
 let best={value:[0,0,0,0],wilds:99,joker:0};
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)for(let k=j+1;k<cards.length;k++){
  const candidate=exactEvaluation([cards[i],cards[j],cards[k]]);if(compareEvaluation(candidate,best)>0)best=candidate;
 }
 return best;
}
export function power(cards){return evaluation(cards).value}
export function compare(a,b){return compareEvaluation(evaluation(a),evaluation(b))}
const HAND_NAME_KEYS=['engine.hand.none','engine.hand.high','engine.hand.pair','engine.hand.flush','engine.hand.straight','engine.hand.straight_flush','engine.hand.trips'];
export function handName(cards){return t(HAND_NAME_KEYS[power(cards)[0]])}
export function orderForDisplay(cards){
 const source=[...cards];if(source.length<2)return source;
 let chosen=source;
 if(source.length>3){chosen=null;for(let i=0;i<source.length;i++)for(let j=i+1;j<source.length;j++)for(let k=j+1;k<source.length;k++){const candidate=[source[i],source[j],source[k]];if(!chosen||compareEvaluation(evaluation(candidate),evaluation(chosen))>0)chosen=candidate}}
 const value=power(chosen),category=value[0];let ordered;
 if(category===4||category===5){
  const expected=[value[1]-2,value[1]-1,value[1]],ordinary=chosen.filter(c=>c.rank<=13),jokers=chosen.filter(c=>c.rank>13).sort((a,b)=>a.rank-b.rank),used=new Set();
  ordered=expected.map(rank=>{const card=ordinary.find(c=>c.rank+(c.boost||0)===rank&&!used.has(c.id));if(card){used.add(card.id);return card}return jokers.shift()}).filter(Boolean);
 }else if(category===2){const pair=value[1];ordered=[...chosen].sort((a,b)=>Number((b.rank+(b.boost||0))===pair)-Number((a.rank+(a.boost||0))===pair)||a.rank-b.rank||a.suit-b.suit)}
 else ordered=[...chosen].sort((a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id);
 const picked=new Set(ordered.map(c=>c.id));return [...ordered,...source.filter(c=>!picked.has(c.id)).sort((a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id)];
}
export function opened(s,p){return s.battle?.lines[p].filter(c=>c.open)||[]}
export function terrainLimit(f){return f?.type==='swamp'?1:f?.type==='forest'?2:3}
export function garrisonLimit(f){return f?.type==='swamp'?1:f?.type==='forest'?2:f?.capital||f?.type==='capital'?5:f?.fortified?4:3}
export function battleLineLimit(s,p){const b=s.battle,f=b?.field?target(s,b.field):null;return b&&p===b.attacker?terrainLimit(f):garrisonLimit(f)}
function mapFor(s){return MAPS.find(m=>m.id===s.opt.map)}
export function isSeaLink(s,a,b){return (mapFor(s)?.seaLinks||[]).some(([x,y])=>(x===a&&y===b)||(x===b&&y===a))}
export function seaLanding(s,p,f){if(s.raid)return false;const origins=s.fields.filter(x=>x.owner===p&&x.links.includes(f.id));return origins.length>0&&origins.every(x=>isSeaLink(s,x.id,f.id))}
function seaFormationLegal(cards){return power(cards)[0]!==6}
function rankUpAllowed(s,p,line,c){return c.open&&c.rank+(c.boost||0)<13&&(!s.battle?.seaLanding||p!==s.battle.attacker||seaFormationLegal(line.map(x=>x===c?{...x,boost:(x.boost||0)+1}:x)))}
export function leading(s){if(!s.battle)return null;return compare(opened(s,s.battle.attacker),opened(s,s.battle.defender))>0?s.battle.attacker:s.battle.defender}
export function cardLocations(s){return [...s.deck,...s.players.flatMap(p=>[...p.hand,...p.reserve]),...s.fields.flatMap(f=>f.garrison),...(s.battle?[...s.battle.lines.flat(),...(s.battle.suppressed||[])]:[])]}
export function validate(s){
 const all=cardLocations(s),ids=all.map(c=>c.id);
 if(new Set(ids).size!==ids.length)throw Error('重复牌');
 if(all.length!==(s.baseDeckSize||54)+s.generated)throw Error('牌数不守恒 '+all.length);
 if(s.players.some(p=>p.hand.some(c=>c.boost)))throw Error('临时晋升未清除');
 if(s.battle&&s.battle.lines.some((l,p)=>l.length>battleLineLimit(s,p)))throw Error('战线超过地形容量');
 if(s.battle?.seaLanding&&!seaFormationLegal(s.battle.lines[s.battle.attacker]))throw Error('跨海进攻不能组成三条');
 if(s.fields.some(f=>f.garrison.length>garrisonLimit(f)))throw Error('驻军超过据点容量');
 if(s.opt.rules==='campaign'&&s.fields.some(f=>f.owner!==null&&!f.capital&&f.garrison.length&&!f.garrison.some(c=>c.open)))throw Error('普通据点必须至少有一张明牌驻军');
 if(s.strategyMarket?.length>3)throw Error('策略市场超过三张');
 if(s.players.some(p=>p.strategies.length>3))throw Error('持有策略超过三张');
 if(!['draft','campaign','defend','attack','tactics','counter','over'].includes(s.phase))throw Error('未知阶段');
 return true;
}
export function createGame(options={}){
 const opt={...defaults,...options};opt.seed=Number(opt.seed)>>>0;
 const map=MAPS.find(m=>m.id===opt.map)||MAPS[0];
 const text=(value,fallback)=>String(value||'').trim().slice(0,18)||fallback;
 const local=opt.mode==='local',aiName=opt.difficulty==='easy'?'新兵 AI':'老兵 AI';
 const names=[text(opt.playerNames?.[0],local?'玩家1':'玩家'),text(opt.playerNames?.[1],local?'玩家2':aiName)];
 const logos=[text(opt.playerLogos?.[0],'⟐').slice(0,2),text(opt.playerLogos?.[1],'✣').slice(0,2)];
 const mapFac=mapFactions(map.id);
 const factions=[text(opt.factions?.[0],mapFac[0]),text(opt.factions?.[1],mapFac[1])];
 const sides=factions.map((name,p)=>{const side=mapFac.indexOf(name);return side<0?p:side});
 if(sides[0]===sides[1])sides[1]=1-sides[0];
 opt.playerNames=names;opt.playerLogos=logos;opt.factions=factions;
 const s={version:1,opt,rng:opt.seed,phase:'draft',active:opt.first===1?1:0,round:1,skirmish:0,generated:0,
 players:[{name:names[0],logo:logos[0],faction:factions[0],side:sides[0],hand:[],reserve:[],strategies:[],supply:2,wins:0},{name:names[1],logo:logos[1],faction:factions[1],side:sides[1],hand:[],reserve:[],strategies:[],supply:2,wins:0}],
 deck:[],fields:structuredClone(map.fields).map(f=>({...f,owner:f.owner===null?null:sides.indexOf(f.owner)})),
 battle:null,log:[],winner:null,reason:'',draft:[[],[]],drafted:[false,false],turn:1,strategyUsed:false,supplyUsed:false,raid:false,knowledge:[{},{}],
 strategyDeck:[],strategyMarket:[],strategyDiscard:[],strategyLocked:[[],[]],marketBought:false,rapidRedeployUsed:false,actionSpent:false,supplyLedger:[null,null]};
 const deckCount=resolvedDeckCount(opt,s.fields);s.baseDeckSize=54+(deckCount-1)*52;
 s.deck=shuffle(s,makeDeck(deckCount));for(let i=0;i<12;i++)for(let p=0;p<2;p++)s.players[p].hand.push(s.deck.pop());
 if(opt.rules==='campaign'){
  if(opt.deployment==='historical'&&map.historical)for(const f of s.fields){const side=map.historical.control[f.id];f.owner=side===undefined?null:sides.indexOf(side)}
  for(const f of s.fields.filter(f=>f.capital))for(let i=0;i<3;i++)f.garrison.push({...s.players[f.owner].hand.pop(),open:false});
  if(opt.deployment==='historical'&&map.historical)for(const f of s.fields.filter(f=>f.owner!==null&&!f.capital))for(let i=0;i<Math.min(3,garrisonLimit(f));i++)f.garrison.push({...clean(s.deck.pop()),open:i===0});
 }
 else s.fields=[];
 const available=STRATEGIES.filter(c=>opt.rules==='campaign'||c.phase==='battle');
 if(opt.strategies){s.strategyDeck=shuffle(s,available.flatMap(c=>Array(c.count).fill(c.id)));for(let p=0;p<2;p++)s.draft[p]=s.strategyDeck.splice(-3)}
 s.active=0;
 if(!opt.strategies){s.drafted=[true,true];begin(s)}
 log(s,t('engine.log.game_ready'));validate(s);return s;
}
function log(s,msg){s.log.unshift({round:s.round,text:msg});s.log=s.log.slice(0,70)}
function clean(c){const {open,boost,...rest}=c;return rest}
function fillMarket(s){
 while(s.strategyMarket.length<3){
 if(!s.strategyDeck.length){if(!s.strategyDiscard.length)break;s.strategyDeck=shuffle(s,s.strategyDiscard.splice(0))}
 s.strategyMarket.push(s.strategyDeck.pop());
 }
}
function refreshMarket(s){s.strategyDiscard.push(...s.strategyMarket.splice(0));fillMarket(s);log(s,t('engine.log.market_refresh'))}
export function upgradeState(s){
 const map=MAPS.find(m=>m.id===s.opt.map)||MAPS[0];
 const renamedFactions={'苍海舰队':'海湾舰队','赤潮军团':'群岛守备军'};
 for(const p of s.players)if(renamedFactions[p.faction])p.faction=renamedFactions[p.faction];
 if(Array.isArray(s.opt.factions))s.opt.factions=s.opt.factions.map(name=>renamedFactions[name]||name);
 for(let p=0;p<2;p++)if(!Number.isInteger(s.players[p].side))s.players[p].side=Math.max(0,map.factions.indexOf(s.players[p].faction));
 if(!s.opt.deckCount)s.opt.deckCount='auto';
 if(!s.opt.deployment)s.opt.deployment='standard';
 if(!s.baseDeckSize)s.baseDeckSize=54;
 if(!Array.isArray(s.strategyDeck)){const held=s.players.flatMap(p=>p.strategies);s.strategyDeck=STRATEGIES.flatMap(c=>Array(Math.max(0,c.count-held.filter(id=>id===c.id).length)).fill(c.id));s.strategyMarket=[];s.strategyDiscard=[]}
 if(!Array.isArray(s.strategyMarket))s.strategyMarket=[];
 if(!Array.isArray(s.strategyDiscard))s.strategyDiscard=[];
 if(!Array.isArray(s.strategyLocked))s.strategyLocked=[[],[]];
 if(typeof s.marketBought!=='boolean')s.marketBought=false;
 if(typeof s.rapidRedeployUsed!=='boolean')s.rapidRedeployUsed=false;
 if(typeof s.actionSpent!=='boolean')s.actionSpent=false;
 if(!Array.isArray(s.supplyLedger))s.supplyLedger=[null,null];
 const template=MAPS.find(m=>m.id===s.opt.map);if(template)for(const f of s.fields)f.fortified=!!template.fields.find(x=>x.id===f.id)?.fortified;
 if(s.opt.rules==='campaign')for(const f of s.fields)if(f.owner!==null&&!f.capital&&f.garrison.length&&!f.garrison.some(c=>c.open))f.garrison[0].open=true;
 if(s.opt.rules==='campaign'&&s.opt.strategies)fillMarket(s);
 return s;
}
function replenish(s){
 let need=true;while(s.deck.length&&need){need=false;for(const p of [s.active,1-s.active])if(s.players[p].hand.length<12&&s.deck.length){s.players[p].hand.push(clean(s.deck.pop()));need=true}}
}
function exhausted(s){
 if(s.deck.length)return false;
 const e=s.players.map(p=>p.hand.length===0);
 if(e[0]||e[1]){finish(s,e[0]&&e[1]?null:e[0]?1:0,t('engine.reason.deck_out'));return true}return false;
}
function score(s,p){return s.players[p].reserve.length+s.fields.filter(f=>f.owner===p).length*3}
function finish(s,winner,reason){s.phase='over';s.winner=winner;s.reason=reason;s.battle=null;log(s,winner===null?t('engine.log.game_draw'):t('engine.log.game_win',{name:s.players[winner].name}))}
function begin(s){s.active=s.opt.first===1?1:0;if(s.opt.rules==='classic')startBattle(s,1-s.active,s.active,null);else{fillMarket(s);s.phase='campaign';income(s)}}
function ledger(s,p){return s.supplyLedger[p]||(s.supplyLedger[p]={round:s.round,opening:s.players[p].supply,entries:[],net:0,discardedId:null})}
function supplyFlow(s,p,label,amount){const report=ledger(s,p),before=s.players[p].supply,after=Math.max(0,Math.min(30,before+amount)),actual=after-before;s.players[p].supply=after;report.entries.push({label,amount:actual});report.net+=actual;return actual}
export function supplyConnected(s,who){
 const owned=new Set(s.fields.filter(f=>f.owner===who).map(f=>f.id)),seen=new Set();
 const cap=s.fields.find(f=>f.owner===who&&f.capital);
 if(!cap)return seen;
 const stack=[cap.id];seen.add(cap.id);
 while(stack.length){const id=stack.pop(),f=s.fields.find(x=>x.id===id);if(!f)continue;for(const nb of f.links)if(owned.has(nb)&&!seen.has(nb)){seen.add(nb);stack.push(nb)}}
 return seen;
}
export function income(s){
 const who=s.active,p=s.players[who],opening=p.supply,report={round:s.round,opening,entries:[],net:0,discardedId:null};s.supplyLedger[who]=report;
 let operationalNet=0;
 const connected=supplyConnected(s,who);
 for(const f of s.fields.filter(f=>f.owner===who)){
  const base=f.type==='oil'?2:1,open=f.garrison.filter(c=>c.open).length,blocked=f.blockedUntil>=s.round;
  let amount=blocked?0:open>=3?-base:open===2?0:base;
  let label=f.label+t(blocked?'engine.ledger.blocked':open>=3?'engine.ledger.upkeep':open===2?'engine.ledger.idle':'engine.ledger.output');
  const cut=!blocked&&!connected.has(f.id);
  if(cut&&amount>0){amount=0;label+=t('engine.ledger.cut');log(s,t('engine.log.supply_cut',{field:f.label}))}
  else if(cut&&amount<0){
   const candidates=f.garrison.filter(c=>c.open);
   if(candidates.length){const lost=candidates[Math.floor(random(s)*candidates.length)];
    f.garrison=f.garrison.filter(c=>c.id!==lost.id);p.reserve.push(clean(lost));
    label+=t('engine.ledger.cut_bleed');log(s,t('engine.log.supply_bleed',{field:f.label,card:face(lost)}))}
  }
  report.entries.push({label,amount});operationalNet+=amount;
 }
 const raw=opening+operationalNet,persisted=Math.max(0,Math.min(30,raw));p.supply=persisted;report.net=persisted-opening;
 if(raw>30)report.entries.push({label:t('engine.ledger.overflow'),amount:30-raw});
 if(raw<0)report.entries.push({label:t('engine.ledger.shortfall'),amount:-raw});
 if(operationalNet<0&&p.hand.length){const card=p.hand.splice(Math.floor(random(s)*p.hand.length),1)[0];p.reserve.push(clean(card));report.discardedId=card.id;log(s,t('engine.log.supply_negative_discard',{name:p.name}))}
 log(s,operationalNet>=0?t('engine.log.supply_gain',{name:p.name,amount:Math.abs(operationalNet)}):t('engine.log.supply_loss',{name:p.name,amount:Math.abs(operationalNet)}));
}
function nextCampaign(s){
 s.active=1-s.active;s.turn++;s.round=Math.floor((s.turn-1)/2)+1;s.phase='campaign';s.strategyUsed=false;s.supplyUsed=false;s.marketBought=false;s.rapidRedeployUsed=false;s.actionSpent=false;s.raid=false;s.strategyLocked[s.active]=[];
 if(exhausted(s))return;
 if(s.round>s.opt.maxRounds){const a=score(s,0),b=score(s,1);finish(s,a===b?null:a>b?0:1,t('engine.reason.max_rounds'));return}
 if(s.active===(s.opt.first===1?1:0)&&s.round>1&&(s.round-1)%3===0)refreshMarket(s);
 income(s);
}
function startBattle(s,attacker,defender,field,siege=false){
 const garrison=field?structuredClone(s.fields.find(x=>x.id===field).garrison):[];
 const suppressed=siege&&garrison.length>3?[garrison.splice(3+Math.floor(random(s)*(garrison.length-3)),1)[0]]:[];
 const lines=[[],[]];
 if(field){const f=s.fields.find(x=>x.id===field);for(const c of garrison)if(c.open)s.knowledge[attacker][c.id]=true;f.garrison=[];lines[defender]=garrison;log(s,t('engine.log.invasion',{field:f.label,name:s.players[attacker].name}))}
 const landing=field&&seaLanding(s,attacker,s.fields.find(x=>x.id===field));
 s.skirmish++;s.battle={attacker,defender,field,garrison:[...garrison,...suppressed],suppressed,lines,strategyUsed:[false,false],seaLanding:landing};s.phase=field?'attack':'defend';s.active=field?attacker:defender;s.strategyUsed=false;log(s,t(field?'engine.log.clash_attack':'engine.log.clash_defend',{n:s.skirmish,name:s.players[field?attacker:defender].name}));
 if(landing)log(s,t('engine.log.sea_landing'));
 if(suppressed.length)log(s,t('engine.log.siege_block'));
}
function settle(s,winner){
 const b=s.battle;
 const stationed=line=>line.map(c=>({...clean(c),open:!!c.open}));
 if(b.field){
 const f=s.fields.find(x=>x.id===b.field);
 if(winner===b.attacker){
  const defeated=b.lines[b.defender];
  s.players[b.defender].hand.push(...defeated.filter(c=>!c.open).map(clean),...(b.suppressed||[]).map(clean));
  s.players[b.attacker].reserve.push(...defeated.filter(c=>c.open).map(clean));
  f.owner=b.attacker;f.garrison=stationed(b.lines[b.attacker]);
 }else{
  const assault=b.lines[b.attacker];
  s.players[b.attacker].hand.push(...assault.filter(c=>!c.open).map(clean));
  s.players[winner===null?b.attacker:b.defender].reserve.push(...assault.filter(c=>c.open).map(clean));
  f.garrison=stationed([...b.lines[b.defender],...(b.suppressed||[])]);
 }
 }else for(let p=0;p<2;p++){
  const open=b.lines[p].filter(c=>c.open).map(clean),hidden=b.lines[p].filter(c=>!c.open).map(clean);
  s.players[p].hand.push(...hidden);s.players[winner===null?p:winner].reserve.push(...open);
 }
 if(winner!==null){s.players[winner].wins++;log(s,t('engine.log.clash_win',{name:s.players[winner].name}))}
 else log(s,t('engine.log.clash_ceasefire'));
 s.battle=null;s.active=b.attacker;
 if(b.field){
 const f=s.fields.find(x=>x.id===b.field);
 if(winner===b.attacker)log(s,t('engine.log.capture_field',{name:s.players[winner].name,field:f.label}));
 else log(s,t('engine.log.field_hold',{field:f.label}));
 if(winner===b.attacker&&f.capital){finish(s,winner,t('engine.reason.capital'));return}
 }
 if(s.opt.rules==='campaign'){
  if(exhausted(s))return;s.phase='campaign';s.actionSpent=true;log(s,t('engine.log.main_action_done',{name:s.players[s.active].name}));
 }else{
 replenish(s);
 if(exhausted(s))return;
 s.round++;s.turn++;if(s.round>s.opt.maxRounds){const a=score(s,0),b=score(s,1);finish(s,a===b?null:a>b?0:1,t('engine.reason.max_clashes'));return}
 startBattle(s,b.defender,b.attacker,null);
 }
}
function resolveCounter(s){
 const winner=leading(s),suppressed=1-winner;
 if(!s.battle.lines[suppressed].some(c=>!c.open)){
 log(s,t('engine.log.suppressed_no_hidden',{name:s.players[suppressed].name}));settle(s,winner);
 }else{
 s.phase='counter';s.active=suppressed;
 log(s,t('engine.log.counter_turn',{name:s.players[suppressed].name}));
 }
}
const RAID_RANGE=2;
function raidReachable(s,p,f){
 const seen=new Set(),queue=[];
 for(const x of s.fields)if(x.owner===p){seen.add(x.id);queue.push([x.id,0])}
 while(queue.length){
  const [id,d]=queue.shift();
  if(id===f.id)return true;
  if(d>=RAID_RANGE)continue;
  for(const nb of s.fields.find(x=>x.id===id).links)if(!seen.has(nb)){seen.add(nb);queue.push([nb,d+1])}
 }
 return false;
}
export function reachable(s,p,f){return s.raid?raidReachable(s,p,f):s.fields.some(x=>x.owner===p&&x.links.includes(f.id))}
function target(s,id){return s.fields.find(x=>x.id===id)}
function strategyError(s,p,id,fieldId,cards){
 const c=strategyById(id);if(!c||!s.players[p].strategies.includes(id))return t('engine.error.no_such_strategy');
 if(s.strategyLocked[p].includes(id))return t('engine.error.strategy_locked');
 const campaign=s.phase==='campaign';
 if(c.phase==='campaign'&&!campaign)return t('engine.error.strategy_phase_campaign');
 if(c.phase==='battle'&&!['tactics','counter'].includes(s.phase))return t('engine.error.strategy_phase_battle');
 if(campaign?s.strategyUsed:s.battle.strategyUsed[p])return t('engine.error.strategy_used');
 if(['revolution','airborne_raid'].includes(id)&&s.actionSpent)return t('engine.error.action_spent');
 const enemy=1-p,f=target(s,fieldId),line=s.battle?.lines[p]||[],other=s.battle?.lines[enemy]||[];
 if(['conscription','paratrooper'].includes(id)&&!s.deck.length)return t('engine.error.deck_empty');
 if(id==='meds_team'){if(!s.players[p].reserve.length)return t('engine.error.meds_no_reserve');if(cards){if(!Array.isArray(cards)||!cards.length||cards.length>2)return t('engine.error.meds_pick_count');const ids=new Set(s.players[p].reserve.map(c=>c.id));if(new Set(cards).size!==cards.length||!cards.every(id=>ids.has(id)))return t('engine.error.meds_own_reserve');}}
 if(id==='isr'&&(!f||f.owner!==enemy||!f.garrison.some(c=>!c.open)))return t('engine.error.isr_target');
 if(['spy','scouting'].includes(id)&&!other.some(c=>!c.open))return t('engine.error.no_enemy_hidden');
 if(id==='paratrooper'&&line.length>=battleLineLimit(s,p))return t('engine.error.line_full');
 if(id==='paratrooper'&&s.battle?.seaLanding&&p===s.battle.attacker)return t('engine.error.sea_paratrooper');
 if(id==='rank_up'&&!line.some(c=>rankUpAllowed(s,p,line,c)))return t('engine.error.no_rank_up');
 if(id==='blitzkrieg'&&leading(s)!==p)return t('engine.error.blitzkrieg_behind');
 if(id==='revolution'&&(!f||f.owner!==null))return t('engine.error.revolution_target');
 if(id==='economic_sanctions'&&(!f||f.owner!==enemy))return t('engine.error.sanctions_target');
 return null;
}
export function canStrategy(s,p,id,fieldId,cards){return p===s.active&&s.phase!=='over'?strategyError(s,p,id,fieldId,cards):t('engine.error.not_your_turn')}
export function canBuyStrategy(s,p,id){
 if(s.phase!=='campaign'||p!==s.active)return t('engine.error.buy_phase');
 if(!s.opt.strategies)return t('engine.error.strategies_off');
 const c=strategyById(id);if(!c||!s.strategyMarket.includes(id))return t('engine.error.not_in_market');
 if(s.marketBought)return t('engine.error.market_bought');
 if(s.players[p].strategies.length>=3)return t('engine.error.strategies_full');
 if(s.players[p].strategies.includes(id))return t('engine.error.duplicate_strategy');
 if(s.players[p].supply<c.price)return t('engine.error.need_supply',{price:c.price});
 return null;
}
function buyStrategy(s,p,id){
 const error=canBuyStrategy(s,p,id);if(error)return error;
 const c=strategyById(id),i=s.strategyMarket.indexOf(id);supplyFlow(s,p,t('engine.ledger.buy',{card:strategyText(id).name}),-c.price);s.players[p].strategies.push(id);s.strategyLocked[p].push(id);s.strategyMarket.splice(i,1);s.marketBought=true;fillMarket(s);log(s,t('engine.log.buy_strategy',{name:s.players[p].name,price:c.price,card:strategyText(id).name}));return null;
}
function garrisonFromHand(s,p,specs,field){
 const limit=garrisonLimit(field);
 if(!Array.isArray(specs)||specs.length<1||specs.length>limit)return {error:t('engine.error.garrison_count',{limit})};
 if(new Set(specs.map(c=>c.id)).size!==specs.length)return {error:t('engine.error.garrison_dup')};
 if(!field.capital&&!specs.some(c=>c.open))return {error:t('engine.error.garrison_open')};
 const line=specs.map(spec=>{const c=s.players[p].hand.find(c=>c.id===spec.id);return c?{...clean(c),open:!!spec.open}:null});
 if(line.some(c=>!c))return {error:t('engine.error.garrison_hand')};
 return {line};
}
function returnGarrisonCards(s,p,cards){
 s.players[p].reserve.push(...cards.filter(c=>c.open).map(clean));
 s.players[p].hand.push(...cards.filter(c=>!c.open).map(clean));
}
function strategy(s,p,id,fieldId,cards){
 const error=strategyError(s,p,id,fieldId,cards);if(error)return error;
 const pl=s.players[p],enemy=1-p,f=target(s,fieldId),pick=a=>a[Math.floor(random(s)*a.length)];
 pl.strategies.splice(pl.strategies.indexOf(id),1);
 s.strategyDiscard.push(id);
 if(s.phase==='campaign')s.strategyUsed=true;else s.battle.strategyUsed[p]=true;
 log(s,t('engine.log.strategy_use',{name:pl.name,card:strategyText(id).name}));
 switch(id){
 case 'conscription':for(let i=0;i<2&&s.deck.length;i++)pl.hand.push(clean(s.deck.pop()));break;
 case 'meds_team':{const picks=cards&&cards.length?cards.map(cid=>pl.reserve.find(c=>c.id===cid)).filter(Boolean):[...pl.reserve].sort((a,b)=>b.rank-a.rank||b.suit-a.suit).slice(0,2);for(const pc of picks){const i=pl.reserve.findIndex(c=>c.id===pc.id);if(i>=0)pl.hand.push(clean(pl.reserve.splice(i,1)[0]))}break}
 case 'spy':{const c=pick(s.battle.lines[enemy].filter(c=>!c.open));s.knowledge[p][c.id]=true;break}
 case 'isr':pick(f.garrison.filter(c=>!c.open)).open=true;break;
 case 'paratrooper':s.battle.lines[p].push({...clean(s.deck.pop()),open:true});if(s.phase==='counter')resolveCounter(s);break;
 case 'rank_up':{const c=pick(s.battle.lines[p].filter(c=>rankUpAllowed(s,p,s.battle.lines[p],c)));c.boost=Math.min(13-c.rank,(c.boost||0)+2);if(s.phase==='counter')resolveCounter(s);break}
 case 'scouting':pick(s.battle.lines[enemy].filter(c=>!c.open)).open=true;resolveCounter(s);break;
 case 'peace_talk':settle(s,null);break;
 case 'revolution':f.owner=p;f.garrison.push({id:s.baseDeckSize+s.generated++,rank:1,suit:Math.floor(random(s)*4),open:true});s.actionSpent=true;break;
 case 'blitzkrieg':settle(s,leading(s));break;
 case 'international_support':supplyFlow(s,p,t('engine.ledger.aid'),6);break;
 case 'airborne_raid':s.raid=true;break;
 case 'economic_sanctions':f.blockedUntil=s.round+3;break;
 }
 return null;
}
function apply(s,p,a){
 if(s.phase==='over')return t('engine.error.game_over');
 if(p!==s.active)return t('engine.error.not_your_turn');
 if(a.type==='resign'){if(s.battle){for(let q=0;q<2;q++)s.players[q].hand.push(...s.battle.lines[q].map(clean))}finish(s,1-p,t('engine.reason.resign'));return null}
 if(s.phase==='draft'){
 if(a.type!=='draft'||!s.draft[p].includes(a.id))return t('engine.error.draft_pick');
 const offer=s.draft[p],picked=offer.indexOf(a.id);s.players[p].strategies=[a.id];s.strategyDiscard.push(...offer.filter((_,i)=>i!==picked));s.draft[p]=[];s.drafted[p]=true;if(s.drafted.every(Boolean))begin(s);else s.active=1-p;return null;
 }
 if(a.type==='strategy')return strategy(s,p,a.id,a.field,a.cards);
 if(s.phase==='campaign'){
 if(a.type==='buy_strategy')return buyStrategy(s,p,a.id);
 if(a.type==='supply'){
 if(s.supplyUsed)return t('engine.error.supply_once');if(s.players[p].supply<2||!s.deck.length)return t('engine.error.supply_cost');
 supplyFlow(s,p,t('engine.ledger.resupply'),-2);s.players[p].hand.push(clean(s.deck.pop()));s.supplyUsed=true;log(s,t('engine.log.supply_card',{name:s.players[p].name}));return null;
 }
 if(a.type==='pass'){log(s,t('engine.log.pass',{name:s.players[p].name}));nextCampaign(s);return null}
 const f=target(s,a.field);
 if(!f)return t('engine.error.pick_field');
 if(s.actionSpent&&['occupy','reorganize','attack','siege'].includes(a.type))return t('engine.error.action_spent_hint');
 if(a.type==='reorganize'){
 if(f.owner!==p)return t('engine.error.reorganize_own');
 const prepared=garrisonFromHand(s,p,a.cards,f);if(prepared.error)return prepared.error;
 const selected=new Set(prepared.line.map(c=>c.id));
 s.players[p].hand=s.players[p].hand.filter(c=>!selected.has(c.id));
 returnGarrisonCards(s,p,f.garrison);f.garrison=prepared.line;
 s.actionSpent=true;log(s,t('engine.log.reorganize',{name:s.players[p].name,field:f.label}));
 return null;
 }
 if(a.type==='rotate_garrison'){
  if(f.owner!==p)return t('engine.error.rotate_own');
  if(s.rapidRedeployUsed)return t('engine.error.rotate_used');
  const outIds=Array.isArray(a.outIds)?a.outIds:[],specs=Array.isArray(a.cards)?a.cards:[],cost=outIds.length;
  if(cost<1||cost!==specs.length)return t('engine.error.rotate_equal');
  if(new Set(outIds).size!==cost||new Set(specs.map(c=>c.id)).size!==cost)return t('engine.error.rotate_dup');
  if(s.players[p].supply<cost)return t('engine.error.rotate_cost',{cost});
  const outgoing=outIds.map(id=>f.garrison.find(c=>c.id===id));
  if(outgoing.some(c=>!c))return t('engine.error.rotate_out');
  const incoming=specs.map(spec=>{const c=s.players[p].hand.find(c=>c.id===spec.id);return c?{...clean(c),open:!!spec.open}:null});
  if(incoming.some(c=>!c))return t('engine.error.rotate_in');
  const removed=new Set(outIds),added=new Set(incoming.map(c=>c.id)),line=[...f.garrison.filter(c=>!removed.has(c.id)),...incoming];
  if(!f.capital&&!line.some(c=>c.open))return t('engine.error.rotate_open');
  s.players[p].hand=s.players[p].hand.filter(c=>!added.has(c.id));
  returnGarrisonCards(s,p,outgoing);f.garrison=line;
  supplyFlow(s,p,t('engine.ledger.rotate',{field:f.label}),-cost);s.rapidRedeployUsed=true;
  log(s,t('engine.log.rotate_garrison',{name:s.players[p].name,cost,field:f.label}));return null;
 }
 if(f.owner===p)return t('engine.error.target_enemy_or_neutral');
 if(!reachable(s,p,f))return t('engine.error.not_adjacent');
 if(a.type==='occupy'){
 if(f.owner!==null)return t('engine.error.occupy_attack');
 const specs=Array.isArray(a.cards)?a.cards:a.card!==undefined?[{id:a.card,open:true}]:[];
 const prepared=garrisonFromHand(s,p,specs,f);if(prepared.error)return prepared.error;
 const selected=new Set(prepared.line.map(c=>c.id));s.players[p].hand=s.players[p].hand.filter(c=>!selected.has(c.id));f.owner=p;f.garrison=prepared.line;
 log(s,t('engine.log.occupy',{name:s.players[p].name,field:f.label}));s.actionSpent=true;return null;
 }
 if(['attack','siege'].includes(a.type)){
  if(f.owner===null)return t('engine.error.attack_neutral');
  if(a.type==='siege'){
   if(f.garrison.length<=3)return t('engine.error.siege_none');
   if(s.players[p].supply<3)return t('engine.error.siege_cost');
   supplyFlow(s,p,t('engine.ledger.siege',{field:f.label}),-3);
  }
  startBattle(s,p,1-p,f.id,a.type==='siege');return null
 }
 return t('engine.error.invalid_campaign');
 }
 if(['defend','attack'].includes(s.phase)){
 if(a.type==='fold'){settle(s,1-p);return null}
 const limit=battleLineLimit(s,p);
 if(a.type!=='deploy'||!Array.isArray(a.cards)||a.cards.length<1||a.cards.length>limit)return t('engine.error.deploy_count',{limit});
 if(new Set(a.cards.map(c=>c.id)).size!==a.cards.length)return t('engine.error.deploy_dup');
 if(!a.cards.some(c=>c.open))return t('engine.error.deploy_open');
 const line=a.cards.map(c=>{const h=s.players[p].hand.find(h=>h.id===c.id);return h?{...h,open:!!c.open}:null});
 if(line.some(c=>!c))return t('engine.error.deploy_hand');
 if(s.phase==='attack'&&s.battle.field&&s.fields.find(f=>f.id===s.battle.field)?.type==='mountain'&&line.filter(c=>c.open).length<2)return t('engine.error.mountain_open');
 if(s.phase==='attack'&&s.battle.seaLanding&&power(line.filter(c=>c.open))[0]<power(opened(s,1-p))[0])return t('engine.error.sea_strength');
 if(s.phase==='attack'&&s.battle.seaLanding&&!seaFormationLegal(line))return t('engine.error.sea_trips');
 if(s.phase==='attack'&&compare(line.filter(c=>c.open),opened(s,1-p))<=0)return t('engine.error.attack_stronger');
 s.players[p].hand=s.players[p].hand.filter(c=>!line.some(x=>x.id===c.id));s.battle.lines[p]=line;
 log(s,t('engine.log.deploy',{name:s.players[p].name,open:line.filter(c=>c.open).length,hidden:line.filter(c=>!c.open).length}));
 if(s.phase==='defend'){s.phase='attack';s.active=s.battle.attacker}
 else{const tactical=s.players[p].strategies.some(id=>strategyById(id)?.phase==='battle');s.phase=tactical?'tactics':'counter';s.active=tactical?p:s.battle.defender}
 return null;
 }
 if(s.phase==='tactics'){
 if(a.type==='continue'){s.phase='counter';s.active=1-leading(s);return null}
 if(a.type==='fold'){settle(s,1-p);return null}
 return t('engine.error.tactics_hint');
 }
 if(s.phase==='counter'){
 if(a.type==='fold'){settle(s,1-p);return null}
 if(a.type!=='reveal'||!Array.isArray(a.ids)||a.ids.length<1||a.ids.length>2||new Set(a.ids).size!==a.ids.length)return t('engine.error.reveal_count');
 const line=s.battle.lines[p];
 if(a.ids.some(id=>!line.some(c=>c.id===id&&!c.open)))return t('engine.error.reveal_own');
 for(const c of line)if(a.ids.includes(c.id))c.open=true;
 if(s.battle.seaLanding&&p===s.battle.attacker&&!seaFormationLegal(line))return t('engine.error.sea_reveal_trips');
 log(s,t('engine.log.reveal',{name:s.players[p].name,count:a.ids.length}));
 resolveCounter(s);
 return null;
 }
 return t('engine.error.unknown');
}
export function act(state,player,action){
 const next=structuredClone(state);
 upgradeState(next);
 const error=apply(next,player,action);if(error)return {ok:false,error,state};
 validate(next);return {ok:true,state:next};
}
export function viewFor(s,p){
 const v=structuredClone(s),mask=()=>({hidden:true});
 v.rng=0;v.opt.seed=0;
 v.deck=v.deck.map(mask);
 v.players[1-p].hand=v.players[1-p].hand.map(mask);
 v.players[1-p].strategies=v.players[1-p].strategies.map(()=>'?');
 v.strategyLocked[1-p]=v.strategyLocked[1-p].map(()=>'?');
 v.draft[1-p]=v.draft[1-p].map(()=>'?');
 v.knowledge[1-p]={};
 for(const f of v.fields)if(f.owner!==p)f.garrison=f.garrison.map(c=>c.open?c:mask(c));
 if(v.battle&&v.battle.defender!==p)v.battle.garrison=(v.battle.garrison||[]).map(c=>c.open?c:mask(c));
 if(v.battle&&v.battle.defender!==p)v.battle.suppressed=(v.battle.suppressed||[]).map(c=>c.open?c:mask(c));
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
 if(v.phase==='tactics'){
 for(const id of pl.strategies)if(!canStrategy(s,p,id)&&['blitzkrieg','rank_up','paratrooper','spy','scouting'].includes(id))return {type:'strategy',id};
 return {type:'continue'};
 }
 if(v.phase==='draft')return {type:'draft',id:v.draft[p].find(id=>['rank_up','paratrooper','revolution','conscription'].includes(id))||v.draft[p][0]};
 if(v.phase==='campaign'){
 const targets=v.fields.filter(f=>f.owner!==p&&reachable(v,p,f));
 const enemy=targets.filter(f=>f.owner===1-p).sort((a,b)=>Number(b.capital)-Number(a.capital));
 const neutral=targets.filter(f=>f.owner===null).sort((a,b)=>(b.type==='oil')-(a.type==='oil'));
 const focus=enemy[0]||neutral[0];
 if(!v.marketBought&&pl.strategies.length<3){
 const priority=['international_support',...(pl.hand.length<9?['conscription']:[]),'spy','rank_up','scouting','meds_team','isr','paratrooper','economic_sanctions','airborne_raid','revolution','peace_talk','blitzkrieg'];
 const affordable=priority.find(id=>v.strategyMarket.includes(id)&&!pl.strategies.includes(id)&&!canBuyStrategy(s,p,id)&&(id==='international_support'||pl.supply-strategyById(id).price>=2));
 if(affordable)return {type:'buy_strategy',id:affordable};
 }
 for(const id of pl.strategies){
 const f=id==='revolution'?v.fields.find(x=>x.owner===null):id==='isr'?v.fields.find(x=>x.owner===1-p&&x.garrison.some(c=>c.hidden)):focus;
 // Availability is evaluated against own/visible resources, no hidden ranks.
 if(!canStrategy(s,p,id,f?.id)&&['conscription','meds_team','revolution','international_support','economic_sanctions','isr'].includes(id))return {type:'strategy',id,field:f?.id};
 }
 const rotation=v.fields.find(f=>f.owner===p&&f.garrison.filter(c=>c.open).length>=2);
 if(rotation&&pl.supply>=1&&!v.rapidRedeployUsed&&pl.hand.length){
  const outgoing=rotation.garrison.filter(c=>c.open).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];
  const incoming=[...pl.hand].sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];
  return {type:'rotate_garrison',field:rotation.id,outIds:[outgoing.id],cards:[{id:incoming.id,open:false}]};
 }
 if(pl.hand.length<10&&pl.supply>=2&&!v.supplyUsed&&v.deck.length)return {type:'supply'};
 if(v.actionSpent)return {type:'pass'};
 if(enemy.length&&(pl.hand.length>=3||!neutral.length))return {type:enemy[0].garrison.length>3&&pl.supply>=3?'siege':'attack',field:enemy[0].id};
 if(neutral.length&&pl.hand.length>1)return {type:'occupy',field:neutral[0].id,cards:[{id:[...pl.hand].sort((a,b)=>a.rank-b.rank)[0].id,open:true}]};
 if(enemy.length&&pl.hand.length)return {type:enemy[0].garrison.length>3&&pl.supply>=3?'siege':'attack',field:enemy[0].id};
 return {type:'pass'};
 }
 if(v.phase==='defend'||v.phase==='attack'){
 let choices=deployments(pl.hand);
 const field=b?.field?target(v,b.field):null;
 choices=choices.filter(l=>l.length<=battleLineLimit(v,p));
 if(v.phase==='attack')choices=choices.filter(l=>compare(l.filter(c=>c.open),opened(v,1-p))>0&&(!field||field.type!=='mountain'||l.filter(c=>c.open).length>=2)&&(!b.seaLanding||power(l.filter(c=>c.open))[0]>=power(opened(v,1-p))[0])&&(!b.seaLanding||seaFormationLegal(l)));
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
 if(s.phase==='tactics')return {type:'continue'};
 if(s.phase==='draft')return {type:'draft',id:s.draft[p][0]};
 if(s.phase==='campaign')return {type:'pass'};
 if(s.phase==='defend'){const c=[...s.players[p].hand].sort((a,b)=>a.rank-b.rank)[0];return c?{type:'deploy',cards:[{id:c.id,open:true}]}:{type:'fold'}}
 return {type:'fold'};
}
