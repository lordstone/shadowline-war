import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {tutorialCampaignCheck} from './browser.test.mjs';

const server=spawn(process.execPath,['server.mjs'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.stdout.on('data',chunk=>{if(String(chunk).includes('Shadowline War ready:'))resolve()});
  server.once('exit',code=>reject(Error('Server exited before ready: '+code)));
 });
 browser=await chromium.launch({headless:true});
 const desktop=await browser.newPage({viewport:{width:2048,height:731}});
 await desktop.goto('http://127.0.0.1:4173/');
 await desktop.locator('[data-action="start-tutorial"]').click();
 await desktop.locator('.event-screen').waitFor();
 await desktop.waitForTimeout(1600);
 assert.equal(await desktop.locator('.event-screen').count(),1,'training reports wait for the player');
 assert.equal(await desktop.locator('.tutorial-event-note').count(),1);
 await mkdir('artifacts',{recursive:true});
 await desktop.screenshot({path:'artifacts/tutorial-event.png'});
 await desktop.setViewportSize({width:390,height:600});
 const eventFooter=await desktop.locator('.event-footer').evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight}});
 assert.ok(eventFooter.top>=0&&eventFooter.bottom<=eventFooter.height,JSON.stringify(eventFooter));
 await desktop.screenshot({path:'artifacts/tutorial-event-mobile.png'});
 await desktop.setViewportSize({width:2048,height:731});
 for(let n=0;n<30&&!await desktop.locator('[data-action="reveal-card"]').count();n++){
  if(await desktop.locator('[data-action="event-continue"]').count())await desktop.locator('[data-action="event-continue"]').click();
  else await desktop.waitForTimeout(250);
 }
 await desktop.locator('[data-action="reveal-card"]').first().waitFor();
 await desktop.screenshot({path:'artifacts/tutorial-desktop-initial.png'});
 const layout=await desktop.evaluate(()=>{
  const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};
  return {viewport:innerHeight,shell:rect('.game-shell'),banner:rect('.tutorial-director'),armies:rect('.armies'),layout:rect('.game-layout'),battle:rect('.battle-area'),hand:rect('.hand-tray'),card:rect('.hand-tray .playing-card')};
 });
 console.log('Tutorial desktop layout:',JSON.stringify(layout));
 assert.ok(layout.hand.bottom<=layout.viewport&&layout.card.bottom<=layout.viewport,JSON.stringify(layout));
 await desktop.close();
 const {page,errors}=await tutorialCampaignCheck(browser);
 await page.screenshot({path:'artifacts/tutorial-victory.png',fullPage:true});
 console.log('Guided campaign completed in Chromium without page errors:',errors.length);
 await page.close();
 const standalone=await browser.newPage();
 await standalone.goto(pathToFileURL(resolve('暗线战争.html')).href);
 await standalone.locator('[data-action="start-tutorial"]').click();
 await standalone.locator('.event-screen').waitFor();
 await standalone.waitForTimeout(1300);
 assert.equal(await standalone.locator('.tutorial-event-note').count(),1,'offline bundle keeps training report visible');
 await standalone.close();
}finally{
 await browser?.close();
 server.kill();
}
