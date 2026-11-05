import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { VideoAttachment, VideoStreamPlayer } from '../dist/index.js';
const dom=new JSDOM('<!doctype html>',{url:'https://app.test'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const asset={status:'ready',generation:'12345678-1234-1234-1234-123456789abc',playlistUrl:'https://app.test/playlist.m3u8',durationSeconds:24,segmentCount:12};
test('StrictMode scope change and cancellation ignore stale prepare responses',async()=>{
 const element=document.createElement('div');document.body.append(element);const root=createRoot(element);let resolvePrepare, prepareSignal, notifications=0;
 const config={scope:'alice',objectKey:'alice:clip',objectsUrl:'/api/video-sources',prepare:(_commit,signal)=>{prepareSignal=signal;return new Promise(resolve=>resolvePrepare=resolve);},onPrepared:()=>notifications++,fetch:async(_url,init)=>{const reader=init.body.getReader();let bytes=0;for(;;){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;}return Response.json({committed:true,key:'alice:clip',bytes,etag:'v1'},{status:201});}};
 async function render(props){await act(async()=>root.render(React.createElement(StrictMode,null,React.createElement(VideoAttachment,props))));}
 async function upload(){await act(async()=>{const input=element.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new File(['fakevideo'],'clip.mp4',{type:'video/mp4'})],configurable:true});input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});await act(async()=>{[...element.querySelectorAll('button')].find(x=>x.textContent==='Upload').click();await new Promise(resolve=>setTimeout(resolve,0));});assert.equal(element.querySelector('[data-video-attachment]').dataset.preparation,'preparing');}
 try {
  await render(config);await upload();await render({...config,scope:'bob',objectKey:'bob:clip'});assert(prepareSignal.aborted);
  await act(async()=>{resolvePrepare(asset);await Promise.resolve();});assert.equal(notifications,0);assert.equal(element.querySelector('[data-video-attachment]').dataset.preparation,'source');assert.equal(element.querySelector('video'),null);
  await render(config);await upload();await act(async()=>[...element.querySelectorAll('button')].find(x=>x.textContent==='Cancel waiting').click());
  assert(prepareSignal.aborted);assert.equal(element.querySelector('[data-video-attachment]').dataset.preparation,'error');assert.match(element.textContent,/Cancellation does not guarantee rollback/);
  await act(async()=>{resolvePrepare(asset);await Promise.resolve();});assert.equal(notifications,0);assert.equal(element.querySelector('video'),null);
 } finally {await act(async()=>root.unmount());element.remove();}
});
test('server render has no browser work and competing preparation mechanisms are rejected',()=>{
 assert.match(renderToString(React.createElement(VideoStreamPlayer,{playlistUrl:'/playlist.m3u8',scope:'alice'})),/<video/);
 assert.throws(()=>renderToString(React.createElement(VideoAttachment,{objectKey:'clip',scope:'alice',prepareUrl:'/prepare',prepare:async()=>asset})),/either prepareUrl or prepare/);
});
