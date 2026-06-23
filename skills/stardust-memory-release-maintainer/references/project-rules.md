# Stardust Memory Project Rules

## Identity

The user-facing project name is `AEPI03-Stardust Memory`.

Use `Stardust Memory`, not `StarDustMemroy` or other misspellings.

The top/header subtitle should be consistent with the product copy, currently `多媒体处理工作站` unless the user changes it.

## Local Development

Typical repo path:

```text
D:\AEPI03STARDUSTMEMROY
```

Preferred commands on Windows:

```powershell
cmd.exe /c npm run build
cmd.exe /c npm test -- src\lib\listingPlanner.test.ts
cmd.exe /c npm run backup:version
```

Use `cmd.exe /c npm ...` because PowerShell execution policy can block npm scripts.

## Startup Scripts

Important project launchers:

- `start-stardust-memory.bat`
- `stop-stardust-memory.bat`
- `edit-stardust-memory-api-key.bat`

The frontend normally runs on `http://127.0.0.1:5173/`.

The local API proxy normally runs on `http://127.0.0.1:3100`.

When debugging generation statistics, check:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3100/__duncan/generation-stats"
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5173/api-proxy/__duncan/generation-stats"
```

## Version Backup

The project uses local version backups:

```text
D:\生图系统\版本备份
```

Backups must exclude:

- `.env.local`
- real keys
- logs
- pid files
- `node_modules`
- build cache
- Git internals

## Change Control

High-risk changes must follow `docs/change-control.md`.

This includes login, platform API, local API proxy, startup BAT, database, NAS, permission, and release-script work.

New high-risk features must be configurable or disabled by default, and must not break local startup, LAN access, existing image generation, AI prompt generation, or Listing/A+ planning when their external services are not configured.

## Listing Planner Rule

For Listing/A+ prompt planning, `适用人群` and `使用场景` are critical fields.

If source listing text does not include them, infer the most likely target audience and usage scenes from title, category, material, selling points, packaging, and benefits. Do not leave these fields as unknown.

Size chart, size guide, specification, and measurement images must stay size-only. Do not mix selling points, lifestyle scenes, benefit icons, product functions, feature callouts, or marketing slogans into those slots.

Small icon rows must deduplicate benefits. A selling point already shown in the headline, main panels, large callouts, or another icon must not be repeated again in the same image.

The clothing workspace may expose a `MODEL` white-background model main-image shortcut. Keep it scoped to the clothing workspace, output `1000x1000`, and do not make the generic workspace depend on clothing-specific rules.

`MODEL` reference images are composition references only: use pose, crop, and person position, but do not copy identity, face, hairstyle, tattoos, jewelry, bags, pants, shorts, or unrelated styling details.

## Open-Source Caveat

Avoid committing third-party character/product images or fandom assets unless the user confirms they have rights. Replace them with original or generated assets before public release.

