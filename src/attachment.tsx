import { useEffect, useMemo, useRef, useState } from 'react';
import { FileAttachment, type FileAttachmentProps } from '@59alex/file-streams-react';
import { createVideoStreams, prepareVideo, VideoPreparationError, type PreparedVideo } from '@59alex/video-streams';
import type { UploadCommit } from '@59alex/file-streams';
import { VideoStreamPlayer } from './player.js';
export interface VideoAttachmentProps extends Omit<FileAttachmentProps, 'onCommitted' | 'accept'> {
  readonly prepareUrl?: string;
  readonly preparationTimeoutMs?: number;
  readonly prepare?: (commit: UploadCommit, signal: AbortSignal) => Promise<PreparedVideo>;
  readonly existingVideo?: PreparedVideo;
  readonly onPrepared?: (video: PreparedVideo) => void;
  readonly onPreparationError?: (error: Error) => void;
}
export function VideoAttachment(props: VideoAttachmentProps) {
  if (props.prepareUrl && props.prepare) throw new TypeError('Supply either prepareUrl or prepare, not both');
  if (!props.prepareUrl && !props.prepare && !props.existingVideo) throw new TypeError('Supply prepareUrl or prepare');
  return <OwnedVideoAttachment key={JSON.stringify([props.scope, props.objectKey, props.objectsUrl, props.prepareUrl, props.existingVideo?.generation])} {...props} />;
}
function OwnedVideoAttachment(props: VideoAttachmentProps) {
  const [asset, setAsset] = useState(props.existingVideo); const [commit, setCommit] = useState<UploadCommit>();
  const [phase, setPhase] = useState<'source' | 'preparing' | 'ready' | 'error'>(props.existingVideo ? 'ready' : 'source');
  const [error, setError] = useState<Error>(); const current = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => { current.current?.abort(); current.current = undefined; }, []);
  const stableHeaders = JSON.stringify([...new Headers(props.headers)].sort(([a], [b]) => a.localeCompare(b)));
  const client = useMemo(() => createVideoStreams({ headers: JSON.parse(stableHeaders) as [string, string][],
    ...(props.credentials ? { credentials: props.credentials } : {}), ...(props.fetch ? { fetch: props.fetch } : {}) }), [stableHeaders, props.credentials, props.fetch]);
  const ru = props.language === 'ru';
  async function prepare(commit: UploadCommit) {
    current.current?.abort(); const controller = new AbortController(); current.current = controller;
    setCommit(commit); setPhase('preparing'); setError(undefined); setAsset(undefined);
    try {
      const value = props.prepare ? await props.prepare(commit, controller.signal) : await prepareVideo({ prepareUrl: props.prepareUrl!, sourceKey: commit.key, scope: props.scope, signal: controller.signal,
        ...(props.preparationTimeoutMs === undefined ? {} : { timeoutMs: props.preparationTimeoutMs }),
        ...(props.headers ? { headers: props.headers } : {}), ...(props.credentials ? { credentials: props.credentials } : {}), ...(props.fetch ? { fetch: props.fetch } : {}) });
      if (current.current !== controller || controller.signal.aborted) return;
      setAsset(value); setPhase('ready'); props.onPrepared?.(value);
    } catch (cause) {
      if (current.current !== controller) return;
      const failure = cause instanceof Error ? cause : new Error('Preparation failed'); setError(failure); setPhase('error'); props.onPreparationError?.(failure);
    } finally { if (current.current === controller) current.current = undefined; }
  }
  function cancel() {
    current.current?.abort(); current.current = undefined;
    setError(new VideoPreparationError('Preparation result is unknown after cancellation', 'unknown')); setPhase('error');
  }
  return <section className="vs-attachment" data-video-attachment data-preparation={phase}>
    <FileAttachment {...props} profile={props.profile ?? 'media'} accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv" disabled={props.disabled || phase !== 'source'} onCommitted={value => { void prepare(value); }} />
    {phase === 'preparing' && <div className="vs-preparation"><p role="status">{ru ? 'Исходник сохранён. Сервер готовит видео…' : 'Source saved. The server is preparing the video…'}</p><button type="button" onClick={cancel}>{ru ? 'Отменить ожидание' : 'Cancel waiting'}</button></div>}
    {phase === 'error' && <div className="vs-preparation"><p role="alert">{ru ? 'Исходник сохранён. Готовность видео не подтверждена.' : 'Source saved. Video readiness is not confirmed.'}</p><p>{error?.message}</p>
      {error instanceof VideoPreparationError && error.outcome === 'rejected' && commit
        ? <button type="button" onClick={() => { void prepare(commit); }}>{ru ? 'Повторить подготовку' : 'Retry preparation'}</button>
        : <p>{ru ? 'Проверьте состояние в приложении перед повтором. Отмена не гарантирует откат.' : 'Check application state before retrying. Cancellation does not guarantee rollback.'}</p>}</div>}
    {asset && <VideoStreamPlayer playlistUrl={asset.playlistUrl} scope={props.scope} client={client} {...(props.language ? { language: props.language } : {})} />}
  </section>;
}
