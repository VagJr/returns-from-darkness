import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/cs/node_modules/playwright/index.mjs';
const root='C:/vagner/returns-from-darkness',dist=root+'/site/dist';
const broken=/(?:[ÃÂ][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|â[\u0080-\u00bf€][\u0080-\u00bf\u2122\u0153\u201c\u201d]|ï¿½|\ufffd)/;
let server,browser;const supplied=process.argv[2];
const langs=['pt-BR','en','es','fr','de','it','pl','ru','uk','tr','ja','ko','zh-CN','ar'];
try{
 let base=supplied;
 if(!base){server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');let file=path.resolve(dist,'.'+decodeURIComponent(u.pathname));if(file!==path.resolve(dist)&&!file.startsWith(path.resolve(dist)+path.sep)){res.writeHead(403);res.end();return;}if(!path.extname(file))file=path.join(file,'index.html');const bytes=await fs.readFile(file);const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[path.extname(file)];res.writeHead(200,{'Content-Type':mime||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const lang of langs){const response=await page.goto(base+'/'+lang+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>document.characterSet),'UTF-8');const visible=await page.locator('body').innerText();assert.ok(!broken.test(visible),'Broken visible text in '+lang);if(lang==='pt-BR'){assert.ok(visible.includes('Até 4 jogadores por partida'));assert.ok(visible.includes('Gratuito · Não comercial'));assert.ok(visible.includes('TH3data.mor'));}}
 await page.goto(base+'/',{waitUntil:'networkidle'});assert.ok(!broken.test(await page.locator('body').innerText()));
 const target='C:/vagner/diablo-online/analysis/site-encoding-'+(supplied?'public':'local')+'.png';await page.screenshot({path:target,fullPage:true});
 await page.goto(base+'/central/?lang=pt-BR#client',{waitUntil:'networkidle'});assert.ok(!broken.test(await page.locator('body').innerText()));
 assert.deepEqual(errors,[]);const feed=await page.request.get(base+'/downloads/latest.json');assert.equal(feed.status(),200);const manifest=JSON.parse(Buffer.from((await feed.json()).payload,'base64').toString('utf8'));assert.equal(manifest.version,'0.4.12');
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/',{waitUntil:'networkidle'});assert.ok(!broken.test(await page.locator('body').innerText()));
 const report={passed:true,base,languages:14,visibleTextUtf8:true,reportedFactLabelsCorrect:true,centralTextCorrect:true,desktopAndMobileVerified:true,downloadVersion:manifest.version,javascriptErrors:errors,screenshot:target};
 await fs.writeFile('C:/vagner/diablo-online/analysis/site-encoding-'+(supplied?'public':'local')+'-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
