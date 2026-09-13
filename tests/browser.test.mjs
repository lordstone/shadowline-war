
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createGame,act,aiAction,makeDeck,validate} from '../src/engine.js';
export async function browserChecks(browser,url='http://127.0.0.1:4173/'){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const click=a=>page.locator('[data-action="'+a+'"]').click();
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('shadowline-war-v1')));
 async function load(s){
  await page.goto(url);await page.evaluate(s=>localStorage.setItem('shadowline-war-v1',JSON.stringify(s)),s);await page.reload();await click('load');
  if(s.opt.mode==='local')await click('ready');
 }
 async function drain(){for(let n=0;n<20&&await page.locator('.event-screen').count();n++)await click('next-event')}
 let s=createGame({strategies:false,mode:'ai',timer:30,eventSeconds:3,seed:119});s.active=1;s.raid=true;
 await load(s);await page.locator('.event-invasion').waitFor();
 assert.match(await page.locator('.event-map-node.hit').innerText(),/西境指挥部/);
 const invaded=await state();assert.equal(invaded.phase,'attack');assert.equal(invaded.battle.lines[0].length,3);
 await page.getByRole('button',{name:'暂停',exact:true}).click();await page.waitForTimeout(3200);
 assert.equal(await page.locator('.event-invasion').count(),1);assert.deepEqual(await state(),invaded);
 await click('close');await page.waitForTimeout(400);assert.equal(await page.locator('.event-invasion').count(),1);
 await page.locator('.event-garrison').waitFor({timeout:4000});await drain();
 assert.equal(await page.locator('.hand-tray .playing-card').count(),9);
 assert.equal(await page.locator('.map-mini-card').count(),6);assert.equal(await page.locator('.map-mini-card.concealed').count(),3);assert.equal(await page.locator('.map-mini-card.back').count(),3);
 assert.equal(await page.locator('.map-camera .node-layer').count(),0);assert.equal(await page.locator('.map-stage > .node-layer').count(),1);
 const nodeBefore=await page.locator('.map-node').first().evaluate(el=>el.getBoundingClientRect().width);await page.getByRole('button',{name:'放大战场'}).click();const nodeAfter=await page.locator('.map-node').first().evaluate(el=>el.getBoundingClientRect().width);assert.ok(Math.abs(nodeBefore-nodeAfter)<1,{nodeBefore,nodeAfter});
 const rankOrder=await page.locator('.hand-tray [data-action="card"]').evaluateAll(xs=>xs.map(x=>Number(x.dataset.id)));
 const rankExpected=(await state()).players[0].hand.slice().sort((a,b)=>a.rank-b.rank||a.suit-b.suit||a.id-b.id).map(c=>c.id);assert.deepEqual(rankOrder,rankExpected);
 await page.locator('[data-action="hand-sort"][data-id="suit"]').click();
 const suitOrder=await page.locator('.hand-tray [data-action="card"]').evaluateAll(xs=>xs.map(x=>Number(x.dataset.id)));
 const suitExpected=(await state()).players[0].hand.slice().sort((a,b)=>a.suit-b.suit||a.rank-b.rank||a.id-b.id).map(c=>c.id);assert.deepEqual(suitOrder,suitExpected);
 await page.waitForFunction(()=>/30|29/.test(document.querySelector('#clock')?.textContent));
 checks.push('AI invasion target, automatic 3-second queue, pause, preserved action timer, visible map garrisons, scale-stable nodes and rank/suit hand sorting');
 s=createGame({strategies:false,mode:'ai'});s.players[0].strategies=['conscription'];await load(s);await page.locator('[data-action="use-strategy"][data-id="conscription"]').click();
 await click('next-event');assert.equal(await page.locator('.event-cards .playing-card:not(.back)').count(),1);
 assert.equal(await page.locator('.event-cards + .event-progress').count(),1);
 assert.equal(await page.locator('.event-cards .new-card-badge').count(),1);await drain();
 assert.equal(await page.locator('.hand-tray .new-card-badge').count(),1);checks.push('new card face animation and persistent hand marker');
 s=createGame({strategies:false,mode:'ai'});s.players[0].strategies=['isr'];await load(s);await page.locator('[data-action="use-strategy"][data-id="isr"]').click();
 assert.equal(await page.locator('.targeting-note').count(),1);
 const enemy=s.fields.find(f=>f.owner===1);await page.locator('[data-action="focus"][data-id="'+enemy.id+'"]').click();await drain();
 assert.ok((await state()).fields.find(f=>f.id===enemy.id).garrison.some(c=>c.open));
 await page.locator('[data-action="reserve"][data-player="0"]').click();assert.equal(await page.locator('.garrison-roster .playing-card:not(.back)').count(),3);await click('close');
 checks.push('strategy target selection and garrison roster');
 s=createGame({strategies:false,mode:'local',eventSeconds:3});await load(s);
 const center=s.fields.find(f=>f.id==='center_town');const stationed=s.players[0].hand[0].id;
 await page.locator('[data-action="focus"][data-id="'+center.id+'"]').click();await page.locator('[data-action="card"][data-id="'+stationed+'"]').click();await click('occupy');
 assert.equal(await page.locator('.event-occupation').count(),1);assert.equal(await page.locator('.hand-tray').count(),0);
 await drain();assert.equal(await page.locator('[data-action="ready"]').count(),1);assert.equal(await page.locator('.hand-tray').count(),0);
 await click('ready');await page.locator('[data-action="reserve"][data-player="0"]').click();
 assert.equal(await page.locator('.garrison-roster .playing-card:not(.back)').count(),1);
 assert.equal(await page.locator('.garrison-roster .playing-card.back').count(),3);
 checks.push('occupation transfer and hotseat privacy before and after handoff');
 // Reach an actual attacker deployment with a usable blitzkrieg.
 s=createGame({rules:'classic',strategies:false,mode:'local',seed:119});
 s=act(s,s.active,{type:'deploy',cards:[{id:s.players[s.active].hand.sort((a,b)=>a.rank-b.rank)[0].id,open:true}]}).state;
 s.players[s.active].strategies=['blitzkrieg'];
 const deployment=aiAction(s,s.active);assert.equal(deployment.type,'deploy');
 await load(s);for(const c of deployment.cards){await page.locator('[data-action="card"][data-id="'+c.id+'"]').click();if(!c.open)await page.locator('[data-action="card"][data-id="'+c.id+'"]').click()}
 await click('deploy');await drain();assert.equal((await state()).phase,'tactics');
 await page.locator('[data-action="use-strategy"][data-id="blitzkrieg"]').click();assert.equal(await page.locator('.event-strategy').count(),1);await drain();
 assert.equal((await state()).players[1].wins,1);checks.push('actual deployment to tactical window and successful blitzkrieg');
 await page.setViewportSize({width:375,height:812});s=createGame({strategies:false,mode:'ai',eventSeconds:5});s.active=1;s.raid=true;await load(s);await page.locator('.event-invasion').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('../../shadowline-event-mobile.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'暂停',exact:true}).click();await click('close');await drain();
 const mobileMetrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,width:innerWidth,height:innerHeight,battle:document.querySelector('.battle-area')?.getBoundingClientRect().toJSON(),hand:document.querySelector('.hand-tray')?.getBoundingClientRect().toJSON(),intel:document.querySelector('.intel-panel')?.getBoundingClientRect().toJSON()}));
 assert.ok(mobileMetrics.scrollWidth<=mobileMetrics.width&&mobileMetrics.scrollHeight<=mobileMetrics.height&&mobileMetrics.hand?.height>=112&&mobileMetrics.hand.bottom<=mobileMetrics.height&&mobileMetrics.intel?.height>=58&&mobileMetrics.intel.bottom<=mobileMetrics.height,JSON.stringify(mobileMetrics));
 await page.setViewportSize({width:834,height:1112});
 const tabletMetrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,width:innerWidth,height:innerHeight,hand:document.querySelector('.hand-tray')?.getBoundingClientRect().toJSON(),intel:document.querySelector('.intel-panel')?.getBoundingClientRect().toJSON()}));
 assert.ok(tabletMetrics.scrollWidth<=tabletMetrics.width&&tabletMetrics.scrollHeight<=tabletMetrics.height&&tabletMetrics.hand?.height>=122&&tabletMetrics.hand.bottom<=tabletMetrics.height&&tabletMetrics.intel?.height>=64&&tabletMetrics.intel.bottom<=tabletMetrics.height,JSON.stringify(tabletMetrics));checks.push('iPhone and iPad battle layouts reserve visible hand and command trays without page overflow');
 assert.deepEqual(errors,[]);await page.close();return {checks,pageErrors:errors};
}

export async function counterplayCheck(browser,url='http://127.0.0.1:4173/'){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let s=createGame({rules:'classic',strategies:false,mode:'ai',first:1,eventSeconds:3});
 const deck=makeDeck(),take=spec=>spec.map(([rank,suit])=>deck.find(c=>c.rank===rank&&c.suit===suit));
 s.players[0].hand=take([[4,0],[9,1]]);s.players[1].hand=take([[1,2],[6,3]]);
 const used=new Set(s.players.flatMap(p=>p.hand.map(c=>c.id)));s.deck=deck.filter(c=>!used.has(c.id));validate(s);
 for(const p of [1,0])s=act(s,p,{type:'deploy',cards:s.players[p].hand.map((c,i)=>({id:c.id,open:i===0}))}).state;
 const humanHidden=s.battle.lines[0][1].id,skirmish=s.skirmish;
 await page.goto(url);await page.evaluate(s=>localStorage.setItem('shadowline-war-v1',JSON.stringify(s)),s);await page.reload();await page.locator('[data-action="load"]').click();
 await page.locator('.event-reveal').waitFor();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('shadowline-war-v1')));
 assert.equal(saved.active,0);assert.equal(saved.skirmish,skirmish);assert.equal(saved.players.map(p=>p.wins).join(','),'0,0');
 await page.locator('[data-action="next-event"]').click();
 const hidden=page.locator('[data-action="reveal-card"][data-id="'+humanHidden+'"]');assert.equal(await hidden.count(),1);
 assert.match(await hidden.innerText(),/点击翻开/);assert.match(await page.locator('.battle-actions').innerText(),/当前比较只计算明牌/);
 await hidden.click();assert.match(await page.locator('.battle-actions').innerText(),/选择后牌型/);assert.equal(await page.locator('[data-action="reveal"]').isEnabled(),true);await page.locator('[data-action="reveal"]').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('shadowline-war-v1')));assert.equal(saved.players[0].wins,1);
 assert.deepEqual(errors,[]);await page.close();
 return 'AI counterlead preserves human hidden-card button; human reveals and wins the same skirmish';
}

export async function strategyMarketCheck(browser,url='http://127.0.0.1:4173/'){
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let s=createGame({strategies:false,mode:'local',eventSeconds:1});s.opt.strategies=true;s.players[0].supply=7;s.strategyMarket=['conscription','spy','blitzkrieg'];s.strategyDeck=['rank_up'];s.strategyDiscard=[];s.strategyLocked=[[],[]];s.marketBought=false;
 await page.goto(url);await page.evaluate(s=>localStorage.setItem('shadowline-war-v1',JSON.stringify(s)),s);await page.reload();await page.locator('[data-action="load"]').click();await page.locator('[data-action="ready"]').click();
 await page.setViewportSize({width:977,height:792});const neutral=s.fields.find(f=>f.owner===null);await page.locator('[data-action="focus"][data-id="'+neutral.id+'"]').click();await page.locator('[data-action="card"]').first().click();
 const targetBounds=await page.evaluate(()=>{const bar=document.querySelector('.target-bar').getBoundingClientRect(),button=document.querySelector('[data-action="occupy"]').getBoundingClientRect();return {bar:{top:bar.top,bottom:bar.bottom},button:{top:button.top,bottom:button.bottom},visible:button.width>0&&button.height>0}});assert.ok(targetBounds.visible&&targetBounds.button.top>=targetBounds.bar.top&&targetBounds.button.bottom<=targetBounds.bar.bottom,JSON.stringify(targetBounds));
 const capital=s.fields.find(f=>f.owner===0);await page.locator('[data-action="focus"][data-id="'+capital.id+'"]').click();const ownActionBounds=await page.evaluate(()=>{const bar=document.querySelector('.target-bar').getBoundingClientRect(),buttons=[...document.querySelectorAll('.target-actions button')].map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent.trim(),top:r.top,bottom:r.bottom,width:r.width,height:r.height}});return {bar:{top:bar.top,bottom:bar.bottom},buttons}});assert.ok(ownActionBounds.buttons.length===4&&ownActionBounds.buttons.every(b=>b.width>0&&b.height>0&&b.top>=ownActionBounds.bar.top&&b.bottom<=ownActionBounds.bar.bottom),JSON.stringify(ownActionBounds));assert.ok(ownActionBounds.buttons.some(b=>b.label==='补充暗牌 · 2 补给'));
 assert.equal(await page.locator('.strategy-shop-trigger').count(),0);assert.equal(await page.locator('.strategy-shop-button').count(),1);assert.equal(await page.locator('.market-card').count(),0);assert.equal(await page.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth,document.documentElement.scrollHeight<=innerHeight].join(',')),'true,true');
 await page.locator('[data-action="open-market"]').click();assert.equal(await page.locator('.market-card').count(),3);assert.match(await page.locator('[data-action="buy-strategy"][data-id="conscription"]').innerText(),/购买 · 4 补给/);assert.match(await page.locator('[data-action="buy-strategy"][data-id="blitzkrieg"]').innerText(),/补给不足 · 需 8/);await page.locator('[data-action="buy-strategy"][data-id="conscription"]').click();
 assert.equal(await page.locator('.event-purchase').count(),1);assert.match(await page.locator('.event-strategy').innerText(),/征召令/);
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('shadowline-war-v1')));assert.equal(saved.players[0].supply,3);assert.ok(saved.strategyLocked[0].includes('conscription'));assert.equal(saved.strategyMarket.length,3);
 await page.locator('[data-action="next-event"]').click();await page.locator('[data-action="open-market"]').click();assert.equal(await page.locator('.market-buy').allTextContents().then(xs=>xs.every(x=>/本回合已购/.test(x))),true);await page.locator('[data-action="close"]').click();assert.match(await page.locator('.strategy-tooltip').textContent(),/下一个地图回合/);await page.locator('.strategy-token').hover();await page.waitForTimeout(220);assert.equal(await page.locator('.strategy-tooltip').isVisible(),true);
 await page.locator('[data-action="pass"]').click();while(await page.locator('.event-screen').count())await page.locator('[data-action="next-event"]').click();await page.locator('[data-action="ready"]').click();await page.locator('[data-action="pass"]').click();while(await page.locator('.event-screen').count())await page.locator('[data-action="next-event"]').click();await page.locator('[data-action="ready"]').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('shadowline-war-v1')));assert.equal(saved.strategyLocked[0].length,0);assert.equal(saved.active,0);assert.deepEqual(errors,[]);await page.close();return 'visible target actions and explicit ordinary-card draw cost; public market purchase states, hover tooltip, refill and next-own-turn unlock';
}
