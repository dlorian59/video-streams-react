import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const root = resolve(import.meta.dirname,'..'); const output = resolve(root,'output/playwright'); const assets = resolve(root,'assets/visuals');
await mkdir(output,{recursive:true}); await mkdir(assets,{recursive:true});
const server = spawn(process.execPath,['scripts/demo.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']}); let log=''; server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
let browser;
try {
 for(let n=0;n<100;n++){ if(log.includes('Video fixture'))break; if(server.exitCode!==null)throw Error(log); await delay(100); }
 if(!log.includes('Video fixture'))throw Error(log);
 browser=await chromium.launch({headless:true}); const reports=[];
 for(const language of ['en','ru']) {
  const context=await browser.newContext({viewport:{width:800,height:830},recordVideo:{dir:output,size:{width:800,height:830}}});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{ document.addEventListener('DOMContentLoaded',()=>{const cursor=document.createElement('div');cursor.style.cssText='position:fixed;z-index:999;left:-20px;top:-20px;width:18px;height:18px;border:2px solid #2454a6;border-radius:50%;background:#b5d0ff88;pointer-events:none;transform:translate(-50%,-50%)';document.body.append(cursor);document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});document.addEventListener('pointerdown',()=>cursor.style.background='#2454a6');document.addEventListener('pointerup',()=>cursor.style.background='#b5d0ff88');});});
  await page.goto(`http://127.0.0.1:5182/?lang=${language}`);
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=3);
  await delay(1000); const before=await page.locator('[data-segments]').innerText(); assert(Number(before)>0 && Number(before)<12,`preloaded all segments: ${before}`);
  async function click(name) { const locator=page.getByRole('button',{name,exact:true});const box=await locator.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:8});await delay(300);await locator.click(); }
  await click(language==='en'?'Play':'Смотреть');
  await page.waitForFunction(()=>document.querySelector('video').currentTime>1.2);
  await click(language==='en'?'Seek to 18 seconds':'Перейти к 18 секунде');
  await page.waitForFunction(()=>{const video=document.querySelector('video');return video.currentTime>18.3 && video.readyState>=3;});
  await delay(700); await page.screenshot({path:resolve(assets,`playback-${language}.png`)});
  await click(language==='en'?'Change account':'Сменить аккаунт');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=3); await delay(500);
  await click(language==='en'?'Close player':'Закрыть плеер'); await delay(400);
  const snapshot=await(await fetch('http://127.0.0.1:5182/requests')).json(); await delay(500);
  const settled=await(await fetch('http://127.0.0.1:5182/requests')).json();
  assert.equal(settled.active,0);assert.equal(snapshot.requests.length,settled.requests.length);assert.deepEqual(errors,[]);
  assert(settled.requests.some(x=>x.owner==='demo-owner-2'));assert(settled.requests.every(x=>['demo-owner-1','demo-owner-2'].includes(x.owner)));
  assert(settled.requests.some(x=>x.name==='segment-000009.m4s'));
  reports.push({language,previewSegments:Number(before),totalSegments:12,actualPlayback:true,seekSeconds:18,accountChange:true,requestsStopOnUnmount:true,errors});
  const video=page.video();await context.close();const path=await video.path();
  execFileSync('ffmpeg',['-v','error','-y','-i',path,'-filter_complex','[0:v]fps=6,scale=720:-2,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-loop','0',resolve(assets,`playback-${language}.gif`)]);
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify(reports,null,2)); console.log(JSON.stringify(reports,null,2));
}finally{await browser?.close();server.kill('SIGTERM');}
