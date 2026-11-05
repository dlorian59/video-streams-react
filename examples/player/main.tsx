import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VideoStreamPlayer, createVideoStreams, type VideoState } from '@59alex/video-streams-react';
import '@59alex/video-streams-react/styles.css';
import './page.css';
function Demo() {
  const ru = new URLSearchParams(location.search).get('lang') === 'ru';
  const [visible, setVisible] = useState(true); const [scope, setScope] = useState('demo-owner-1'); const [state, setState] = useState<VideoState>();
  // This synthetic fixture credential is public test data, not application authentication.
  // Credential синтетической фикстуры — публичные тестовые данные, не авторизация приложения.
  const client = useMemo(() => createVideoStreams({ headers: () => ({ 'X-Demo-Owner': scope }) }), [scope]);
  return <main><header><p className="eyebrow">VIDEO STREAMS</p><h1>{ru ? 'Начало готово. Продолжение — по мере просмотра.' : 'The beginning is ready. The rest follows playback.'}</h1><p>{ru ? 'Настоящее HLS-видео FFmpeg · короткая предзагрузка · перемотка по сегментам' : 'Real FFmpeg HLS video · short preview · segment-based seeking'}</p></header>
    {visible && <VideoStreamPlayer scope={scope} playlistUrl="/media/playlist.m3u8" client={client} language={ru ? 'ru' : 'en'} muted onState={setState} />}
    <nav><button onClick={() => { const video = document.querySelector('video'); if (video) void video.play(); }}>{ru ? 'Смотреть' : 'Play'}</button>
    <button onClick={() => { const video = document.querySelector('video'); if (video) video.currentTime = 18; }}>{ru ? 'Перейти к 18 секунде' : 'Seek to 18 seconds'}</button>
    <button onClick={() => setVisible(value => !value)}>{visible ? (ru ? 'Закрыть плеер' : 'Close player') : (ru ? 'Открыть плеер' : 'Open player')}</button>
    <button onClick={() => setScope(value => value === 'demo-owner-1' ? 'demo-owner-2' : 'demo-owner-1')}>{ru ? 'Сменить аккаунт' : 'Change account'}</button></nav>
    <p className="note">{ru ? 'Сегментов получено' : 'Segments received'}: <strong data-segments>{state?.loadedSegments ?? 0}</strong> / 12. {ru ? 'Пауза и перемотка управляют дальнейшей загрузкой.' : 'Pause and seek control further loading.'}</p>
    <p className="note">{ru ? 'Демонстрация: локальный HTTP transport, синтетическое видео. Не S3.' : 'Demonstration: local HTTP transport and synthetic video. Not S3.'}</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
