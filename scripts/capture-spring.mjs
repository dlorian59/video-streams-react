import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const source=process.env.DEMO_VIDEO_SOURCE;if(!source)throw Error('Set DEMO_VIDEO_SOURCE to the real 32-second test video; see CONTRIBUTING.md');
const root=resolve(import.meta.dirname,'..');const output=resolve(root,'output/spring-capture');const assets=resolve(root,'assets/visuals');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['scripts/spring-demo.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],env:process.env});let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);let browser;
try{
 for(let n=0;n<80&&!log.includes('Spring video example');n++){if(server.exitCode!==null)throw Error(log);await delay(100);}if(!log.includes('Spring video example'))throw Error(log);
 browser=await chromium.launch({headless:true});const results=[];
 for(const lang of ['en','ru']){
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:800,height:1000},recordVideo:{dir:output,size:{width:800,height:1000}}});const page=await context.newPage();const errors=[],requests=[],responses=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));page.on('response',r=>responses.push({url:r.url(),status:r.status()}));
  await page.addInitScript(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>{if(!(init?.body instanceof ReadableStream))return native(input,init);const body=init.body.pipeThrough(new TransformStream({async transform(chunk,controller){for(let start=0;start<chunk.length;start+=131072){await new Promise(r=>setTimeout(r,60));init.signal?.throwIfAborted();controller.enqueue(chunk.subarray(start,start+131072));}}}));return native(input,{...init,body});};document.addEventListener('DOMContentLoaded',()=>{const cursor=document.createElement('div');cursor.style.cssText='position:fixed;z-index:999;left:-20px;top:-20px;width:18px;height:18px;border:2px solid #2454a6;border-radius:50%;background:#b5d0ff88;pointer-events:none;transform:translate(-50%,-50%)';document.body.append(cursor);document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});document.addEventListener('pointerdown',()=>cursor.style.background='#2454a6');document.addEventListener('pointerup',()=>cursor.style.background='#b5d0ff88');});});
  await page.goto(`https://127.0.0.1:5182/?lang=${lang}`);
  async function click(name){const target=page.getByRole('button',{name,exact:true});await target.waitFor();const box=await target.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:8});await delay(200);await target.click();}
  await click(lang==='en'?'Sign in to demo':'Войти в демо');await page.locator('input[type=file]').waitFor();
  const chooser=page.waitForEvent('filechooser');await page.locator('input[type=file]').click();await(await chooser).setFiles(source);await delay(700);
  assert.match(await page.locator('input[type=file]').inputValue(),/source-32s\.mp4$/);
  await click(lang==='en'?'Upload':'Загрузить');await page.locator('[data-upload-state=transferring]').waitFor();await page.locator('[data-preparation=preparing]').waitFor({timeout:30_000});
  await page.locator('[data-preparation=ready]').waitFor({timeout:190_000});await page.waitForFunction(()=>document.querySelector('video')?.readyState>=3);await delay(700);
  const initial=requests.filter(x=>/segment-\d{6}\.m4s$/.test(x.url));assert(initial.length>0&&initial.length<16,`initialsegments ${initial.length}`);
  await click(lang==='en'?'Play':'Смотреть');await page.waitForFunction(()=>document.querySelector('video').currentTime>1.1);
  await click(lang==='en'?'Seek to 24 seconds':'Перейти к 24 секунде');await page.waitForFunction(()=>document.querySelector('video').currentTime>24.2&&document.querySelector('video').readyState>=3);await delay(500);
  await page.screenshot({path:resolve(assets,`attachment-spring-${lang}.png`)});
  const generation=await page.locator('[data-generation]').getAttribute('data-generation');const playlist=requests.find(x=>x.url.endsWith('/playlist.m3u8')).url;
  await click(lang==='en'?'Close attachment':'Закрыть вложение');await delay(500);const count=requests.length;await delay(500);assert.equal(requests.length,count);
  assert.equal(requests.filter(x=>x.method==='PUT').length,1);assert.equal(requests.filter(x=>x.method==='POST'&&x.url.endsWith('/prepare')).length,1);
  assert(responses.some(x=>x.url.endsWith('/prepare')&&x.status===201));assert(requests.some(x=>x.url.endsWith('/segment-000012.m4s')));assert.deepEqual(errors,[]);
  await context.clearCookies();const denied=await context.request.get(playlist);assert.equal(denied.status(),401);
  results.push({language:lang,backend:'Spring WebFlux + FFmpeg + Garage S3',sourceBytes:7374595,durationSeconds:32,segments:16,initialSegmentRequests:initial.length,upload201:true,prepare201:true,playback:true,seekSeconds:24,cleanupStopsRequests:true,unauthenticatedPlaylist:401,generation,errors});
  const video=page.video();await context.close();const path=await video.path();execFileSync('ffmpeg',['-v','error','-y','-i',path,'-filter_complex','[0:v]fps=6,scale=720:-2,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',resolve(assets,`attachment-spring-${lang}.gif`)]);
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
