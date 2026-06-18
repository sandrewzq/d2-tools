# d2-service

Windows local Destiny 2 assistant.

## Development

```powershell
npx pnpm@9.15.0 install
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 --filter @d2-service/desktop build
```

## Run The GUI In Development

Terminal 1:

```powershell
npx pnpm@9.15.0 --filter @d2-service/desktop dev
```

Terminal 2:

```powershell
npx pnpm@9.15.0 --filter @d2-service/desktop build
npx pnpm@9.15.0 --filter @d2-service/desktop dev:electron
```

## Build The Windows Green Package

```powershell
npx pnpm@9.15.0 package:win
```

The ZIP artifact is written to:

```text
packages/desktop/release/d2-service-win-x64-0.1.0.zip
```

Unzip it and run `d2-service.exe`.

## User Data

Runtime data is stored under `%APPDATA%\d2-service`.

Do not commit `.env`, `config.json`, token files, SQLite databases, logs, or packaged release artifacts.
