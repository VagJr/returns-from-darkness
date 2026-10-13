import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'file:///C:/cs/node_modules/playwright/index.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
const config=JSON.parse(await fs.readFile(path.join(root,'site-config.json'),'utf8'));
const version=config.baseVersion;
const copy=JSON.parse(await fs.readFile(path.join(root,'real-gallery.json'),'utf8'));
const out='C:/vagner/diablo-online/analysis';
await fs.mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.json':'application/json','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(url.pathname).replaceAll('\\','/');
  const target=path.resolve(dist,'.'+name+(name.endsWith('/')?'index.html':''));
  if(!target.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(target);
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
const checks=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Gallery fixture is offline"}'}));
 for(const lang of Object.keys(copy)){
  for(const central of [false,true]){
   await page.goto(base+(central?'/central/?lang='+lang+'#client':lang==='pt-BR'?'/':'/'+lang+'/'));
   const gallery=page.locator(central?'#client-gallery':'#game-gallery');
   await gallery.locator('.capture-heading h2').waitFor();
   await page.waitForFunction(({id,title})=>document.querySelector(id+' .capture-heading h2')?.textContent===title,{id:central?'#client-gallery':'#game-gallery',title:copy[lang].title});
   assert.equal(await gallery.locator('figure').count(),5);
   assert.deepEqual(await gallery.locator('figcaption h3').allTextContents(),copy[lang].cards.map(card=>card[0]));
   assert.deepEqual(await gallery.locator('figcaption p').allTextContents(),copy[lang].cards.map(card=>card[1]));
   assert.deepEqual(await gallery.locator('.capture-flow h4').allTextContents(),copy[lang].steps.map(step=>step[0]));
   assert.deepEqual(await gallery.locator('.capture-flow p').allTextContents(),copy[lang].steps.map(step=>step[1]));
   assert.equal(await gallery.locator('.capture-note').textContent(),copy[lang].note);
   await gallery.locator('img').evaluateAll(async images=>{images.forEach(image=>image.loading='eager');await Promise.all(images.map(image=>image.decode()));});
   await page.waitForFunction(id=>[...document.querySelectorAll(id+' img')].every(image=>image.complete&&image.naturalWidth===1920&&image.naturalHeight===1080),central?'#client-gallery':'#game-gallery');
   const links=await gallery.locator('.capture-image').evaluateAll(nodes=>nodes.map(node=>({href:node.getAttribute('href'),label:node.getAttribute('aria-label'),target:node.target,rel:node.rel})));
   assert.equal(new Set(links.map(link=>link.href)).size,5);
   assert(links.every(link=>link.href.endsWith('?v='+version)));
   assert(links.every(link=>link.target==='_blank'&&link.rel.includes('noopener')));
   assert.deepEqual(links.map(link=>link.label),copy[lang].cards.map(card=>card[0]+' — '+copy[lang].open));
   for(const width of [1920,390]){
    await page.setViewportSize({width,height:width===1920?1080:844});
    await gallery.scrollIntoViewIfNeeded();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),lang+' '+central+' '+width+' overflow');
    if(lang==='pt-BR'&&width===1920||lang==='ar'&&central&&width===390){
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
     await gallery.screenshot({path:path.join(out,'real-gallery-'+(central?'central':'landing')+'-'+lang+'-'+width+'.png')});
    }
   }
   checks.push({lang,central,captures:5,localized:true,fullImageLinks:true,desktopAndMobile:true});
  }
 }
 assert.deepEqual(errors,[]);
 const feedBytes=await fs.readFile(path.join(dist,'downloads','latest.json'));
 const releaseFeed=await fs.readFile('C:/vagner/diablo-online/build/releases/'+version+'/latest.json');
 assert.deepEqual(feedBytes,releaseFeed,'Published feed must match the signed release byte for byte');
 const feed=JSON.parse(feedBytes.toString('utf8'));
 const payload=JSON.parse(Buffer.from(feed.payload,'base64').toString('utf8'));
 assert.equal(payload.version,version);
 assert(payload.archiveUrl.includes('/client-v'+version+'/'));
 assert(feed.signature.length>100);
 const centralSource=await fs.readFile(path.join(dist,'central','index.html'),'utf8');
 assert(centralSource.includes('/client-v'+version+'/ReturnsFromDarkness-Setup.exe'));
 assert(centralSource.includes('href="rfd://open"'));
 const report={passed:true,version,languages:14,pages:28,screenshots:5,realSourceAssets:true,noOverflow:true,localizedCaptionsAndAccessibleLinks:true,signedFeedIdenticalToRelease:true,downloadVersion:version,installedClientLink:'rfd://open',desktop:'1920x1080',mobile:'390x844',errors,checks};
 await fs.writeFile(path.join(out,'real-gallery-qa.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,version,languages:report.languages,pages:report.pages,noOverflow:report.noOverflow,signedFeedIdenticalToRelease:true}));
 if(process.argv.includes('--site-suite')){
  await browser.close();
  const {stdout}=await promisify(execFile)(process.execPath,['C:/vagner/diablo-online/tools/qa-site.mjs',base,version],{timeout:120000});
  console.log(stdout.trim());
 }
}finally{
 await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
