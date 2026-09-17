import {BALANCE,MAPS,STRATEGIES,defaults,strategyById,SUITS} from './data.js';
import {t,setLang,getLang,onLangChange,strategyText,mapText,mapFactions,fieldLabel} from './i18n/index.js';
import {createGame,act,face,handName,power,compare,opened,leading,reachable,canAttack,garrisonLimit,seaLanding,isSeaLink,supplyConnected,battleLineLimit,canStrategy,canBuyStrategy,buyStrategyErrorText,aiAction,timeoutAction,validate,upgradeState,resolvedDeckCount,orderForDisplay} from './engine.js';
import {Battlefield} from './battlefield.js';
import {actionEvents} from './events.js';
import {GEO_BACKDROPS} from './map-geography.js';
const app=document.querySelector('#app'),sceneEl=document.querySelector('#scene');
const scene=new Battlefield(sceneEl);
let s=null,options={...defaults,seed:Math.floor(Math.random()*4294967296)},selection=new Map(),reveals=new Set(),focus=null,gate=false,modal=null,aiTask=null,deadline=null,remaining=null,clockKey='',muted=false;
let handSort='rank';
const sortHand=(cards,sort='rank')=>[...cards].sort(sort==='suit'?(a,b)=>a.suit-b.suit||a.rank-b.rank||a.id-b.id:(a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id);
let advancedOpen=false;
let targeting=null;
let events=[],eventEnd=null,eventRemaining=null,newCards=new Set();
let mapViewport={x:0,y:0,scale:1},mapDrag=null,mapPointers=new Map(),fittedMap=null,lastMapDragAt=0;
const STORE='shadowline-war-v1';
const mapSymbol=id=>({duel:'⟁',rift:'⋈',ring:'◎',eastern_front:'⇥',korea:'↕',western_front:'⇆',hormuz:'≋',china_civil_war:'山'}[id]||'◇');
const LOGOS=['⟐','✣','♜','⚓','▲','✦','◈','☄'];
const FIELD_TARGET_STRATEGIES=new Set(['isr','revolution','economic_sanctions','scorched_earth','relocate_capital']);
const factionLogo=(map,faction)=>{const i=Number.isInteger(faction)?faction:mapFactions(map.id).indexOf(faction);return map.factionLogos?.[i]||LOGOS[Math.max(0,i)]};
const sideOf=p=>s?.players[p]?.side??p;
const themedFields=fields=>fields.map(f=>({...f,owner:f.owner===null?null:sideOf(f.owner)}));
const fieldIcon=f=>f.capital?'♜':f.fortified?'▰':f.type==='oil'?'▥':f.type==='port'?'⚓':f.type==='mountain'?'▲':f.type==='forest'?'♣':f.type==='swamp'?'≈':'◆';
const geoBackdrop=map=>GEO_BACKDROPS[map.id]?'<svg class="geo-backdrop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+GEO_BACKDROPS[map.id]+'</svg>':'';
function menuMapPreview(map){
 const routes=map.fields.flatMap(a=>a.links.filter(id=>a.id.localeCompare(id)<0).map(id=>{const b=map.fields.find(f=>f.id===id);return b?'<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>':''})).join('');
 const nodes=map.fields.map(f=>'<span class="menu-preview-node owner-'+(f.owner===null?'null':f.owner)+(f.capital?' capital':'')+'" style="left:'+f.x+'%;top:'+f.y+'%"><i>'+fieldIcon(f)+'</i><b>'+esc(fieldName(map.id,f))+'</b></span>').join('');
 return '<div class="menu-preview-map" aria-hidden="true">'+geoBackdrop(map)+'<svg class="menu-preview-routes" viewBox="0 0 100 100" preserveAspectRatio="none">'+routes+'</svg><div class="menu-preview-nodes">'+nodes+'</div></div>';
}
const orderedCards=(cards,allKnown=false)=>allKnown?orderForDisplay(cards):[...orderForDisplay(cards.filter(c=>c.open)),...cards.filter(c=>!c.open)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,cls='',disabled=false,extra='')=>'<button class="'+cls+'" data-action="'+action+'" '+(disabled?'disabled ':'')+extra+'>'+label+'</button>';
const viewer=()=>s?.opt.mode==='ai'?0:s?.active??0;
const isAI=()=>s?.opt.mode==='ai'&&s.active===1&&s.phase!=='over';
// Field labels come from the map packs when available; fall back to the raw
// data.js label so untranslated fields still render.
const fieldName=(mapId,site)=>{const v=fieldLabel(mapId,site.id);return v===site.id?site.label:v};
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toast.job);toast.job=setTimeout(()=>el.classList.remove('show'),3800)}
function sound(type='click'){
 if(muted||!(s?.opt.sound??options.sound))return;
 try{const ctx=sound.ctx||(sound.ctx=new(window.AudioContext||window.webkitAudioContext)());ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(type==='win'?440:220,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(type==='win'?880:130,ctx.currentTime+.14);g.gain.setValueAtTime(.045,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.22);o.start();o.stop(ctx.currentTime+.23)}catch{}
}
function save(){try{if(!s)return;if(s.phase!=='over')localStorage.setItem(STORE,JSON.stringify(s));else localStorage.removeItem(STORE)}catch{}}
function saved(){try{const value=JSON.parse(localStorage.getItem(STORE));if(value?.version===1){upgradeState(value);validate(value);return value}}catch{}return null}
function pause(){if(deadline!==null){remaining=Math.max(0,deadline-Date.now());deadline=null}if(eventEnd!==null){eventRemaining=Math.max(0,eventEnd-Date.now());eventEnd=null}clearTimeout(aiTask)}
function resume(){if(events.length){eventEnd=Date.now()+(eventRemaining??3000);eventRemaining=null}else if(remaining!==null){deadline=Date.now()+remaining;remaining=null}}
function showModal(kind){pause();modal=kind;render()}
function card(c,{hidden=false,selected=false,stance=null,interactive=false,small=false,action='card',peek=false,revealable=false}={}){
 const color=!hidden?(c.rank===15?'joker-gold':c.rank===14?'joker-silver':c.suit===1||c.suit===3?'red':''):'';
 const label=hidden?t('card.hidden'):face(c)+(SUITS[c.suit]||' ★');
 const tag=interactive?'button':'div';
 const attributes=interactive?' data-action="'+action+'" data-id="'+c.id+'" aria-label="'+esc(label+' · '+(stance===true?t('card.stance_open_selected'):stance===false?t('card.stance_concealed_selected'):t('card.stance_click')))+'" aria-pressed="'+selected+'"':'';
 return '<'+tag+' class="playing-card '+color+' '+(hidden?'back ':'')+(selected?'selected ':'')+(small?'small ':'')+(stance===false?'concealed ':'')+(revealable?'revealable ':'')+'"'+attributes+'>'+
 (hidden?'<span class="card-back-mark">S<svg class="card-back-caption" viewBox="0 0 120 16" aria-hidden="true"><text x="60" y="12" text-anchor="middle" textLength="114" lengthAdjust="spacingAndGlyphs">SHADOWLINE</text></svg></span>':'<span class="card-corner">'+face(c)+'<i>'+(SUITS[c.suit]||'★')+'</i></span><span class="card-suit">'+(SUITS[c.suit]||'★')+'</span><span class="card-bottom">'+face(c)+'</span>')+
 (stance!==null?'<span class="stance">'+(revealable?(selected?t('card.reveal_selected'):t('card.reveal_click')):(stance?t('card.stance_open'):t('card.stance_concealed')))+'</span>':'')+(peek?'<span class="peek">'+t('card.peeked')+'</span>':'')+(c.boost?'<span class="boost">+'+c.boost+'</span>':'')+(!hidden&&newCards.has(c.id)?'<span class="new-card-badge">'+t('card.new')+'</span>':'')+'</'+tag+'>';
}
function strategyCard(id,action='choose-strategy',disabled=false){
 const c=strategyById(id),st=strategyText(id),phase=c.phase==='battle'?t('strategy.phase_battle'):t('strategy.phase_campaign');
 return '<button class="strategy-card" data-action="'+action+'" data-id="'+id+'" '+(disabled?'disabled':'')+'><span class="strategy-top"><span>'+c.icon+'</span><small>'+phase+'</small></span><h3>'+st.name+'</h3><p>'+st.desc+'</p><span class="strategy-foot">'+(action==='choose-strategy'?t('strategy.choose')+' ↗':t('strategy.single_use'))+'</span></button>';
}
function header(menu=false){
 const identityName=(options.playerNames?.[0]||(options.mode==='local'?t('menu.player_local0'):t('menu.player_single'))).trim();
 const identityLogo=options.playerLogos?.[0]||LOGOS[0];
 const langBtn=menu?'<div class="lang-switch" role="group" aria-label="'+t('lang.switch.label')+'"><button class="'+(getLang()==='zh'?'active':'')+'" data-action="lang-zh" aria-pressed="'+(getLang()==='zh')+'">'+t('lang.zh')+'</button><span>|</span><button class="'+(getLang()==='en'?'active':'')+'" data-action="lang-en" aria-pressed="'+(getLang()==='en')+'">'+t('lang.en')+'</button></div>':'';
 return '<header class="topbar"><a class="brand" href="#" data-action="'+(menu?'none':'pause')+'"><img class="brand-mark" src="./assets/icons/shadowline-32.png" alt="'+t('app.title')+'"><span>'+t('app.title')+'<small>'+t('app.subtitle')+'</small></span></a>'+
 (menu?'<span class="top-meta">TACTICAL CARD WARFARE <span class="live-dot"></span> '+t('menu.meta_offline')+'</span>':'<div class="round-info"><span>'+(s.opt.rules==='campaign'?t('game.rules_campaign'):t('game.rules_classic'))+'</span><b>'+String(s.round).padStart(2,'0')+'</b><span>'+t('game.round')+'</span>'+(s.opt.rules==='campaign'&&s.phase!=='draft'?'<span class="action-point '+(s.actionSpent?'spent':'available')+'"><i></i><span class="action-label">'+t('game.main_action')+'</span><strong>'+(s.actionSpent?'0 / 1':'1 / 1')+'</strong></span>':'')+'<span id="clock" class="clock"></span></div>')+
 '<div class="top-actions">'+langBtn+(menu?'<button class="identity-chip" data-action="edit-identity" aria-label="'+t('game.identity_aria')+'" title="'+t('game.identity_aria')+'"><span class="identity-emblem">'+identityLogo+'</span><b>'+esc(identityName)+'</b></button>':'')+btn(muted?t('game.sound_off'):t('game.sound_on'),'sound','text-button')+(menu?btn(t('game.tutorial'),'tutorial','text-button'):'')+btn(t('game.rules'),'rules','text-button')+(menu?'':btn(t('game.pause'),'pause','icon-button'))+'</div></header>';
}
function optionSelect(name,label,entries,value){return '<label class="option"><span>'+label+'</span><select data-option="'+name+'">'+entries.map(([v,t])=>'<option value="'+v+'" '+(String(value)===String(v)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'}
function logoPicker(player){const selected=options.playerLogos?.[player]||LOGOS[player];return '<div class="logo-picker" role="radiogroup" aria-label="'+t('modal.identity.choose_logo')+'">'+LOGOS.map(icon=>'<label class="logo-choice"><input type="radio" name="player-logo-'+player+'" data-option="playerLogo'+player+'" value="'+icon+'" '+(selected===icon?'checked':'')+'><span>'+icon+'</span></label>').join('')+'</div>'}
function identityFields(player,label){const selected=options.playerLogos?.[player]||LOGOS[player];return '<div class="identity-editor"><div class="identity-preview"><span>'+selected+'</span><small>'+t('modal.identity.current_logo')+'</small></div><div class="identity-controls"><label class="identity-name"><span>'+t('modal.identity.name_label',{label})+'</span><input data-option="playerName'+player+'" maxlength="18" placeholder="'+(options.mode==='local'?t('menu.player_local'+player):t('menu.player_single'))+'" value="'+esc(options.playerNames?.[player]||'')+'"></label><span class="identity-label">'+t('modal.identity.choose_logo')+'</span>'+logoPicker(player)+'</div></div>'}
function menu(){
 const map=MAPS.find(m=>m.id===options.map);
 return header(true)+'<section class="command-menu"><div class="setup-panel"><div class="eyebrow"><span></span> '+t('menu.eyebrow')+'</div><h1>'+t('menu.hero_l1')+'<br><em>'+t('menu.hero_l2')+'</em></h1><p class="intro">'+t('menu.intro_l1')+'<br>'+t('menu.intro_l2')+'</p>'+
 '<div class="field-label">'+t('menu.mode_label')+'</div><div class="segmented">'+btn('<b>◈ '+t('menu.mode_ai_title')+'</b><small>'+t('menu.mode_ai_sub')+'</small>','mode-ai',options.mode==='ai'?'active':'')+btn('<b>⧉ '+t('menu.mode_local_title')+'</b><small>'+t('menu.mode_local_sub')+'</small>','mode-local',options.mode==='local'?'active':'')+'</div>'+
 '<div class="field-label">'+t('menu.map_label')+'</div><div class="map-choices">'+MAPS.map(m=>{const mt=mapText(m.id);return '<button class="map-choice '+(m.id===options.map?'active':'')+'" data-action="map" data-id="'+m.id+'"><span class="map-symbol">'+mapSymbol(m.id)+'</span><span><b>'+mt.name+'</b><small>'+mt.subtitle+'</small></span><i>'+(m.id===options.map?'●':'○')+'</i><em class="map-tag'+(m.historical?' hist':'')+'">'+(m.historical?t('menu.map_tag_hist'):t('menu.map_tag_versus'))+'</em></button>'}).join('')+'</div>'+
 '<details class="advanced" '+(advancedOpen?'open':'')+'><summary>'+t('menu.advanced')+' <span>＋</span></summary><div class="advanced-grid">'+
 optionSelect('rules',t('menu.opt.rules_label'),[['campaign',t('menu.opt.rules_campaign')],['classic',t('menu.opt.rules_classic')]],options.rules)+
 optionSelect('difficulty',t('menu.opt.difficulty_label'),[['easy',t('menu.opt.difficulty_easy')],['normal',t('menu.opt.difficulty_normal')]],options.difficulty)+
 optionSelect('eventSeconds',t('menu.opt.event_label'),[[1,t('menu.opt.event_1')],[3,t('menu.opt.event_3')],[5,t('menu.opt.event_5')]],options.eventSeconds||3)+
 optionSelect('timer',t('menu.opt.timer_label'),[[0,t('menu.opt.timer_0')],[30,t('menu.opt.timer_30')],[60,t('menu.opt.timer_60')],[120,t('menu.opt.timer_120')]],options.timer)+
 optionSelect('first',t('menu.opt.first_label'),[[0,t('menu.opt.first_0')],[1,t('menu.opt.first_1')]],options.first)+
 (map.historical?optionSelect('deployment',t('menu.opt.deployment_label'),[['standard',t('menu.opt.deployment_standard')],['historical',t('menu.opt.deployment_historical',{label:t('map.'+map.id+'.historical.label')})]],options.deployment||'standard'):'')+
 optionSelect('faction0',t('menu.opt.faction0_label'),mapFactions(map.id).map((x,i)=>[i,x]),options.factions?.[0]??0)+
 optionSelect('faction1',options.mode==='local'?t('menu.opt.faction1_local'):t('menu.opt.faction1_ai'),mapFactions(map.id).map((x,i)=>[i,x]),options.factions?.[1]??1)+
 optionSelect('strategies',t('menu.opt.strategies_label'),[[true,t('menu.opt.strategies_on')],[false,t('menu.opt.strategies_off')]],options.strategies)+
 optionSelect('openingTruceRounds',t('menu.opt.truce_label'),[[0,t('menu.opt.truce_0')],[1,t('menu.opt.truce_1')],[2,t('menu.opt.truce_2')]],options.openingTruceRounds??0)+
 optionSelect('deckCount',t('menu.opt.deck_label'),[['auto',t('menu.opt.deck_auto')],[1,t('menu.opt.deck_1')],[2,t('menu.opt.deck_2')]],options.deckCount||'auto')+
 optionSelect('maxRounds',t('menu.opt.rounds_label'),[[40,'40'],[80,'80'],[120,'120']],options.maxRounds)+
 '<label class="option"><span>'+t('menu.opt.seed_label')+'</span><input data-option="seed" type="number" min="0" max="4294967295" value="'+options.seed+'"></label>'+
 '<p class="option-note">'+t('menu.opt.deck_note',{deck:resolvedDeckCount(options,map.fields)===2?t('menu.opt.deck_two'):t('menu.opt.deck_one')})+'</p></div></details>'+
 btn(t('menu.start')+' <span>→</span>','start','primary launch')+(saved()?btn(t('menu.resume'),'load','resume-button'):'')+
 '<div class="menu-foot">'+t('menu.foot',{count:resolvedDeckCount(options,map.fields)===2?'106':'54'})+'</div></div>'+
 '<div class="menu-visual"><div class="map-heading"><span>'+t('menu.preview_label')+' / '+map.id.toUpperCase()+'</span><b>'+mapText(map.id).name+'</b></div>'+menuMapPreview(map)+'<div class="visual-corner tl"></div><div class="visual-corner br"></div><div class="map-caption"><span class="coordinates">SECTOR '+map.fields.length+' / '+(options.rules==='classic'?'SKIRMISH':'CAPITAL STRIKE')+'</span><p>'+mapText(map.id).desc+'</p></div><div class="side-word">SHADOWLINE</div></div></section>';
}
function playerPanel(p){
 const pl=s.players[p],report=s.supplyLedger?.[p],tip=report?t('game.panel.supply_tip',{round:report.round,entries:report.entries.map(e=>e.label+' '+(e.amount>0?'+':'')+e.amount).join(t('game.panel.supply_sep'))}):t('game.panel.supply_none');
 return '<button class="army-panel army-'+sideOf(p)+' '+(s.active===p?'current':'')+'" data-action="reserve" data-player="'+p+'"><span class="army-insignia">'+(pl.logo||(sideOf(p)===0?'⟐':'✣'))+'</span><span><b>'+pl.name+'</b><small>'+(pl.faction?pl.faction+' · ':'')+(s.active===p?t('game.panel.active'):t('game.panel.idle'))+'</small></span><div class="army-stats"><span><b>'+pl.hand.length+'</b>'+t('game.panel.hand')+'</span><span><b>'+pl.reserve.length+'</b>'+t('game.panel.open')+'</span><span class="supply-stat" data-action="supply-ledger" data-player="'+p+'" title="'+esc(tip)+'"><b>'+pl.supply+'</b>'+t('game.panel.supply')+'<i>ⓘ</i></span><span><b>'+s.fields.filter(f=>f.owner===p).reduce((n,f)=>n+f.garrison.length,0)+'</b>'+t('game.panel.garrison')+'</span></div></button>';
}
function statusText(){
 if(s.phase==='draft')return t('game.phase.draft');
 if(s.phase==='campaign')return t('game.phase.campaign');
 if(s.phase==='defend')return t('game.phase.defend');
 if(s.phase==='attack')return t('game.phase.attack');
 if(s.phase==='tactics')return t('game.phase.tactics');
 if(s.phase==='counter'&&s.battle)return t(s.active===s.battle.attacker?'game.phase.counter_attacker':'game.phase.counter_defender');
 return t('game.phase.over');
}
function draft(){
 const p=viewer();return '<section class="draft-screen"><div class="eyebrow">'+t('game.draft.eyebrow')+'</div><h1>'+t('game.draft.title')+'</h1><p>'+t('game.draft.desc',{name:s.players[s.active].name})+'</p>'+
 (isAI()?'<div class="ai-thinking"><span></span>'+t('game.draft.ai')+'</div>':'<div class="draft-grid">'+s.draft[p].map(id=>strategyCard(id)).join('')+'</div>')+
 '<div class="draft-help">'+t('game.draft.help')+'</div></section>';
}
function mapGarrison(f,p){
 if(!f.garrison.length)return '';
 const cards=orderedCards(f.garrison,f.owner===p);
 return '<span class="map-garrison" aria-label="'+esc(t('game.garrison_aria',{label:fieldName(s.opt.map,f),n:f.garrison.length}))+'">'+cards.map(c=>{const hidden=!c.open&&f.owner!==p,label=hidden?'?':face(c)+(SUITS[c.suit]||'★'),tone=!hidden?(c.rank===15?'joker-gold':c.rank===14?'joker-silver':c.suit===1||c.suit===3?'red':''):'';return '<span class="map-mini-card '+(hidden?'back':c.open?'open':'concealed')+' '+tone+'" title="'+esc(hidden?t('game.garrison_enemy_hidden'):(c.open?t('game.garrison_open'):t('game.garrison_own_hidden'))+label)+'">'+label+'</span>'}).join('')+'</span>';
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
function layoutMapNodes(){
 const stage=document.querySelector('.map-stage');
 if(!stage||!s)return;
 const w=stage.clientWidth,h=stage.clientHeight;
 if(!w||!h)return;
 const nodes=[...stage.querySelectorAll('.map-node')].map(el=>({el,id:el.dataset.id,x:Number(el.dataset.mapX)/100*w,y:Number(el.dataset.mapY)/100*h,width:el.offsetWidth,height:el.offsetHeight}));
 const gap=innerWidth<=520?4:6;
 const sr=stage.getBoundingClientRect(),obstacles=[stage.closest('.war-map')?.querySelector('.map-title'),stage.querySelector('.map-controls'),stage.querySelector('.map-compass')].filter(Boolean).map(el=>{const r=el.getBoundingClientRect();return {l:r.left-sr.left,r:r.right-sr.left,t:r.top-sr.top,b:r.bottom-sr.top}});
  for(let pass=0;pass<160;pass++){
   let moved=false;
   for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const a=nodes[i],b=nodes[j],al=a.x-a.width/2,ar=a.x+a.width/2,at=a.y-5,ab=at+a.height,bl=b.x-b.width/2,br=b.x+b.width/2,bt=b.y-5,bb=bt+b.height;
    const ox=Math.min(ar,br)-Math.max(al,bl)+gap,oy=Math.min(ab,bb)-Math.max(at,bt)+gap;
    if(ox<=0||oy<=0)continue;
    moved=true;
    if(ox<oy){const dir=(a.x-b.x)||((a.id<b.id)?-1:1),push=ox/2+.05;a.x+=Math.sign(dir)*push;b.x-=Math.sign(dir)*push}
    else{const ac=a.y-5+a.height/2,bc=b.y-5+b.height/2,dir=(ac-bc)||((a.id<b.id)?-1:1),push=oy/2+.05;a.y+=Math.sign(dir)*push;b.y-=Math.sign(dir)*push}
   }
   for(const n of nodes)for(const o of obstacles){const l=n.x-n.width/2,r=n.x+n.width/2,t0=n.y-5,b0=t0+n.height,ox=Math.min(r,o.r)-Math.max(l,o.l)+gap,oy=Math.min(b0,o.b)-Math.max(t0,o.t)+gap;if(ox<=0||oy<=0)continue;moved=true;if(ox<oy)n.x+=(n.x<(o.l+o.r)/2?-1:1)*(ox+.05);else n.y+=(n.y-5+n.height/2<(o.t+o.b)/2?-1:1)*(oy+.05)}
   for(const n of nodes){n.x=Math.min(w-n.width/2-gap,Math.max(n.width/2+gap,n.x));n.y=Math.min(h-n.height+5-gap,Math.max(5+gap,n.y))}
   if(!moved)break;
  }
 const points=new Map(nodes.map(n=>{const p={x:n.x/w*100,y:n.y/h*100};n.el.style.left=p.x+'%';n.el.style.top=p.y+'%';return [n.id,p]}));
 const all=[...points.values()];
 stage.querySelectorAll('.map-route').forEach(route=>{const a=points.get(route.dataset.a),b=points.get(route.dataset.b);if(!a||!b)return;route.querySelectorAll('line').forEach(line=>{line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y)});route.querySelectorAll('path').forEach(path=>path.setAttribute('d',seaLaneD(a,b,all.filter(p=>p!==a&&p!==b))))});
 fittedMap={minX:Math.min(...all.map(p=>p.x))-3,maxX:Math.max(...all.map(p=>p.x))+3,minY:Math.min(...all.map(p=>p.y))-4,maxY:Math.max(...all.map(p=>p.y))+6};
}
function mapView(){
 const p=viewer(),f=s.fields.find(f=>f.id===focus),map=MAPS.find(m=>m.id===s.opt.map);
 const cutLine=[supplyConnected(s,0),supplyConnected(s,1)];
 const selectedLinks=new Set(f?.links||[]);
 const focusHasSea=f&&f.links.some(id=>isSeaLink(s,f.id,id));
 const seaMarkerSVG='<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1,6.8 L9,6.8 L7.6,9.6 L2.4,9.6 Z" fill="#a9cfdd"/><rect x="4.75" y="1.6" width="0.5" height="5.4" fill="#a9cfdd"/><path d="M5.5,1.8 L5.5,6.2 L8.4,6.2 Z" fill="#e8cf95"/><path d="M4.5,2.6 L4.5,6.2 L2.2,6.2 Z" fill="#e2eae8"/></svg>';
 const actionable=s.active===p&&!isAI(),primaryAvailable=actionable&&!s.actionSpent,can=f&&f.owner!==p&&reachable(s,p,f),attackAllowed=f&&canAttack(s,p,f);
 const limit=garrisonLimit(f),chosen=[...selection].map(([id,open])=>({id,open})),placementValid=chosen.length>0&&chosen.length<=limit&&(f?.capital||chosen.some(c=>c.open));
 const terrainNote=!f?'':f.type==='swamp'?t('game.terrain_swamp'):f.type==='forest'?t('game.terrain_forest'):f.type==='mountain'?t('game.terrain_mountain'):f.type==='port'&&seaLanding(s,p,f)?t('game.terrain_sea'):'';
 const topology='<svg class="topology-lines '+(f?'has-focus':'')+'" viewBox="0 0 100 100" preserveAspectRatio="none">'+s.fields.flatMap(a=>a.links.filter(id=>a.id.localeCompare(id)<0).map(id=>{const b=s.fields.find(f=>f.id===id);if(!b)return '';const active=focus===a.id||focus===b.id,direction=focus===b.id?' reverse':'';if(isSeaLink(s,a.id,b.id)){const d=seaLaneD(a,b,s.fields.filter(o=>o!==a&&o!==b));return '<g class="map-route sea-route'+(active?' active':'')+'" data-a="'+a.id+'" data-b="'+b.id+'"><path class="route-base sea-base" d="'+d+'"/>'+(active?'<path class="route-pulse sea-pulse'+direction+'" d="'+d+'"/>':'')+'</g>'}return '<g class="map-route '+(active?'active':'')+'" data-a="'+a.id+'" data-b="'+b.id+'"><line class="route-base" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>'+(active?'<line class="route-pulse'+direction+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"/>':'')+'</g>'})).join('')+'</svg>';
 return (targeting?'<div class="targeting-note">'+t('game.targeting',{name:strategyText(targeting).name})+btn(t('game.cancel'),'cancel-target','text-button')+'</div>':'')+'<div class="war-map"><div class="map-title"><div class="eyebrow">'+t('game.map.eyebrow')+'</div><h2>'+mapText(map.id).name+'</h2></div><div class="map-stage '+(s.fields.length>9?'dense-map':'')+'"><div class="map-camera" style="--map-x:'+mapViewport.x+'px;--map-y:'+mapViewport.y+'px;--map-scale:'+mapViewport.scale+'"><div id="visual-mount" class="scene-mount"></div>'+geoBackdrop(map)+topology+'<div class="node-layer">'+s.fields.map(site=>'<button class="map-node owner-'+(site.owner===null?'null':sideOf(site.owner))+' '+(site.owner!==null&&!cutLine[site.owner].has(site.id)?'supply-cut ':'')+(site.id===focus?'focused ':'')+(selectedLinks.has(site.id)?'route-neighbor ':'')+(reachable(s,p,site)&&site.owner!==p?'reachable':'')+'" data-action="focus" data-id="'+site.id+'" data-map-x="'+site.x+'" data-map-y="'+site.y+'" style="left:'+site.x+'%;top:'+site.y+'%"><span class="node-icon">'+fieldIcon(site)+'</span>'+(site.owner!==null&&!cutLine[site.owner].has(site.id)?'<span class="supply-cut-marker" title="'+t('game.node_cut_title')+'" aria-label="'+t('game.node_cut_title')+'">⛓</span>':'')+(focusHasSea&&(site.id===f.id||isSeaLink(s,f.id,site.id))?'<span class="sea-marker" title="'+t('game.sea_marker')+'">'+seaMarkerSVG+'</span>':'')+'<b>'+fieldName(s.opt.map,site)+'</b>'+mapGarrison(site,p)+'<small>'+(site.owner===null?t('game.node_neutral'):site.owner===p?t('game.node_own'):t('game.node_enemy'))+' · '+t('game.node_capacity',{n:garrisonLimit(site)})+(site.blockedUntil>=s.round?t('game.node_blocked'):'')+(site.owner!==null&&!cutLine[site.owner].has(site.id)?t('game.node_cut'):'')+'</small></button>').join('')+'</div></div><div class="map-controls"><button data-map-control="in" aria-label="'+t('game.mapctrl_in')+'">＋</button><button data-map-control="out" aria-label="'+t('game.mapctrl_out')+'">－</button><button data-map-control="reset" aria-label="'+t('game.mapctrl_reset')+'">⌖</button></div><span class="map-gesture-hint">'+t('game.mapctrl_hint')+'</span><span class="map-compass">N<br>↑</span></div>'+
 '<div class="target-bar"><div><small>'+t('game.target.current')+'</small><b>'+(f?t('game.target.field',{label:fieldName(s.opt.map,f),n:limit}):t('game.target.select'))+'</b><p>'+(f?f.owner===p?t('game.target.desc_own'):!can?t('game.target.desc_unreachable'):f.owner===null?t('game.target.desc_neutral',{n:limit}):t('game.target.desc_enemy'):t('game.target.legend',{f0:s.players.find(pl=>pl.side===0).faction,f1:s.players.find(pl=>pl.side===1).faction}))+'</p>'+(terrainNote?'<span class="garrison-info">'+terrainNote+'</span>':'')+(f?.garrison.length?'<span class="garrison-info">'+t('game.target.garrison_label')+f.garrison.map(c=>f.owner===p||c.open?face(c)+(SUITS[c.suit]||'★'):t('game.target.unknown')).join(' / ')+'</span>':'')+'</div>'+
 '<div class="target-actions">'+(s.actionSpent?'<span class="action-reminder" title="'+t('game.action.reminder_title')+'">'+t('game.action.reminder_text')+'</span>':'')+(f?.owner===null?btn(t('game.action.occupy')+' →','occupy','primary '+(primaryAvailable&&!placementValid?'needs-selection':''),!primaryAvailable||!can,'title="'+(placementValid?t('game.action.occupy_title_ok'):t('game.action.occupy_title_need'))+'" data-selection-ready="'+placementValid+'"'):f?.owner===1-p?btn(t('game.action.attack')+' →','attack','primary danger',!primaryAvailable||!can||!attackAllowed,'title="'+(!attackAllowed?t('game.action.attack_blocked'):'')+'"')+btn(t('game.action.siege',{cost:BALANCE.campaign.siegeCost}),'siege','secondary',!primaryAvailable||!can||!attackAllowed||f.garrison.length<=BALANCE.campaign.siegeThreshold||s.players[p].supply<BALANCE.campaign.siegeCost,'title="'+t('game.action.siege_title',{cost:BALANCE.campaign.siegeCost})+'"'):f?.owner===p?btn(t('game.action.reorganize')+' →','reorganize','primary '+(primaryAvailable&&!placementValid?'needs-selection':''),!primaryAvailable||!cutLine[p].has(f.id),'title="'+(placementValid?t('game.action.reorganize_title_ok'):t('game.action.reorganize_title_need'))+'" data-selection-ready="'+placementValid+'"')+btn(t('game.action.rotate',{cost:BALANCE.campaign.rotationCostPerCard}),'open-rotation','secondary',!actionable||!cutLine[p].has(f.id)||!f.garrison.length||!s.players[p].hand.length||s.rapidRedeployUsed||s.players[p].supply<BALANCE.campaign.rotationCostPerCard,'title="'+t('game.action.rotate_title',{cost:BALANCE.campaign.rotationCostPerCard})+'"'):'')+
 (f?.owner===p?btn(t('game.action.abandon'),'abandon-field','secondary danger',!primaryAvailable||f.capital||!cutLine[p].has(f.id)):'')+
 btn(t('game.action.supply',{cost:BALANCE.campaign.resupplyCost,cards:BALANCE.campaign.resupplyCards}),'supply','secondary supply-action',!actionable||s.supplyUsed||s.players[p].supply<BALANCE.campaign.resupplyCost||s.deck.length<BALANCE.campaign.resupplyCards,'title="'+t('game.action.supply_title',{cost:BALANCE.campaign.resupplyCost,cards:BALANCE.campaign.resupplyCards})+'"')+btn(t('game.action.pass'),'pass','secondary pass-action',!actionable,'title="'+t('game.action.pass_title')+'"')+'</div></div></div>';
}
function line(p){
 const b=s.battle,v=viewer(),deployed=b.lines[p];
 const own=p===v;
 const raw=deployed.length?deployed:own&&['defend','attack'].includes(s.phase)?[...selection].map(([id,open])=>({...s.players[p].hand.find(c=>c.id===id),open,preview:true})):[];
 const cards=orderedCards(raw,own);
 return '<div class="battle-line '+(own?'own-line':'enemy-line')+'"><div class="line-label"><span>'+(p===b.defender?t('game.line.defender'):t('game.line.attacker'))+'</span><b>'+s.players[p].name+'</b><small>'+handName(cards.filter(c=>c.open))+' / '+power(cards.filter(c=>c.open)).join(' · ')+'</small></div><div class="line-cards">'+
 Array.from({length:b.field?battleLineLimit(s,p):3},(_,i)=>{const c=cards[i];if(!c)return '<div class="card-slot"><span>0'+(i+1)+'</span></div>';const known=own||c.open||s.knowledge[v][c.id],revealable=own&&!c.open&&!c.preview&&s.phase==='counter'&&!isAI();return card(c,{hidden:!known,selected:reveals.has(c.id),stance:c.open,interactive:revealable,revealable,action:'reveal-card',peek:!own&&!c.open&&known})}).join('')+'</div></div>';
}
const rankLabel=rank=>rank===15?t('card.rank_big'):rank===14?t('card.rank_small'):({1:'A',11:'J',12:'Q',13:'K'}[rank]||String(rank||t('card.rank_none')));
function comparisonDetail(a,b,leader){
 const av=power(a),bv=power(b),an=handName(a),bn=handName(b),winner=leader===0?av:bv,loser=leader===0?bv:av;
 if(av[0]!==bv[0])return t('game.compare.beats',{w:leader===0?an:bn,l:leader===0?bn:an});
 const difference=winner.findIndex((value,index)=>index>0&&value!==loser[index]);
 if(difference<0)return t('game.compare.tie');
 if(av[0]===2)return difference===1?t('game.compare.pair',{w:rankLabel(winner[1]),l:rankLabel(loser[1])}):t('game.compare.pair_kicker',{w:rankLabel(winner[2]),l:rankLabel(loser[2])});
 if([4,5,6].includes(av[0]))return t('game.compare.high',{hand:an,w:rankLabel(winner[1]),l:rankLabel(loser[1])});
 return difference===1?t('game.compare.top_open',{w:rankLabel(winner[1]),l:rankLabel(loser[1])}):t('game.compare.nth',{n:difference,x:rankLabel(winner[difference]),y:rankLabel(loser[difference])});
}
function deploymentValid(p=viewer()){
 const b=s.battle,chosen=[...selection].map(([id,open])=>{const c=s.players[p].hand.find(c=>c.id===id);return c?{...c,open}:null}).filter(Boolean);
 const mountain=b.field&&s.fields.find(f=>f.id===b.field)?.type==='mountain',sea=b.seaLanding;
 return chosen.length>0&&chosen.length<=battleLineLimit(s,p)&&chosen.some(c=>c.open)&&(s.phase!=='attack'||(compare(chosen.filter(c=>c.open),opened(s,b.defender))>0&&(!mountain||chosen.filter(c=>c.open).length>=BALANCE.battle.mountainMinOpen)&&(!sea||power(chosen.filter(c=>c.open))[0]>=power(opened(s,b.defender))[0])&&(!sea||power(chosen)[0]!==6)));
}
function battleView(){
 const b=s.battle,p=viewer(),active=s.active===p&&!isAI();
 const comparing=['counter','tactics'].includes(s.phase),lead=comparing?leading(s):null;
 const tied=comparing&&compare(opened(s,b.attacker),opened(s,b.defender))===0;
 const leadDetail=comparing?comparisonDetail(opened(s,p),opened(s,1-p),lead===p?0:1):'';
 const leadText=comparing?'<strong>'+(tied?t('game.battle.tie_defender_lead'):lead===p?t('game.battle.own_lead'):t('game.battle.enemy_lead'))+'</strong><small>'+t('game.battle.lead_note',{detail:leadDetail})+'</small>':'<strong>VS</strong>';
 const mountain=b.field&&s.fields.find(f=>f.id===b.field)?.type==='mountain',sea=b.seaLanding;
 const valid=deploymentValid(p);
 const revealPreview=s.phase==='counter'&&reveals.size?handName(b.lines[p].filter(c=>c.open||reveals.has(c.id))):'';
 return '<section class="battle-area"><div class="battle-heading"><div><div class="eyebrow">'+t('game.battle.eyebrow')+' '+String(s.skirmish).padStart(2,'0')+' / SKIRMISH</div><h2>'+(b.field?fieldName(s.opt.map,s.fields.find(f=>f.id===b.field)):t('game.battle.field_default'))+'</h2></div><span class="battle-badge">'+statusText()+'</span></div>'+
 line(1-p)+'<div class="versus"><span></span><b>'+leadText+'</b><span></span></div>'+line(p)+
 '<div class="battle-actions"><div><b>'+(isAI()?t('game.battle.ai'):s.phase==='tactics'?t('game.battle.hint_tactics'):s.phase==='defend'?t('game.battle.hint_defend',{n:battleLineLimit(s,p)}):s.phase==='attack'?(mountain?t('game.battle.hint_attack_mountain'):sea?t('game.battle.hint_attack_sea'):t('game.battle.hint_attack')):reveals.size?t('game.battle.hint_counter_selected',{preview:revealPreview}):t('game.battle.hint_counter'))+'</b><small>'+(s.phase==='counter'?t('game.battle.sub_counter'):t('game.battle.sub_order'))+'</small></div><div>'+
 (s.phase==='tactics'?btn(t('game.battle.continue')+' →','continue','primary',!active):s.phase==='counter'?btn(reveals.size?t('game.battle.reveal_confirm',{n:reveals.size})+' →':t('game.battle.reveal_first'),'reveal','primary',!active||reveals.size<1||reveals.size>BALANCE.battle.maxCounterReveal):btn(t('game.battle.deploy')+' →','deploy','primary',!active||!valid))+
 btn(t('game.battle.fold'),'fold','secondary',!active)+'</div></div></section>';
}
function handTray(){
 const p=viewer(),pl=s.players[p],interactive=!isAI()&&s.active===p&&['campaign','defend','attack'].includes(s.phase);
 const cards=sortHand(pl.hand,handSort);
 const sort='<span class="hand-sort-toggle" role="group" aria-label="'+t('game.hand.sort_label')+'"><button class="'+(handSort==='rank'?'active':'')+'" data-action="hand-sort" data-id="rank" aria-pressed="'+(handSort==='rank')+'">'+t('game.hand.sort_rank')+'</button><button class="'+(handSort==='suit'?'active':'')+'" data-action="hand-sort" data-id="suit" aria-pressed="'+(handSort==='suit')+'">'+t('game.hand.sort_suit')+'</button></span>';
 return '<section class="hand-tray"><div class="hand-top"><div><span class="eyebrow">'+t('game.hand.eyebrow')+'</span><b>'+t('game.hand.count',{n:pl.hand.length})+'</b></div><div>'+sort+'<span class="hand-selection-status">'+(['defend','attack'].includes(s.phase)?t('game.hand.selected',{n:selection.size}):s.phase==='campaign'?t('game.hand.choose_garrison'):t('game.hand.safe'))+'</span></div></div><div class="hand-scroll" style="--hand-count:'+cards.length+'">'+cards.map((c,i)=>'<div class="hand-card-shell" style="--rot:'+((i-(cards.length-1)/2)*1.15)+'deg;--lift:'+(-Math.abs(i-(cards.length-1)/2)*1.15)+'px;--z:'+i+'">'+card(c,{interactive,selected:selection.has(c.id),stance:selection.has(c.id)?selection.get(c.id):null})+'</div>').join('')+'</div></section>';
}
function strategyMarketView(){
 if(s.phase!=='campaign'||!s.opt.strategies)return '';
 const p=viewer();
 return '<section class="strategy-market expanded"><div class="market-heading"><div><span class="eyebrow">'+t('game.market.eyebrow')+'</span><h3>'+(s.marketBought?t('game.market.bought'):t('game.market.can_buy'))+'</h3></div><small>'+t('game.market.status',{supply:s.players[p].supply,n:s.players[p].strategies.length})+'</small></div><div class="market-list">'+s.strategyMarket.map((id,index)=>{const c=strategyById(id),st=strategyText(id),reason=canBuyStrategy(s,p,id),label=!reason?t('game.market.buy',{price:c.price}):reason==='need_supply'?t('game.market.need',{price:c.price}):reason==='duplicate_strategy'?t('game.market.owned'):reason==='strategies_full'?t('game.market.full'):reason==='market_bought'?t('game.market.bought_one'):t('game.market.unavailable');return '<article class="market-card"><span class="market-icon">'+c.icon+'</span><div><b>'+st.name+'</b><small>'+(c.phase==='battle'?t('strategy.phase_battle'):t('strategy.phase_campaign'))+' · '+st.desc+'</small></div>'+btn(label,'buy-strategy','market-buy',!!reason,'data-id="'+id+'" data-index="'+index+'" title="'+esc(reason?buyStrategyErrorText(reason,id):t('game.market.buy_title',{price:c.price}))+'"')+'</article>'}).join('')+'</div></section>';
}
function strategyShopButton(){
 if(s.phase!=='campaign'||!s.opt.strategies)return '';
 const p=viewer(),summary=s.marketBought?t('game.shop.bought'):t('game.shop.view',{n:s.strategyMarket.length});
 return '<button class="strategy-shop-button" data-action="open-market" aria-label="'+esc(t('game.shop.aria',{summary,supply:s.players[p].supply}))+'" title="'+esc(t('game.shop.title',{summary,supply:s.players[p].supply}))+'"><span class="shop-coin">$</span><i>'+s.strategyMarket.length+'</i></button>';
}
function battleLogList(limit=s.log.length){return '<ol class="battle-log">'+s.log.slice(0,limit).map(l=>'<li><span>'+String(l.round).padStart(2,'0')+'</span><p>'+esc(l.text)+'</p></li>').join('')+'</ol>'}
function strategyDock(){
 const p=viewer(),cards=s.players[p].strategies;if(!cards.length)return '<div class="empty-tactics">'+t('game.dock.empty')+'</div>';
 return '<div class="tactic-dock">'+cards.map(id=>{const c=strategyById(id),st=strategyText(id),reason=canStrategy(s,p,id,focus);return '<button class="strategy-token '+(reason?'unavailable':'ready')+'" data-action="use-strategy" data-id="'+id+'" '+(isAI()?'disabled':'')+' aria-label="'+esc(t('game.dock.aria',{name:st.name,desc:st.desc,state:reason||t('game.dock.ready')}))+'"><span>'+c.icon+'</span><small>'+st.name+'</small><span class="strategy-tooltip"><b>'+st.name+'</b><em>'+(c.phase==='battle'?t('strategy.phase_battle'):t('strategy.phase_campaign'))+'</em><p>'+st.desc+'</p><strong>'+(reason||t('game.dock.ready'))+'</strong></span></button>'}).join('')+'</div>';
}
function sidePanel(){
 const p=viewer();return '<aside class="intel-panel"><div class="supply-box"><span class="eyebrow">'+t('game.side.deck')+'</span><b>'+s.deck.length+'<small> / '+s.baseDeckSize+'</small></b><div class="supply-meter"><span style="width:'+s.deck.length/s.baseDeckSize*100+'%"></span></div><p>'+(s.opt.rules==='campaign'?t('game.side.deck_campaign'):t('game.side.deck_classic'))+'</p></div><div class="tactics-heading"><h3>'+t('game.side.tactics')+'</h3><span class="tactics-tools"><button class="compact-log-button" data-action="open-log" aria-label="'+t('game.side.log_title')+'" title="'+t('game.side.log_title')+'">'+t('game.side.log_btn')+'</button><span>'+s.players[p].strategies.length+'</span>'+strategyShopButton()+'</span></div>'+
 strategyDock()+'<div class="log-heading"><h3>'+t('game.side.log')+'</h3><span>LIVE</span></div>'+battleLogList(6)+'</aside>';
}
function game(){
 if(s.phase==='draft')return header()+draft();
 return header()+'<div class="armies">'+playerPanel(0)+'<span class="army-vs">VS</span>'+playerPanel(1)+'</div>'+
 '<div class="game-layout"><div class="play-column">'+(s.phase==='campaign'?mapView():battleView())+handTray()+'</div>'+sidePanel()+'</div>';
}
function result(){
 const win=s.winner,map=MAPS.find(m=>m.id===s.opt.map);return header()+'<section class="result-screen"><div class="result-emblem">'+(win===null?'⟐':s.players[win].logo)+'</div><div class="eyebrow">OPERATION COMPLETE</div><h1>'+(win===null?t('game.result.draw'):t('game.result.win',{name:s.players[win].name}))+'</h1><p>'+s.reason+'</p><div class="result-stats">'+s.players.map((p,i)=>'<div class="army-'+sideOf(i)+'"><h3>'+(p.faction?t('game.result.faction',{name:p.name,faction:p.faction}):p.name)+'</h3><b>'+t('game.result.wins',{n:p.wins})+'</b><span>'+t('game.result.stats',{open:p.reserve.length,fields:s.fields.filter(f=>f.owner===i).length})+'</span></div>').join('')+'</div><div class="result-actions">'+btn(t('game.result.rematch')+' →','rematch','primary')+btn(t('game.result.exit'),'exit','secondary')+'</div><small>'+t('game.result.seed',{seed:s.opt.seed,n:s.skirmish})+'</small></section>';
}
// Built per call (not a module const) so the rules text follows the current language.
function rulesHTML(){return '<div class="eyebrow">'+t('rules.eyebrow')+'</div><h2>'+t('rules.title')+'</h2><div class="rules-content">'+
'<h3>'+t('rules.s1_h')+'</h3><p class="rank-order">'+t('rules.s1_rank')+'</p><p>'+t('rules.s1_p1')+'</p><p>'+t('rules.s1_p2')+'</p>'+
'<h3>'+t('rules.s2_h')+'</h3><ol><li>'+t('rules.s2_li1')+'</li><li>'+t('rules.s2_li2')+'</li><li>'+t('rules.s2_li3')+'</li><li>'+t('rules.s2_li4')+'</li></ol>'+
'<h3>'+t('rules.s3_h')+'</h3><ul><li>'+t('rules.s3_li1')+'</li><li>'+t('rules.s3_li2')+'</li><li>'+t('rules.s3_li3')+'</li><li>'+t('rules.s3_li4')+'</li><li>'+t('rules.s3_li5')+'</li><li>'+t('rules.s3_li6')+'</li></ul>'+
'<h3>'+t('rules.s4_h')+'</h3><p>'+t('rules.s4_p')+'</p><div class="rules-strategy-grid">'+STRATEGIES.map(c=>{const st=strategyText(c.id);return '<article data-strategy-manual="'+c.id+'"><span>'+c.icon+'</span><div><h4>'+st.name+' <small>'+t('rules.strategy_cost',{price:c.price})+' · '+t(c.phase==='battle'?'strategy.phase_short_battle':'strategy.phase_short_campaign')+'</small></h4><p>'+st.desc+'</p><em>'+st.use+'</em></div></article>'}).join('')+'</div>'+
'<h3>'+t('rules.s5_h')+'</h3><p>'+t('rules.s5_p1')+'</p><p>'+t('rules.s5_p2')+'</p><p>'+t('rules.s5_p3')+'</p></div>'}
function tutorialSteps(){return [
 {title:t('tutorial.0.title'),tag:t('tutorial.0.tag'),image:'./assets/tutorial/01-map.png',text:t('tutorial.0.text'),tip:t('tutorial.0.tip')},
 {title:t('tutorial.1.title'),tag:t('tutorial.1.tag'),image:'./assets/tutorial/02-occupy.png',text:t('tutorial.1.text'),tip:t('tutorial.1.tip')},
 {title:t('tutorial.2.title'),tag:t('tutorial.2.tag'),image:'./assets/tutorial/03-battle.png',text:t('tutorial.2.text'),tip:t('tutorial.2.tip')},
 {title:t('tutorial.3.title'),tag:t('tutorial.3.tag'),image:'./assets/tutorial/04-supply.png',text:t('tutorial.3.text'),tip:t('tutorial.3.tip')},
 {title:t('tutorial.4.title'),tag:t('tutorial.4.tag'),image:'./assets/tutorial/05-draw.png',text:t('tutorial.4.text'),tip:t('tutorial.4.tip')},
 {title:t('tutorial.5.title'),tag:t('tutorial.5.tag'),image:'./assets/tutorial/05-market.png',text:t('tutorial.5.text'),tip:t('tutorial.5.tip')},
 {title:t('tutorial.6.title'),tag:t('tutorial.6.tag'),image:'./assets/tutorial/06-strategy.png',text:t('tutorial.6.text'),tip:t('tutorial.6.tip')},
 {title:t('tutorial.7.title'),tag:t('tutorial.7.tag'),image:'./assets/tutorial/07-victory.png',text:t('tutorial.7.text'),tip:t('tutorial.7.tip')}
]}
function tutorialView(step=0){const steps=tutorialSteps(),i=Math.max(0,Math.min(steps.length-1,Number(step)||0)),st=steps[i];return '<div class="tutorial-head"><div><div class="eyebrow">'+t('tutorial.eyebrow')+'</div><h2>'+st.title+'</h2></div><span>'+(i+1)+' / '+steps.length+'</span></div><div class="tutorial-progress" style="--tutorial-steps:'+steps.length+'">'+steps.map((_,n)=>'<i class="'+(n===i?'active':n<i?'done':'')+'"></i>').join('')+'</div><figure class="tutorial-shot"><img src="'+st.image+'" alt="'+esc(t('tutorial.shot_alt',{title:st.title}))+'"><figcaption>'+st.tag+'</figcaption></figure><p class="tutorial-text">'+st.text+'</p><p class="tutorial-tip"><b>'+t('tutorial.tip_label')+'</b>'+st.tip+'</p><div class="tutorial-actions">'+btn(t('tutorial.close'),'close','text-button')+'<span>'+btn(t('tutorial.prev'),'tutorial-step','secondary',i===0,'data-id="'+(i-1)+'"')+btn(i===steps.length-1?t('tutorial.done'):t('tutorial.next')+' →','tutorial-step','primary',false,'data-id="'+(i+1)+'"')+'</span></div>'}
function eventView(ev){
 const map=ev.map||s.fields,field=ev.field&&map.find(f=>f.id===ev.field);
 const paths=map.flatMap(f=>f.links.filter(id=>f.id.localeCompare(id)<0).map(id=>{const to=map.find(x=>x.id===id);return to?'<line x1="'+f.x+'" y1="'+f.y+'" x2="'+to.x+'" y2="'+to.y+'"/>':''})).join('');
 const diagram=field?'<div class="event-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg>'+map.map(f=>'<div class="event-map-node '+(f.id===ev.field?'hit':'')+' owner-'+(f.owner===null?'null':sideOf(f.owner))+'" style="left:'+f.x+'%;top:'+f.y+'%"><i>'+fieldIcon(f)+'</i><b>'+fieldName(s.opt.map,f)+'</b></div>').join('')+'</div>':'';
 const strategy=ev.strategy?'<div class="event-strategy-card"><span>'+ev.strategy.icon+'</span><div><b>'+strategyText(ev.strategy.id).name+'</b><small>'+strategyText(ev.strategy.id).desc+'</small></div><strong>'+ev.strategy.price+' '+t('game.panel.supply')+'</strong></div>':'';
 const cards=(ev.cards||[]).length?'<div class="event-cards">'+ev.cards.map(c=>card(c,{hidden:!!c.hidden,small:ev.cards.length>6})).join('')+'</div>':'';
 return '<section class="event-screen event-'+ev.kind+'" role="status" aria-live="polite"><div class="event-panel"><div class="eyebrow">'+t('modal.event.report',{kind:ev.kind.toUpperCase()})+'</div><h1>'+esc(ev.title)+'</h1><p>'+esc(ev.detail)+'</p>'+diagram+strategy+cards+'<div class="event-progress" style="--duration:'+(s.opt.eventSeconds||3)+'s"><span style="animation-play-state:'+(modal?'paused':'running')+'"></span></div><div class="event-footer"><small>'+t('modal.event.footer',{n:events.length})+'</small>'+btn(t('modal.event.continue'),'event-continue','secondary')+'</div></div></section>';
}
function supplyLedgerView(){
 const p=modal.player,pl=s.players[p],report=s.supplyLedger?.[p],entries=report?.entries||[];
 let running=report?.opening??pl.supply;
 return '<div class="eyebrow">'+t('modal.ledger.eyebrow')+'</div><h2>'+t('modal.ledger.title',{name:pl.name,supply:pl.supply})+'</h2><p>'+t(report?'modal.ledger.desc':'modal.ledger.legacy',{round:report?.round??s.round,opening:report?.opening??pl.supply})+'</p><div class="supply-ledger">'+(entries.map(e=>{running=e.balance??Math.max(0,Math.min(BALANCE.campaign.supplyCap,running+e.amount));return '<div><span>'+esc(e.label)+'<small>'+t('modal.ledger.balance',{n:running})+'</small></span><b class="'+(e.amount<0?'negative':'positive')+'">'+(e.amount>0?'+':'')+e.amount+'</b></div>'}).join('')||'<div><span>'+t('modal.ledger.empty')+'</span><b>0</b></div>')+(report?'<div class="ledger-total"><span>'+t('modal.ledger.total')+'</span><b class="'+(report.net<0?'negative':'positive')+'">'+(report.net>0?'+':'')+report.net+'</b></div>':'')+'</div>'+(report?.discardedId!=null?'<p class="ledger-warning">'+t('modal.ledger.warning')+'</p>':'')+btn(t('modal.close'),'close','primary');
}
function medicView(strategyId){
 const p=viewer(),openPile=[...s.players[p].reserve].sort((a,b)=>b.rank-a.rank||a.suit-b.suit||a.id-b.id),chosen=modal.chosen;
 return '<div class="eyebrow">'+t('modal.medic.eyebrow')+'</div><h2>'+strategyText(strategyId).name+'</h2><p>'+t('modal.medic.desc',{n:chosen.size})+'</p><div class="rotation-cards meds-cards">'+openPile.map(c=>card(c,{small:true,interactive:true,selected:chosen.has(c.id),action:'medic-toggle'})).join('')+'</div><div class="modal-actions">'+btn(t('modal.cancel'),'close','secondary')+btn(t('modal.medic.confirm',{n:chosen.size}),'medic-confirm','primary',chosen.size<1,'data-id="'+strategyId+'"')+'</div>';
}
function rotationView(strategyId){
 const p=viewer(),picked=[...modal.picked.values()];
 const canSwap=picked.length===2&&picked[0]!==picked[1];
 return '<div class="eyebrow">'+t('modal.rotation.eyebrow')+'</div><h2>'+strategyText(strategyId).name+'</h2><p class="modal-desc">'+t('modal.rotation.desc')+'</p><p class="modal-desc">'+t('modal.rotation.picked',{n:picked.length})+'</p><div class="choose-grid">'+s.fields.map(f=>'<div class="choose-card rotation-card '+(modal.picked.has(f.id)?'chosen':'')+'" data-action="rotation-toggle" data-id="'+f.id+'" role="checkbox" aria-checked="'+modal.picked.has(f.id)+'" tabindex="0"><b>'+fieldName(s.opt.map,f)+'</b><span>'+t('modal.rotation.count',{n:f.garrison.length})+'</span><span class="choose-mark">'+(modal.picked.has(f.id)?'✓':'')+'</span></div>').join('')+'</div><div class="modal-actions">'+btn(t('modal.cancel'),'close','text-button')+btn(t('modal.rotation.confirm'),'rotation-confirm','primary',!canSwap,'data-id="'+strategyId+'"')+'</div>';
}
function garrisonRotationView(config){
 const f=s.fields.find(x=>x.id===config.field),p=viewer(),out=new Set(config.outIds||[]),stances=config.stances||{},incoming=Object.keys(stances).map(Number),cost=out.size*BALANCE.campaign.rotationCostPerCard,sort=config.sort||handSort,cards=sortHand(s.players[p].hand,sort);
 const kept=f.garrison.filter(c=>!out.has(c.id)),added=incoming.map(id=>({...s.players[p].hand.find(c=>c.id===id),open:!!stances[id]})),valid=out.size>0&&out.size===incoming.length&&cost<=s.players[p].supply&&(f.capital||[...kept,...added].some(c=>c.open));
 const warning=out.size!==incoming.length?t('modal.garrison_rotation.equal'):!f.capital&&![...kept,...added].some(c=>c.open)?t('modal.garrison_rotation.keep_open'):cost>s.players[p].supply?t('modal.garrison_rotation.insufficient'):'';
 return '<div class="eyebrow">'+t('modal.garrison_rotation.eyebrow')+'</div><h2>'+t('modal.garrison_rotation.title',{field:fieldName(s.opt.map,f),cost:BALANCE.campaign.rotationCostPerCard})+'</h2><p>'+t('modal.garrison_rotation.desc')+'</p><div class="rotation-grid"><section><h3>'+t('modal.garrison_rotation.out',{n:out.size})+'</h3><div class="rotation-cards">'+f.garrison.map(c=>card(c,{small:true,interactive:true,selected:out.has(c.id),stance:c.open,action:'rotate-out'})).join('')+'</div></section><section><div class="rotation-heading"><h3>'+t('modal.garrison_rotation.in',{n:incoming.length})+'</h3><span class="hand-sort-toggle" role="group" aria-label="'+t('game.hand.sort_label')+'"><button class="'+(sort==='rank'?'active':'')+'" data-action="rotation-hand-sort" data-id="rank" aria-pressed="'+(sort==='rank')+'">'+t('game.hand.sort_rank')+'</button><button class="'+(sort==='suit'?'active':'')+'" data-action="rotation-hand-sort" data-id="suit" aria-pressed="'+(sort==='suit')+'">'+t('game.hand.sort_suit')+'</button></span></div><div class="rotation-cards">'+cards.map(c=>card(c,{small:true,interactive:true,selected:incoming.includes(c.id),stance:incoming.includes(c.id)?!!stances[c.id]:null,action:'rotate-in'})).join('')+'</div></section></div><div class="rotation-summary"><b>'+t('modal.garrison_rotation.cost',{n:cost})+'</b><span>'+(warning||t('modal.garrison_rotation.ready'))+'</span></div><div class="modal-actions">'+btn(t('modal.cancel'),'close','secondary')+btn(t('modal.garrison_rotation.confirm'),'rotate-submit','primary',!valid)+'</div>';
}
function handoverView(){
 return '<div class="eyebrow">'+t('modal.handover.eyebrow')+'</div><h2>'+t('modal.handover.title',{n:s.active})+'</h2><p class="modal-desc">'+t('modal.handover.desc',{name:s.players[s.active].name})+'</p><div class="modal-actions">'+btn(t('modal.handover.confirm'),'handover-confirm','primary')+'</div>';
}
function identityView(){
 return '<div class="eyebrow">'+t('modal.identity.eyebrow')+'</div><h2>'+t('modal.identity.title')+'</h2><p class="modal-desc">'+t('modal.identity.desc')+'</p>'+identityFields(0,options.mode==='local'?t('menu.player_local0'):t('menu.player_single'))+(options.mode==='local'?identityFields(1,t('menu.player_local1')):'')+'<div class="modal-actions">'+btn(t('modal.identity.confirm'),'identity-confirm','primary')+'</div>';
}
function marketView(){
 const p=viewer();
 return '<div class="eyebrow">'+t('modal.market.eyebrow')+'</div><h2>'+t('modal.market.title')+'</h2><p class="modal-desc">'+t('modal.market.desc',{supply:s.players[p].supply})+'</p><div class="market-list">'+s.strategyMarket.map((id,index)=>{const c=strategyById(id),st=strategyText(id),reason=canBuyStrategy(s,p,id),label=!reason?t('game.market.buy',{price:c.price}):reason==='need_supply'?t('game.market.need',{price:c.price}):reason==='duplicate_strategy'?t('game.market.owned'):reason==='strategies_full'?t('game.market.full'):reason==='market_bought'?t('game.market.bought_one'):t('game.market.unavailable');return '<article class="market-card"><span class="market-icon">'+c.icon+'</span><div><b>'+st.name+'</b><small>'+(c.phase==='battle'?t('strategy.phase_battle'):t('strategy.phase_campaign'))+' · '+st.desc+'</small></div>'+btn(label,'buy-strategy','market-buy',!!reason,'data-id="'+id+'" data-index="'+index+'"')+'</article>'}).join('')+'</div>'+btn(t('modal.close'),'close','primary');
}
function strategyConfirmView(config){
 const id=config.strategyId,c=strategyById(id),st=strategyText(id),target=config.field?s.fields.find(f=>f.id===config.field):null;
 return '<div class="eyebrow">'+t('modal.strategy_confirm.eyebrow')+'</div><h2>'+t('modal.strategy_confirm.title',{name:st.name})+'</h2><div class="event-strategy-card strategy-confirm-card"><span>'+c.icon+'</span><div><b>'+st.name+'</b><small>'+(c.phase==='battle'?t('strategy.phase_battle'):t('strategy.phase_campaign'))+' · '+st.desc+'</small></div></div><p class="modal-desc">'+st.use+'</p>'+(target?'<p class="modal-desc">'+t('modal.strategy_confirm.target',{name:fieldName(s.opt.map,target)})+'</p>':'')+'<p class="modal-desc">'+t('modal.strategy_confirm.single_use')+'</p><div class="modal-actions">'+btn(t('modal.cancel'),'close','secondary')+btn(t(config.chooseTarget?'modal.strategy_confirm.choose_target':'modal.strategy_confirm.confirm'),'strategy-confirm','primary',false,'data-id="'+id+'"')+'</div>';
}
function abandonConfirmView(config){
 const f=s.fields.find(x=>x.id===config.field),open=f.garrison.filter(c=>c.open).length,hidden=f.garrison.length-open;
 return '<div class="eyebrow">'+t('modal.abandon.eyebrow')+'</div><h2>'+t('modal.abandon.title',{field:fieldName(s.opt.map,f)})+'</h2><p class="modal-desc">'+t('modal.abandon.desc',{open,hidden})+'</p><div class="modal-actions">'+btn(t('modal.cancel'),'close','secondary')+btn(t('modal.abandon.confirm'),'abandon-confirm','primary danger',false,'data-id="'+f.id+'"')+'</div>';
}
function logView(){
 return '<div class="eyebrow">'+t('modal.log.eyebrow')+'</div><h2>'+t('modal.log.title')+'</h2><div class="log-modal-list">'+battleLogList()+'</div>'+btn(t('modal.close'),'close','primary');
}
function garrisonRoster(p){
 const fields=s.fields.filter(f=>f.owner===p);
 if(!fields.length)return '';
 return '<h3>'+t('modal.reserve.garrison_title')+'</h3><div class="garrison-roster">'+fields.map(f=>{const stationed=s.battle?.field===f.id?s.battle.lines[p]:f.garrison;return '<div><b>'+fieldName(s.opt.map,f)+'</b><span>'+t('modal.reserve.garrison_count',{n:stationed.length})+'</span><div class="reserve-cards">'+stationed.map(c=>card(c,{small:true,hidden:p!==viewer()&&!c.open})).join('')+(s.battle?.field===f.id?'<p>'+t('modal.reserve.in_battle')+'</p>':!stationed.length?'<p>'+t('modal.reserve.garrison_empty')+'</p>':'')+'</div></div>'}).join('')+'</div>';
}
function reserveView(config){
 const p=s.players[config.player],sort=config.sort||'rank',cards=[...p.reserve].sort(sort==='suit'?(a,b)=>a.suit-b.suit||a.rank-b.rank||a.id-b.id:(a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id);
 return '<div class="reserve-heading"><div><h2>'+t('modal.reserve.title',{name:p.name})+'</h2><p>'+t('modal.reserve.desc')+'</p></div><span class="hand-sort-toggle" role="group" aria-label="'+t('modal.reserve.sort_label')+'"><button class="'+(sort==='rank'?'active':'')+'" data-action="reserve-sort" data-id="rank" aria-pressed="'+(sort==='rank')+'">'+t('modal.reserve.sort_rank')+'</button><button class="'+(sort==='suit'?'active':'')+'" data-action="reserve-sort" data-id="suit" aria-pressed="'+(sort==='suit')+'">'+t('modal.reserve.sort_suit')+'</button></span></div><div class="reserve-cards">'+(cards.map(c=>card(c,{small:true})).join('')||'<p>'+t('modal.reserve.empty')+'</p>')+'</div>'+garrisonRoster(config.player)+btn(t('modal.close'),'close','primary');
}
function quitConfirm(){
 return '<div class="eyebrow">'+t('modal.quit.eyebrow')+'</div><h2>'+t('modal.quit.title')+'</h2><p class="modal-desc">'+t('modal.quit.desc')+'</p><div class="modal-actions">'+btn(t('modal.cancel'),'close','text-button')+btn(t('modal.quit.confirm'),'quit-game','primary')+'</div>';
}
function pauseView(){
 return '<div class="eyebrow">'+t('modal.pause.eyebrow')+'</div><h2>'+t('modal.pause.title')+'</h2><p class="modal-desc">'+t('modal.pause.desc')+'</p><div class="modal-actions"><div>'+btn(t('modal.pause.save_exit'),'save-exit','secondary')+'</div><div>'+btn(t('modal.pause.quit_no_save'),'quit-game','text-button')+btn(t('modal.pause.resume'),'close','primary')+'</div></div>';
}
function modalView(kind=modal){
 let content='';
 if(kind?.kind==='ledger')content=supplyLedgerView();
 else if(kind==='event'&&events.length)content=eventView(events[0]);
 else if(kind==='market')content=marketView();
 else if(kind==='log')content=logView();
 else if(kind&&kind.kind==='strategy-confirm')content=strategyConfirmView(kind);
 else if(kind&&kind.kind==='abandon-confirm')content=abandonConfirmView(kind);
 else if(kind&&kind.kind==='reserve')content=reserveView(kind);
 else if(modal&&modal.rotation==='medic')content=medicView(modal.strategyId);
 else if(modal&&modal.rotation==='garrison')content=garrisonRotationView(modal);
 else if(modal&&modal.rotation==='rotation')content=rotationView(modal.strategyId);
 else if(kind==='identity')content=identityView();
 else if(modal&&modal.tutorial==='tutorial')content=tutorialView(modal.step);
 else if(kind==='rules')content=rulesHTML()+btn(t('modal.rules_ok'),'close','primary');
 else if(kind==='quit')content=quitConfirm();
 else if(kind==='pause')content=pauseView();
 else if(kind==='handover')content=handoverView();
 return '<div class="modal-overlay" data-action="mask"><div class="modal" role="dialog" aria-modal="true" aria-label="'+t('modal.aria')+'" data-modal>'+(kind==='event'?'':btn(t('modal.close'),'close','icon-button modal-x'))+'<div class="modal-body">'+content+'</div></div></div>';
}
function overlay(){
 let html='';
 if(events.length&&modal)html+='<div class="event-next"><span>'+t('game.overlay.next_event')+'</span></div>';
 else if(events.length)html+=eventView(events[0]);
 if(gate)html+='<div class="handoff"><div class="handoff-symbol">'+s.players[s.active].logo+'</div><div class="eyebrow">'+t('game.gate.eyebrow')+'</div><h1>'+t('game.gate.title',{n:s.active+1})+'</h1><p>'+t('game.gate.desc',{name:s.players[s.active].name})+'</p>'+btn(t('game.gate.confirm',{name:s.players[s.active].name}),'ready','primary')+'</div>';
 if(modal)html+=modalView();
 return html;
}

function updateCardSelectionUI(cid){
 // Update the specific card's selected class and stance without full re-render,
 // so CSS transitions animate. Falls back to render() if element not found.
 const el=document.querySelector('.hand-card-shell .playing-card[data-id="'+cid+'"]');
 if(!el){render();return}
 const sel=selection.has(cid), stance=sel?selection.get(cid):null;
 el.classList.toggle('selected',sel);
 el.classList.toggle('concealed',stance===false);
 el.setAttribute('aria-pressed',sel);
 const c=s?.players[viewer()]?.hand.find(card=>card.id===cid);
 if(c){
  const label=face(c)+(SUITS[c.suit]||' ★');
  el.setAttribute('aria-label',label+' · '+(stance===true?t('card.stance_open_selected'):stance===false?t('card.stance_concealed_selected'):t('card.stance_click')));
 }
 let st=el.querySelector('.stance');
 if(stance!==null){
  const txt=stance?t('card.stance_open'):t('card.stance_concealed');
  if(st){st.textContent=txt}else{el.insertAdjacentHTML('beforeend','<span class="stance">'+txt+'</span>')}
 }else if(st){st.remove()}
 // Update selection counter in hand-top
 const counter=document.querySelector('.hand-selection-status');
 if(counter){
  const s2=s, ph=s2?s2.phase:'';
  counter.textContent=['defend','attack'].includes(ph)?t('game.hand.selected',{n:selection.size}):ph==='campaign'?t('game.hand.choose_garrison'):t('game.hand.safe');
 }
 const deploy=document.querySelector('[data-action="deploy"]');
 if(deploy)deploy.disabled=isAI()||s.active!==viewer()||!deploymentValid();
 if(s.phase==='campaign'){
  const f=s.fields.find(f=>f.id===focus),valid=selection.size>0&&selection.size<=garrisonLimit(f)&&(f?.capital||[...selection.values()].some(Boolean));
  const primary=document.querySelector('[data-action="occupy"], [data-action="reorganize"]');
  if(primary){primary.classList.toggle('needs-selection',!valid);primary.dataset.selectionReady=String(valid);primary.title=valid?t(primary.dataset.action==='occupy'?'game.action.occupy_title_ok':'game.action.reorganize_title_ok'):t(primary.dataset.action==='occupy'?'game.action.occupy_title_need':'game.action.reorganize_title_need')}
 }
}

function render(){
 if(!s){app.innerHTML=menu()+overlay();clockKey='';mountVisual();return}
 const content=events.length?header()+eventView(events[0])+(modal?modalView():''):gate&&!modal?header()+overlay():(s.phase==='over'?result():game())+overlay();
 app.innerHTML='<div class="game-shell" data-phase="'+s.phase+'">'+content+'</div>';
 mountVisual();
 requestAnimationFrame(()=>{layoutMapNodes();if(!s||innerWidth<=800)return;document.querySelectorAll('.strategy-token .strategy-tooltip').forEach(el=>{const r=el.getBoundingClientRect();el.style.transform=r.left<160?'translateX(calc(-100% - 18px))':''})});
 if(s.phase==='over'){clockKey='';deadline=null;remaining=null;return}
 const ready=!modal&&!gate&&!events.length,actionKey=s.active+':'+s.phase+':'+s.turn+':'+s.skirmish;
 if(ready&&s.phase!=='draft'&&clockKey!==actionKey){clockKey=actionKey;deadline=s.opt.timer?Date.now()+s.opt.timer*1000:null;remaining=null}
 if(ready&&deadline!==null)tickClock();
 else if(!ready)clearInterval(tickClock.job);
 if(ready&&isAI())queueAI(()=>perform(aiAction(s,1)));
}
function startRotationPicker(strategyId){showModal({rotation:'rotation',strategyId,picked:new Set()})}
function startMedicPicker(strategyId){showModal({rotation:'medic',strategyId,chosen:new Set()})}
function rotationFields(){return s.fields.filter(f=>modal.picked.has(f.id))}
function runStrategy(id){
 const targeted=FIELD_TARGET_STRATEGIES.has(id),reason=canStrategy(s,viewer(),id,targeted?focus:null);
 const chooseTarget=!!reason&&s.phase==='campaign'&&targeted&&s.fields.some(f=>!canStrategy(s,viewer(),id,f.id));
 if(reason&&!chooseTarget){toast(reason);return}
 if(id==='meds_team'){targeting=null;startMedicPicker(id);return}
 showModal({kind:'strategy-confirm',strategyId:id,field:targeted&&!chooseTarget?focus:null,chooseTarget});
}
function confirmStrategy(id){
 const pending=modal&&modal.kind==='strategy-confirm'&&modal.strategyId===id?modal:null;
 if(!pending)return;
 modal=null;resume();
 if(pending.chooseTarget){targeting=id;toast(t('toast.strategy_target_first'));render();return}
 targeting=null;perform({type:'strategy',id,field:pending.field});
}
function queueEvent(ev){events.push(ev);pause();if(s&&s.phase!=='over')save()}
function eventQueueToLog(){for(const ev of events.splice(0))s.log.unshift({round:s.round,text:ev.title+' —— '+ev.detail});eventEnd=null;eventRemaining=null}
function advanceEvent(){
 const ev=events.shift();if(ev)s.log.unshift({round:s.round,text:ev.title+' —— '+ev.detail});
 eventEnd=events.length?Date.now()+(s.opt.eventSeconds||3)*1000:null;
 if(!events.length){eventRemaining=null;resume()}render();
}
const stripTags=html=>String(html||'').replace(/<[^>]*>/g,'');
function medicConfirm(strategyId){
 const ids=[...modal.chosen].slice(0,strategyById(strategyId).effect.recover);
 if(!ids.length)return;
 modal=null;selection.clear();resume();perform({type:'strategy',id:strategyId,cards:ids});
}
function rotationConfirm(strategyId){
 const p=viewer(),fields=rotationFields();
 modal=null;selection.clear();
 const res=act(s,p,{type:'strategy',id:strategyId,extra:{fields:[fields[0].id,fields[1].id]}});
 if(res.error){toast(res.error);render();return}
 if(res.usedSupply)toast(t('toast.strategy_used',{name:strategyText(strategyId).name,n:res.usedSupply}));
 newCards.clear();eventQueueToLog();render();
}
function occupy(fieldId,chosen,type='occupy'){
 const f=s.fields.find(x=>x.id===fieldId);
 if(!chosen.length){toast(t('toast.choose_cards_first'));return}
 if(chosen.length>garrisonLimit(f)){toast(t('toast.garrison_full',{n:garrisonLimit(f)}));return}
 if(!chosen.some(c=>c.open)){toast(t('toast.garrison_need_open'));return}
 perform({type,field:fieldId,cards:chosen});
}
function supplyToHand(){perform({type:'supply'})}
function timedOut(){
 const p=s.active;if(s.opt.mode==='ai'&&p===1&&isAI())return;
 perform(timeoutAction(s,p));
}
function queueAI(fn){
 clearTimeout(aiTask);pause();
 const delay=events.length?Math.max(300,(eventRemaining??(s.opt.eventSeconds||3)*1000)+120):600;
 aiTask=setTimeout(()=>{pause();fn();},delay);
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
 }catch(e){console.error(e);toast(t('toast.action_failed',{message:e.message}))}
}
function tickClock(){
 clearInterval(tickClock.job);
 if(s.phase!=='over'&&s.opt.timer>0&&deadline!==null&&s.phase!=='draft'){
  const label=s.opt.mode==='local'?t('menu.player_local'+s.active):(s.opt.mode==='ai'&&s.active===1?t('game.ai_turn'):t('menu.player_single'));
  tickClock.job=setInterval(()=>{
   const left=Math.max(0,deadline-Date.now());
   const el=document.querySelector('#clock');
   if(el){el.innerHTML='<span class="'+(left<10000?'danger':'')+'">⏳ '+t('game.clock',{label,secs:Math.ceil(left/1000)})+'</span>';if(left<=0){clearInterval(tickClock.job);timedOut()}}
  },250);
 }else{const el=document.querySelector('#clock');if(el)el.innerHTML=''}
}
function launchGame(){
 const map=MAPS.find(m=>m.id===options.map),mf=mapFactions(map.id);
 // options.factions stores side indices (0/1); normalize in case of stale names.
 const fi=v=>v===0||v===1?v:0;
 options.factions=[fi(options.factions?.[0]),fi(options.factions?.[1]??1)];
 if(options.factions[0]===options.factions[1])options.factions[1]=1-options.factions[0];
 options.playerNames=[options.playerNames?.[0]||(options.mode==='local'?t('menu.player_local0'):t('menu.player_single')),options.playerNames?.[1]||(options.mode==='ai'?t('menu.ai_name'):t('menu.player_local1'))];
 options.playerLogos=[options.playerLogos?.[0]||factionLogo(map,options.factions[0])||LOGOS[0],options.playerLogos?.[1]||factionLogo(map,options.factions[1])||LOGOS[1]];
 gate=options.mode==='local';focus=null;selection.clear();reveals.clear();newCards.clear();
 events=[];eventEnd=null;eventRemaining=null;deadline=null;remaining=null;aiTask=null;
 mapViewport={x:0,y:0,scale:1};fittedMap=null;
 s=createGame(options);
 // Let the AI resolve its strategy draft first without overriding the chosen
 // first player when historical deployment skips the draft entirely.
 if(options.mode==='ai'&&options.first===0&&s.phase==='draft')s.active=1;
 toast(t('toast.game_start',{map:mapText(map.id).name}));
 modal=null;pause();render();
}
function mountVisual(){
 const mount=document.querySelector('#visual-mount');
 if(!mount)return;
 // Hero SVG assets were removed; clear the mount to avoid 404s.
 mount.innerHTML='';
}
function clampMapViewport(){
 const stage=document.querySelector('.map-stage');
 if(!stage)return;
 const rect=stage.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
 const contentW=w*mapViewport.scale,contentH=h*mapViewport.scale;
 if(contentW<=w&&contentH<=h){
  const mx=w*0.18,my=h*0.18;
  mapViewport.x=Math.min(mx,Math.max(-mx,mapViewport.x));
  mapViewport.y=Math.min(my,Math.max(-my,mapViewport.y));
  return;
 }
 const over=24,fit=fittedMap||{minX:0,maxX:100,minY:0,maxY:100};
 const left=fit.minX/100*w*mapViewport.scale-over,top=fit.minY/100*h*mapViewport.scale-over;
 const right=fit.maxX/100*w*mapViewport.scale+over,bottom=fit.maxY/100*h*mapViewport.scale+over;
 mapViewport.x=Math.min(w-left,Math.max(-right,mapViewport.x));
 mapViewport.y=Math.min(h-top,Math.max(-bottom,mapViewport.y));
}
function updateMapCamera(){
 const el=document.querySelector('.map-camera');
 if(el)el.style.setProperty('--map-x',mapViewport.x+'px'),el.style.setProperty('--map-y',mapViewport.y+'px'),el.style.setProperty('--map-scale',mapViewport.scale);
}
function resetMapCamera(){mapViewport={x:0,y:0,scale:1};updateMapCamera()}
function fitMapViewport(){
 const stage=document.querySelector('.map-stage');
 if(!stage||!s)return;
 let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
 for(const f of s.fields){minX=Math.min(minX,f.x);maxX=Math.max(maxX,f.x);minY=Math.min(minY,f.y);maxY=Math.max(maxY,f.y)}
 fittedMap={minX:minX-3,maxX:maxX+3,minY:minY-4,maxY:maxY+6};
 resetMapCamera();
}
document.addEventListener('pointerdown',e=>{
 if(!e.target.closest('.map-stage'))return;
 if(e.target.closest('[data-map-control]')||e.target.closest('.target-bar'))return;
 const stage=e.target.closest('.map-stage');
 const id=e.pointerId;
 e.target.setPointerCapture?.(id);
 mapPointers.set(id,{x:e.clientX,y:e.clientY});
 if(mapPointers.size===1){mapDrag={x:e.clientX,y:e.clientY,vx:mapViewport.x,vy:mapViewport.y,moved:false,stage}}
 else if(mapPointers.size===2){const [a,b]=[...mapPointers.values()];mapDrag={pinch:true,dist:Math.hypot(a.x-b.x,a.y-b.y),scale:mapViewport.scale,moved:true,stage};stage.classList.add('dragging')}
});
document.addEventListener('pointermove',e=>{
 if(!mapPointers.has(e.pointerId))return;
 mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(!mapDrag)return;
 if(mapDrag.pinch&&mapPointers.size===2){
  const [a,b]=[...mapPointers.values()],dist=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
  mapViewport.scale=Math.min(3.5,Math.max(0.6,mapDrag.scale*dist/mapDrag.dist));
 }else if(!mapDrag.pinch){
  const dx=e.clientX-mapDrag.x,dy=e.clientY-mapDrag.y;
  if(Math.abs(dx)+Math.abs(dy)>6){mapDrag.moved=true;mapDrag.stage?.classList.add('dragging')}
  mapViewport.x=mapDrag.vx+dx;mapViewport.y=mapDrag.vy+dy;
 }
 clampMapViewport();updateMapCamera();
});
const endPointer=e=>{
 if(mapDrag?.moved){lastMapDragAt=performance.now();mapDrag.stage?.classList.remove('dragging')}
 mapPointers.delete(e.pointerId);
 if(mapPointers.size<2&&mapDrag?.pinch)mapDrag=null;
 if(mapPointers.size===0)mapDrag=null;
};
document.addEventListener('pointerup',endPointer);
document.addEventListener('pointercancel',endPointer);
document.addEventListener('wheel',e=>{const stage=e.target.closest('.map-stage');if(!stage)return;e.preventDefault();mapViewport.scale=Math.min(3.5,Math.max(0.6,mapViewport.scale*(e.deltaY<0?1.12:0.89)));clampMapViewport();updateMapCamera()},{passive:false});
document.addEventListener('click',e=>{
 if(e.target.closest('.map-stage')&&performance.now()-lastMapDragAt<250){e.preventDefault();e.stopPropagation();return}
 const route=e.target.closest('.route-pulse,.route-base');
 if(route){focus=null;render();return}
 const control=e.target.closest('[data-map-control]');
 if(control){const kind=control.dataset.mapControl;if(kind==='in'||kind==='out')mapViewport.scale=Math.min(3.5,Math.max(0.6,mapViewport.scale*(kind==='in'?1.25:0.8)));else resetMapCamera();clampMapViewport();updateMapCamera();return}
 const el=e.target.closest('[data-action]');
 if(!el){if(modal&&modal.rotation)return;return}
 const a=el.dataset.action,id=el.dataset.id;
 if(a==='none'){e.preventDefault();return}
 sound();
 if(a==='lang-zh'||a==='lang-en'){setLang(a==='lang-zh'?'zh':'en');toast(t('toast.lang_switched'));return}
 if(a==='mode-ai'||a==='mode-local'){options.mode=a==='mode-ai'?'ai':'local';advancedOpen=true;render();return}
 if(a==='map'){options.map=id;const map=MAPS.find(m=>m.id===id);options.factions=[0,1];options.playerLogos=[factionLogo(map,0),factionLogo(map,1)];options.deployment=map.historical?'historical':'standard';options.deckCount='auto';render();return}
 if(a==='start'){launchGame();return}
 if(a==='load'){const value=saved();if(value){options=value.opt;gate=value.opt.mode==='local';s=value;focus=null;selection.clear();reveals.clear();toast(t('toast.loaded'))}pause();render();return}
 if(a==='sound'){muted=!muted;render();return}
 if(a==='tutorial'){showModal({tutorial:'tutorial',step:0});return}
 if(a==='rules'){modal='rules';render();return}
 if(a==='pause'){showModal('pause');return}
 if(a==='edit-identity'){showModal('identity');return}
 if(a==='tutorial-step'){const step=Number(id);if(step>=tutorialSteps().length){modal=null;resume()}else modal.step=step;render();return}
 if(a==='close'){modal=null;resume();render();return}
 if(a==='mask'&&e.target.classList.contains('modal-overlay')&&modal!=='event'&&(!modal||!modal.rotation)){modal=null;render();return}
 if(a==='quit'){showModal('quit');return}
 if(a==='save-exit'){save();s=null;modal=null;render();return}
 if(a==='quit-game'){try{localStorage.removeItem(STORE)}catch{}s=null;modal=null;render();return}
 if(a==='rematch'){options.seed=Math.floor(Math.random()*4294967296);launchGame();return}
 if(a==='exit'){showModal('quit');return}
 if(a==='identity-confirm'){modal=null;render();return}
 if(a==='supply-ledger'){e.stopPropagation();showModal({kind:'ledger',player:Number(el.dataset.player)});return}
 if(a==='reserve'){showModal({kind:'reserve',player:Number(el.dataset.player),sort:'rank'});return}
 if(a==='reserve-sort'&&modal?.kind==='reserve'){modal.sort=id==='suit'?'suit':'rank';render();return}
 if(a==='focus'){if(focus===id){focus=null}else{focus=id;selection.clear()}if(targeting&&!canStrategy(s,viewer(),targeting,focus)){const strategy=targeting;targeting=null;perform({type:'strategy',id:strategy,field:focus})}else render();return}
 if(a==='hand-sort'){handSort=id;render();return}
 if(a==='occupy'){occupy(focus,[...selection].map(([cid,open])=>({...s.players[viewer()].hand.find(c=>c.id===cid),open})));return}
 if(a==='reorganize'){occupy(focus,[...selection].map(([cid,open])=>({...s.players[viewer()].hand.find(c=>c.id===cid),open})),'reorganize');return}
 if(a==='attack'){if(focus)perform({type:'attack',field:focus});return}
 if(a==='siege'){if(focus)perform({type:'siege',field:focus});return}
 if(a==='abandon-field'){if(focus)showModal({kind:'abandon-confirm',field:focus});return}
 if(a==='abandon-confirm'){modal=null;resume();perform({type:'abandon_field',field:id});return}
 if(a==='supply'){supplyToHand();return}
 if(a==='open-market'){showModal('market');return}
 if(a==='open-log'){showModal('log');return}
 if(a==='choose-strategy'){if(s.phase==='draft'){perform({type:'draft',id});return}runStrategy(id);return}
 if(a==='use-strategy'){if(isAI())return;runStrategy(id);return}
 if(a==='strategy-confirm'){confirmStrategy(id);return}
 if(a==='buy-strategy'){modal=null;resume();perform({type:'buy_strategy',id});return}
 if(a==='cancel-target'){targeting=null;render();return}
 if(a==='medic-toggle'){const cid=Number(id),set=modal.chosen,limit=strategyById(modal.strategyId).effect.recover;if(set.has(cid))set.delete(cid);else if(set.size<limit)set.add(cid);else toast(t('toast.medic_max'));render();return}
 if(a==='medic-confirm'){medicConfirm(id);return}
 if(a==='rotation-toggle'){const set=modal.picked;if(set.has(id))set.delete(id);else if(set.size<2)set.add(id);else toast(t('toast.rotation_max'));render();return}
 if(a==='rotation-confirm'){rotationConfirm(id);return}
 if(modal&&modal.rotation==='garrison'){
  const n=Number(id);
  if(a==='rotation-hand-sort'){modal.sort=id==='suit'?'suit':'rank';render();return}
  if(a==='rotate-out'){const out=new Set(modal.outIds||[]);out.has(n)?out.delete(n):out.add(n);modal.outIds=[...out];render();return}
  if(a==='rotate-in'){modal.stances=modal.stances||{};if(!(n in modal.stances))modal.stances[n]=true;else if(modal.stances[n])modal.stances[n]=false;else delete modal.stances[n];render();return}
  if(a==='rotate-submit'){const action={type:'rotate_garrison',field:modal.field,outIds:[...(modal.outIds||[])],cards:Object.entries(modal.stances||{}).map(([cardId,open])=>({id:Number(cardId),open}))};modal=null;resume();perform(action);return}
 }
 if(a==='card'){
  if(!s||s.active!==viewer()||isAI())return;
  const cid=Number(id),phase=s.phase,p=viewer(),f=s.fields.find(f=>f.id===focus);
  if(phase==='campaign'){
   if(!f||f.owner===1-p){toast(t('toast.select_field_first'));return}
   const limit=garrisonLimit(f);
   if(!selection.has(cid)){
    if(selection.size>=limit){toast(t('toast.garrison_full',{n:limit}));return}
    selection.set(cid,true);
   }else if(selection.get(cid))selection.set(cid,false);
   else selection.delete(cid);
   updateCardSelectionUI(cid);return;
  }
  if(phase==='defend'||phase==='attack'){
   const limit=battleLineLimit(s,p);
   if(!selection.has(cid)){
    if(selection.size>=limit){toast(t('toast.attack_need',{n:limit}));return}
    selection.set(cid,true);
   }else if(selection.get(cid))selection.set(cid,false);
   else selection.delete(cid);
   updateCardSelectionUI(cid);return;
  }
  return;
 }
 if(a==='reveal-card'){if(s.phase!=='counter')return;const cid=Number(id);if(reveals.has(cid)){reveals.delete(cid)}else{if(reveals.size>=BALANCE.battle.maxCounterReveal){toast(t('toast.reveal_max'));return}const c=s.battle.lines[s.active].find(c=>c.id===cid);if(c&&!c.open)reveals.add(cid)}render();return}
 if(a==='deploy'){
  const phase=s.phase,p=viewer(),chosen=[...selection].map(([cid,open])=>({...s.players[p].hand.find(c=>c.id===cid),open}));
  if(phase==='defend'||phase==='attack'){
   perform({type:'deploy',cards:chosen});return;
  }
  return;
 }
 if(a==='reveal'){
  perform({type:'reveal',ids:[...reveals]});return;
 }
 if(a==='fold'){perform({type:'fold'});return}
 if(a==='continue'){perform({type:'continue'});return}
 if(a==='pass'){perform({type:'pass'});return}
 if(a==='event-continue'){modal=null;advanceEvent();return}
 if(a==='open-rotation'){if(focus)showModal({rotation:'garrison',field:focus,outIds:[],stances:{},sort:handSort});return}
 if(a==='ready'||a==='handover-confirm'){gate=false;focus=null;selection.clear();reveals.clear();pause();resume();render();return}
});
document.addEventListener('change',e=>{
 const input=e.target.closest('[data-option]');
 if(!input)return;
 const name=input.dataset.option,value=input.value;
 if(name.startsWith('playerLogo')){options.playerLogos=options.playerLogos||LOGOS.slice(0,2);options.playerLogos[Number(name.slice(10))]=value;advancedOpen=true;render();return}
 if(name.startsWith('playerName')){options.playerNames=options.playerNames||[];options.playerNames[Number(name.slice(10))]=value;return}
 options[name]=input.type==='checkbox'?input.checked:(name==='seed'?Math.max(0,Math.min(4294967295,Number(value)||0)):(name==='strategies'?value==='true':value));
 if(name==='deckCount')options.deckCount=value==='auto'?'auto':Number(value);
 if(name==='faction0'||name==='faction1'){const p=Number(name.slice(-1)),map=MAPS.find(m=>m.id===options.map),idx=Number(value);options.factions=[...(options.factions||[0,1])];options.factions[p]=idx;options.factions[1-p]=1-idx;options.playerLogos=[...(options.playerLogos||LOGOS.slice(0,2))];options.playerLogos[p]=factionLogo(map,options.factions[p]);options.playerLogos[1-p]=factionLogo(map,options.factions[1-p]);advancedOpen=true;render();return}
 if(name==='map')return;
 advancedOpen=true;render();
});
window.addEventListener('beforeunload',()=>save());
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(modal&&!modal.rotation&&modal!=='event'){if(modal==='event')eventQueueToLog();modal=null;render()}
  else if(targeting){targeting=null;render()}
 }
});
onLangChange(()=>{render()});
window.addEventListener('resize',()=>requestAnimationFrame(layoutMapNodes));
window.addEventListener('error',()=>{toast(t('toast.error_reload'))});
setInterval(()=>{
 if(events.length&&!modal&&eventEnd!==null&&Date.now()>=eventEnd)advanceEvent();
},250);
const boot=()=>{
 const value=saved();
 if(value&&value.phase!=='draft'&&value.phase!=='over'&&options.resume!==false){/* keep menu on boot; resume via button */}
 render();
};
boot();
