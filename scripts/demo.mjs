import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, basename } from 'node:path';
const root = resolve(import.meta.dirname, '..'); const output = resolve(root, 'output/demo'); const media = resolve(output, 'media');
await mkdir(media, { recursive: true });
// Generate a real 24-second H264/AAC fragmented MP4 fixture with 12 seekable segments.
// Создаём настоящее H264/AAC fMP4-видео на 24 секунды с 12 сегментами для перемотки.
execFileSync('ffmpeg', ['-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','24','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','60','-keyint_min','60','-sc_threshold','0','-c:a','aac','-b:a','64k','-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_type','fmp4','-hls_fmp4_init_filename','init.mp4','-hls_segment_filename',resolve(media,'segment-%06d.m4s'),resolve(media,'playlist.m3u8')]);
await build({ entryPoints: [resolve(root, 'examples/player/main.tsx')], bundle: true, alias: { react: resolve(root, 'node_modules/react'), 'react-dom': resolve(root, 'node_modules/react-dom') }, format: 'esm', outfile: resolve(output, 'main.js') });
const requests = []; let active = 0;
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:5182');
    if (url.pathname === '/requests') { response.setHeader('content-type','application/json'); response.end(JSON.stringify({ requests, active })); return; }
    if (url.pathname.startsWith('/media/')) {
      const name = basename(url.pathname); if (!/^(playlist\.m3u8|init\.mp4|segment-\d{6}\.m4s)$/.test(name)) { response.writeHead(404).end(); return; }
      const owner = request.headers['x-demo-owner']; requests.push({ name, owner, at: Date.now() });
      if (!['demo-owner-1','demo-owner-2'].includes(owner)) { response.writeHead(403).end(); return; }
      const data = await readFile(resolve(media,name)); active++;
      response.on('close', () => active--);
      response.writeHead(200, { 'content-type': name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp4', 'content-length': data.length, 'cache-control': 'no-store' });
      // Network pacing makes real buffering and cancellation observable in the recording.
      // Задержка настоящей передачи позволяет увидеть буферизацию и отмену на записи.
      for (let offset=0;offset<data.length && !response.destroyed;offset+=32768) { response.write(data.subarray(offset,offset+32768)); await new Promise(done=>setTimeout(done,30)); }
      response.end(); return;
    }
    const file = url.pathname === '/' ? resolve(root,'examples/player/index.html') : ['/main.js','/main.css'].includes(url.pathname) ? resolve(output,url.pathname.slice(1)) : null;
    if (!file) { response.writeHead(404).end(); return; }
    response.setHeader('content-type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'application/javascript'); response.end(await readFile(file));
  } catch { response.writeHead(500).end(); }
});
server.listen(5182,'127.0.0.1',()=>console.log('Video fixture http://127.0.0.1:5182'));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
