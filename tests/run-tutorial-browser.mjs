import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
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
 const {page,errors}=await tutorialCampaignCheck(browser);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/tutorial-victory.png',fullPage:true});
 console.log('Guided campaign completed in Chromium without page errors:',errors.length);
 await page.close();
}finally{
 await browser?.close();
 server.kill();
}
