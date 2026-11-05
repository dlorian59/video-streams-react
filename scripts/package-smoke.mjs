import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');const output=resolve(root,'output/package-check');await mkdir(output,{recursive:true});const tarballs=[];
for(const folder of ['../file-streams/browser','../file-streams-react','../video-streams/browser','.']){
 const data=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',output],{cwd:resolve(root,folder),encoding:'utf8'}))[0];
 assert(data.files.some(f=>f.path==='LICENSE'),`${folder} missing MIT license`);assert(data.files.some(f=>f.path==='dist/index.d.ts'));tarballs.push(resolve(output,data.filename));
}
for(const version of ['18.3.1','19.3.1']){
 const consumer=resolve(output,`react-${version}`);await mkdir(consumer,{recursive:true});await writeFile(resolve(consumer,'package.json'),JSON.stringify({private:true,type:'module'}));
 execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',`react@${version}`,`react-dom@${version}`,...tarballs],{cwd:consumer,stdio:'pipe'});
 await writeFile(resolve(consumer,'smoke.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString}from'react-dom/server';import{VideoAttachment,VideoStreamPlayer}from'@59alex/video-streams-react';import{createVideoStreams}from'@59alex/video-streams';assert.equal(typeof createVideoStreams,'function');assert.match(renderToString(React.createElement(VideoStreamPlayer,{playlistUrl:'/a.m3u8',scope:'alice'})),/<video/);assert.match(renderToString(React.createElement(VideoAttachment,{objectKey:'alice:clip',scope:'alice',prepareUrl:'/prepare'})),/type="file"/);console.log('Packed SSR React '+React.version+' passed');`);
 console.log(execFileSync(process.execPath,['smoke.mjs'],{cwd:consumer,encoding:'utf8'}).trim());
 const entry=await readFile(resolve(consumer,'node_modules/@59alex/video-streams-react/dist/index.js'),'utf8');assert(entry.startsWith("'use client';"));await access(resolve(consumer,'node_modules/@59alex/video-streams-react/dist/styles.css'));
}
