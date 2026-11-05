# Versions / Версии

[← Guide / Руководство](../README.md) · [← README](../../README.md)

| Version | Runtime | Added |
|---|---|---|
| 0.1.0 | React 18.3+ / 19, modern browser with compatible MSE codecs | VideoStreamPlayer, VideoAttachment, request-scoped HLS transport, upload → prepare → watch |

0.1.0 is source-only, not an npm release. React 19 uses the same compatible API; no Actions/useOptimistic dependency is introduced because preparation success must follow a confirmed server result. The public entry preserves `use client` for Next.js. Server rendering produces markup; media work begins after mounting.

0.1.0 пока доступна как исходники, не npm-релиз. React 19 использует тот же API: Actions/useOptimistic не добавлены, поскольку готовность видео требует подтверждённого ответа. Директива `use client` сохранена для Next.js. SSR создаёт разметку, работа с видео начинается после mount.
