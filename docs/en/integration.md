# Video attachment in an existing Spring + React application

[← Guides](../README.md) · [Русский](../ru/integration.md) · [API](reference.md)

A customer attaches a video to a support ticket. The browser streams the original file to storage, the server prepares seekable HLS segments, and the player retrieves the beginning before the customer presses Play. Your application owns the ticket, login and permission to read the attachment.

## Project structure

```text
server/
  build.gradle.kts
  src/main/resources/application.yml
  src/main/java/.../VideoController.java
ui/
  package.json
  src/VideoMessage.tsx
```

Use the [complete secured Spring consumer](https://github.com/dlorian59/video-streams-spring-boot-starter/tree/main/examples/secured-video) for the matching dependency, configuration and controller. Its opt-in application routes are not automatically exposed by the starter. Java 17 is the baseline; FFmpeg and ffprobe are external executables.

The UI dependencies are listed in the [README](../../README.md). Import the stylesheet once. The [complete VideoMessage component](../../examples/spring-react/VideoMessage.tsx) contains every import and bilingual comments:

```tsx
const key = `${account.id}:${attachmentId}`;
<VideoAttachment
  scope={account.id}
  objectKey={key}
  objectsUrl="/api/video-sources"
  prepareUrl={`/api/videos/${encodeURIComponent(key)}/prepare`}
  headers={{ [account.csrfHeader]: account.csrfToken }}
  onPrepared={saveVideoReference}
/>;
```

The `account.id` prefix is checked against the server's authenticated Principal. A client-supplied prefix never grants access. `attachmentId` stays stable throughout this upload; use a new identifier for a new source. Change `scope` immediately when the authenticated account changes, without transitions or deferred updates.

## What happens on the wire

| Stage | Request | Confirmed result |
|---|---|---|
| Source upload | Raw `PUT /api/video-sources/{encodedKey}`, `X-Upload-Length` | `201 {committed:true,key,bytes,etag}`; file-streams validates the commit. |
| Preparation | `POST /api/videos/{encodedKey}/prepare`, JSON `{sourceKey:key}` | One request waits for `201 {status:"ready",generation,playlistUrl,durationSeconds,segmentCount}`. |
| Playback | Authenticated GET of the playlist and relative init/segment URLs | hls.js appends fragments to the media element; later segments follow playback or seeking. |

A successful source PUT does not mean the video is ready. Preparation reads the committed source through file-streams, runs FFmpeg, publishes immutable media artifacts, then publishes the final playlist. There is no invented 202 queue, polling or job database in V1. Integrate the same server service into your own durable job system when required.

The frontend and backend should share an origin, typically through your existing reverse proxy. Session cookies are sent with `same-origin` credentials, and unsafe PUT/POST requests carry the application's CSRF header. Every asset GET is authorized too. Cross-origin deployments need an explicitly configured client, CORS and compatible credentials; no bearer token is added to playlist URLs.

## Supported sources and limits

The default picker suggests MP4/MOV/WebM/Matroska. Its `accept` value is a selection hint, not content validation; the server validates and probes the source. The default attachment profile is `media` (512 MiB), matching the server's default input limit. Server deployment limits, disk capacity and FFmpeg availability must still be configured.

The HLS client accepts unencrypted fMP4 VOD media playlists. Default preview targets four seconds; playback targets twelve seconds ahead and eight behind. Responses are individually capped (1 MiB playlist, 16 MiB fragment), but these are not a hard process-memory limit. Unsupported MSE/codec or decode failure is shown explicitly; there is no full-file Blob fallback.

## Errors and recovery

- **Source upload fails:** file-streams retains its confirmed/unknown outcome. Unknown uploads require the application's existing `reconcileUpload` check before another source attempt.
- **Preparation is rejected:** selected definitive request rejection statuses allow an explicit Retry preparation button. No retry is automatic.
- **Preparation response is lost, timed out or cancelled:** the source remains committed. The prepared generation may exist; the component reports an unknown result and does not repeat the POST. A 408 is unknown too.
- **Application resolves an unknown outcome:** supply an authoritative `existingVideo` reference when known. The library has no job store and cannot reconstruct an unobserved generation by itself. Applications requiring durable recovery must save generation metadata on the server.
- **Playback GET/decode fails:** Retry playback creates a fresh owned session. It does not re-upload or re-prepare the video.

`onPrepared` delivers metadata to the application; it is not durable server persistence. `existingVideo` opens a previously authorized reference; `existingFile` can also describe the saved original. A completed `VideoAttachment` locks source replacement in that component; create a new attachment ID for another upload.

## Real recording and runnable example

[Run the two examples](../../CONTRIBUTING.md). The [player recording](components.md) exercises a genuine FFmpeg HLS clip against a local HTTP fixture. Its fixture labels are intentional: it proves decoding, preloading, seeking and lifecycle, not S3 durability. The full Spring example additionally demonstrates the upload/prepare boundary; use the evidence in CONTRIBUTING for the exact verified backend.
