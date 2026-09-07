
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createGame,act,aiAction} from '../src/engine.js';
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
 assert.match(await page.locator('.event-map-node.hit').innerText(),/苍岚首都/);
 const invaded=await state();assert.equal(invaded.phase,'defend');
 await page.getByRole('button',{name:'暂停',exact:true}).click();await page.waitForTimeout(3200);
 assert.equal(await page.locator('.event-invasion').count(),1);assert.deepEqual(await state(),invaded);
 await click('close');await page.waitForTimeout(400);assert.equal(await page.locator('.event-invasion').count(),1);
 await page.locator('.event-garrison').waitFor({timeout:4000});await drain();
 assert.equal(await page.locator('.hand-tray .playing-card').count(),12);
 await page.waitForFunction(()=>/30|29/.test(document.querySelector('#clock')?.textContent));
 checks.push('AI invasion target, automatic 3-second queue, pause, preserved action timer and returned garrison');
 s=createGame({strategies:false,mode:'ai'});s.players[0].strategies=['conscription'];await load(s);await page.locator('[data-action="use-strategy"][data-id="conscription"]').click();
 await click('next-event');assert.equal(await page.locator('.event-cards .playing-card:not(.back)').count(),1);
 assert.equal(await page.locator('.event-cards .new-card-badge').count(),1);await drain();
 assert.equal(await page.locator('.hand-tray .new-card-badge').count(),1);checks.push('new card face animation and persistent hand marker');
 s=createGame({strategies:false,mode:'ai'});s.players[0].strategies=['isr'];await load(s);await page.locator('[data-action="use-strategy"][data-id="isr"]').click();
 assert.equal(await page.locator('.targeting-note').count(),1);
 const enemy=s.fields.find(f=>f.owner===1);await page.locator('[data-action="focus"][data-id="'+enemy.id+'"]').click();await drain();
 assert.equal((await state()).fields.find(f=>f.id===enemy.id).garrison[0].open,true);
 await page.locator('[data-action="reserve"][data-player="0"]').click();assert.equal(await page.locator('.garrison-roster .playing-card:not(.back)').count(),1);await click('close');
 checks.push('strategy target selection and garrison roster');
 s=createGame({strategies:false,mode:'local',eventSeconds:3});await load(s);
 const center=s.fields.find(f=>f.id==='center_town');const stationed=s.players[0].hand[0].id;
 await page.locator('[data-action="focus"][data-id="'+center.id+'"]').click();await page.locator('[data-action="card"][data-id="'+stationed+'"]').click();await click('occupy');
 assert.equal(await page.locator('.event-occupation').count(),1);assert.equal(await page.locator('.hand-tray').count(),0);
 await drain();assert.equal(await page.locator('[data-action="ready"]').count(),1);assert.equal(await page.locator('.hand-tray').count(),0);
 await click('ready');await page.locator('[data-action="reserve"][data-player="0"]').click();
 assert.equal(await page.locator('.garrison-roster .playing-card:not(.back)').count(),0);
 assert.equal(await page.locator('.garrison-roster .playing-card.back').count(),2);
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
 await page.setViewportSize({width:390,height:844});s=createGame({strategies:false,mode:'ai',eventSeconds:5});s.active=1;s.raid=true;await load(s);await page.locator('.event-invasion').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('../../shadowline-event-mobile.png',import.meta.url)),fullPage:true});
 await page.getByRole('button',{name:'暂停',exact:true}).click();await click('close');await drain();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px mobile event and battle layout without horizontal overflow');
 assert.deepEqual(errors,[]);await page.close();return {checks,pageErrors:errors};
}
