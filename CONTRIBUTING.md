# Run and verify locally / Локальный запуск и проверка

[← README](README.md) · [Guides / Руководства](docs/README.md)

## Source artifacts / Исходные артефакты

The 0.1.0 family has not been published to npm. Place the public repositories beside one another. Use Node 24 (minimum 22.12), npm and FFmpeg/ffprobe on PATH. These are development commands, not application installation instructions.

Семейство 0.1.0 ещё не опубликовано в npm. Разместите публичные репозитории рядом. Нужны Node 24 (минимум 22.12), npm и FFmpeg/ffprobe в PATH. Ниже команды разработки, не инструкция подключения к приложению.

```text
repos/
  file-streams/browser/
  file-streams-react/
  video-streams/browser/
  video-streams-react/
```

From each indicated directory / Из указанного каталога:

```sh
# file-streams/browser
npm ci --ignore-scripts
npm run build
# file-streams-react
npm ci --ignore-scripts
npm run build
# video-streams/browser
npm ci --ignore-scripts
npm run build
# video-streams-react
npm ci --ignore-scripts
npm run typecheck
npm test
npm run test:package
```

The React repository's `.npmrc` uses `install-links=true`: local file dependencies are packed copies, so linked development React installations do not create two React runtimes. After editing the core, rebuild and refresh the local artifact before testing the React consumer. `test:package` checks actual tarballs against React 18 and 19. Published peer dependency ranges remain semver, never filesystem paths.

`.npmrc` React-репозитория задаёт `install-links=true`: локальные зависимости копируются как пакеты, чтобы не загружать два React из разных developer checkout. После правок core пересоберите и обновите локальный артефакт. `test:package` проверяет настоящие tarballs с React 18 и 19; публичные peer dependencies используют semver, не filesystem paths.

```sh
# video-streams-react, after rebuilding video-streams/browser
mkdir -p output/packages
npm pack ../video-streams/browser --ignore-scripts --pack-destination output/packages
npm install --no-save --package-lock=false --ignore-scripts ./output/packages/59alex-video-streams-0.1.0.tgz
```

## Standalone player / Отдельный плеер

```sh
npm run demo
# http://127.0.0.1:5182/ and /?lang=ru
npm run test:browser
```

Run the demo and browser recording separately: they share port 5182. The script generates a real synthetic 24-second H264/AAC clip using FFmpeg and serves authenticated-by-fixture-header HLS fragments. It is a bounded local HTTP demonstration, not production authentication or S3. The capture uses headless Chromium and writes GIF/PNG assets plus `output/playwright/results.json`. It does not open desktop windows. Chromium must already be installed for the Playwright version used; on a fresh development machine install the matching browser through Playwright's normal setup.

Демо и запись запускаются отдельно: оба используют порт 5182. Скрипт создаёт настоящее синтетическое H264/AAC-видео на 24 секунды и отдаёт HLS-фрагменты с тестовым header-доступом. Это локальная HTTP-демонстрация, не production auth и не S3. Headless Chromium записывает GIF/PNG и `output/playwright/results.json`, без окон рабочего стола. Нужен браузер соответствующей версии Playwright.

## Full Spring example / Полный Spring-пример

Start the [secured-video Spring consumer](https://github.com/dlorian59/video-streams-spring-boot-starter/tree/main/examples/secured-video) on HTTPS/HTTP2 `127.0.0.1:19445` with the documented test-only `demo` account, CSRF and real storage configuration. Its fixture preparation creates a temporary certificate and a 32-second source file. Do not commit certificates or credentials from real deployments.

Запустите [защищённый Spring consumer](https://github.com/dlorian59/video-streams-spring-boot-starter/tree/main/examples/secured-video) на HTTPS/HTTP2 `127.0.0.1:19445` с документированным тестовым аккаунтом `demo`, CSRF и настоящим storage. Его фикстура создаёт временный сертификат и 32-секундный исходник. Не добавляйте сертификаты/credentials реального deployment в Git.

```sh
export DEMO_TLS_CERT=/absolute/path/to/test-certificate.pem
export DEMO_TLS_KEY=/absolute/path/to/test-key.pem
export DEMO_VIDEO_SOURCE=/absolute/path/to/source-32s.mp4
npm run demo:spring
# https://127.0.0.1:5182/ and /?lang=ru
# Stop the manual frontend before running the recorder:
npm run capture:spring
```

The frontend's loopback-only HTTP/2 proxy streams PUT bytes to Spring and preserves same-origin session/CSRF behavior. It trusts the self-signed **local fixture** certificate; use your normal verified TLS reverse proxy in production. The full source is [spring-demo.mjs](scripts/spring-demo.mjs), [VideoMessage.tsx](examples/spring-react/VideoMessage.tsx) and [main.tsx](examples/spring-react/main.tsx). Recording script: [capture-spring.mjs](scripts/capture-spring.mjs).

HTTP/2 proxy только на loopback передаёт PUT потоком и сохраняет same-origin session/CSRF. Он доверяет самоподписанному сертификату **локальной фикстуры**; для production нужен обычный reverse proxy с проверкой TLS. Исходники: [spring-demo.mjs](scripts/spring-demo.mjs), [VideoMessage.tsx](examples/spring-react/VideoMessage.tsx), [main.tsx](examples/spring-react/main.tsx). Запись: [capture-spring.mjs](scripts/capture-spring.mjs).

## Verification

- Browser core: 5 focused tests covering response validation, unknown outcome, byte limits, hanging/custom cancellation, stale authorization and HLS range defaults.
- React: 2 focused tests covering StrictMode/account changes, stale preparation, explicit cancellation, SSR and mutually exclusive preparation options.
- TypeScript 7.0.2 checks components, executable examples and the core repository's complete browser helper.
- Packed consumers: React 18.3.1 and 19.3.1 render both components server-side, with LICENSE, declarations, stylesheet and `use client` present.
- Chromium 156.0.8078.4 / Playwright 1.64.1 / FFmpeg 6.1.1: real 24-second video, 3/12 segments initially, playback, seek18s, changed owner and stopped requests after unmount; zero page errors in EN and RU. GIF/PNG are actual recordings.
- Full Spring capture (EN/RU): real HTTPS/HTTP2 streamed upload of 7,374,595 bytes, source201 → FFmpeg prepare201 → 32-second HLS with 16 segments in Garage S3. Initial media requests3/16, actual playback, seek24s, no further requests after close, unauthenticated playlist401, zero page errors. Assets: `assets/visuals/attachment-spring-{en,ru}.gif/png`; reproducible machine evidence: `output/spring-capture/results.json`. This run used a clean-repackaged Spring JAR: nested core/WebFlux SHA256 values were checked against the final artifacts before startup. The clean-build rerun replaced the earlier recording, which had used a stale repackaged dependency.

Проверки выше отделяют unit/lifecycle, package consumers и настоящее декодирование. Полный S3-путь не выводится из отдельной HTTP-фикстуры. CI definitions included here are not a claim that GitHub Actions has already run. Java17/21/25 backend compatibility and server tests are documented in the server repositories.

[Checked-in standalone evidence](docs/evidence/player-browser.json) · [Checked-in Spring/S3 evidence](docs/evidence/spring-browser.json) · [Backend artifact hashes verified before this run](docs/evidence/packaged-artifacts.json).

Only regenerate assets when behavior or presentation changes. Do not commit `output`, `node_modules`, TLS files or generated fixture source video. All scripts stop only their owned frontend/browser; stop the independently started Spring/Garage fixture through its owner/runner.
