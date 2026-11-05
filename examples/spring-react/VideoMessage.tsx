import { VideoAttachment, type PreparedVideo } from '@59alex/video-streams-react';
import '@59alex/video-streams-react/styles.css';
export interface VideoMessageProps {
  readonly account: { id: string; csrfHeader: string; csrfToken: string };
  readonly attachmentId: string;
  readonly language?: 'en' | 'ru';
  readonly onPrepared: (video: PreparedVideo) => void;
}
export function VideoMessage({ account, attachmentId, language = 'en', onPrepared }: VideoMessageProps) {
  // The server verifies this account prefix against the authenticated Principal on every request.
  // Сервер сверяет префикс аккаунта с авторизованным Principal при каждом запросе.
  const key = `${account.id}:${attachmentId}`;
  // A committed source is prepared once; HTTP 201 makes the immutable playlist available for playback.
  // Подтверждённый исходник подготавливается один раз; HTTP 201 открывает неизменяемый плейлист для просмотра.
  return <VideoAttachment scope={account.id} objectKey={key} objectsUrl="/api/video-sources"
    prepareUrl={`/api/videos/${encodeURIComponent(key)}/prepare`}
    headers={{ [account.csrfHeader]: account.csrfToken }} language={language}
    onPrepared={onPrepared} />;
}
