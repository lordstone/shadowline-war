
import {MAPS,STRATEGIES,SUITS,defaults,strategyById} from './data.js';
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296}
export function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
export function makeDeck(count=1){
 const d=[];for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)d.push({id:suit*13+rank-1,rank,suit});
 d.push({id:52,rank:14,suit:4},{id:53,rank:15,suit:4});
 for(let copy=1;copy<count;copy++)for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)d.push({id:54+(copy-1)*52+suit*13+rank-1,rank,suit});
 return d;
}
export function resolvedDeckCount(opt,fields){if(opt.deckCount===1||opt.deckCount==='1')return 1;if(opt.deckCount===2||opt.deckCount==='2')return 2;return opt.rules==='campaign'&&fields.length>=12?2:1}
export function face(c){return c.rank===15?'大王':c.rank===14?'小王':({1:'A',11:'J',12:'Q',13:'K'}[c.rank]||String(c.rank))}
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
const evaluationCache=new Map();
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
export function handName(cards){return ['未出牌','高牌','对子','同花','顺子','同花顺','三条'][power(cards)[0]]}
export function opened(s,p){return s.battle?.lines[p].filter(c=>c.open)||[]}
export function terrainLimit(f){return f?.type==='swamp'?1:f?.type==='forest'?2:3}
export function garrisonLimit(f){return Math.min(f?.capital?5:f?.fortified?4:3,terrainLimit(f))}
export function battleLineLimit(s,p){const b=s.battle,f=b?.field?target(s,b.field):null;return b&&p===b.attacker?terrainLimit(f):garrisonLimit(f)}
function mapFor(s){return MAPS.find(m=>m.id===s.opt.map)}
function isSeaLink(s,a,b){return (mapFor(s)?.seaLinks||[]).some(([x,y])=>(x===a&&y===b)||(x===b&&y===a))}
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
 const text=(value,fallback)=>String(value||'').trim().slice(0,18)||fallback;
 const local=opt.mode==='local',aiName=opt.difficulty==='easy'?'新兵 AI':'老兵 AI';
 const names=[text(opt.playerNames?.[0],local?'玩家1':'玩家'),text(opt.playerNames?.[1],local?'玩家2':aiName)];
 const logos=[text(opt.playerLogos?.[0],'⟐').slice(0,2),text(opt.playerLogos?.[1],'✣').slice(0,2)];
 const factions=[text(opt.factions?.[0],''),text(opt.factions?.[1],'')];
 opt.playerNames=names;opt.playerLogos=logos;opt.factions=factions;
 const s={version:1,opt,rng:opt.seed,phase:'draft',active:opt.first===1?1:0,round:1,skirmish:0,generated:0,
 players:[{name:names[0],logo:logos[0],faction:factions[0],hand:[],reserve:[],strategies:[],supply:2,wins:0},{name:names[1],logo:logos[1],faction:factions[1],hand:[],reserve:[],strategies:[],supply:2,wins:0}],
 deck:[],fields:structuredClone(MAPS.find(m=>m.id===opt.map)?.fields||MAPS[0].fields),
 battle:null,log:[],winner:null,reason:'',draft:[[],[]],drafted:[false,false],turn:1,strategyUsed:false,supplyUsed:false,raid:false,knowledge:[{},{}],
 strategyDeck:[],strategyMarket:[],strategyDiscard:[],strategyLocked:[[],[]],marketBought:false,rapidRedeployUsed:false};
 const deckCount=resolvedDeckCount(opt,s.fields);s.baseDeckSize=54+(deckCount-1)*52;
 s.deck=shuffle(s,makeDeck(deckCount));for(let i=0;i<12;i++)for(let p=0;p<2;p++)s.players[p].hand.push(s.deck.pop());
 if(opt.rules==='campaign'){for(const f of s.fields.filter(f=>f.capital))for(let i=0;i<3;i++)f.garrison.push({...s.players[f.owner].hand.pop(),open:false});}
 else s.fields=[];
 const available=STRATEGIES.filter(c=>opt.rules==='campaign'||c.phase==='battle');
 if(opt.strategies){s.strategyDeck=shuffle(s,available.flatMap(c=>Array(c.count).fill(c.id)));for(let p=0;p<2;p++)s.draft[p]=s.strategyDeck.splice(-3)}
 s.active=0;
 if(!opt.strategies){s.drafted=[true,true];begin(s)}
 log(s,'行动准备完毕。明牌决定火力，暗牌保留变数。');validate(s);return s;
}
function log(s,msg){s.log.unshift({round:s.round,text:msg});s.log=s.log.slice(0,70)}
function clean(c){const {open,boost,...rest}=c;return rest}
function fillMarket(s){
 while(s.strategyMarket.length<3){
 if(!s.strategyDeck.length){if(!s.strategyDiscard.length)break;s.strategyDeck=shuffle(s,s.strategyDiscard.splice(0))}
 s.strategyMarket.push(s.strategyDeck.pop());
 }
}
function refreshMarket(s){s.strategyDiscard.push(...s.strategyMarket.splice(0));fillMarket(s);log(s,'策略市场已刷新。')}
export function upgradeState(s){
 if(!s.opt.deckCount)s.opt.deckCount='auto';
 if(!s.baseDeckSize)s.baseDeckSize=54;
 if(!Array.isArray(s.strategyDeck)){const held=s.players.flatMap(p=>p.strategies);s.strategyDeck=STRATEGIES.flatMap(c=>Array(Math.max(0,c.count-held.filter(id=>id===c.id).length)).fill(c.id));s.strategyMarket=[];s.strategyDiscard=[]}
 if(!Array.isArray(s.strategyMarket))s.strategyMarket=[];
 if(!Array.isArray(s.strategyDiscard))s.strategyDiscard=[];
 if(!Array.isArray(s.strategyLocked))s.strategyLocked=[[],[]];
 if(typeof s.marketBought!=='boolean')s.marketBought=false;
 if(typeof s.rapidRedeployUsed!=='boolean')s.rapidRedeployUsed=false;
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
 if(e[0]||e[1]){finish(s,e[0]&&e[1]?null:e[0]?1:0,'公共牌库耗尽，暗牌手牌耗尽');return true}return false;
}
function score(s,p){return s.players[p].reserve.length+s.fields.filter(f=>f.owner===p).length*3}
function finish(s,winner,reason){s.phase='over';s.winner=winner;s.reason=reason;s.battle=null;log(s,winner===null?'战局结束：双方平局。':s.players[winner].name+'赢得大局。')}
function begin(s){s.active=s.opt.first===1?1:0;if(s.opt.rules==='classic')startBattle(s,1-s.active,s.active,null);else{fillMarket(s);s.phase='campaign';income(s)}}
function income(s){const p=s.players[s.active],before=p.supply;p.supply=Math.min(30,p.supply+s.fields.filter(f=>f.owner===s.active&&f.blockedUntil<s.round).reduce((n,f)=>n+(f.type==='oil'?2:1),0));log(s,p.name+'收获 '+(p.supply-before)+' 点补给。')}
function nextCampaign(s){
 s.active=1-s.active;s.turn++;s.round=Math.floor((s.turn-1)/2)+1;s.phase='campaign';s.strategyUsed=false;s.supplyUsed=false;s.marketBought=false;s.rapidRedeployUsed=false;s.raid=false;s.strategyLocked[s.active]=[];
 if(exhausted(s))return;
 if(s.round>s.opt.maxRounds){const a=score(s,0),b=score(s,1);finish(s,a===b?null:a>b?0:1,'达到回合上限：比较公开牌数 + 每块领地 3 分');return}
 if(s.active===(s.opt.first===1?1:0)&&s.round>1&&(s.round-1)%3===0)refreshMarket(s);
 income(s);
}
function startBattle(s,attacker,defender,field,siege=false){
 const garrison=field?structuredClone(s.fields.find(x=>x.id===field).garrison):[];
 const suppressed=siege&&garrison.length>3?[garrison.splice(3+Math.floor(random(s)*(garrison.length-3)),1)[0]]:[];
 const lines=[[],[]];
 if(field){const f=s.fields.find(x=>x.id===field);for(const c of garrison)if(c.open)s.knowledge[attacker][c.id]=true;f.garrison=[];lines[defender]=garrison;log(s,f.label+'遭到'+s.players[attacker].name+'入侵；固定驻军直接进入防守战线。')}
 const landing=field&&seaLanding(s,attacker,s.fields.find(x=>x.id===field));
 s.skirmish++;s.battle={attacker,defender,field,garrison:[...garrison,...suppressed],suppressed,lines,strategyUsed:[false,false],seaLanding:landing};s.phase=field?'attack':'defend';s.active=field?attacker:defender;s.strategyUsed=false;log(s,'第 '+s.skirmish+' 次交锋：'+(field?s.players[attacker].name+'准备突破固定驻军。':s.players[defender].name+'先部署防线。'));
 if(landing)log(s,'跨海登陆：进攻牌型须不低于守军，且不能组成三条。');
 if(suppressed.length)log(s,'围城封锁了 1 张预备守军；该牌本次交锋不参与牌型。');
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
 if(winner!==null){s.players[winner].wins++;log(s,s.players[winner].name+'赢得交锋，收取双方明牌。')}
 else log(s,'双方停火，各自回收战线。');
 s.battle=null;s.active=b.attacker;
 if(b.field){
 const f=s.fields.find(x=>x.id===b.field);
 if(winner===b.attacker)log(s,s.players[winner].name+'夺取'+f.label+'，进攻战线转为新驻军。');
 else log(s,f.label+'的固定驻军守住据点。');
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
function resolveCounter(s){
 const winner=leading(s),suppressed=1-winner;
 if(!s.battle.lines[suppressed].some(c=>!c.open)){
 log(s,s.players[suppressed].name+'没有战线暗牌，仍被压制。');settle(s,winner);
 }else{
 s.phase='counter';s.active=suppressed;
 log(s,'轮到'+s.players[suppressed].name+'翻开暗牌反击或撤退。');
 }
}
export function reachable(s,p,f){return s.raid||s.fields.some(x=>x.owner===p&&x.links.includes(f.id))}
function target(s,id){return s.fields.find(x=>x.id===id)}
function strategyError(s,p,id,fieldId){
 const c=strategyById(id);if(!c||!s.players[p].strategies.includes(id))return '没有这张策略卡。';
 if(s.strategyLocked[p].includes(id))return '新购策略将在你的下一个地图回合解锁。';
 const campaign=s.phase==='campaign';
 if(c.phase==='campaign'&&!campaign)return '这张策略卡只能在地图行动阶段使用。';
 if(c.phase==='battle'&&!['tactics','counter'].includes(s.phase))return '双方部署后，在战术窗口或反击阶段使用。';
 if(campaign?s.strategyUsed:s.battle.strategyUsed[p])return '本回合已经使用过策略卡。';
 const enemy=1-p,f=target(s,fieldId),line=s.battle?.lines[p]||[],other=s.battle?.lines[enemy]||[];
 if(['conscription','paratrooper'].includes(id)&&!s.deck.length)return '公共牌库已空。';
 if(id==='meds_team'&&!s.players[p].reserve.length)return '没有可回收的公开牌。';
 if(id==='isr'&&(!f||f.owner!==enemy||!f.garrison.some(c=>!c.open)))return '请先选择有暗牌驻军的敌方据点。';
 if(['spy','scouting'].includes(id)&&!other.some(c=>!c.open))return '敌方战线没有暗牌。';
 if(id==='paratrooper'&&line.length>=battleLineLimit(s,p))return '战线已满，受当前地形容量限制。';
 if(id==='paratrooper'&&s.battle?.seaLanding&&p===s.battle.attacker)return '跨海登陆不能使用空降增援，避免组成三条。';
 if(id==='rank_up'&&!line.some(c=>rankUpAllowed(s,p,line,c)))return '没有可晋升的普通明牌。';
 if(id==='blitzkrieg'&&leading(s)!==p)return '闪电战需要己方占优；在进攻部署后的战术窗口使用。';
 if(id==='revolution'&&(!f||f.owner!==null))return '请先选择中立据点。';
 if(id==='economic_sanctions'&&(!f||f.owner!==enemy))return '请先选择敌方据点。';
 return null;
}
export function canStrategy(s,p,id,fieldId){return p===s.active&&s.phase!=='over'?strategyError(s,p,id,fieldId):'尚未轮到你行动。'}
export function canBuyStrategy(s,p,id){
 if(s.phase!=='campaign'||p!==s.active)return '只能在自己的地图行动阶段购买。';
 if(!s.opt.strategies)return '本局未开启策略牌。';
 const c=strategyById(id);if(!c||!s.strategyMarket.includes(id))return '策略市场中没有这张牌。';
 if(s.marketBought)return '每个地图回合只能购买一张策略牌。';
 if(s.players[p].strategies.length>=3)return '最多持有三张策略牌。';
 if(s.players[p].strategies.includes(id))return '不能同时持有同名策略牌。';
 if(s.players[p].supply<c.price)return '需要 '+c.price+' 点补给。';
 return null;
}
function buyStrategy(s,p,id){
 const error=canBuyStrategy(s,p,id);if(error)return error;
 const c=strategyById(id),i=s.strategyMarket.indexOf(id);s.players[p].supply-=c.price;s.players[p].strategies.push(id);s.strategyLocked[p].push(id);s.strategyMarket.splice(i,1);s.marketBought=true;fillMarket(s);log(s,s.players[p].name+'花费 '+c.price+' 点补给购买「'+c.name+'」，下回合解锁。');return null;
}
function garrisonFromHand(s,p,specs,field){
 const limit=garrisonLimit(field);
 if(!Array.isArray(specs)||specs.length<1||specs.length>limit)return {error:'该据点驻军必须选择 1–'+limit+' 张牌。'};
 if(new Set(specs.map(c=>c.id)).size!==specs.length)return {error:'不能重复选择同一张驻军牌。'};
 if(!field.capital&&!specs.some(c=>c.open))return {error:'非首都据点至少需要 1 张明牌驻军。'};
 const line=specs.map(spec=>{const c=s.players[p].hand.find(c=>c.id===spec.id);return c?{...clean(c),open:!!spec.open}:null});
 if(line.some(c=>!c))return {error:'只能选择自己的手牌驻军。'};
 return {line};
}
function strategy(s,p,id,fieldId){
 const error=strategyError(s,p,id,fieldId);if(error)return error;
 const pl=s.players[p],enemy=1-p,f=target(s,fieldId),pick=a=>a[Math.floor(random(s)*a.length)];
 pl.strategies.splice(pl.strategies.indexOf(id),1);
 s.strategyDiscard.push(id);
 if(s.phase==='campaign')s.strategyUsed=true;else s.battle.strategyUsed[p]=true;
 log(s,pl.name+'使用「'+strategyById(id).name+'」。');
 switch(id){
 case 'conscription':pl.hand.push(clean(s.deck.pop()));break;
 case 'meds_team':pl.hand.push(clean(pl.reserve.splice(Math.floor(random(s)*pl.reserve.length),1)[0]));break;
 case 'spy':{const c=pick(s.battle.lines[enemy].filter(c=>!c.open));s.knowledge[p][c.id]=true;break}
 case 'isr':pick(f.garrison.filter(c=>!c.open)).open=true;break;
 case 'paratrooper':s.battle.lines[p].push({...clean(s.deck.pop()),open:true});if(s.phase==='counter')resolveCounter(s);break;
 case 'rank_up':{const c=pick(s.battle.lines[p].filter(c=>rankUpAllowed(s,p,s.battle.lines[p],c)));c.boost=(c.boost||0)+1;if(s.phase==='counter')resolveCounter(s);break}
 case 'scouting':pick(s.battle.lines[enemy].filter(c=>!c.open)).open=true;resolveCounter(s);break;
 case 'peace_talk':settle(s,null);break;
 case 'revolution':f.owner=p;f.garrison.push({id:s.baseDeckSize+s.generated++,rank:1,suit:Math.floor(random(s)*4),open:true});nextCampaign(s);break;
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
 const offer=s.draft[p],picked=offer.indexOf(a.id);s.players[p].strategies=[a.id];s.strategyDiscard.push(...offer.filter((_,i)=>i!==picked));s.draft[p]=[];s.drafted[p]=true;if(s.drafted.every(Boolean))begin(s);else s.active=1-p;return null;
 }
 if(a.type==='strategy')return strategy(s,p,a.id,a.field);
 if(s.phase==='campaign'){
 if(a.type==='buy_strategy')return buyStrategy(s,p,a.id);
 if(a.type==='supply'){
 if(s.supplyUsed)return '每个地图回合只能补给一次。';if(s.players[p].supply<2||!s.deck.length)return '需要 2 点补给和非空公共牌库。';
 s.players[p].supply-=2;s.players[p].hand.push(clean(s.deck.pop()));s.supplyUsed=true;log(s,s.players[p].name+'补充了一张暗牌。');return null;
 }
 if(a.type==='pass'){log(s,s.players[p].name+'结束地图行动。');nextCampaign(s);return null}
 const f=target(s,a.field);
 if(!f)return '请选择地图据点。';
 if(['reorganize','rapid_redeploy'].includes(a.type)){
 if(f.owner!==p)return '只能调整己方据点的驻军。';
 if(a.type==='rapid_redeploy'&&(s.rapidRedeployUsed||s.players[p].supply<3))return s.rapidRedeployUsed?'本回合已经快速换防。':'快速换防需要 3 点补给。';
 const prepared=garrisonFromHand(s,p,a.cards,f);if(prepared.error)return prepared.error;
 const selected=new Set(prepared.line.map(c=>c.id));
 s.players[p].hand=s.players[p].hand.filter(c=>!selected.has(c.id));
 s.players[p].hand.push(...f.garrison.map(clean));f.garrison=prepared.line;
 if(a.type==='rapid_redeploy'){s.players[p].supply-=3;s.rapidRedeployUsed=true;log(s,s.players[p].name+'花费 3 点补给，快速调整'+f.label+'驻军。')}
 else{log(s,s.players[p].name+'整编'+f.label+'驻军并结束地图行动。');nextCampaign(s)}
 return null;
 }
 if(f.owner===p)return '请选择中立或敌方据点。';
 if(!reachable(s,p,f))return '目标必须与己方领地相邻。';
 if(a.type==='occupy'){
 if(f.owner!==null)return '该据点已有驻军，需要发起进攻。';
 const specs=Array.isArray(a.cards)?a.cards:a.card!==undefined?[{id:a.card,open:true}]:[];
 const prepared=garrisonFromHand(s,p,specs,f);if(prepared.error)return prepared.error;
 const selected=new Set(prepared.line.map(c=>c.id));s.players[p].hand=s.players[p].hand.filter(c=>!selected.has(c.id));f.owner=p;f.garrison=prepared.line;
 log(s,s.players[p].name+'占领'+f.label+'。');nextCampaign(s);return null;
 }
 if(['attack','siege'].includes(a.type)){
  if(f.owner===null)return '中立据点请使用占领。';
  if(a.type==='siege'){
   if(f.garrison.length<=3)return '该据点没有可封锁的预备守军。';
   if(s.players[p].supply<3)return '围城需要 3 点补给。';
   s.players[p].supply-=3;
  }
  startBattle(s,p,1-p,f.id,a.type==='siege');return null
 }
 return '地图行动无效。';
 }
 if(['defend','attack'].includes(s.phase)){
 if(a.type==='fold'){settle(s,1-p);return null}
 const limit=battleLineLimit(s,p);
 if(a.type!=='deploy'||!Array.isArray(a.cards)||a.cards.length<1||a.cards.length>limit)return '本次部署必须选择 1–'+limit+' 张牌。';
 if(new Set(a.cards.map(c=>c.id)).size!==a.cards.length)return '不能重复部署同一张牌。';
 if(!a.cards.some(c=>c.open))return '至少部署 1 张明牌。';
 const line=a.cards.map(c=>{const h=s.players[p].hand.find(h=>h.id===c.id);return h?{...h,open:!!c.open}:null});
 if(line.some(c=>!c))return '只能部署自己的手牌。';
 if(s.phase==='attack'&&s.battle.field&&s.fields.find(f=>f.id===s.battle.field)?.type==='mountain'&&line.filter(c=>c.open).length<2)return '山地进攻必须至少亮出 2 张牌。';
 if(s.phase==='attack'&&s.battle.seaLanding&&power(line.filter(c=>c.open))[0]<power(opened(s,1-p))[0])return '跨海登陆的进攻牌型必须不低于防守方。';
 if(s.phase==='attack'&&s.battle.seaLanding&&!seaFormationLegal(line))return '跨海登陆不能组成三条。';
 if(s.phase==='attack'&&compare(line.filter(c=>c.open),opened(s,1-p))<=0)return '进攻方的明牌牌力必须严格大于防守方。';
 s.players[p].hand=s.players[p].hand.filter(c=>!line.some(x=>x.id===c.id));s.battle.lines[p]=line;
 log(s,s.players[p].name+'部署 '+line.filter(c=>c.open).length+' 明 / '+line.filter(c=>!c.open).length+' 暗。');
 if(s.phase==='defend'){s.phase='attack';s.active=s.battle.attacker}
 else{const tactical=s.players[p].strategies.some(id=>strategyById(id)?.phase==='battle');s.phase=tactical?'tactics':'counter';s.active=tactical?p:s.battle.defender}
 return null;
 }
 if(s.phase==='tactics'){
 if(a.type==='continue'){s.phase='counter';s.active=1-leading(s);return null}
 if(a.type==='fold'){settle(s,1-p);return null}
 return '使用一张交锋策略，或继续进入反击阶段。';
 }
 if(s.phase==='counter'){
 if(a.type==='fold'){settle(s,1-p);return null}
 if(a.type!=='reveal'||!Array.isArray(a.ids)||a.ids.length<1||a.ids.length>2||new Set(a.ids).size!==a.ids.length)return '请选择 1 或 2 张暗牌翻开。';
 const line=s.battle.lines[p];
 if(a.ids.some(id=>!line.some(c=>c.id===id&&!c.open)))return '只能翻开己方尚未揭示的战线牌。';
 for(const c of line)if(a.ids.includes(c.id))c.open=true;
 if(s.battle.seaLanding&&p===s.battle.attacker&&!seaFormationLegal(line))return '跨海登陆不能通过翻牌组成三条。';
 log(s,s.players[p].name+'翻开 '+a.ids.length+' 张暗牌。');
 resolveCounter(s);
 return null;
 }
 return '未知行动。';
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
 if(pl.hand.length<10&&pl.supply>=2&&!v.supplyUsed&&v.deck.length)return {type:'supply'};
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
