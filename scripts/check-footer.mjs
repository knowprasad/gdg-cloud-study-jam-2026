import { chromium } from 'file:///C:/Users/shubh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/shubh/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'});
const results=[];
try{
for(const width of [320,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5174/?design=clubhouse',{waitUntil:'networkidle'});
 for(const theme of ['light','dark']){
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#theme').click();
  await page.waitForFunction(()=>[...document.images].every(x=>x.complete));
  const check=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,bands:document.querySelectorAll('.clubhouse-band').length,bandHeights:[...document.querySelectorAll('.clubhouse-band')].map(x=>x.getBoundingClientRect().height),brokenImages:[...document.images].filter(x=>!x.complete||!x.naturalWidth).length,footerLinks:[...document.querySelectorAll('.clubhouse-footer a')].filter(x=>x.hash).map(x=>x.hash)}));
  if(check.overflow||check.brokenImages||check.bands!==2||check.bandHeights.some(h=>h!==32)||errors.length)throw Error(JSON.stringify({width,theme,check,errors}));
  results.push({width,theme,...check,errors});
  if(width===390||width===1440){await page.locator('.clubhouse-footer').screenshot({path:`design-previews/clubhouse-footer-${width}-${theme}.png`,style:'.site-header,.skip{visibility:hidden}'});}
 }
 await page.locator('.clubhouse-footer a[href="#guilds"]').click();
 await page.waitForURL('**#guilds');
 if(await page.locator('.clubhouse-band').count()!==1)throw Error('Footer band missing on guild route');
 await page.close();
}
await fs.writeFile('design-previews/footer-verification.json',JSON.stringify(results,null,2));
console.log('PASS: 8 viewport/theme checks; strips 32px; no overflow, image failures or page errors; footer guild navigation passed.');
}finally{await browser.close();}
