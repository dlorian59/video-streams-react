import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VideoMessage } from './VideoMessage.js';
import type { PreparedVideo } from '@59alex/video-streams-react';
import '../player/page.css';
type Session = { username: string; csrfHeader: string; csrfToken: string };
function App() {
  const ru = new URLSearchParams(location.search).get('lang') === 'ru';
  const [session, setSession] = useState<Session>(); const [asset, setAsset] = useState<PreparedVideo>(); const [error, setError] = useState('');
  const [visible, setVisible] = useState(true); const [attachmentId] = useState(() => crypto.randomUUID());
  useEffect(() => { const controller = new AbortController(); void fetch('/api/session', { signal: controller.signal }).then(response => response.json()).then(value => { if (!controller.signal.aborted) setSession(value); }).catch(() => {}); return () => controller.abort(); }, []);
  async function login() {
    if (!session) return;
    // These public credentials belong only to the isolated example server.
    // Эти публичные credentials принадлежат только изолированному серверу примера.
    const response = await fetch('/login', { method: 'POST', headers: { [session.csrfHeader]: session.csrfToken, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'demo', password: 'video-demo-only' }) });
    if (!response.ok) { setError('Demo login failed'); return; }
    // Spring changes CSRF state after login; obtain the new token before uploading.
    // После входа Spring меняет CSRF-состояние; получаем новый token перед загрузкой.
    setSession(await (await fetch('/api/session')).json());
  }
  return <main><header><p className="eyebrow">VIDEO ATTACHMENT · SPRING + S3</p><h1>{ru ? 'Прикрепить видео к обращению' : 'Attach a video to a support ticket'}</h1><p>{ru ? 'Потоковая загрузка → подготовка FFmpeg → просмотр начала' : 'Streamed upload → FFmpeg preparation → preview playback'}</p></header>
    {session?.username !== 'demo' ? <button disabled={!session} onClick={() => { void login(); }}>{ru ? 'Войти в демо' : 'Sign in to demo'}</button>
      : visible && <VideoMessage account={{ id: session.username, csrfHeader: session.csrfHeader, csrfToken: session.csrfToken }} attachmentId={attachmentId} language={ru ? 'ru' : 'en'} onPrepared={setAsset} />}
    {error && <p role="alert">{error}</p>}
    {asset && <><output data-generation={asset.generation}>{ru ? 'Готовое видео' : 'Prepared video'}: {asset.durationSeconds}s · {asset.segmentCount} {ru ? 'сегментов' : 'segments'}</output><nav>
      <button onClick={() => { void document.querySelector('video')?.play(); }}>{ru ? 'Смотреть' : 'Play'}</button>
      <button onClick={() => { const video = document.querySelector('video'); if (video) video.currentTime = 24; }}>{ru ? 'Перейти к 24 секунде' : 'Seek to 24 seconds'}</button>
      <button onClick={() => setVisible(false)}>{ru ? 'Закрыть вложение' : 'Close attachment'}</button>
    </nav></>}
    <p className="note">{ru ? 'Изолированный пример: Spring WebFlux, настоящий FFmpeg и Garage S3. Не production deployment.' : 'Isolated example: Spring WebFlux, real FFmpeg and Garage S3. Not a production deployment.'}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
