
import {MAPS,STRATEGIES,defaults,strategyById,SUITS} from './data.js';
import {createGame,act,face,handName,power,compare,opened,leading,reachable,garrisonLimit,seaLanding,isSeaLink,battleLineLimit,canStrategy,canBuyStrategy,aiAction,timeoutAction,validate,upgradeState,resolvedDeckCount,orderForDisplay} from './engine.js';
import {Battlefield} from './battlefield.js';
import {actionEvents} from './events.js';
import {GEO_BACKDROPS} from './map-geography.js';
const app=document.querySelector('#app'),sceneEl=document.querySelector('#scene');
const scene=new Battlefield(sceneEl);
let s=null,options={...defaults,seed:Math.floor(Math.random()*4294967296)},selection=new Map(),reveals=new Set(),focus=null,gate=false,modal=null,aiTask=null,deadline=null,remaining=null,clockKey='',muted=false;
let handSort='rank';
let advancedOpen=false;
let targeting=null;
let events=[],eventEnd=null,eventRemaining=null,newCards=new Set();
let mapViewport={x:0,y:0,scale:1},mapDrag=null,mapPointers=new Map(),fittedMap=null;
const STORE='shadowline-war-v1';
const mapSymbol=id=>({duel:'⟁',rift:'⋈',ring:'◎',eastern_front:'⇥',korea:'↕',western_front:'⇆',hormuz:'≋',china_civil_war:'山'}[id]||'◇');
const LOGOS=['⟐','✣','♜','⚓','▲','✦','◈','☄'];
const factionLogo=(map,faction)=>map.factionLogos?.[map.factions.indexOf(faction)]||LOGOS[Math.max(0,map.factions.indexOf(faction))];
const sideOf=p=>s?.players[p]?.side??p;
const themedFields=fields=>fields.map(f=>({...f,owner:f.owner===null?null:sideOf(f.owner)}));
const fieldIcon=f=>f.capital?'♜':f.fortified?'▰':f.type==='oil'?'▥':f.type==='port'?'⚓':f.type==='mountain'?'▲':f.type==='forest'?'♣':f.type==='swamp'?'≈':'◆';
const geoBackdrop=map=>GEO_BACKDROPS[map.id]?'<svg class="geo-backdrop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+GEO_BACKDROPS[map.id]+'</svg>':'';
const orderedCards=(cards,allKnown=false)=>allKnown?orderForDisplay(cards):[...orderForDisplay(cards.filter(c=>c.open)),...cards.filter(c=>!c.open)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,cls='',disabled=false,extra='')=>'<button class="'+cls+'" data-action="'+action+'" '+(disabled?'disabled ':'')+extra+'>'+label+'</button>';
const viewer=()=>s?.opt.mode==='ai'?0:s?.active??0;
const isAI=()=>s?.opt.mode==='ai'&&s.active===1&&s.phase!=='over';
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.job);toast.job=setTimeout(()=>el.classList.remove('show'),3800)}
function sound(type='click'){
 if(muted||!(s?.opt.sound??options.sound))return;
 try{const ctx=sound.ctx||(sound.ctx=new(window.AudioContext||window.webkitAudioContext)());ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(type==='win'?440:220,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(type==='win'?880:130,ctx.currentTime+.14);g.gain.setValueAtTime(.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);o.start();o.stop(ctx.currentTime+.23)}catch{}
}
function save(){try{if(s&&s.phase!=='over')localStorage.setItem(STORE,JSON.stringify(s));else localStorage.removeItem(STORE)}catch{}}
function saved(){try{const value=JSON.parse(localStorage.getItem(STORE));if(value?.version===1){upgradeState(value);validate(value);return value}}catch{}return null}
function pause(){if(deadline!==null){remaining=Math.max(0,deadline-Date.now());deadline=null}if(eventEnd!==null){eventRemaining=Math.max(0,eventEnd-Date.now());eventEnd=null}clearTimeout(aiTask)}
function resume(){if(events.length){eventEnd=Date.now()+(eventRemaining??3000);eventRemaining=null}else if(remaining!==null){deadline=Date.now()+remaining;remaining=null}}
function showModal(kind){pause();modal=kind;render()}
function card(c,{hidden=false,selected=false,stance=null,interactive=false,small=false,action='card',peek=false,revealable=false}={}){
 const color=!hidden?(c.rank===15?'joker-gold':c.rank===14?'joker-silver':c.suit===1||c.suit===3?'red':''):'';
 const label=hidden?'未揭示暗牌':face(c)+(SUITS[c.suit]||' ★');
 const tag=interactive?'button':'div';
 const attributes=interactive?' data-action="'+action+'" data-id="'+c.id+'" aria-label="'+esc(label+(stance===true?'，已选明牌':stance===false?'，已选暗牌':'，点击选择'))+'" aria-pressed="'+selected+'"':'';
 return '<'+tag+' class="playing-card '+color+' '+(hidden?'back ':'')+(selected?'selected ':'')+(small?'small ':'')+(stance===false?'concealed ':'')+(revealable?'revealable ':'')+'"'+attributes+'>'+
 (hidden?'<span class="card-back-mark">S<svg class="card-back-caption" viewBox="0 0 120 16" aria-hidden="true"><text x="60" y="12" text-anchor="middle" textLength="114" lengthAdjust="spacingAndGlyphs">SHADOWLINE</text></svg></span>':'<span class="card-corner">'+face(c)+'<i>'+(SUITS[c.suit]||'★')+'</i></span><span class="card-suit">'+(SUITS[c.suit]||'★')+'</span><span class="card-bottom">'+face(c)+'</span>')+
 (stance!==null?'<span class="stance">'+(revealable?(selected?'已选择':'点击翻开'):(stance?'明部署':'暗部署'))+'</span>':'')+(peek?'<span class="peek">已侦察</span>':'')+(c.boost?'<span class="boost">+'+c.boost+'</span>':'')+(!hidden&&newCards.has(c.id)?'<span class="new-card-badge">新</span>':'')+'</'+tag+'>';
}
function strategyCard(id,action='choose-strategy',disabled=false){
 const c=strategyById(id);return '<button class="strategy-card" data-action="'+action+'" data-id="'+id+'" '+(disabled?'disabled':'')+'><span class="strategy-top"><span>'+c.icon+'</span><small>'+(c.phase==='battle'?'交锋战术':'战役指令')+'</small></span><h3>'+c.name+'</h3><p>'+c.desc+'</p><span class="strategy-foot">'+(action==='choose-strategy'?'选择此策略 ↗':'单次使用')+'</span></button>';
}
function header(menu=false){
 const identityName=(options.playerNames?.[0]|| (options.mode==='local'?'玩家1':'玩家')).trim();
 const identityLogo=options.playerLogos?.[0]||LOGOS[0];
 return '<header class="topbar"><a class="brand" href="#" data-action="'+(menu?'none':'pause')+'"><img class="brand-mark" src="./assets/icons/shadowline-32.png" alt="暗线战争"><span>暗线战争<small>SHADOWLINE / WAR ROOM</small></span></a>'+
 (menu?'<span class="top-meta">TACTICAL CARD WARFARE <span class="live-dot"></span> 离线就绪</span>':'<div class="round-info"><span>'+(s.opt.rules==='campaign'?'战役':'经典交锋')+'</span><b>'+String(s.round).padStart(2,'0')+'</b><span>回合</span>'+(s.opt.rules==='campaign'&&s.phase!=='draft'?'<span class="action-point '+(s.actionSpent?'spent':'available')+'"><i></i><span class="action-label">主要行动</span><strong>'+(s.actionSpent?'0 / 1':'1 / 1')+'</strong></span>':'')+'<span id="clock" class="clock"></span></div>')+
 '<div class="top-actions">'+(menu?'<button class="identity-chip" data-action="edit-identity" aria-label="选择名字和徽记" title="选择名字和徽记"><span class="identity-emblem">'+identityLogo+'</span><b>'+esc(identityName)+'</b></button>':'')+btn(muted?'音效关闭':'音效开启','sound','text-button')+(menu?btn('教程','tutorial','text-button'):'')+btn('规则','rules','text-button')+(menu?'':btn('暂停','pause','icon-button'))+'</div></header>';
}
function optionSelect(name,label,entries,value){return '<label class="option"><span>'+label+'</span><select data-option="'+name+'">'+entries.map(([v,t])=>'<option value="'+v+'" '+(String(value)===String(v)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'}
function logoPicker(player){const selected=options.playerLogos?.[player]||LOGOS[player];return '<div class="logo-picker" role="radiogroup" aria-label="选择徽记">'+LOGOS.map(icon=>'<label class="logo-choice"><input type="radio" name="player-logo-'+player+'" data-option="playerLogo'+player+'" value="'+icon+'" '+(selected===icon?'checked':'')+'><span>'+icon+'</span></label>').join('')+'</div>'}
function identityFields(player,label){const selected=options.playerLogos?.[player]||LOGOS[player];return '<div class="identity-editor"><div class="identity-preview"><span>'+selected+'</span><small>当前徽记</small></div><div class="identity-controls"><label class="identity-name"><span>'+label+'名称</span><input data-option="playerName'+player+'" maxlength="18" placeholder="'+(options.mode==='local'?'玩家'+(player+1):'玩家')+'" value="'+esc(options.playerNames?.[player]||'')+'"></label><span class="identity-label">选择徽记</span>'+logoPicker(player)+'</div></div>'}
function menu(){
 const map=MAPS.find(m=>m.id===options.map);
 return header(true)+'<section class="command-menu"><div class="setup-panel"><div class="eyebrow"><span></span> 作战部署 / OPERATION SETUP</div><h1>明面交火。<br><em>暗线制胜。</em></h1><p class="intro">一组牌库，一场信息战争。<br>建立防线，隐藏底牌，夺取敌方首都。</p>'+
 '<div class="field-label">01 / 选择对战模式</div><div class="segmented">'+btn('<b>◈ 人机对战</b><small>与战术 AI 交锋</small>','mode-ai',options.mode==='ai'?'active':'')+btn('<b>⧉ 双人对战</b><small>同机轮流 · 手牌遮蔽</small>','mode-local',options.mode==='local'?'active':'')+'</div>'+
 '<div class="field-label">02 / 选择战场</div><div class="map-choices">'+MAPS.map(m=>'<button class="map-choice '+(m.id===options.map?'active':'')+'" data-action="map" data-id="'+m.id+'"><span class="map-symbol">'+mapSymbol(m.id)+'</span><span><b>'+m.name+'</b><small>'+m.subtitle+'</small></span><i>'+(m.id===options.map?'●':'○')+'</i><em class="map-tag'+(m.historical?' hist':'')+'">'+(m.historical?'史实':'对战')+'</em></button>').join('')+'</div>'+
 '<details class="advanced" '+(advancedOpen?'open':'')+'><summary>高级选项 <span>＋</span></summary><div class="advanced-grid">'+
 optionSelect('rules','胜利规则',[['campaign','战役 · 夺取首都'],['classic','经典 · 暗牌耗尽']],options.rules)+
 optionSelect('difficulty','AI 风格',[['easy','新兵 · 节省兵力'],['normal','老兵 · 组合与伏兵']],options.difficulty)+
 optionSelect('eventSeconds','事件展示时长',[[1,'1 秒 · 快速'],[3,'3 秒 · 标准'],[5,'5 秒 · 慢速']],options.eventSeconds||3)+
 optionSelect('timer','每次行动限时',[[0,'不限时'],[30,'30 秒'],[60,'60 秒'],[120,'120 秒']],options.timer)+
 optionSelect('first','先行方',[[0,'玩家先行'],[1,'对手先行']],options.first)+
 (map.historical?optionSelect('deployment','开局态势',[['standard','标准 · 仅控制首都'],['historical','史实 · '+map.historical.label]],options.deployment||'standard'):'')+
 optionSelect('faction0','玩家势力',map.factions.map(x=>[x,x]),options.factions?.[0]||map.factions[0])+
 optionSelect('faction1',options.mode==='local'?'玩家 2 势力':'AI 势力',map.factions.map(x=>[x,x]),options.factions?.[1]||map.factions[1])+
 optionSelect('strategies','初始策略卡',[[true,'开启 · 三选一'],[false,'关闭 · 纯扑克牌']],options.strategies)+
 optionSelect('deckCount','公共牌库',[['auto','跟随地图'],[1,'1 副 · 54 张'],[2,'2 副 · 106 张']],options.deckCount||'auto')+
 optionSelect('maxRounds','回合上限',[[40,'40'],[80,'80'],[120,'120']],options.maxRounds)+
 '<label class="option"><span>战局种子</span><input data-option="seed" type="number" min="0" max="4294967295" value="'+options.seed+'"></label>'+
 '<p class="option-note">当前牌库：'+(resolvedDeckCount(options,map.fields)===2?'2 副，共 106 张（仅一对大小王）':'1 副，共 54 张')+'。跟随地图时，12 个以上据点使用 2 副，其余使用 1 副。</p></div></details>'+
 btn('进入战场 <span>→</span>','start','primary launch')+(saved()?btn('继续本机存档','load','resume-button'):'')+
 '<div class="menu-foot">'+(resolvedDeckCount(options,map.fields)===2?'106':'54')+' 张扑克牌 <i></i> 隐藏信息博弈 <i></i> 无需联网</div></div>'+
 '<div class="menu-visual"><div class="map-heading"><span>战区预览 / '+map.id.toUpperCase()+'</span><b>'+map.name+'</b></div><div class="scene-mount" id="visual-mount"></div>'+geoBackdrop(map)+'<div class="visual-corner tl"></div><div class="visual-corner br"></div><div class="map-caption"><span class="coordinates">SECTOR '+map.fields.length+' / '+(options.rules==='classic'?'SKIRMISH':'CAPITAL STRIKE')+'</span><p>'+map.desc+'</p></div><div class="side-word">SHADOWLINE</div></div></section>';
}
function playerPanel(p){
 const pl=s.players[p],report=s.supplyLedger?.[p],tip=report?'第 '+report.round+' 回合：'+report.entries.map(e=>e.label+' '+(e.amount>0?'+':'')+e.amount).join('；'):'尚未进行本回合补给结算';
 return '<button class="army-panel army-'+sideOf(p)+' '+(s.active===p?'current':'')+'" data-action="reserve" data-player="'+p+'"><span class="army-insignia">'+(pl.logo|| (sideOf(p)===0?'⟐':'✣'))+'</span><span><b>'+pl.name+'</b><small>'+(pl.faction?pl.faction+' · ':'')+(s.active===p?'正在行动':'待命')+'</small></span><div class="army-stats"><span><b>'+pl.hand.length+'</b>暗牌</span><span><b>'+pl.reserve.length+'</b>公开牌</span><span class="supply-stat" data-action="supply-ledger" data-player="'+p+'" title="'+esc(tip)+'"><b>'+pl.supply+'</b>补给<i>ⓘ</i></span><span><b>'+s.fields.filter(f=>f.owner===p).reduce((n,f)=>n+f.garrison.length,0)+'</b>驻军</span></div></button>';
}
function statusText(){
 if(s.phase==='draft')return '选择初始策略';
 if(s.phase==='campaign')return '选择地图目标';
 if(s.phase==='defend')return '防守方部署';
 if(s.phase==='attack')return '进攻方部署';
 if(s.phase==='tactics')return '进攻方战术窗口';
 if(s.phase==='counter')return '被压制方反击';
 return '战役结束';
}
function draft(){
 const p=viewer();return '<section class="draft-screen"><div class="eyebrow">情报简报 / STRATEGY DRAFT</div><h1>决定你的第一步。</h1><p>'+s.players[s.active].name+'：从三张策略中保留一张。每张只能使用一次。</p>'+
 (isAI()?'<div class="ai-thinking"><span></span>敌方正在选择战术…</div>':'<div class="draft-grid">'+s.draft[p].map(id=>strategyCard(id)).join('')+'</div>')+
 '<div class="draft-help">策略不会替代核心牌力规则。你仍需要决定哪些牌公开、哪些牌留在暗处。</div></section>';
}
function mapGarrison(f,p){
 if(!f.garrison.length)return '';
 const cards=orderedCards(f.garrison,f.owner===p);
 return '<span class="map-garrison" aria-label="'+esc(f.label+'驻军 '+f.garrison.length+' 张')+'">'+cards.map(c=>{const hidden=!c.open&&f.owner!==p,label=hidden?'?':face(c)+(SUITS[c.suit]||'★'),tone=!hidden?(c.rank===15?'joker-gold':c.rank===14?'joker-silver':c.suit===1||c.suit===3?'red':''):'';return '<span class="map-mini-card '+(hidden?'back':c.open?'open':'concealed')+' '+tone+'" title="'+esc(hidden?'敌方暗牌':(c.open?'明牌 ':'己方暗牌 ')+label)+'">'+label+'</span>'}).join('')+'</span>';
}
function seaLaneD(a,b,others){
 const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
 const off=Math.max(2.5,Math.min(11,len*0.22)),nx=-dy/len,ny=dx/len;
 const clearance=sg=>{const cx=mx+nx*off*sg,cy=my+ny*off*sg;let m=1e9;
  for(const t of [0.25,0.5,0.75]){const px=(1-t)*(1-t)*a.x+2*(1-t)*t*cx+t*t*b.x,py=(1-t)*(1-t)*a.y+2*(1-t)*t*cy+t*t*b.y;
   for(const o of others||[]){const d=Math.hypot(px-o.x,py-o.y);if(d<m)m=d}}
  return m};
 const sg=clearance(1)>=clearance(-1)?1:-1,cx=mx+nx*off*sg,cy=my+ny*off*sg;
 const f=n=>n.toFixed(2);
 return 'M '+f(a.x)+' '+f(a.y)+' Q '+f(cx)+' '+f(cy)+' '+f(b.x)+' '+f(b.y);
}
function mapView(){
 const p=viewer(),f=s.fields.find(f=>f.id===focus),map=MAPS.find(m=>m.id===s.opt.map);
 const selectedLinks=new Set(f?.links||[]);
 const actionable=s.active===p&&!isAI(),primaryAvailable=actionable&&!s.actionSpent,can=f&&f.owner!==p&&reachable(s,p,f);
 const limit=garrisonLimit(f),chosen=[...selection].map(([id,open])=>({id,open})),placementValid=chosen.length>0&&chosen.length<=limit&&(f?.capital||chosen.some(c=>c.open));
 const terrainNote=!f?'':f.type==='swamp'?'沼泽：攻守与驻军最多 1 张。':f.type==='forest'?'林地：攻守与驻军最多 2 张。':f.type==='mountain'?'山地：进攻至少亮出 2 张牌。':f.type==='port'&&seaLanding(s,p,f)?'跨海登陆：不能组成三条，进攻牌型须不低于守军。':'';
 const topology='<svg class="topology-lines '+(f?'has-focus':'')+'" viewBox="0 0 100 100" preserveAspectRatio="none">'+s.fields.flatMap(a=>a.links.filter(id=>a.id.localeCompare(id)<0).map(id=>{const b=s.fields.find(f=>f.id===id);if(!b)return '';const active=focus===a.id||focus===b.id,direction=focus===b.id?' reverse':'';if(isSeaLink(s,a.id,b.id)){const d=seaLaneD(a,b,s.fields.filter(o=>o!==a&&o!==b));return '<g class="map-route sea-route'+(active?' active':'')+'"><path class="route-base sea-base" data-a="'+a.id+'" data-b="'+b.id+'" d="'+d+'"/><g class="sea-ship"><animateMotion dur="7s" repeatCount="indefinite" path="'+d+'"/><g class="sea-ship-icon" transform="scale(0.29,0.7) translate(-5,-5)"><path d="M1,6.8 L9,6.8 L7.6,9.6 L2.4,9.6 Z" fill="#a9cfdd"/><rect x="4.75" y="1.6" width="0.5" height="5.4" fill="#a9cfdd"/><path d="M5.5,1.8 L5.5,6.2 L8.4,6.2 Z" fill="#e8cf95"/><path d="M4.5,2.6 L4.5,6.2 L2.2,6.2 Z" fill="#e2eae8"/></g></g>'+(active?'<path class="route-pulse sea-pulse'+direction+'" data-a="'+a.id+'" data-b="'+b.id+'" d="'+d+'"/>':'')+'</g>'}return '<g class="map-route '+(active?'active':'')+'"><line class="route-base" data-a="'+a.id+'" data-b="'+b.id+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>'+(active?'<line class="route-pulse'+direction+'" data-a="'+a.id+'" data-b="'+b.id+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>':'')+'</g>'})).join('')+'</svg>';
 return (targeting?'<div class="targeting-note">'+strategyById(targeting).name+'：点击符合条件的地图据点'+btn('取消','cancel-target','text-button')+'</div>':'')+'<div class="war-map"><div class="map-title"><div class="eyebrow">战术地图 / LIVE OPERATIONS</div><h2>'+map.name+'</h2></div><div class="map-stage '+(s.fields.length>9?'dense-map':'')+'"><div class="map-camera" style="--map-x:'+mapViewport.x+'px;--map-y:'+mapViewport.y+'px;--map-scale:'+mapViewport.scale+'"><div id="visual-mount" class="scene-mount"></div>'+geoBackdrop(map)+'</div>'+topology+'<div class="node-layer">'+s.fields.map(site=>'<button class="map-node owner-'+(site.owner===null?'null':sideOf(site.owner))+' '+(site.id===focus?'focused ':'')+(selectedLinks.has(site.id)?'route-neighbor ':'')+(reachable(s,p,site)&&site.owner!==p?'reachable':'')+'" data-action="focus" data-id="'+site.id+'" style="left:'+site.x+'%;top:'+site.y+'%"><span class="node-icon">'+fieldIcon(site)+'</span><b>'+site.label+'</b>'+mapGarrison(site,p)+'<small>'+(site.owner===null?'中立区域':site.owner===p?'己方控制':'敌方控制')+' · 容量 '+garrisonLimit(site)+(site.blockedUntil>=s.round?' · 封锁中':'')+'</small></button>').join('')+'</div><div class="map-controls"><button data-map-control="in" aria-label="放大战场">＋</button><button data-map-control="out" aria-label="缩小战场">－</button><button data-map-control="reset" aria-label="重置战场视图">⌖</button></div><span class="map-gesture-hint">拖动战场 · 双指或滚轮缩放</span><span class="map-compass">N<br>↑</span></div>'+
 '<div class="target-bar"><div><small>当前目标</small><b>'+(f?f.label+' · 容量 '+limit:'选择地图上的据点')+'</b><p>'+(f?f.owner===p?'可按张快速轮换，或从手牌重新编组整支驻军；撤下的明牌进入公开牌堆，暗牌返回手牌。':!can?'目标尚不相邻，需要先建立进军路线。':f.owner===null?'选择 1–'+limit+' 张手牌驻军，非首都至少 1 张明牌。':'守军公开牌超过 3 张时自动计算最强三张；可用围城封锁一张预备守军。':'青色：'+s.players.find(pl=>pl.side===0).faction+'；橙色：'+s.players.find(pl=>pl.side===1).faction+'。')+'</p>'+(terrainNote?'<span class="garrison-info">'+terrainNote+'</span>':'')+(f?.garrison.length?'<span class="garrison-info">驻军：'+f.garrison.map(c=>f.owner===p||c.open?face(c)+(SUITS[c.suit]||'★'):'未知暗牌').join(' / ')+'</span>':'')+'</div>'+
 '<div class="target-actions">'+(s.actionSpent?'<span class="action-reminder" title="你仍可购买普通暗牌、购买或使用策略牌、快速轮换，然后点击结束行动交接。">主要行动已完成 · 完成后请点击“结束行动”</span>':'')+(f?.owner===null?btn('部署驻军并占领 →','occupy','primary '+(primaryAvailable&&!placementValid?'needs-selection':''),!primaryAvailable||!can,'title="'+(placementValid?'部署所选驻军并占领据点':'请先从下方手牌选择驻军；点击同一张牌可切换明牌或暗牌')+'" data-selection-ready="'+placementValid+'"'):f?.owner===1-p?btn('发动进攻 →','attack','primary danger',!primaryAvailable||!can)+btn('围城 · 3 补给','siege','secondary',!primaryAvailable||!can||f.garrison.length<=3||s.players[p].supply<3,'title="封锁一张第4或第5位预备守军，本次交锋不参与牌型"'):f?.owner===p?btn('整编全部驻军 →','reorganize','primary '+(primaryAvailable&&!placementValid?'needs-selection':''),!primaryAvailable,'title="'+(placementValid?'消耗主要行动，用所选手牌替换整支驻军':'请先从下方手牌选择新的整支驻军；此操作会替换全部现有驻军')+'" data-selection-ready="'+placementValid+'"')+btn('轮换部分驻军 · 1/张','open-rotation','secondary',!actionable||!f.garrison.length||!s.players[p].hand.length||s.rapidRedeployUsed||s.players[p].supply<1,'title="等量选择撤下和派入的牌，每张花费 1 补给，不消耗主要行动"'):'')+
 btn('补充暗牌 · 2 补给','supply','secondary',!actionable||s.supplyUsed||s.players[p].supply<2||!s.deck.length,'title="消耗 2 点补给，从公共牌库随机抽取 1 张暗牌"')+btn('结束行动','pass','secondary pass-action',!actionable,'title="结束本回合并交接给对方；购买策略、补充暗牌和快速轮换请在此之前完成"')+'</div></div></div>';
}
function line(p){
 const b=s.battle,v=viewer(),deployed=b.lines[p];
 const own=p===v;
 const raw=deployed.length?deployed:own&&['defend','attack'].includes(s.phase)?[...selection].map(([id,open])=>({...s.players[p].hand.find(c=>c.id===id),open,preview:true})):[];
 const cards=orderedCards(raw,own);
 return '<div class="battle-line '+(own?'own-line':'enemy-line')+'"><div class="line-label"><span>'+(p===b.defender?'防守方 · 平手即胜':'进攻方 · 必须压过')+'</span><b>'+s.players[p].name+'</b><small>'+handName(cards.filter(c=>c.open))+' / '+power(cards.filter(c=>c.open)).join(' · ')+'</small></div><div class="line-cards">'+
 Array.from({length:b.field?battleLineLimit(s,p):3},(_,i)=>{const c=cards[i];if(!c)return '<div class="card-slot"><span>0'+(i+1)+'</span></div>';const known=own||c.open||s.knowledge[v][c.id],revealable=own&&!c.open&&!c.preview&&s.phase==='counter'&&!isAI();return card(c,{hidden:!known,selected:reveals.has(c.id),stance:c.open,interactive:revealable,revealable,action:'reveal-card',peek:!own&&!c.open&&known})}).join('')+'</div></div>';
}
const rankLabel=rank=>rank===15?'大王':rank===14?'小王':({1:'A',11:'J',12:'Q',13:'K'}[rank]||String(rank||'无'));
function comparisonDetail(a,b,leader){
 const av=power(a),bv=power(b),an=handName(a),bn=handName(b),winner=leader===0?av:bv,loser=leader===0?bv:av;
 if(av[0]!==bv[0])return (leader===0?an:bn)+'压过'+(leader===0?bn:an);
 const difference=winner.findIndex((value,index)=>index>0&&value!==loser[index]);
 if(difference<0)return '牌力完全相同，防守方占优';
 if(av[0]===2)return difference===1?'对子 '+rankLabel(winner[1])+' 胜对子 '+rankLabel(loser[1]):'对子同点，单牌 '+rankLabel(winner[2])+' 胜 '+rankLabel(loser[2]);
 if([4,5,6].includes(av[0]))return an+'最高点 '+rankLabel(winner[1])+' 胜 '+rankLabel(loser[1]);
 return difference===1?'最高明牌 '+rankLabel(winner[1])+' 胜 '+rankLabel(loser[1]):'最高牌同为 '+rankLabel(winner[1])+'，第 '+difference+' 张 '+rankLabel(winner[difference])+' 胜 '+rankLabel(loser[difference]);
}
function battleView(){
 const b=s.battle,p=viewer(),active=s.active===p&&!isAI();
 const comparing=['counter','tactics'].includes(s.phase),lead=comparing?leading(s):null;
 const leadDetail=comparing?comparisonDetail(opened(s,p),opened(s,1-p),lead===p?0:1):'';
 const leadText=comparing?'<strong>'+(lead===p?'己方明牌占优':'对方明牌占优')+'</strong><small>'+leadDetail+' · 暗牌尚未计入</small>':'<strong>VS</strong>';
 const chosen=[...selection].map(([id,open])=>({...s.players[p].hand.find(c=>c.id===id),open}));
 const mountain=b.field&&s.fields.find(f=>f.id===b.field)?.type==='mountain',sea=b.seaLanding;
 const valid=chosen.length>0&&chosen.length<=battleLineLimit(s,p)&&chosen.some(c=>c.open)&&(s.phase!=='attack'||(compare(chosen.filter(c=>c.open),opened(s,b.defender))>0&&(!mountain||chosen.filter(c=>c.open).length>=2)&&(!sea||power(chosen.filter(c=>c.open))[0]>=power(opened(s,b.defender))[0])&&(!sea||power(chosen)[0]!==6)));
 const revealPreview=s.phase==='counter'&&reveals.size?handName(b.lines[p].filter(c=>c.open||reveals.has(c.id))):'';
 return '<section class="battle-area"><div class="battle-heading"><div><div class="eyebrow">交锋 '+String(s.skirmish).padStart(2,'0')+' / SKIRMISH</div><h2>'+(b.field?s.fields.find(f=>f.id===b.field).label:'明暗交锋')+'</h2></div><span class="battle-badge">'+statusText()+'</span></div>'+
 line(1-p)+'<div class="versus"><span></span><b>'+leadText+'</b><span></span></div>'+line(p)+
 '<div class="battle-actions"><div><b>'+(isAI()?'敌方正在推演…':s.phase==='tactics'?'可使用交锋策略，或继续让对方反击。':s.phase==='defend'?'部署 1–'+battleLineLimit(s,p)+' 张牌，至少 1 张为明牌。':s.phase==='attack'?(mountain?'山地进攻：至少亮出 2 张牌，并严格压过防线。':sea?'跨海登陆：不能组成三条，牌型须不低于防守方。':'用明牌压过防线，保留你的暗牌。'):reveals.size?'选择后牌型：'+revealPreview+'。点击右侧确认翻开。':'当前比较只计算明牌；点击战线上标有“点击翻开”的暗牌，再确认反击。')+'</b><small>'+(s.phase==='counter'?'你翻开的暗牌会立刻加入比较；若反超，对方才获得继续反击的机会。':'手牌点击顺序：选择为明牌 → 改为暗牌 → 取消。')+'</small></div><div>'+
 (s.phase==='tactics'?btn('继续 · 让对方反击 →','continue','primary',!active):s.phase==='counter'?btn(reveals.size?'确认翻开 '+reveals.size+' 张 →':'先点击暗牌','reveal','primary',!active||reveals.size<1||reveals.size>2):btn('确认部署 →','deploy','primary',!active||!valid))+
 btn('撤退','fold','secondary',!active)+'</div></div></section>';
}
function handTray(){
 const p=viewer(),pl=s.players[p],interactive=!isAI()&&s.active===p&&['campaign','defend','attack'].includes(s.phase);
 const cards=[...pl.hand].sort(handSort==='suit'?(a,b)=>a.suit-b.suit||a.rank-b.rank||a.id-b.id:(a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id);
 const sort='<span class="hand-sort-toggle" role="group" aria-label="手牌排序"><button class="'+(handSort==='rank'?'active':'')+'" data-action="hand-sort" data-id="rank" aria-pressed="'+(handSort==='rank')+'">点数</button><button class="'+(handSort==='suit'?'active':'')+'" data-action="hand-sort" data-id="suit" aria-pressed="'+(handSort==='suit')+'">花色</button></span>';
 return '<section class="hand-tray"><div class="hand-top"><div><span class="eyebrow">你的暗牌 / PRIVATE HAND</span><b>'+pl.hand.length+' 张</b></div><div>'+sort+'<span>'+(['defend','attack'].includes(s.phase)?'已选 '+selection.size+' / 3':s.phase==='campaign'?'选择驻军牌':'暗牌安全保留')+'</span></div></div><div class="hand-scroll" style="--hand-count:'+cards.length+'">'+cards.map((c,i)=>'<div class="hand-card-shell" style="--rot:'+((i-(cards.length-1)/2)*1.15)+'deg;--lift:'+(-Math.abs(i-(cards.length-1)/2)*1.15)+'px;--z:'+i+'">'+card(c,{interactive,selected:selection.has(c.id),stance:selection.has(c.id)?selection.get(c.id):null})+'</div>').join('')+'</div></section>';
}
function strategyMarketView(){
 if(s.phase!=='campaign'||!s.opt.strategies)return '';
 const p=viewer();
 return '<section class="strategy-market expanded"><div class="market-heading"><div><span class="eyebrow">策略市场 / WAR ROOM</span><h3>'+(s.marketBought?'本回合已完成购买':'本回合可购买 1 张')+'</h3></div><small>当前 '+s.players[p].supply+' 补给 · 持有 '+s.players[p].strategies.length+' / 3 · 新购下回合解锁</small></div><div class="market-list">'+s.strategyMarket.map((id,index)=>{const c=strategyById(id),reason=canBuyStrategy(s,p,id),label=!reason?'购买 · '+c.price+' 补给':reason.startsWith('需要 ')?'补给不足 · 需 '+c.price:reason.includes('同名')?'已持有':reason.includes('持有三张')?'持有已满':reason.includes('只能购买一张')?'本回合已购':'不可购买';return '<article class="market-card"><span class="market-icon">'+c.icon+'</span><div><b>'+c.name+'</b><small>'+(c.phase==='battle'?'交锋战术':'战役指令')+' · '+c.desc+'</small></div>'+btn(label,'buy-strategy','market-buy',!!reason,'data-id="'+id+'" data-index="'+index+'" title="'+esc(reason||'花费 '+c.price+' 补给购买；下一个地图回合解锁')+'"')+'</article>'}).join('')+'</div></section>';
}
function strategyShopButton(){
 if(s.phase!=='campaign'||!s.opt.strategies)return '';
 const p=viewer(),summary=s.marketBought?'本回合已采购':'可查看 '+s.strategyMarket.length+' 张市场策略';
 return '<button class="strategy-shop-button" data-action="open-market" aria-label="'+esc('打开战术商店：'+summary+'，当前 '+s.players[p].supply+' 点补给')+'" title="'+esc(summary+' · '+s.players[p].supply+' 补给')+'"><span class="shop-coin">$</span><i>'+s.strategyMarket.length+'</i></button>';
}
function strategyDock(){
 const p=viewer(),cards=s.players[p].strategies;if(!cards.length)return '<div class="empty-tactics">暂无策略卡</div>';
 return '<div class="tactic-dock">'+cards.map(id=>{const c=strategyById(id),reason=canStrategy(s,p,id,focus);return '<button class="strategy-token '+(reason?'unavailable':'ready')+'" data-action="use-strategy" data-id="'+id+'" '+(isAI()?'disabled':'')+' aria-label="'+esc(c.name+'：'+c.desc+'；'+(reason||'现在可以使用'))+'"><span>'+c.icon+'</span><small>'+c.name+'</small><span class="strategy-tooltip"><b>'+c.name+'</b><em>'+(c.phase==='battle'?'交锋战术':'战役指令')+'</em><p>'+c.desc+'</p><strong>'+(reason||'现在可以使用')+'</strong></span></button>'}).join('')+'</div>';
}
function sidePanel(){
 const p=viewer();return '<aside class="intel-panel"><div class="supply-box"><span class="eyebrow">公共牌库</span><b>'+s.deck.length+'<small> / '+s.baseDeckSize+'</small></b><div class="supply-meter"><span style="width:'+s.deck.length/s.baseDeckSize*100+'%"></span></div><p>'+(s.opt.rules==='campaign'?'战役交锋不自动补牌<br>使用补给或策略获得新暗牌':'经典交锋后补暗牌至 12 张<br>公共牌库耗尽后，暗牌耗尽者败')+'</p></div><div class="tactics-heading"><h3>战术指令</h3><span class="tactics-tools"><span>'+s.players[p].strategies.length+'</span>'+strategyShopButton()+'</span></div>'+
 strategyDock()+'<div class="log-heading"><h3>战场记录</h3><span>LIVE</span></div><ol class="battle-log">'+s.log.slice(0,6).map(l=>'<li><span>'+String(l.round).padStart(2,'0')+'</span><p>'+esc(l.text)+'</p></li>').join('')+'</ol></aside>';
}
function game(){
 return header()+'<div class="armies">'+playerPanel(0)+'<span class="army-vs">VS</span>'+playerPanel(1)+'</div>'+
 '<div class="game-layout"><div class="play-column">'+(s.phase==='campaign'?mapView():battleView())+handTray()+'</div>'+sidePanel()+'</div>';
}
function result(){
 const win=s.winner;return header()+'<section class="result-screen"><div class="result-emblem">'+(win===null?'⟐':s.players[win].logo)+'</div><div class="eyebrow">OPERATION COMPLETE</div><h1>'+(win===null?'战局平分秋色':s.players[win].name+'获胜')+'</h1><p>'+s.reason+'</p><div class="result-stats">'+s.players.map((p,i)=>'<div class="army-'+sideOf(i)+'"><h3>'+p.name+(p.faction?' · '+p.faction:'')+'</h3><b>'+p.wins+'<small> 次交锋获胜</small></b><span>'+p.reserve.length+' 张公开牌 · '+s.fields.filter(f=>f.owner===i).length+' 块领地</span></div>').join('')+'</div><div class="result-actions">'+btn('再战一局 →','rematch','primary')+btn('返回作战部署','exit','secondary')+'</div><small>战局种子 '+s.opt.seed+' · '+s.skirmish+' 次交锋</small></section>';
}
const finalRulesHTML=`<div class="eyebrow">FIELD MANUAL / 战地手册</div><h2>明牌交火，暗牌反击。</h2><div class="rules-content">
<h3>牌力与王牌</h3><p class="rank-order">三条 ＞ 同花顺 ＞ 顺子 ＞ 同花 ＞ 对子 ＞ 高牌</p><p>当前牌力只计算已经翻开的牌。两张或三张明牌中出现两张同点数即为对子，三张同点数为三条；相同牌型按点数逐项比较，不比较花色。A 最小，Q-K-A 不成顺。</p><p>大小王是万能牌，会自动替代成当前最强的合法点数和花色。相同牌型与点数时，天然组合胜使用万能牌的组合；双方都使用一张王时大王胜小王。单张大王胜单张小王，但完整牌型等级优先于王的身份。</p>
<h3>交锋流程</h3><ol><li>经典交锋由防守方先部署 1–3 张，至少 1 张明牌；战役交锋直接使用据点的固定驻军。进攻方部署 1–3 张，已翻开的牌必须严格压过防线。</li><li>被压制方可以撤退，或翻开战线中的 1–2 张暗牌。翻牌反超后，只要对方仍有暗牌，对方就获得继续反击的机会；双方可以反复翻牌。</li><li>进攻方必须严格大于才占优，平手时防守方占优。平手不会跳过另一方尚存暗牌的反击机会。被压制方无暗牌或主动撤退才判负；闪电战和停火按牌面效果立即结算。</li><li>经典交锋由胜方收取双方明牌，暗牌各自收回，并从公共牌库补至 12 张。战役中守住则原驻军留守且已翻开的牌保持公开；攻下则由进攻战线接防，交锋后不自动补牌。</li></ol>
<h3>战役、驻军与补给</h3><ul><li>每方首都开局部署 3 张暗牌驻军，手中保留 9 张。每个地图回合有 1 次主要行动，可占领、进攻、整编或跳过；只能从己方相邻据点建立进军路线。</li><li>普通据点容量 3，强化据点容量 4，首都容量 5。非首都至少有 1 张明牌，首都可以全暗；防守方公开牌超过 3 张时自动选择最强三张计算，其他守军仍可逐步翻开。</li><li>驻军设定后固定在据点。“整编全部驻军”消耗主要行动，用所选手牌替换整支驻军；“轮换部分驻军”每换一张花 1 补给，每回合一次且不消耗主要行动。撤下的明牌进入己方公开牌堆，暗牌返回手牌。</li><li>攻击超过 3 张守军的据点时，可花 3 补给围城，随机封锁一张预备守军。据点基础产出为 1，油田为 2：驻守 0–1 张明牌时正常产出，2 张明牌时停产，3 张以上明牌时倒扣同等补给。己方据点合计净产出为负时，本回合公开弃置 1 张暗牌；补给最低为 0，不会形成债务。点击军团栏的补给数字可查看本回合流水。</li><li>每回合可花 2 补给从公共牌库抽 1 张暗牌一次，不消耗主要行动。沼泽的攻守与驻军上限均为 1 张，林地均为 2 张；山地进攻至少亮出 2 张。跨海登陆不能组成三条，进攻牌型等级不得低于防守方，同时仍须按正常比较严格压过防线。夺取敌方首都立即赢得战役。</li></ul>
<h3>策略与商店</h3><p>开局先从三张策略中选择一张。战役模式另有三张公开市场牌：每个地图回合最多购买一张，最多持有三张且不能重复持有同名牌；新购策略在购买者下一个地图回合解锁，市场每三轮整体刷新。战役策略每个地图回合最多使用一次，交锋策略每方每次交锋最多一次。</p><div class="rules-strategy-grid">${STRATEGIES.map(c=>'<article data-strategy-manual="'+c.id+'"><span>'+c.icon+'</span><div><h4>'+c.name+' <small>'+c.price+' 补给 · '+(c.phase==='battle'?'交锋':'战役')+'</small></h4><p>'+c.desc+'</p><em>'+c.use+'</em></div></article>').join('')}</div>
<h3>模式、牌库与操作</h3><p>高级选项可让公共牌库跟随地图，或固定为 1／2 副。跟随地图时，12 个以上据点使用 106 张牌，否则使用 54 张；两副牌包含 104 张普通牌和唯一一对大小王。公共牌库耗尽且任一方暗牌手牌为空时该方失败，同时耗尽则平局。</p><p>经典模式不使用地图、驻军和补给，双方交替先防守。回合上限到达时，经典模式比较公开牌数；战役模式比较公开牌数加每块领地 3 分，相同则平局。手牌可按点数或花色排序；地图支持拖动、滚轮或双指缩放。</p><p>同机双人会在换人时遮蔽手牌，按“准备就绪”后才显示并开始计时；当前不提供两台设备联网。AI 只依据公开信息和自己的牌决策。暂停、规则手册和事件展示会暂停计时及 AI。超时后地图自动跳过，经典防守部署最低单张明牌，进攻或反击自动撤退。存档仅保存在当前浏览器。</p></div>`;
const TUTORIAL=[
 {title:'看懂战场与进军路线',tag:'01 / 战区',image:'./assets/tutorial/01-map.png',text:'每回合有 1 次主要行动。点击据点后，脉冲路线和光环会标出所有直接相邻据点；你只能从己方领地沿连接线继续推进。',tip:'先从首都周围建立连续领地，不要让前线与后方断开。'},
 {title:'占领中立据点并设置驻军',tag:'02 / 占领',image:'./assets/tutorial/02-occupy.png',text:'选择相邻的中立据点，再从底部手牌选 1–3 张驻军。点击同一张牌会在明牌、暗牌和取消之间循环；除首都外必须至少留 1 张明牌。',tip:'明牌越多，防守信息越透明，而且会降低据点补给产出。'},
 {title:'进攻、部署与连续翻牌',tag:'03 / 交锋',image:'./assets/tutorial/03-battle.png',text:'点击相邻敌方据点发动进攻。先用已经翻开的牌严格压过守军，再确认部署；被压制的一方可逐次翻开暗牌反击，双方可能连续反超。',tip:'牌力为三条 ＞ 同花顺 ＞ 顺子 ＞ 同花 ＞ 对子 ＞ 高牌；平手时防守方占优。'},
 {title:'积累并花费补给',tag:'04 / 后勤',image:'./assets/tutorial/04-supply.png',text:'据点会在回合开始结算补给。2 点可补 1 张普通暗牌；轮换部分驻军每张 1 点，围城需要 3 点。点击军团栏中的补给数字，可以查看本回合每一笔收入与支出。',tip:'撤下的明牌进入公开牌堆，暗牌返回手牌；0–1 张明牌正常产出，2 张明牌停产，3 张以上会倒扣据点产出。'},
 {title:'用补给购买普通暗牌',tag:'05 / 补牌',image:'./assets/tutorial/05-draw.png',text:'在地图行动栏点击高亮的“补充暗牌 · 2 补给”，从公共牌库购买 1 张普通暗牌。每个地图回合只能补充一次，但不会消耗主要行动。',tip:'手牌不足时先补牌再行动；按钮变灰通常表示补给不足、本回合已经补过，或公共牌库已空。'},
 {title:'进入策略商店购买战术',tag:'06 / 商店',image:'./assets/tutorial/05-market.png',text:'点击右侧“战术指令”旁的钱币按钮打开商店。每个地图回合最多购买 1 张策略牌，新购策略会在你的下一个地图回合解锁。',tip:'策略牌最多持有 3 张，不能重复购买同名策略；市场每三轮整体刷新。'},
 {title:'在正确时机使用策略',tag:'07 / 战术',image:'./assets/tutorial/06-strategy.png',text:'战役策略在地图阶段使用，交锋策略在战斗阶段使用。点击策略图标会直接发动，或要求你再选择目标据点；使用后该牌进入弃牌堆。',tip:'进攻部署后会先进入战术窗口，确认没有想用的交锋策略再继续。'},
 {title:'攻入首都，赢得战役',tag:'08 / 胜负',image:'./assets/tutorial/07-victory.png',text:'攻占敌方首都会立即获胜。若达到回合上限，则按公开牌与领地积分判定；公共牌库耗尽后，无法维持暗牌手牌的一方也会失败。',tip:'首都最多容纳 5 张守军且允许全暗，先切断外围补给再组织决战。'}
];
function tutorialView(step=0){const i=Math.max(0,Math.min(TUTORIAL.length-1,Number(step)||0)),t=TUTORIAL[i];return '<div class="tutorial-head"><div><div class="eyebrow">QUICK CAMPAIGN / 新手教程</div><h2>'+t.title+'</h2></div><span>'+(i+1)+' / '+TUTORIAL.length+'</span></div><div class="tutorial-progress" style="--tutorial-steps:'+TUTORIAL.length+'">'+TUTORIAL.map((_,n)=>'<i class="'+(n===i?'active':n<i?'done':'')+'"></i>').join('')+'</div><figure class="tutorial-shot"><img src="'+t.image+'" alt="'+esc(t.title+'游戏界面示例')+'"><figcaption>'+t.tag+'</figcaption></figure><p class="tutorial-text">'+t.text+'</p><p class="tutorial-tip"><b>作战提示</b>'+t.tip+'</p><div class="tutorial-actions">'+btn('关闭','close','text-button')+'<span>'+btn('← 上一步','tutorial-step','secondary',i===0,'data-id="'+(i-1)+'"')+btn(i===TUTORIAL.length-1?'完成教程':'下一步 →','tutorial-step','primary',false,'data-id="'+(i+1)+'"')+'</span></div>'}
function supplyLedgerView(p){
 const pl=s.players[p],report=s.supplyLedger?.[p],entries=report?.entries||[];
 return '<div class="eyebrow">LOGISTICS / 补给流水</div><h2>'+esc(pl.name)+' · '+pl.supply+' 补给</h2><p>'+(report?'第 '+report.round+' 回合，期初 '+report.opening+' 点。':'旧存档尚无本回合明细；下一回合开始后自动记录。')+'</p><div class="supply-ledger">'+(entries.map(e=>'<div><span>'+esc(e.label)+'</span><b class="'+(e.amount<0?'negative':'positive')+'">'+(e.amount>0?'+':'')+e.amount+'</b></div>').join('')||'<div><span>暂无进项或出项</span><b>0</b></div>')+(report?'<div class="ledger-total"><span>本回合净变化</span><b class="'+(report.net<0?'negative':'positive')+'">'+(report.net>0?'+':'')+report.net+'</b></div>':'')+'</div>'+(report?.discardedId!=null?'<p class="ledger-warning">据点净产出为负，本回合已公开弃置一张暗牌。</p>':'')+btn('关闭','close','primary');
}
function rotationView(config){
 const f=s.fields.find(f=>f.id===config.field),p=viewer(),out=new Set(config.outIds||[]),stances=config.stances||{};
 const incoming=Object.keys(stances).map(Number),cost=out.size,kept=f.garrison.filter(c=>!out.has(c.id)),newCardsForPost=incoming.map(id=>({...s.players[p].hand.find(c=>c.id===id),open:!!stances[id]}));
 const valid=cost>0&&cost===incoming.length&&cost<=s.players[p].supply&&(f.capital||[...kept,...newCardsForPost].some(c=>c.open));
 const warning=cost!==incoming.length?'撤下与派入数量必须相同。':!f.capital&&![...kept,...newCardsForPost].some(c=>c.open)?'普通据点轮换后至少保留一张明牌。':cost>s.players[p].supply?'补给不足。':'';
 return '<div class="eyebrow">FIELD ROTATION / 快速轮换</div><h2>'+esc(f.label)+' · 每张 1 补给</h2><p>先选择要撤下的驻军，再选择等量手牌。撤下的明牌进入公开牌堆，暗牌回到手牌；点击派入牌可循环选择明牌、暗牌或取消。</p><div class="rotation-grid"><section><h3>撤下驻军 <span>'+out.size+' 张</span></h3><div class="rotation-cards">'+f.garrison.map(c=>card(c,{small:true,interactive:true,selected:out.has(c.id),stance:c.open,action:'rotate-out'})).join('')+'</div></section><section><h3>派入手牌 <span>'+incoming.length+' 张</span></h3><div class="rotation-cards">'+s.players[p].hand.map(c=>card(c,{small:true,interactive:true,selected:incoming.includes(c.id),stance:incoming.includes(c.id)?!!stances[c.id]:null,action:'rotate-in'})).join('')+'</div></section></div><div class="rotation-summary"><b>预计消耗 '+cost+' 补给</b><span>'+(warning||'轮换后仍可执行本回合主要行动。')+'</span></div><div class="modal-actions">'+btn('取消','close','secondary')+btn('确认快速轮换 →','rotate-submit','primary',!valid)+'</div>';
}
function overlay(){
 if(gate&&!modal)return '<div class="handoff"><div class="handoff-symbol">⟐</div><div class="eyebrow">SECURE HANDOVER</div><h1>请将屏幕交给<br><em>'+s.players[s.active].name+'</em></h1><p>对手移开视线后，点击下方按钮查看自己的手牌。</p>'+btn('准备就绪 · 显示手牌','ready','primary')+btn('返回主菜单','confirm-exit','text-button')+'</div>';
 if(!modal)return '';
 let content='';
 if(typeof modal==='object'&&modal.kind==='identity'){
  const p=modal.player,final=modal.final;
  content='<div class="eyebrow">PLAYER IDENTITY / 玩家身份</div><h2>'+(p===0?'设置你的名字与徽记':'请将屏幕交给玩家 2')+'</h2><p>'+(final?'玩家 2 可以直接使用默认设置进入战场。':'设置只影响本局显示，不改变玩法。')+'</p>'+identityFields(p,p===0?(options.mode==='local'?'玩家 1':'玩家'):'玩家 2')+'<div class="modal-actions identity-modal-actions">'+(!final?btn('取消','close','secondary'):'')+btn(final?'确认并进入战场 →':'保存身份','identity-save','primary')+'</div>';
 }
 else if(modal==='rules')content=finalRulesHTML+btn('已了解 · 继续','close','primary');
 else if(typeof modal==='object'&&modal.kind==='tutorial')content=tutorialView(modal.step);
 else if(modal==='market')content='<div class="eyebrow">SUPPLY EXCHANGE / 补给交易所</div><h2>战术商店</h2><p>市场公开可见。购买策略牌不消耗地图行动；买到的策略牌在你的下一个地图回合解锁。</p>'+strategyMarketView()+btn('关闭商店','close','secondary');
 else if(typeof modal==='object'&&modal.kind==='supply')content=supplyLedgerView(modal.player);
 else if(typeof modal==='object'&&modal.kind==='rotation')content=rotationView(modal);
 else if(typeof modal==='object'&&modal.kind==='reserve'){const p=s.players[modal.player],sort=modal.sort||'rank',cards=[...p.reserve].sort(sort==='suit'?(a,b)=>a.suit-b.suit||a.rank-b.rank||a.id-b.id:(a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id);content='<div class="reserve-heading"><div><h2>'+p.name+' · 公开牌堆</h2><p>这些牌双方均可查看。</p></div><span class="hand-sort-toggle" role="group" aria-label="公开牌排序"><button class="'+(sort==='rank'?'active':'')+'" data-action="reserve-sort" data-id="rank" aria-pressed="'+(sort==='rank')+'">点数</button><button class="'+(sort==='suit'?'active':'')+'" data-action="reserve-sort" data-id="suit" aria-pressed="'+(sort==='suit')+'">花色</button></span></div><div class="reserve-cards">'+(cards.map(c=>card(c,{small:true})).join('')||'<p>尚未获得公开牌。</p>')+'</div>'+garrisonRoster(modal.player)+btn('关闭','close','primary')}
 else if(modal==='exit')content='<h2>离开当前战局？</h2><p>本机存档会保留，可从主菜单继续。</p><div class="modal-actions">'+btn('返回战局','close','primary')+btn('保存并退出','exit','secondary')+'</div>';
 else content='<div class="eyebrow">TACTICAL PAUSE</div><h2>战场已暂停</h2><p>行动计时与电脑对手均已暂停。</p><div class="pause-actions">'+btn('继续战斗 →','close','primary')+btn('查看规则','rules','secondary')+btn('保存并返回主菜单','exit','secondary')+btn('投降','resign','text-button')+'</div>';
 return '<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="游戏面板">'+content+'</section></div>';
}
function mountScene(){
 const mount=document.querySelector('#visual-mount');if(mount){mount.appendChild(sceneEl);sceneEl.hidden=false;scene.resize?.();if(s?.phase==='campaign'&&fittedMap!==s.opt.map)fitMapCamera();else positionNodes()}else sceneEl.hidden=true;
}
function fitMapCamera(){
 const stage=document.querySelector('.map-stage');if(!stage||!s?.fields.length)return;
 const points=s.fields.map(f=>scene.project?.(f)||{x:f.x,y:f.y}),xs=points.map(p=>p.x),ys=points.map(p=>p.y),spanX=Math.max(1,Math.max(...xs)-Math.min(...xs)),spanY=Math.max(1,Math.max(...ys)-Math.min(...ys));
 const width=stage.clientWidth,height=stage.clientHeight,padX=Math.min(105,Math.max(48,width*.09)),padY=Math.min(72,Math.max(42,height*.13));
 const scale=Math.max(1,Math.min(2.15,(width-padX*2)/(width*spanX/100),(height-padY*2)/(height*spanY/100))),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 mapViewport={scale,x:(50-cx)*width*scale/100,y:(50-cy)*height*scale/100};fittedMap=s.opt.map;updateMapCamera();
}
function positionNodes(){
 if(!s||s.phase!=='campaign'||!scene.renderer)return;
 const stage=document.querySelector('.map-stage');if(!stage)return;
 const projected={},items=[];
 for(const f of s.fields){const el=stage.querySelector('[data-id="'+f.id+'"]');if(!el)continue;
 const point=scene.project?.(f)||{x:f.x,y:f.y},rawX=50+(point.x-50)*mapViewport.scale+mapViewport.x/stage.clientWidth*100,rawY=50+(point.y-50)*mapViewport.scale+mapViewport.y/stage.clientHeight*100;
 items.push({f,el,w:el.offsetWidth,h:el.offsetHeight,x:rawX*stage.clientWidth/100,y:rawY*stage.clientHeight/100});
 }
 if(mapViewport.scale<=2.15){
  const gap=stage.clientWidth<=520?5:8,clamp=item=>{item.x=Math.max(item.w/2+6,Math.min(stage.clientWidth-item.w/2-6,item.x));item.y=Math.max(11,Math.min(stage.clientHeight-item.h+1,item.y))};
  for(let pass=0;pass<48;pass++){for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j],dx=b.x-a.x,ay=a.y-5+a.h/2,by=b.y-5+b.h/2,dy=by-ay,ox=(a.w+b.w)/2+gap-Math.abs(dx),oy=(a.h+b.h)/2+gap-Math.abs(dy);if(ox<=0||oy<=0)continue;if(ox<oy){const push=ox/2+.2,sign=dx>=0?1:-1;a.x-=push*sign;b.x+=push*sign}else{const push=oy/2+.2,sign=dy>=0?1:-1;a.y-=push*sign;b.y+=push*sign}}for(const item of items)clamp(item)}
 }
 for(const {f,el,x,y} of items){const visible={x:x/stage.clientWidth*100,y:y/stage.clientHeight*100};projected[f.id]=visible;el.style.left=visible.x+'%';el.style.top=visible.y+'%'}
 for(const line of stage.querySelectorAll('.topology-lines line')){const a=projected[line.dataset.a],b=projected[line.dataset.b];if(a&&b){line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y)}}
 for(const p of stage.querySelectorAll('.topology-lines path[data-a]')){const a=projected[p.dataset.a],b=projected[p.dataset.b];if(a&&b){const others=s.fields.filter(o=>o.id!==p.dataset.a&&o.id!==p.dataset.b).map(o=>projected[o.id]).filter(Boolean);const d=seaLaneD(a,b,others);p.setAttribute('d',d);const m=p.closest('.map-route')?.querySelector('animateMotion');if(m)m.setAttribute('path',d)}}
 {const W=stage.clientWidth||1,H=stage.clientHeight||1,sy=0.7,sx=sy*H/W,t='scale('+sx.toFixed(3)+','+sy+') translate(-5,-5)';for(const g of stage.querySelectorAll('.topology-lines .sea-ship-icon'))g.setAttribute('transform',t)}
}
function clampMapViewport(){
 const stage=document.querySelector('.map-stage');
 if(!stage||!s?.fields?.length)return;
 const W=stage.clientWidth,H=stage.clientHeight;if(!W||!H)return;
 const sc=mapViewport.scale;
 let minX=50,maxX=50,minY=50,maxY=50;
 for(const f of s.fields){const p=scene.project?.(f)||{x:f.x,y:f.y};
  if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;}
 const mX=Math.min(120,W*.18),mY=Math.min(120,H*.18);
 // content box edges in screen px at zero camera offset
 const cL=W/2+(minX-50)/100*W*sc,cR=W/2+(maxX-50)/100*W*sc;
 const cT=H/2+(minY-50)/100*H*sc,cB=H/2+(maxY-50)/100*H*sc;
 // an extreme node must always be able to come fully on screen (issue #16 follow-up:
 // at high zoom the content spread dwarfs the margin band, trapping end nodes off-screen)
 const nodeEl=document.querySelector('.map-node');
 const hw=(nodeEl?.offsetWidth||100)/2,hh=(nodeEl?.offsetHeight||100)/2,o=24;
 let loX,hiX;
 if(cR-cL<=W){loX=-mX-cL;hiX=W+mX-cR;}
 else{loX=Math.min(hw-cL,W-hw-cR)-o;hiX=Math.max(hw-cL,W-hw-cR)+o;}
 let loY,hiY;
 if(cB-cT<=H){loY=-mY-cT;hiY=H+mY-cB;}
 else{loY=Math.min(hh-cT,H-hh-cB)-o;hiY=Math.max(hh-cT,H-hh-cB)+o;}
 if(loX>hiX){const t=(loX+hiX)/2;loX=hiX=t;}
 if(loY>hiY){const t=(loY+hiY)/2;loY=hiY=t;}
 mapViewport.x=Math.max(loX,Math.min(hiX,mapViewport.x));
 mapViewport.y=Math.max(loY,Math.min(hiY,mapViewport.y));
}
function updateMapCamera(){
 const camera=document.querySelector('.map-camera');if(!camera)return;
 clampMapViewport();
 camera.style.setProperty('--map-x',mapViewport.x+'px');camera.style.setProperty('--map-y',mapViewport.y+'px');camera.style.setProperty('--map-scale',mapViewport.scale);
 positionNodes();
}
function zoomMap(factor,clientX,clientY){
 const stage=document.querySelector('.map-stage');if(!stage)return;
 const box=stage.getBoundingClientRect(),old=mapViewport.scale,next=Math.max(1,Math.min(3.5,old*factor));
 const x=(clientX??box.left+box.width/2)-box.left-box.width/2,y=(clientY??box.top+box.height/2)-box.top-box.height/2;
 mapViewport.x=x-(x-mapViewport.x)*(next/old);mapViewport.y=y-(y-mapViewport.y)*(next/old);mapViewport.scale=next;
 updateMapCamera();
}

function eventView(){
 const e=events[0],map=e.map||s.fields;
 const paths=map.flatMap(f=>f.links.filter(id=>f.id.localeCompare(id)<0).map(id=>{const to=map.find(t=>t.id===id);return to?'<line x1="'+f.x+'" y1="'+f.y+'" x2="'+to.x+'" y2="'+to.y+'"/>':''})).join('');
 const diagram=e.field&&map.length?'<div class="event-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+map.map(f=>'<div class="event-map-node '+(f.id===e.field?'hit':'')+' owner-'+(f.owner===null?'null':sideOf(f.owner))+'" style="left:'+f.x+'%;top:'+f.y+'%"><i>'+fieldIcon(f)+'</i><b>'+f.label+'</b></div>').join('')+'</div>':'';
 return '<section class="event-screen event-'+e.kind+'" role="status" aria-live="polite"><div class="event-panel"><div class="eyebrow">战场快报 / '+e.kind.toUpperCase()+'</div><h1>'+esc(e.title)+'</h1><p>'+esc(e.detail)+'</p>'+diagram+
 (e.strategy?'<div class="event-strategy-card"><span>'+e.strategy.icon+'</span><div><b>'+e.strategy.name+'</b><small>'+e.strategy.desc+'</small></div><strong>'+e.strategy.price+' 补给</strong></div>':'')+
 ((e.cards||[]).length?'<div class="event-cards">'+e.cards.map(c=>card(c,{hidden:!!c.hidden,small:e.cards.length>6})).join('')+'</div>':'')+
 '<div class="event-progress" style="--duration:'+(s.opt.eventSeconds||3)+'s"><span style="animation-play-state:'+(modal?'paused':'running')+'"></span></div><div class="event-footer"><small>展示期间暂停 AI 和行动计时 · 剩余 '+events.length+' 条</small>'+btn('我看清了 · 继续 →','next-event','secondary')+'</div></div></section>';
}
function advanceEvent(){
 if(!events.length)return;events.shift();
 eventEnd=events.length?Date.now()+(s.opt.eventSeconds||3)*1000:null;
 if(!events.length){eventRemaining=null;resume()}
 render();
}
function garrisonRoster(p){
 const fields=s.fields.filter(f=>f.owner===p);
 if(!fields.length)return '';
 return '<h3>据点驻军（不在手牌或公开牌堆内）</h3><div class="garrison-roster">'+fields.map(f=>{const stationed=s.battle?.field===f.id?s.battle.lines[p]:f.garrison;return '<div><b>'+f.label+'</b><span>'+stationed.length+' 张驻军</span><div class="reserve-cards">'+stationed.map(c=>card(c,{small:true,hidden:p!==viewer()&&!c.open})).join('')+
 (s.battle?.field===f.id?'<p>固定驻军正在作为防守战线参战。</p>':!stationed.length?'<p>暂无驻军</p>':'')+'</div></div>'}).join('')+'</div>';
}

function render(){
 clearTimeout(aiTask);
 document.body.appendChild(sceneEl);
 if(!s){app.innerHTML=menu()+overlay();scene.setMap(MAPS.find(m=>m.id===options.map).fields,!!GEO_BACKDROPS[options.map]);scene.setMode('map')}
 else if(events.length){app.innerHTML=header()+eventView()+(modal?overlay():'')}
 else if(gate){app.innerHTML=header()+overlay()}
 else{
 app.innerHTML=s.phase==='over'?result():s.phase==='draft'?header()+draft():game();
 if(s.phase==='campaign')scene.setMap(themedFields(s.fields),!!GEO_BACKDROPS[s.opt.map]);
 scene.setMode(s.phase==='campaign'?'map':'battle');
 app.insertAdjacentHTML('beforeend',overlay());
 }
 mountScene();
 if(modal){document.querySelector('.modal button')?.focus()}
 else if(gate){document.querySelector('[data-action="ready"]')?.focus()}
 schedule();
}
function schedule(){
 if(!s||s.phase==='over'||modal||gate||events.length)return;
 if(isAI()){const snapshot=s;aiTask=setTimeout(()=>{if(s!==snapshot||modal||gate)return;try{perform(aiAction(s,1,s.opt.difficulty))}catch(e){console.error(e);toast('AI 行动恢复中');perform(timeoutAction(s,1))}},750)}
 const key=s.active+':'+s.phase+':'+s.turn+':'+s.skirmish;
 if(key!==clockKey){clockKey=key;deadline=s.opt.timer?Date.now()+s.opt.timer*1000:null;remaining=null}
}
function perform(action){
 if(!s||gate||modal||events.length||s.phase==='over')return;
 const before=s,oldActor=s.active;
 try{const res=act(s,s.active,action);if(!res.ok){toast(res.error);return}
 const perspective=viewer();if(oldActor===perspective)newCards.clear();
 const incoming=actionEvents(before,res.state,action,perspective);for(const e of incoming)for(const id of e.newIds||[])newCards.add(id);
 pause();events=incoming;eventRemaining=null;eventEnd=events.length?Date.now()+(s.opt.eventSeconds||3)*1000:null;
 s=res.state;targeting=null;selection.clear();reveals.clear();sound(s.phase==='over'?'win':'click');
 if(s.opt.mode==='local'&&s.active!==oldActor&&s.phase!=='over'){gate=true;deadline=null;clockKey=''}
 if(s.phase!==before.phase||s.turn!==before.turn)focus=null;
 save();if(!events.length)resume();render();
 }catch(e){console.error(e);toast('行动未提交，战局保持不变：'+e.message)}
}
function launchGame(){
 const map=MAPS.find(m=>m.id===options.map);options.factions=[options.factions?.[0]||map.factions[0],options.factions?.[1]||map.factions[1]];
 s=createGame(options);targeting=null;events=[];eventEnd=null;newCards.clear();selection.clear();reveals.clear();focus=null;gate=false;modal=null;deadline=null;remaining=null;clockKey='';fittedMap=null;save();render();sound();
}
app.addEventListener('click',e=>{
 const control=e.target.closest('[data-map-control]');if(control){e.preventDefault();const kind=control.dataset.mapControl;if(kind==='reset')fitMapCamera();else zoomMap(kind==='in'?1.25:.8);return}
 const el=e.target.closest('[data-action]');if(!el||el.disabled)return;e.preventDefault();const a=el.dataset.action,id=el.dataset.id;
 if(a==='none')return;
 if(a==='next-event'){if(!modal)advanceEvent();return}
 if(a==='sound'){muted=!muted;render();return}
 if(a==='tutorial'){showModal({kind:'tutorial',step:0});return}
 if(a==='tutorial-step'){const step=Number(id);if(step>=TUTORIAL.length){modal=null;resume()}else modal={kind:'tutorial',step:Math.max(0,step)};render();return}
 if(a==='rules'){showModal('rules');return}
 if(a==='close'){modal=null;resume();render();return}
 if(a==='edit-identity'){modal={kind:'identity',player:0,final:false};render();return}
 if(a==='identity-save'){const final=!!modal?.final;modal=null;if(final)launchGame();else render();return}
 if(a==='exit'){save();pause();s=null;modal=null;gate=false;deadline=null;remaining=null;clockKey='';events=[];eventEnd=null;eventRemaining=null;newCards.clear();selection.clear();render();return}
 if(a==='confirm-exit'){showModal('exit');return}
 if(a==='pause'){showModal('pause');return}
 if(a==='ready'){gate=false;clockKey='';render();return}
 if(a==='start'||a==='rematch'){
 if(a==='rematch'){options={...s.opt,seed:(s.opt.seed+1)>>>0};launchGame();return}
 if(a==='start'&&options.mode==='local'){modal={kind:'identity',player:1,final:true};render();return}
 launchGame();return;
 }
 if(a==='load'){const loaded=saved();if(!loaded){toast('没有有效存档');return}s=loaded;gate=s.opt.mode==='local';clockKey='';focus=null;selection.clear();render();return}
 if(!s){
  if(a.startsWith('mode-'))options.mode=a.slice(5);
  if(a==='map'){options.map=id;const map=MAPS.find(m=>m.id===id);options.factions=[map.factions[0],map.factions[1]];options.playerLogos=[factionLogo(map,map.factions[0]),factionLogo(map,map.factions[1])];options.deployment=map.historical?'historical':'standard'}
 render();return
 }
 if(modal&&typeof modal==='object'&&modal.kind==='rotation'){
  const n=Number(id);
  if(a==='rotate-out'){const out=new Set(modal.outIds||[]);if(out.has(n))out.delete(n);else out.add(n);modal.outIds=[...out];render();return}
  if(a==='rotate-in'){modal.stances=modal.stances||{};if(!(n in modal.stances))modal.stances[n]=true;else if(modal.stances[n])modal.stances[n]=false;else delete modal.stances[n];render();return}
  if(a==='rotate-submit'){const action={type:'rotate_garrison',field:modal.field,outIds:[...(modal.outIds||[])],cards:Object.entries(modal.stances||{}).map(([id,open])=>({id:Number(id),open}))};modal=null;resume();perform(action);return}
 }
 if(a==='reserve'){showModal({kind:'reserve',player:Number(el.dataset.player),sort:'rank'});return}
 if(a==='reserve-sort'&&modal?.kind==='reserve'){modal.sort=id==='suit'?'suit':'rank';render();return}
 if(a==='supply-ledger'){showModal({kind:'supply',player:Number(el.dataset.player)});return}
 if(a==='open-market'){showModal('market');return}
 if(a==='buy-strategy'){modal=null;resume();perform({type:'buy_strategy',id});return}
 if(a==='resign'){events=[];eventEnd=null;eventRemaining=null;modal=null;perform({type:'resign'});return}
 if(events.length||isAI()||gate||modal)return;
 if(a==='open-rotation'){showModal({kind:'rotation',field:focus,outIds:[],stances:{}});return}
 if(a==='focus'){focus=id;if(targeting&&!canStrategy(s,viewer(),targeting,focus)){const strategy=targeting;targeting=null;perform({type:'strategy',id:strategy,field:focus})}else render();return}
 if(a==='cancel-target'){targeting=null;render();return}
 if(a==='hand-sort'){handSort=id==='suit'?'suit':'rank';render();return}
 if(a==='card'){
 const n=Number(id);if(s.phase==='campaign'){const limit=garrisonLimit(s.fields.find(f=>f.id===focus));if(!selection.has(n)){if(selection.size>=limit){toast('该据点最多驻军 '+limit+' 张');return}selection.set(n,true)}else if(selection.get(n))selection.set(n,false);else selection.delete(n)}
 else if(!selection.has(n)){if(selection.size>=3){toast('最多部署 3 张牌');return}selection.set(n,true)}
 else if(selection.get(n))selection.set(n,false);else selection.delete(n);
 render();return;
 }
 if(a==='reveal-card'){const n=Number(id);if(reveals.has(n))reveals.delete(n);else if(reveals.size<2)reveals.add(n);else{toast('一次最多翻 2 张');return}render();return}
 if(a==='choose-strategy')perform({type:'draft',id});
 if(a==='use-strategy'){const reason=canStrategy(s,viewer(),id,focus);if(reason){if(s.phase==='campaign'&&['isr','revolution','economic_sanctions'].includes(id)&&s.fields.some(f=>!canStrategy(s,viewer(),id,f.id))){targeting=id;toast('请选择地图目标：'+strategyById(id).name);render()}else toast(reason)}else{targeting=null;perform({type:'strategy',id,field:focus})}}
 if(a==='deploy')perform({type:'deploy',cards:[...selection].map(([id,open])=>({id,open}))});
 if(a==='reveal')perform({type:'reveal',ids:[...reveals]});
 if(['occupy','reorganize'].includes(a))perform({type:a,field:focus,cards:[...selection].map(([id,open])=>({id,open}))});
 if(['attack','siege'].includes(a))perform({type:a,field:focus});
 if(['fold','supply','pass','continue'].includes(a))perform({type:a});
});
app.addEventListener('wheel',e=>{if(!e.target.closest('.map-stage'))return;e.preventDefault();zoomMap(e.deltaY<0?1.12:.89,e.clientX,e.clientY)},{passive:false});
app.addEventListener('pointerdown',e=>{
 const stage=e.target.closest('.map-stage');if(!stage||e.target.closest('button'))return;
 stage.setPointerCapture?.(e.pointerId);mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mapPointers.size===1)mapDrag={x:e.clientX,y:e.clientY,originX:mapViewport.x,originY:mapViewport.y};
 else if(mapPointers.size===2){const [a,b]=[...mapPointers.values()];mapDrag={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:mapViewport.scale}}
 stage.classList.add('dragging');
});
app.addEventListener('pointermove',e=>{
 if(!mapPointers.has(e.pointerId))return;mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mapPointers.size===1&&mapDrag?.originX!==undefined){mapViewport.x=mapDrag.originX+e.clientX-mapDrag.x;mapViewport.y=mapDrag.originY+e.clientY-mapDrag.y;updateMapCamera()}
 else if(mapPointers.size===2&&mapDrag?.distance){const [a,b]=[...mapPointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),target=Math.max(1,Math.min(3.5,mapDrag.scale*distance/mapDrag.distance));zoomMap(target/mapViewport.scale,(a.x+b.x)/2,(a.y+b.y)/2)}
});
function endMapPointer(e){mapPointers.delete(e.pointerId);if(!mapPointers.size){mapDrag=null;document.querySelector('.map-stage')?.classList.remove('dragging')}else{const a=[...mapPointers.values()][0];mapDrag={x:a.x,y:a.y,originX:mapViewport.x,originY:mapViewport.y}}}
app.addEventListener('pointerup',endMapPointer);app.addEventListener('pointercancel',endMapPointer);
app.addEventListener('change',e=>{
 const name=e.target.dataset.option;if(!name)return;
 const value=e.target.value;
 if(name.startsWith('playerName')){const p=Number(name.slice(-1));options.playerNames=[...(options.playerNames||['',''])];options.playerNames[p]=value;return}
 if(name.startsWith('playerLogo')){const p=Number(name.slice(-1));options.playerLogos=[...(options.playerLogos||LOGOS.slice(0,2))];options.playerLogos[p]=value;const preview=e.target.closest('.identity-editor')?.querySelector('.identity-preview>span');if(preview)preview.textContent=value;return}
 if(name==='faction0'||name==='faction1'){const p=Number(name.slice(-1)),map=MAPS.find(m=>m.id===options.map);options.factions=[...(options.factions||map.factions)];options.factions[p]=value;options.factions[1-p]=map.factions.find(x=>x!==value);options.playerLogos=[...(options.playerLogos||LOGOS.slice(0,2))];options.playerLogos[p]=factionLogo(map,options.factions[p]);options.playerLogos[1-p]=factionLogo(map,options.factions[1-p]);advancedOpen=true;render();return}
 options[name]=['seed','timer','first','maxRounds','eventSeconds'].includes(name)?Math.min(4294967295,Math.max(0,Number(value)||0)):name==='strategies'?value==='true':value;
 if(name==='rules'||name==='map'||name==='deckCount'||name==='deployment')render();
});
app.addEventListener('input',e=>{const name=e.target.dataset.option;if(!name?.startsWith('playerName'))return;const p=Number(name.slice(-1));options.playerNames=[...(options.playerNames||['',''])];options.playerNames[p]=e.target.value});
app.addEventListener('toggle',e=>{if(e.target.matches?.('details.advanced'))advancedOpen=e.target.open},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&s){e.preventDefault();if(modal){modal=null;resume();render()}else showModal('pause')}});
window.addEventListener('resize',positionNodes);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&s&&!modal&&!gate&&s.phase!=='over')showModal('pause')});
setInterval(()=>{
 if(events.length){if(!modal&&eventEnd!==null&&Date.now()>=eventEnd)advanceEvent();return}
 if(!s||gate||modal||s.phase==='over')return;
 const el=document.querySelector('#clock');
 if(el)el.textContent=deadline===null?'不限时':Math.max(0,Math.ceil((deadline-Date.now())/1000))+'s';
 if(deadline!==null&&Date.now()>=deadline){deadline=null;perform(timeoutAction(s,s.active));toast('行动超时，已执行保守行动')}
},250);
render();
