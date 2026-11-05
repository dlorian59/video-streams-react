# Public API

[← Guides](../README.md) · [Русский](../ru/reference.md) · [Integration](integration.md)

Import React components and re-exported client/types from `@59alex/video-streams-react`; import lower-level preparation, profiles and transport types from `@59alex/video-streams`. Import `@59alex/video-streams-react/styles.css` once. Its FileAttachment stylesheet dependency is included through CSS import. The package's `use client` directive is preserved; no browser APIs run during import or server rendering.

## VideoStreamPlayerProps

| Prop | Type / default | Meaning |
|---|---|---|
| `playlistUrl` | required string | Authorized, immutable fMP4 HLS VOD media playlist. Relative URLs resolve against the document. |
| `scope` | required nonempty string | Account/authorization identity. Change immediately to invalidate the old session. |
| `client` | `VideoStreams`, default same-origin client | Stable or memoized transport/configuration. Changing client identity restarts the owned session. |
| `preload` | `'preview'` (default) or `'none'` | Short initial media window, or only manifest until play. |
| `poster` | optional string | Standard video poster URL; your app controls its authorization/caching. |
| `title` | optional string | Accessible video label. Default “Video attachment”, localized. |
| `language` | `'en'` (default) / `'ru'` | Package UI labels. Native video control labels follow the browser. |
| `muted` | optional boolean | Standard video muted property. No autoplay is requested. |
| `className` | optional string | Added to the surrounding section. |
| `children` | `ReactNode` | Standard `<track>` children for app-provided captions. |
| `onState` | `(VideoState) => void` | Observable lifecycle/time/progress. Do not mutate authorization from delayed playback state. |

Native controls manage play/pause/seek; the additional button disposes loading. Retry creates a new playback session after failure/stop. All request and media ownership is released on unmount, scope/URL/client change or effect reconnect.

## VideoAttachmentProps

Inherits [`FileAttachmentProps`](https://github.com/dlorian59/file-streams-react/blob/main/docs/0.1.0/reference.en.md) except `accept` and `onCommitted`. File uploads retain file-streams' existing progress, commit validation and unknown-outcome behavior.

| Prop | Type / default | Meaning |
|---|---|---|
| `objectKey`, `scope` | required strings | One new application attachment and its owner; server checks the same key. |
| `objectsUrl` | string, inherited `/objects` | Use `/api/video-sources` with the paired server example. |
| `prepareUrl` | optional string | POST ready integration. Required unless `prepare` or `existingVideo` is supplied. |
| `prepare` | `(UploadCommit, AbortSignal) => Promise<PreparedVideo>` | Advanced application SDK alternative; trusted typed result. Mutually exclusive with `prepareUrl`. |
| `preparationTimeoutMs` | number, default `190000` | Client prepare deadline (1–3660000). Increase when the server's default three-minute deadline is customized. Does not configure the server. |
| `existingVideo` | `PreparedVideo` | An already authorized ready reference. Opens playback without another upload/preparation. |
| `onPrepared` | `(PreparedVideo) => void` | Ready metadata; application persistence is separate. |
| `onPreparationError` | `(Error) => void` | Preparation failure; no automatic retry. |
| `profile` | `FileProfile`, default `'media'` | 512 MiB source cap. Inherited `maxBytes` can override it; align with server limits. |
| `existingFile` | `UploadCommit` | Metadata for an already stored original; matching objectKey required by FileAttachment. |
| `headers`, `credentials`, `fetch` | inherited transport | Applies to upload, preparation and playback. Equal static header values do not restart playback on parent rerender. Default credentials are same-origin. |
| `language`, `fileName`, `destination`, `disabled`, `className`, `onComplete`, `reconcileUpload` | inherited | File UI/sink behavior. See file-streams-react reference for signatures. |

The picker suggests `.mp4,.mov,.webm,.mkv`; this is not content validation. Source upload success locks replacement in this component. Use a new objectKey for a new source. Cancelling preparation means cancellation of waiting with an unknown server outcome; it does not erase the uploaded source. `existingVideo`/scope/object identity changes remount the owned UI.

## Browser client and preparation

`createVideoStreams(options?) → VideoStreams`. Options: `profile: 'preview'|'playback'`; `headers: HeadersInit | (VideoRequestContext) => HeadersInit | Promise<HeadersInit>`; `credentials: RequestCredentials`; `fetch: typeof fetch`; `allowedOrigins: readonly string[]`.

Header context contains `url`, `method` (`GET` or `POST`), `signal`, and `scope` (string or undefined). Your custom fetch must preserve signal, redirect and authorization boundaries. Header/fetch/body waits are interruptible even if a custom promise never settles; underlying uncooperative application work cannot be forcibly stopped by JavaScript.

`client.attach(video, {playlistUrl,scope,preload?,signal?,onState?}) → VideoSession`. Methods:

| Method | Result |
|---|---|
| `getState()` | Current immutable `VideoState`. |
| `subscribe(listener)` | Immediately delivers state; returns unsubscribe. No registration after disposal. |
| `play()` | Calls HTML video play and returns its Promise; browser autoplay policy may reject it. |
| `pause()` | Pauses media and future buffering. An already in-flight fragment may finish. |
| `seek(seconds)` | Sets currentTime; finite nonnegative input required. |
| `dispose()` | Idempotent abort/disposal; subsequent play/seek reject. |

`prepareVideo({prepareUrl,sourceKey,scope?,signal?,timeoutMs?,headers?,credentials?,fetch?,allowedOrigins?}) → Promise<PreparedVideo>`. One JSON POST waits for HTTP 201. `preparationDefaults.timeoutMs` is 190000. URL scope, response size (16 KiB), UUID generation, positive finite duration and safe positive segmentCount are validated. Relative playlist URLs resolve against the prepare endpoint.

`validatePreparedVideo(value, baseUrl, allowedOriginsSet)` exposes the same response validation for adapters. `VideoPreparationError.outcome` is `'rejected'` for selected definitive request statuses (400/401/403/404/413/415/422/429), otherwise `'unknown'`. An invalid/lost 201 body, 408, abort, timeout and network failure are unknown; there is no POST retry.

`PreparedVideo` fields: `status:'ready'`, `generation:string`, `playlistUrl:string`, `durationSeconds:number`, `segmentCount:number`.

## State and limits

`VideoState`: `phase`, `currentTime`, `duration`, `bufferedSeconds`, `receivedBytes`, `loadedSegments`, optional `error:Error`. `phase` is loading, ready, playing, paused, buffering, ended, error or disposed. Readiness follows media events; downloaded byte progress is not a storage commit or proof of smooth future playback. `loadedSegments` counts distinct fragment URLs observed buffered in this session, not the total rendition size.

`videoProfiles.preview`: preview4s / forward12s / back8s. `videoProfiles.playback`: preview4s / forward24s / back12s. Both cap one segment response at 16 MiB; playlists at 1 MiB. Buffer windows are targets and may exceed them by fragment/browser behavior. No full-file cache or native HLS fallback exists. The wrapper rejects encrypted/non-VOD/non-fMP4 playlists and does not advertise ABR or DRM.

Playback fatal errors stop loading and become state errors. No automatic network retries are configured. Retry playback is safe GET replay, distinct from repeating preparation. Separate browser lifetimes never reuse an authorization cache because V1 has no shared segment cache.
