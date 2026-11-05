import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createVideoStreams, type VideoState, type VideoSession, type VideoStreams } from '@59alex/video-streams';
const defaultClient = createVideoStreams();
export interface VideoStreamPlayerProps {
  readonly playlistUrl: string;
  readonly scope: string;
  readonly client?: VideoStreams;
  readonly preload?: 'preview' | 'none';
  readonly poster?: string;
  readonly title?: string;
  readonly language?: 'en' | 'ru';
  readonly muted?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly onState?: (state: VideoState) => void;
}
export function VideoStreamPlayer(props: VideoStreamPlayerProps) {
  return <OwnedPlayer key={JSON.stringify([props.playlistUrl, props.scope])} {...props} />;
}
function OwnedPlayer(props: VideoStreamPlayerProps) {
  const video = useRef<HTMLVideoElement>(null); const session = useRef<VideoSession | undefined>(undefined);
  const [state, setState] = useState<VideoState>(); const [failure, setFailure] = useState<string>(); const [attempt, setAttempt] = useState(0);
  const callback = useRef(props.onState);
  useEffect(() => { callback.current = props.onState; }, [props.onState]);
  useEffect(() => {
    let active = true; setState(undefined); setFailure(undefined);
    try {
      const owned = (props.client ?? defaultClient).attach(video.current!, { playlistUrl: props.playlistUrl, scope: props.scope,
        preload: props.preload ?? 'preview', onState: value => { if (active) { setState(value); callback.current?.(value); } } });
      session.current = owned;
      return () => { active = false; owned.dispose(); if (session.current === owned) session.current = undefined; };
    } catch (error) { if (active) setFailure(error instanceof Error ? error.message : 'Playback unavailable'); }
    return () => { active = false; };
  }, [props.client, props.playlistUrl, props.scope, props.preload, attempt]);
  const ru = props.language === 'ru';
  const messages = ru ? { loading: 'Получаем начало видео…', ready: 'Начало готово — можно смотреть', playing: 'Воспроизведение', paused: 'Пауза', buffering: 'Загружаем нужный фрагмент…', ended: 'Просмотр завершён', error: 'Не удалось воспроизвести', disposed: 'Загрузка остановлена' }
    : { loading: 'Loading the beginning…', ready: 'The beginning is ready to play', playing: 'Playing', paused: 'Paused', buffering: 'Loading the requested segment…', ended: 'Playback ended', error: 'Playback failed', disposed: 'Loading stopped' };
  const phase = state?.phase ?? 'loading';
  return <section className={['vs-player', props.className].filter(Boolean).join(' ')} data-video-player data-phase={failure ? 'error' : phase}>
    <video ref={video} controls playsInline poster={props.poster} muted={props.muted} aria-label={props.title ?? (ru ? 'Видеовложение' : 'Video attachment')}>{props.children}</video>
    <div className="vs-status" role="status">{failure ?? messages[phase]}</div>
    {state && <div className="vs-metrics"><span>{ru ? 'Получено' : 'Received'}: {Math.round(state.receivedBytes / 1024)} KiB</span><span>{ru ? 'Буфер впереди' : 'Buffered ahead'}: {state.bufferedSeconds.toFixed(1)} s</span></div>}
    {(failure || phase === 'error') && <p role="alert">{state?.error?.message ?? failure}</p>}
    <div className="vs-actions">
      {failure || phase === 'error' || phase === 'disposed'
        ? <button type="button" onClick={() => setAttempt(value => value + 1)}>{ru ? 'Повторить воспроизведение' : 'Retry playback'}</button>
        : <button type="button" onClick={() => session.current?.dispose()}>{ru ? 'Остановить загрузку' : 'Stop loading'}</button>}
    </div>
  </section>;
}
