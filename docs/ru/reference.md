# Публичный API

[← Руководства](../README.md) · [English](../en/reference.md) · [Интеграция](integration.md)

React-компоненты и переэкспортированные client/types импортируются из `@59alex/video-streams-react`; подготовка, профили и transport types — из `@59alex/video-streams`. Один раз подключите `@59alex/video-streams-react/styles.css`: он включает stylesheet FileAttachment через CSS import. Директива `use client` сохранена; импорт и SSR не запускают browser API.

## VideoStreamPlayerProps

| Параметр | Тип / default | Назначение |
|---|---|---|
| `playlistUrl` | обязательная string | Разрешённый immutable fMP4 HLS VOD media playlist. Относительный URL разрешается от документа. |
| `scope` | обязательная непустая string | Аккаунт/область доступа. Меняйте сразу, чтобы завершить старую сессию. |
| `client` | `VideoStreams`, default same-origin | Стабильный или memoized transport/config. Смена identity клиента пересоздаёт сессию. |
| `preload` | `'preview'` (default) / `'none'` | Короткое начало либо только плейлист до Play. |
| `poster` | optional string | Стандартный poster видео; доступ/кэширование контролирует приложение. |
| `title` | optional string | Доступная подпись video. Default «Видеовложение», с локализацией. |
| `language` | `'en'` (default) / `'ru'` | Подписи пакета. Native controls переводит браузер. |
| `muted` | optional boolean | Стандартное свойство muted, без autoplay. |
| `className` | optional string | CSS-класс окружающей секции. |
| `children` | `ReactNode` | Стандартные `<track>` для субтитров приложения. |
| `onState` | `(VideoState) => void` | Состояние, время и progress. Не меняйте авторизацию из отложенного playback state. |

Native controls управляют просмотром, паузой и перемоткой. Дополнительная кнопка освобождает загрузку, повтор создаёт новую сессию. Запросы и media ownership освобождаются при unmount, смене scope/URL/client и переподключении эффекта.

## VideoAttachmentProps

Наследует [`FileAttachmentProps`](https://github.com/dlorian59/file-streams-react/blob/main/docs/0.1.0/reference.ru.md), кроме `accept` и `onCommitted`. Сохраняет progress, проверку commit и unknown outcome из file-streams.

| Параметр | Тип / default | Назначение |
|---|---|---|
| `objectKey`, `scope` | обязательные strings | Новое вложение и владелец; сервер сверяет тот же key. |
| `objectsUrl` | string, inherited `/objects` | В парном примере — `/api/video-sources`. |
| `prepareUrl` | optional string | Готовая POST-интеграция. Нужна, если нет `prepare` или `existingVideo`. |
| `prepare` | `(UploadCommit, AbortSignal) => Promise<PreparedVideo>` | Альтернатива для SDK приложения; доверенный типизированный результат. Нельзя вместе с `prepareUrl`. |
| `preparationTimeoutMs` | number, default `190000` | Deadline клиента (1–3660000). Увеличьте при изменении трёхминутного server deadline. Сервер этим не настраивается. |
| `existingVideo` | `PreparedVideo` | Ранее разрешённая готовая ссылка, без новой загрузки/подготовки. |
| `onPrepared` | `(PreparedVideo) => void` | Метаданные готового видео; сохранение делает приложение. |
| `onPreparationError` | `(Error) => void` | Ошибка подготовки без автоматического повтора. |
| `profile` | `FileProfile`, default `'media'` | Исходник до 512 MiB. `maxBytes` переопределяет; согласуйте с сервером. |
| `existingFile` | `UploadCommit` | Сохранённый оригинал; key должен совпадать с objectKey. |
| `headers`, `credentials`, `fetch` | inherited transport | Общие для upload, подготовки и просмотра. Равные static headers не перезапускают playback при parent rerender. Credentials по умолчанию same-origin. |
| `language`, `fileName`, `destination`, `disabled`, `className`, `onComplete`, `reconcileUpload` | inherited | Поведение файлового UI и sink; сигнатуры в справочнике file-streams-react. |

Picker предлагает `.mp4,.mov,.webm,.mkv`, но не проверяет содержимое. Подтверждённая загрузка блокирует замену исходника в этом компоненте. Для нового исходника нужен новый objectKey. Отмена подготовки прекращает ожидание, оставляя серверный результат неизвестным, и не удаляет исходник. Смена existingVideo/scope/identity пересоздаёт UI.

## Browser client и подготовка

`createVideoStreams(options?) → VideoStreams`. Options: `profile: 'preview'|'playback'`; `headers: HeadersInit | (VideoRequestContext) => HeadersInit | Promise<HeadersInit>`; `credentials: RequestCredentials`; `fetch: typeof fetch`; `allowedOrigins: readonly string[]`.

Header context содержит `url`, `method` (`GET`/`POST`), `signal`, `scope` (string/undefined). Свой fetch должен сохранять ограничения signal, redirect и авторизации. Ожидание headers/fetch/body прерывается даже при зависшем promise, но JavaScript не может принудительно остановить чужую работу, игнорирующую отмену.

`client.attach(video, {playlistUrl,scope,preload?,signal?,onState?}) → VideoSession`:

| Метод | Результат |
|---|---|
| `getState()` | Текущий immutable `VideoState`. |
| `subscribe(listener)` | Сразу передаёт state и возвращает unsubscribe. После disposal не регистрирует listener. |
| `play()` | Вызывает video.play, возвращает Promise; autoplay policy браузера может отказать. |
| `pause()` | Ставит видео и дальнейшую буферизацию на паузу. Уже запрошенный фрагмент может завершиться. |
| `seek(seconds)` | Задаёт currentTime; число конечное и неотрицательное. |
| `dispose()` | Идемпотентная отмена/cleanup; play/seek после неё отклоняются. |

`prepareVideo({prepareUrl,sourceKey,scope?,signal?,timeoutMs?,headers?,credentials?,fetch?,allowedOrigins?}) → Promise<PreparedVideo>`. Один JSON POST ожидает HTTP 201. `preparationDefaults.timeoutMs` — 190000. Проверяются origin URL, размер ответа до 16 KiB, UUID generation, положительная конечная duration и положительный safe integer segmentCount. Относительный playlist URL разрешается от prepare endpoint.

`validatePreparedVideo(value, baseUrl, allowedOriginsSet)` открывает ту же проверку для адаптеров. `VideoPreparationError.outcome` — `'rejected'` для определённых отказов (400/401/403/404/413/415/422/429), иначе `'unknown'`. Некорректный/потерянный body 201, 408, abort, timeout и сеть дают unknown; POST не повторяется.

`PreparedVideo`: `status:'ready'`, `generation:string`, `playlistUrl:string`, `durationSeconds:number`, `segmentCount:number`.

## Состояния и границы

`VideoState`: `phase`, `currentTime`, `duration`, `bufferedSeconds`, `receivedBytes`, `loadedSegments`, optional `error:Error`. Возможные phase: loading, ready, playing, paused, buffering, ended, error, disposed. Готовность определяется media events; byte progress не подтверждает storage commit или будущую плавность просмотра. loadedSegments считает разные URL буферизированных фрагментов этой сессии, а не весь размер видео.

`videoProfiles.preview`: preview4s / forward12s / back8s. `videoProfiles.playback`: preview4s / forward24s / back12s. Один сегмент ограничен 16 MiB, плейлист — 1 MiB. Окно буфера целевое, возможен overshoot из-за фрагментов/браузера. Нет полного кэша и native HLS fallback. Зашифрованные/non-VOD/non-fMP4 плейлисты отклоняются; ABR/DRM не заявлены.

Fatal playback error останавливает загрузку и становится state error. Автоматических network retries нет. Повтор просмотра — GET, а не повтор подготовки. Между сессиями не переиспользуется authorization cache: общего сегментного кэша в V1 нет.
