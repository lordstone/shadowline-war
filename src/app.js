
import {MAPS,STRATEGIES,defaults,strategyById,SUITS} from './data.js';
import {createGame,act,face,handName,power,compare,opened,leading,reachable,garrisonLimit,canStrategy,canBuyStrategy,aiAction,timeoutAction,validate,upgradeState} from './engine.js';
import {Battlefield} from './battlefield.js';
import {actionEvents} from './events.js';
const app=document.querySelector('#app'),sceneEl=document.querySelector('#scene');
const scene=new Battlefield(sceneEl);
let s=null,options={...defaults,seed:Math.floor(Math.random()*4294967296)},selection=new Map(),reveals=new Set(),focus=null,gate=false,modal=null,aiTask=null,deadline=null,remaining=null,clockKey='',muted=false;
let targeting=null;
let events=[],eventEnd=null,eventRemaining=null,newCards=new Set();
let mapViewport={x:0,y:0,scale:1},mapDrag=null,mapPointers=new Map();
const STORE='shadowline-war-v1';
const mapSymbol=id=>({duel:'⟁',rift:'⋈',ring:'◎',eastern_front:'⇥',korea:'↕',western_front:'⇆'}[id]||'◇');
const fieldIcon=f=>f.capital?'♜':f.fortified?'▰':f.type==='oil'?'▥':f.type==='port'?'⚓':f.type==='mountain'?'▲':'◆';
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
 const color=!hidden&&(c.suit===1||c.suit===3)?'red':'';
 const label=hidden?'未揭示暗牌':face(c)+(SUITS[c.suit]||' ★');
 const tag=interactive?'button':'div';
 const attributes=interactive?' data-action="'+action+'" data-id="'+c.id+'" aria-label="'+esc(label+(stance===true?'，已选明牌':stance===false?'，已选暗牌':'，点击选择'))+'" aria-pressed="'+selected+'"':'';
 return '<'+tag+' class="playing-card '+color+' '+(hidden?'back ':'')+(selected?'selected ':'')+(small?'small ':'')+(stance===false?'concealed ':'')+(revealable?'revealable ':'')+'"'+attributes+'>'+
 (hidden?'<span class="card-back-mark">S<span>SHADOWLINE</span></span>':'<span class="card-corner">'+face(c)+'<i>'+(SUITS[c.suit]||'★')+'</i></span><span class="card-suit">'+(SUITS[c.suit]||'★')+'</span><span class="card-bottom">'+face(c)+'</span>')+
 (stance!==null?'<span class="stance">'+(revealable?(selected?'已选择':'点击翻开'):(stance?'明部署':'暗部署'))+'</span>':'')+(peek?'<span class="peek">已侦察</span>':'')+(c.boost?'<span class="boost">+'+c.boost+'</span>':'')+(!hidden&&newCards.has(c.id)?'<span class="new-card-badge">新</span>':'')+'</'+tag+'>';
}
function strategyCard(id,action='choose-strategy',disabled=false){
 const c=strategyById(id);return '<button class="strategy-card" data-action="'+action+'" data-id="'+id+'" '+(disabled?'disabled':'')+'><span class="strategy-top"><span>'+c.icon+'</span><small>'+(c.phase==='battle'?'交锋战术':'战役指令')+'</small></span><h3>'+c.name+'</h3><p>'+c.desc+'</p><span class="strategy-foot">'+(action==='choose-strategy'?'选择此策略 ↗':'单次使用')+'</span></button>';
}
function header(menu=false){
 return '<header class="topbar"><a class="brand" href="#" data-action="'+(menu?'none':'pause')+'"><span class="brand-mark">⟐</span><span>暗线战争<small>SHADOWLINE / WAR ROOM</small></span></a>'+
 (menu?'<span class="top-meta">TACTICAL CARD WARFARE <span class="live-dot"></span> 离线就绪</span>':'<div class="round-info"><span>'+(s.opt.rules==='campaign'?'战役':'经典交锋')+'</span><b>'+String(s.round).padStart(2,'0')+'</b><span>回合</span>'+(s.opt.rules==='campaign'&&s.phase!=='draft'?'<span class="action-point '+(s.phase==='campaign'?'available':'spent')+'"><i></i>主要行动 '+(s.phase==='campaign'?'1 / 1':'0 / 1')+'</span>':'')+'<span id="clock" class="clock"></span></div>')+
 '<div class="top-actions">'+btn(muted?'音效关闭':'音效开启','sound','text-button')+btn('规则','rules','text-button')+(menu?'':btn('暂停','pause','icon-button'))+'</div></header>';
}
function optionSelect(name,label,entries,value){return '<label class="option"><span>'+label+'</span><select data-option="'+name+'">'+entries.map(([v,t])=>'<option value="'+v+'" '+(String(value)===String(v)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'}
function menu(){
 const map=MAPS.find(m=>m.id===options.map);
 return header(true)+'<section class="command-menu"><div class="setup-panel"><div class="eyebrow"><span></span> 作战部署 / OPERATION SETUP</div><h1>明面交火。<br><em>暗线制胜。</em></h1><p class="intro">一副扑克牌，一场信息战争。<br>建立防线，隐藏底牌，夺取敌方首都。</p>'+
 '<div class="field-label">01 / 选择对战模式</div><div class="segmented">'+btn('<b>◈ 人机对战</b><small>与战术 AI 交锋</small>','mode-ai',options.mode==='ai'?'active':'')+btn('<b>⧉ 双人对战</b><small>同机轮流 · 手牌遮蔽</small>','mode-local',options.mode==='local'?'active':'')+'</div>'+
 '<div class="field-label">02 / 选择战场</div><div class="map-choices">'+MAPS.map(m=>'<button class="map-choice '+(m.id===options.map?'active':'')+'" data-action="map" data-id="'+m.id+'"><span class="map-symbol">'+mapSymbol(m.id)+'</span><span><b>'+m.name+'</b><small>'+m.subtitle+'</small></span><i>'+(m.id===options.map?'●':'○')+'</i></button>').join('')+'</div>'+
 '<details class="advanced"><summary>高级选项 <span>＋</span></summary><div class="advanced-grid">'+
 optionSelect('rules','胜利规则',[['campaign','战役 · 夺取首都'],['classic','经典 · 暗牌耗尽']],options.rules)+
 optionSelect('difficulty','AI 风格',[['easy','新兵 · 节省兵力'],['normal','老兵 · 组合与伏兵']],options.difficulty)+
 optionSelect('eventSeconds','事件展示时长',[[1,'1 秒 · 快速'],[3,'3 秒 · 标准'],[5,'5 秒 · 慢速']],options.eventSeconds||3)+
 optionSelect('timer','每次行动限时',[[0,'不限时'],[30,'30 秒'],[60,'60 秒'],[120,'120 秒']],options.timer)+
 optionSelect('first','先行军团',[[0,'苍岚先行'],[1,'赤烬先行']],options.first)+
 optionSelect('strategies','初始策略卡',[[true,'开启 · 三选一'],[false,'关闭 · 纯扑克牌']],options.strategies)+
 optionSelect('maxRounds','回合上限',[[40,'40'],[80,'80'],[120,'120']],options.maxRounds)+
 '<label class="option"><span>战局种子</span><input data-option="seed" type="number" min="0" max="4294967295" value="'+options.seed+'"></label>'+
 '<p class="option-note">同一种子重现相同洗牌。经典模式不使用地图与战役策略；超时自动保守行动。</p></div></details>'+
 btn('进入战场 <span>→</span>','start','primary launch')+(saved()?btn('继续本机存档','load','resume-button'):'')+
 '<div class="menu-foot">54 张扑克牌 <i></i> 隐藏信息博弈 <i></i> 无需联网</div></div>'+
 '<div class="menu-visual"><div class="map-heading"><span>战区预览 / '+map.id.toUpperCase()+'</span><b>'+map.name+'</b></div><div class="scene-mount" id="visual-mount"></div><div class="visual-corner tl"></div><div class="visual-corner br"></div><div class="map-caption"><span class="coordinates">SECTOR '+map.fields.length+' / '+(options.rules==='classic'?'SKIRMISH':'CAPITAL STRIKE')+'</span><p>'+map.desc+'</p></div><div class="side-word">SHADOWLINE</div></div></section>';
}
function playerPanel(p){
 const pl=s.players[p];return '<button class="army-panel army-'+p+' '+(s.active===p?'current':'')+'" data-action="reserve" data-player="'+p+'"><span class="army-insignia">'+(p===0?'⟐':'✣')+'</span><span><b>'+pl.name+'</b><small>'+(s.active===p?'正在行动':'待命')+'</small></span><div class="army-stats"><span><b>'+pl.hand.length+'</b>暗牌</span><span><b>'+pl.reserve.length+'</b>公开牌</span><span><b>'+pl.supply+'</b>补给</span><span><b>'+s.fields.filter(f=>f.owner===p).reduce((n,f)=>n+f.garrison.length,0)+'</b>驻军</span></div></button>';
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
function mapView(){
 const p=viewer(),f=s.fields.find(f=>f.id===focus);
 const actionable=s.active===p&&!isAI(),can=f&&f.owner!==p&&reachable(s,p,f);
 const limit=garrisonLimit(f),chosen=[...selection].map(([id,open])=>({id,open})),placementValid=chosen.length>0&&chosen.length<=limit&&(f?.capital||chosen.some(c=>c.open));
 const topology='<svg class="topology-lines" viewBox="0 0 100 100" preserveAspectRatio="none">'+s.fields.flatMap(a=>a.links.filter(id=>a.id.localeCompare(id)<0).map(id=>{const b=s.fields.find(f=>f.id===id);return b?'<line data-a="'+a.id+'" data-b="'+b.id+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>':''})).join('')+'</svg>';
 return (targeting?'<div class="targeting-note">'+strategyById(targeting).name+'：点击符合条件的地图据点'+btn('取消','cancel-target','text-button')+'</div>':'')+'<div class="war-map"><div class="map-title"><div class="eyebrow">战术地图 / LIVE OPERATIONS</div><h2>'+MAPS.find(m=>m.id===s.opt.map).name+'</h2></div><div class="map-stage '+(s.fields.length>9?'dense-map':'')+'"><div class="map-camera" style="--map-x:'+mapViewport.x+'px;--map-y:'+mapViewport.y+'px;--map-scale:'+mapViewport.scale+'"><div id="visual-mount" class="scene-mount"></div>'+topology+'<div class="node-layer">'+s.fields.map(f=>'<button class="map-node owner-'+f.owner+' '+(f.id===focus?'focused ':'')+(reachable(s,p,f)&&f.owner!==p?'reachable':'')+'" data-action="focus" data-id="'+f.id+'" style="left:'+f.x+'%;top:'+f.y+'%"><span class="node-icon">'+fieldIcon(f)+'</span><b>'+f.label+'</b><small>'+(f.owner===null?'中立区域':f.owner===p?'己方控制':'敌方控制')+' · 容量 '+garrisonLimit(f)+(f.owner!==null?' · 驻军 '+f.garrison.length:'')+(f.blockedUntil>=s.round?' · 封锁中':'')+'</small></button>').join('')+'</div></div><div class="map-controls"><button data-map-control="in" aria-label="放大战场">＋</button><button data-map-control="out" aria-label="缩小战场">－</button><button data-map-control="reset" aria-label="重置战场视图">⌖</button></div><span class="map-gesture-hint">拖动战场 · 双指或滚轮缩放</span><span class="map-compass">N<br>↑</span></div>'+
 '<div class="target-bar"><div><small>当前目标</small><b>'+(f?f.label+' · 容量 '+limit:'选择地图上的据点')+'</b><p>'+(f?f.owner===p?'固定驻军不可直接取回；选择 1–'+limit+' 张手牌可整编换防。':!can?'目标尚不相邻，需要先建立进军路线。':f.owner===null?'选择 1–'+limit+' 张手牌驻军，非首都至少 1 张明牌。':'守军公开牌超过 3 张时自动计算最强三张；可用围城封锁一张预备守军。':'青色代表苍岚，橙色代表赤烬。')+'</p>'+(f?.garrison.length?'<span class="garrison-info">驻军：'+f.garrison.map(c=>f.owner===p||c.open?face(c)+(SUITS[c.suit]||'★'):'未知暗牌').join(' / ')+'</span>':'')+'</div>'+
 '<div class="target-actions">'+(f?.owner===null?btn('部署驻军并占领 →','occupy','primary',!actionable||!can||!placementValid):f?.owner===1-p?btn('发动进攻 →','attack','primary danger',!actionable||!can)+btn('围城 · 3 补给','siege','secondary',!actionable||!can||f.garrison.length<=3||s.players[p].supply<3,'title="封锁一张第4或第5位预备守军，本次交锋不参与牌型"'):f?.owner===p?btn('整编驻军 →','reorganize','primary',!actionable||!placementValid)+btn('快速换防 · 3','rapid_redeploy','secondary',!actionable||!placementValid||s.rapidRedeployUsed||s.players[p].supply<3):'')+
 btn('补充暗牌 · 2 补给','supply','secondary',!actionable||s.supplyUsed||s.players[p].supply<2||!s.deck.length,'title="消耗 2 点补给，从公共牌库随机抽取 1 张暗牌"')+btn('结束行动','pass','text-button',!actionable)+'</div></div></div>';
}
function line(p){
 const b=s.battle,v=viewer(),deployed=b.lines[p];
 const own=p===v;
 const cards=deployed.length?deployed:own&&['defend','attack'].includes(s.phase)?[...selection].map(([id,open])=>({...s.players[p].hand.find(c=>c.id===id),open,preview:true})):[];
 return '<div class="battle-line '+(own?'own-line':'enemy-line')+'"><div class="line-label"><span>'+(p===b.defender?'防守方 · 平手即胜':'进攻方 · 必须压过')+'</span><b>'+s.players[p].name+'</b><small>'+handName(cards.filter(c=>c.open))+' / '+power(cards.filter(c=>c.open)).join(' · ')+'</small></div><div class="line-cards">'+
 Array.from({length:p===b.defender&&b.field?garrisonLimit(s.fields.find(f=>f.id===b.field)):3},(_,i)=>{const c=cards[i];if(!c)return '<div class="card-slot"><span>0'+(i+1)+'</span></div>';const known=own||c.open||s.knowledge[v][c.id],revealable=own&&!c.open&&!c.preview&&s.phase==='counter'&&!isAI();return card(c,{hidden:!known,selected:reveals.has(c.id),stance:c.open,interactive:revealable,revealable,action:'reveal-card',peek:!own&&!c.open&&known})}).join('')+'</div></div>';
}
function battleView(){
 const b=s.battle,p=viewer(),active=s.active===p&&!isAI();
 const comparing=['counter','tactics'].includes(s.phase),lead=comparing?leading(s):null;
 const chosen=[...selection].map(([id,open])=>({...s.players[p].hand.find(c=>c.id===id),open}));
 const valid=chosen.length>0&&chosen.some(c=>c.open)&&(s.phase!=='attack'||compare(chosen.filter(c=>c.open),opened(s,b.defender))>0);
 const revealPreview=s.phase==='counter'&&reveals.size?handName(b.lines[p].filter(c=>c.open||reveals.has(c.id))):'';
 return '<section class="battle-area"><div class="battle-heading"><div><div class="eyebrow">交锋 '+String(s.skirmish).padStart(2,'0')+' / SKIRMISH</div><h2>'+(b.field?s.fields.find(f=>f.id===b.field).label:'明暗交锋')+'</h2></div><span class="battle-badge">'+statusText()+'</span></div>'+
 line(1-p)+'<div class="versus"><span></span><b>'+(comparing?lead===p?'己方占优':'己方被压制':'VS')+'</b><span></span></div>'+line(p)+
 '<div class="battle-actions"><div><b>'+(isAI()?'敌方正在推演…':s.phase==='tactics'?'可使用交锋策略，或继续让对方反击。':s.phase==='defend'?'部署 1–3 张牌，至少 1 张为明牌。':s.phase==='attack'?'用明牌压过防线，保留你的暗牌。':reveals.size?'选择后牌型：'+revealPreview+'。点击右侧确认翻开。':'点击战线上标有“点击翻开”的暗牌，再确认反击。')+'</b><small>'+(s.phase==='counter'?'暗牌未翻开前不计入当前牌型；反超后由对方继续反击。':'手牌点击顺序：选择为明牌 → 改为暗牌 → 取消。')+'</small></div><div>'+
 (s.phase==='tactics'?btn('继续 · 让对方反击 →','continue','primary',!active):s.phase==='counter'?btn(reveals.size?'确认翻开 '+reveals.size+' 张 →':'先点击暗牌','reveal','primary',!active||reveals.size<1||reveals.size>2):btn('确认部署 →','deploy','primary',!active||!valid))+
 btn('撤退','fold','secondary',!active)+'</div></div></section>';
}
function handTray(){
 const p=viewer(),pl=s.players[p],interactive=!isAI()&&s.active===p&&['campaign','defend','attack'].includes(s.phase);
 return '<section class="hand-tray"><div class="hand-top"><div><span class="eyebrow">你的暗牌 / PRIVATE HAND</span><b>'+pl.hand.length+' 张</b></div><div>'+btn('按点数排序','sort','text-button')+'<span>'+(['defend','attack'].includes(s.phase)?'已选 '+selection.size+' / 3':s.phase==='campaign'?'选择驻军牌':'暗牌安全保留')+'</span></div></div><div class="hand-scroll">'+pl.hand.map((c,i)=>'<div class="hand-card-shell" style="--rot:'+((i-(pl.hand.length-1)/2)*1.15)+'deg;--lift:'+(-Math.abs(i-(pl.hand.length-1)/2)*1.15)+'px;--z:'+i+'">'+card(c,{interactive,selected:selection.has(c.id),stance:selection.has(c.id)?selection.get(c.id):null})+'</div>').join('')+'</div></section>';
}
function strategyMarketView(expanded=false){
 if(s.phase!=='campaign'||!s.opt.strategies)return '';
 const p=viewer(),icons=s.strategyMarket.map(id=>'<i>'+strategyById(id).icon+'</i>').join('');
 if(!expanded)return '<button class="strategy-shop-trigger" data-action="open-market"><span class="shop-emblem">▰</span><span><small>战术商店 / STRATEGY SHOP</small><b>'+(s.marketBought?'本回合已采购':'查看 3 张市场策略')+'</b></span><span class="shop-icons">'+icons+'</span><strong>'+s.players[p].supply+' 补给　›</strong></button>';
 return '<section class="strategy-market expanded"><div class="market-heading"><div><span class="eyebrow">策略市场 / WAR ROOM</span><h3>'+(s.marketBought?'本回合已完成购买':'本回合可购买 1 张')+'</h3></div><small>当前 '+s.players[p].supply+' 补给 · 持有 '+s.players[p].strategies.length+' / 3 · 新购下回合解锁</small></div><div class="market-list">'+s.strategyMarket.map((id,index)=>{const c=strategyById(id),reason=canBuyStrategy(s,p,id),label=!reason?'购买 · '+c.price+' 补给':reason.startsWith('需要 ')?'补给不足 · 需 '+c.price:reason.includes('同名')?'已持有':reason.includes('持有三张')?'持有已满':reason.includes('只能购买一张')?'本回合已购':'不可购买';return '<article class="market-card"><span class="market-icon">'+c.icon+'</span><div><b>'+c.name+'</b><small>'+(c.phase==='battle'?'交锋战术':'战役指令')+' · '+c.desc+'</small></div>'+btn(label,'buy-strategy','market-buy',!!reason,'data-id="'+id+'" data-index="'+index+'" title="'+esc(reason||'花费 '+c.price+' 补给购买；下一个地图回合解锁')+'"')+'</article>'}).join('')+'</div></section>';
}
function strategyDock(){
 const p=viewer(),cards=s.players[p].strategies;if(!cards.length)return '<div class="empty-tactics">暂无策略卡</div>';
 return '<div class="tactic-dock">'+cards.map(id=>{const c=strategyById(id),reason=canStrategy(s,p,id,focus);return '<button class="strategy-token '+(reason?'unavailable':'ready')+'" data-action="use-strategy" data-id="'+id+'" '+(isAI()?'disabled':'')+' aria-label="'+esc(c.name+'：'+c.desc+'；'+(reason||'现在可以使用'))+'"><span>'+c.icon+'</span><small>'+c.name+'</small><span class="strategy-tooltip"><b>'+c.name+'</b><em>'+(c.phase==='battle'?'交锋战术':'战役指令')+'</em><p>'+c.desc+'</p><strong>'+(reason||'现在可以使用')+'</strong></span></button>'}).join('')+'</div>';
}
function sidePanel(){
 const p=viewer();return '<aside class="intel-panel"><div class="supply-box"><span class="eyebrow">公共牌库</span><b>'+s.deck.length+'<small> / 54</small></b><div class="supply-meter"><span style="width:'+s.deck.length/54*100+'%"></span></div><p>交锋结束补暗牌至 12 张<br>公共牌库耗尽后，暗牌耗尽者败</p></div><div class="tactics-heading"><h3>战术指令</h3><span>'+s.players[p].strategies.length+'</span></div>'+
 strategyDock()+'<div class="log-heading"><h3>战场记录</h3><span>LIVE</span></div><ol class="battle-log">'+s.log.slice(0,6).map(l=>'<li><span>'+String(l.round).padStart(2,'0')+'</span><p>'+esc(l.text)+'</p></li>').join('')+'</ol></aside>';
}
function game(){
 return header()+'<div class="armies">'+playerPanel(0)+'<span class="army-vs">VS</span>'+playerPanel(1)+'</div>'+
 '<div class="game-layout"><div class="play-column">'+(s.phase==='campaign'?mapView()+strategyMarketView():battleView())+handTray()+'</div>'+sidePanel()+'</div>';
}
function result(){
 const win=s.winner;return header()+'<section class="result-screen"><div class="result-emblem">'+(win===null?'⟐':win===0?'♜':'✣')+'</div><div class="eyebrow">OPERATION COMPLETE</div><h1>'+(win===null?'战局平分秋色':s.players[win].name+'获胜')+'</h1><p>'+s.reason+'</p><div class="result-stats">'+s.players.map((p,i)=>'<div class="army-'+i+'"><h3>'+p.name+'</h3><b>'+p.wins+'<small> 次交锋获胜</small></b><span>'+p.reserve.length+' 张公开牌 · '+s.fields.filter(f=>f.owner===i).length+' 块领地</span></div>').join('')+'</div><div class="result-actions">'+btn('再战一局 →','rematch','primary')+btn('返回作战部署','exit','secondary')+'</div><small>战局种子 '+s.opt.seed+' · '+s.skirmish+' 次交锋</small></section>';
}
const rulesHTML='<div class="eyebrow">FIELD MANUAL / 战地手册</div><h2>明牌交火，暗牌反击。</h2><div class="rules-content"><h3>一场交锋</h3><ol><li>防守方先部署 1–3 张牌，至少 1 张明牌。进攻方同样部署，明牌必须严格压过防守方。</li><li>随后被压制方选择撤退，或翻开 1–2 张暗牌。进攻方必须严格大于才占优，平手时防守方占优。</li><li>翻牌反超后，如果对方仍有战线暗牌，交给对方反击；双方可反复翻牌。仍被压制且还有暗牌，则继续翻牌或撤退；被压制方没有战线暗牌或主动撤退才判负。首次进攻部署不会立即获胜，闪电战与停火按各自效果结算。</li><li>胜方收取双方已翻开的牌进入公开牌堆；未翻开的牌各自收回。双方从公共牌库交替补至 12 张暗牌。</li></ol><h3>牌力顺序 · 从强到弱</h3><p class="rank-order">三条 ＞ 同花顺 ＞ 顺子 ＞ 同花 ＞ 对子 ＞ 高牌</p><p>组合牌型要求恰好 3 张明牌，包括“对子 + 一张杂牌”。两张同点数明牌仍按高牌比较。A 最小，Q-K-A 不成顺。小王大于 K，大王最大；含王的牌只按高牌比较，王不参与任何组合。相同牌型依规则逐项比较点数，不比较花色。</p><h3>战役地图 · 本作补充规则</h3><ul><li>每方 12 张初始牌中的 1 张作为首都暗牌驻军，其余 11 张在手中。每个地图回合有 1 次占领、进攻或跳过行动。占领中立点消耗 1 张手牌作为暗牌驻军，只能行动至相邻据点。</li><li>交锋开始时，防守驻军收回手中供部署。交锋结束仍由防守方控制时，优先将尚在手牌中的原驻军归还原据点；否则从所有者的公开牌堆（若空则手牌）取 1 张驻防。进攻胜利夺取该据点；夺取敌方首都立即赢得大局。</li><li>地图回合开始：每个己方据点产 1 补给，油田产 2，最多储存 30。每回合可花 2 点从公共牌库补充 1 张，不消耗地图行动。</li><li>公共牌库为空且任一方暗牌手牌为空，该方失败；同时耗尽则平局。驻军和公开牌不计为暗牌手牌。双方按回合交替优先补牌。</li><li>策略卡开局三选一，每张一次性。战役策略每个地图回合最多一次，交锋策略每方每次交锋最多一次。进攻方持有交锋策略时，完成部署后有战术窗口，可出策略或点击继续。闪电战仅己方占优时可用；之后由被压制方反击。医疗分队从己方公开牌回收；起义额外生成一张 A。补给、驻军和策略细则是本作扩展，并非原 MVP 规则。</li></ul><h3>经典模式与其他选项</h3><p>经典模式完整使用 54 张牌、每人 12 张暗牌，不使用地图、驻军和补给；双方交替先防守。开启策略时只从交锋策略选取。回合上限到达后，经典比较公开牌数，战役比较公开牌数 + 每块领地 3 分；相同则平局。</p><p>同机双人模式在每次换人时遮蔽手牌，按“准备就绪”后才显示并计时。它不提供两台设备联网。AI 只根据公开信息和自己的牌决策。暂停与手册会暂停计时和 AI。超时：地图跳过、防守出最低单张明牌、进攻或反击撤退。存档保存在此浏览器，仅供本机继续对局。</p></div>';
const revisedRulesHTML=rulesHTML.replace('组合牌型要求恰好 3 张明牌，包括“对子 + 一张杂牌”。两张同点数明牌仍按高牌比较。A 最小，Q-K-A 不成顺。小王大于 K，大王最大；含王的牌只按高牌比较，王不参与任何组合。','两张或三张明牌中出现两张同点数即为对子；三张同点数为三条。大小王是万能牌，会自动替代为当前最强合法牌型。相同牌型与点数时天然组合胜万能组合；都使用一张王时大王胜小王。单张大王胜单张小王，但完整牌型等级始终优先。A 最小，Q-K-A 不成顺。');
const finalRulesHTML=revisedRulesHTML.replace('防守方先部署 1–3 张牌，至少 1 张明牌。进攻方同样部署，明牌必须严格压过防守方。','经典交锋由防守方先部署 1–3 张牌，至少 1 张明牌；战役交锋直接使用据点的固定驻军。进攻方部署 1–3 张，明牌必须严格压过防线。').replace('胜方收取双方已翻开的牌进入公开牌堆；未翻开的牌各自收回。双方从公共牌库交替补至 12 张暗牌。','经典交锋由胜方收取双方明牌，暗牌各自收回。战役交锋中，守住时固定驻军留守，攻下时进攻战线接防，其余牌按明暗结算。双方从公共牌库交替补至 12 张暗牌。').replace('策略卡开局三选一，每张一次性。','策略卡开局三选一，每张一次性。战役模式另有三张公开市场牌，每回合可花费补给购买一张，最多持有三张；新购牌在购买者下一个地图回合解锁，市场每三轮整体刷新。').replace('每方 12 张初始牌中的 1 张作为首都暗牌驻军，其余 11 张在手中。每个地图回合有 1 次占领、进攻或跳过行动。占领中立点消耗 1 张手牌作为暗牌驻军，只能行动至相邻据点。','每方首都开局部署 3 张暗牌驻军，其余 9 张在手中。普通据点容量 3，强化据点容量 4，首都容量 5；非首都至少 1 张明牌，首都可以全暗。防守公开牌超过 3 张时只计算最强三张，暗牌仍需逐步翻开。占领中立点时选择不超过该据点容量的手牌并决定明暗，只能行动至相邻据点。').replace('交锋开始时，防守驻军收回手中供部署。交锋结束仍由防守方控制时，优先将尚在手牌中的原驻军归还原据点；否则从所有者的公开牌堆（若空则手牌）取 1 张驻防。进攻胜利夺取该据点；夺取敌方首都立即赢得大局。','驻军设置后固定在据点，被攻击时直接成为防守战线。守军获胜则原驻军留守，已翻开的牌保持公开；进攻胜利时，进攻战线成为该据点的新驻军。选择己方据点可用一次地图行动整编，或花费 3 点补给快速换防且保留地图行动；快速换防每回合一次。攻击超过 3 张守军的据点时，可花 3 点补给围城并随机封锁一张预备守军。夺取敌方首都立即赢得大局。');
function overlay(){
 if(gate&&!modal)return '<div class="handoff"><div class="handoff-symbol">⟐</div><div class="eyebrow">SECURE HANDOVER</div><h1>请将屏幕交给<br><em>'+s.players[s.active].name+'</em></h1><p>对手移开视线后，点击下方按钮查看自己的手牌。</p>'+btn('准备就绪 · 显示手牌','ready','primary')+btn('返回主菜单','confirm-exit','text-button')+'</div>';
 if(!modal)return '';
 let content='';
 if(modal==='rules')content=finalRulesHTML+btn('已了解 · 继续','close','primary');
 else if(modal==='market')content='<div class="eyebrow">SUPPLY EXCHANGE / 补给交易所</div><h2>战术商店</h2><p>市场公开可见。购买策略牌不消耗地图行动；买到的策略牌在你的下一个地图回合解锁。</p>'+strategyMarketView(true)+btn('关闭商店','close','secondary');
 else if(typeof modal==='object'&&modal.kind==='reserve'){const p=s.players[modal.player];content='<h2>'+p.name+' · 公开牌堆</h2><p>这些牌双方均可查看。</p><div class="reserve-cards">'+(p.reserve.map(c=>card(c,{small:true})).join('')||'<p>尚未获得公开牌。</p>')+'</div>'+garrisonRoster(modal.player)+btn('关闭','close','primary')}
 else if(modal==='exit')content='<h2>离开当前战局？</h2><p>本机存档会保留，可从主菜单继续。</p><div class="modal-actions">'+btn('返回战局','close','primary')+btn('保存并退出','exit','secondary')+'</div>';
 else content='<div class="eyebrow">TACTICAL PAUSE</div><h2>战场已暂停</h2><p>行动计时与电脑对手均已暂停。</p><div class="pause-actions">'+btn('继续战斗 →','close','primary')+btn('查看规则','rules','secondary')+btn('保存并返回主菜单','exit','secondary')+btn('投降','resign','text-button')+'</div>';
 return '<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="游戏面板">'+content+'</section></div>';
}
function mountScene(){
 const mount=document.querySelector('#visual-mount');if(mount){mount.appendChild(sceneEl);sceneEl.hidden=false;scene.resize?.();positionNodes()}else sceneEl.hidden=true;
}
function positionNodes(){
 if(!s||s.phase!=='campaign'||!scene.renderer)return;
 const stage=document.querySelector('.map-stage');if(!stage)return;
 const projected={};
 for(const f of s.fields){const el=stage.querySelector('[data-id="'+f.id+'"]');if(!el)continue;
 const point=scene.project?.(f)||{x:f.x,y:f.y};projected[f.id]=point;el.style.left=point.x+'%';el.style.top=point.y+'%';
 }
 for(const line of stage.querySelectorAll('.topology-lines line')){const a=projected[line.dataset.a],b=projected[line.dataset.b];if(a&&b){line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y)}}
}
function updateMapCamera(){
 const camera=document.querySelector('.map-camera');if(!camera)return;
 camera.style.setProperty('--map-x',mapViewport.x+'px');camera.style.setProperty('--map-y',mapViewport.y+'px');camera.style.setProperty('--map-scale',mapViewport.scale);
}
function zoomMap(factor,clientX,clientY){
 const stage=document.querySelector('.map-stage');if(!stage)return;
 const box=stage.getBoundingClientRect(),old=mapViewport.scale,next=Math.max(1,Math.min(2.2,old*factor));
 const x=(clientX??box.left+box.width/2)-box.left-box.width/2,y=(clientY??box.top+box.height/2)-box.top-box.height/2;
 mapViewport.x=x-(x-mapViewport.x)*(next/old);mapViewport.y=y-(y-mapViewport.y)*(next/old);mapViewport.scale=next;
 if(next===1){mapViewport.x=0;mapViewport.y=0}updateMapCamera();
}

function eventView(){
 const e=events[0],map=e.map||s.fields;
 const paths=map.flatMap(f=>f.links.filter(id=>f.id.localeCompare(id)<0).map(id=>{const to=map.find(t=>t.id===id);return to?'<line x1="'+f.x+'" y1="'+f.y+'" x2="'+to.x+'" y2="'+to.y+'"/>':''})).join('');
 const diagram=e.field&&map.length?'<div class="event-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+map.map(f=>'<div class="event-map-node '+(f.id===e.field?'hit':'')+' owner-'+f.owner+'" style="left:'+f.x+'%;top:'+f.y+'%"><i>'+fieldIcon(f)+'</i><b>'+f.label+'</b></div>').join('')+'</div>':'';
 return '<section class="event-screen event-'+e.kind+'" role="status" aria-live="polite"><div class="event-panel"><div class="eyebrow">战场快报 / '+e.kind.toUpperCase()+'</div><h1>'+esc(e.title)+'</h1><p>'+esc(e.detail)+'</p>'+diagram+
 (e.strategy?'<div class="event-strategy"><span>'+e.strategy.icon+'</span><div><b>'+e.strategy.name+'</b><small>'+e.strategy.desc+'</small></div><strong>'+e.strategy.price+' 补给</strong></div>':'')+
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
 if(!s){app.innerHTML=menu()+overlay();scene.setMap(MAPS.find(m=>m.id===options.map).fields);scene.setMode('map')}
 else if(events.length){app.innerHTML=header()+eventView()+(modal?overlay():'')}
 else if(gate){app.innerHTML=header()+overlay()}
 else{
 app.innerHTML=s.phase==='over'?result():s.phase==='draft'?header()+draft():game();
 if(s.phase==='campaign')scene.setMap(s.fields);
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
app.addEventListener('click',e=>{
 const control=e.target.closest('[data-map-control]');if(control){e.preventDefault();const kind=control.dataset.mapControl;if(kind==='reset'){mapViewport={x:0,y:0,scale:1};updateMapCamera()}else zoomMap(kind==='in'?1.25:.8);return}
 const el=e.target.closest('[data-action]');if(!el||el.disabled)return;e.preventDefault();const a=el.dataset.action,id=el.dataset.id;
 if(a==='none')return;
 if(a==='next-event'){if(!modal)advanceEvent();return}
 if(a==='sound'){muted=!muted;render();return}
 if(a==='rules'){showModal('rules');return}
 if(a==='close'){modal=null;resume();render();return}
 if(a==='exit'){save();pause();s=null;modal=null;gate=false;deadline=null;remaining=null;clockKey='';events=[];eventEnd=null;eventRemaining=null;newCards.clear();selection.clear();render();return}
 if(a==='confirm-exit'){showModal('exit');return}
 if(a==='pause'){showModal('pause');return}
 if(a==='ready'){gate=false;clockKey='';render();return}
 if(a==='start'||a==='rematch'){
 if(a==='rematch')options={...s.opt,seed:(s.opt.seed+1)>>>0};
 s=createGame(options);targeting=null;events=[];eventEnd=null;newCards.clear();selection.clear();reveals.clear();focus=null;gate=false;modal=null;deadline=null;remaining=null;clockKey='';save();render();sound();return;
 }
 if(a==='load'){const loaded=saved();if(!loaded){toast('没有有效存档');return}s=loaded;gate=s.opt.mode==='local';clockKey='';selection.clear();render();return}
 if(!s){if(a.startsWith('mode-'))options.mode=a.slice(5);if(a==='map')options.map=id;render();return}
 if(a==='reserve'){showModal({kind:'reserve',player:Number(el.dataset.player)});return}
 if(a==='open-market'){showModal('market');return}
 if(a==='buy-strategy'){modal=null;resume();perform({type:'buy_strategy',id});return}
 if(a==='resign'){events=[];eventEnd=null;eventRemaining=null;modal=null;perform({type:'resign'});return}
 if(events.length||isAI()||gate||modal)return;
 if(a==='focus'){focus=id;if(targeting&&!canStrategy(s,viewer(),targeting,focus)){const strategy=targeting;targeting=null;perform({type:'strategy',id:strategy,field:focus})}else render();return}
 if(a==='cancel-target'){targeting=null;render();return}
 if(a==='sort'){s.players[viewer()].hand.sort((a,b)=>a.rank-b.rank||a.suit-b.suit);render();return}
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
 if(['occupy','reorganize','rapid_redeploy'].includes(a))perform({type:a,field:focus,cards:[...selection].map(([id,open])=>({id,open}))});
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
 else if(mapPointers.size===2&&mapDrag?.distance){const [a,b]=[...mapPointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),target=Math.max(1,Math.min(2.2,mapDrag.scale*distance/mapDrag.distance));zoomMap(target/mapViewport.scale,(a.x+b.x)/2,(a.y+b.y)/2)}
});
function endMapPointer(e){mapPointers.delete(e.pointerId);if(!mapPointers.size){mapDrag=null;document.querySelector('.map-stage')?.classList.remove('dragging')}else{const a=[...mapPointers.values()][0];mapDrag={x:a.x,y:a.y,originX:mapViewport.x,originY:mapViewport.y}}}
app.addEventListener('pointerup',endMapPointer);app.addEventListener('pointercancel',endMapPointer);
app.addEventListener('change',e=>{
 const name=e.target.dataset.option;if(!name)return;
 const value=e.target.value;
 options[name]=['seed','timer','first','maxRounds','eventSeconds'].includes(name)?Math.min(4294967295,Math.max(0,Number(value)||0)):name==='strategies'?value==='true':value;
 if(name==='rules'||name==='map')render();
});
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
