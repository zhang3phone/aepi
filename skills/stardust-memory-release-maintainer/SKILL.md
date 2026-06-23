---
name: stardust-memory-release-maintainer
description: Maintain, release, back up, open-source, and GitHub-publish the Stardust Memory / AEPI03 image workstation safely. Use when Codex is asked to update versions, prepare releases, audit secrets before publishing, configure GitHub remotes/SSH, push to GitHub, migrate the project to another Windows PC, or modify the local startup/API proxy workflow.
---

# Stardust Memory Release Maintainer

## Core Role

Act as the release and safety maintainer for the Stardust Memory / AEPI03 image workstation.

Prioritize:

1. Do not expose secrets.
2. Preserve local runtime state unless explicitly asked to delete it.
3. Keep releases reproducible: version files, changelog, build, tests, backup, commit, push.
4. Prefer project scripts and existing conventions over new tooling.

## Project Signals

Use this skill when working in a repository that contains most of:

- `package.json` with the Stardust/Amazon image studio frontend.
- `scripts/local-api-proxy.mjs`.
- `src/changelog.ts`.
- Windows BAT launchers such as `start-stardust-memory.bat`.
- Local runtime files such as `.env.local`, `.duncan-generation-stats.json`, or `.duncan-shared-style-references.json`.

If the user asks for GitHub/open-source handling, read `references/github-release.md`.

If the user asks for product/version/startup/API behavior, read `references/project-rules.md`.

If the user asks for version fixes, new requirements, login, platform API, local proxy changes, startup scripts, database/NAS work, or says that new work must not break previous versions, read `docs/change-control.md` from the repository before planning or editing.

## Release Workflow

For a normal version update:

1. Inspect worktree status first:
   - `git status --short --branch`
   - Read changed files before editing if unrelated changes exist.
2. Bump version with npm, usually patch version:
   - `cmd.exe /c npm version X.Y.Z --no-git-tag-version`
3. Update `src/changelog.ts`:
   - Add a top entry.
   - Keep user-facing changes concise.
   - Mention security/open-source or startup/API changes when relevant.
4. Validate:
   - `cmd.exe /c npm run build`
   - Run targeted tests, at minimum `cmd.exe /c npm test -- src\lib\listingPlanner.test.ts` when planner behavior changed.
5. Create backup when doing a release:
   - `cmd.exe /c npm run backup:version`
   - Backup writes outside the repo; request escalation if needed.
6. Commit and push:
   - Commit only intended release files.
   - Use existing SSH config or `core.sshCommand` if already configured.

Do not tag unless the user explicitly asks.

## Open-Source Safety Checklist

Before making a public commit or push:

- Confirm `.env.local` is ignored and not tracked.
- Confirm logs, pid files, `node_modules/`, `dist/`, runtime stats, and local Codex files are ignored.
- Avoid publishing local-only instructions such as `AGENTS.md`, `.agents/`, and private `skills/` unless the user explicitly wants to distribute them.
- Scan for common secret patterns without printing secret values.
- Remove or replace unlicensed brand/IP images before public release.
- Prefer a fresh Git history if there is any chance old commits contained secrets.

Never paste API keys, private keys, database passwords, or `.env.local` contents into the conversation.

## GitHub Push Rules

Use HTTPS with Git Credential Manager or SSH with a dedicated key. For this project, SSH is preferred once configured.

If SSH is configured with a dedicated key, set local repo config:

```powershell
git config core.sshCommand "ssh -i C:/Users/Administrator/.ssh/aepi_github_ed25519 -o IdentitiesOnly=yes"
```

Confirm push success with:

```powershell
git status --short --branch
git log --oneline -2
git ls-remote origin refs/heads/main
```

If ordinary sandbox permissions cannot read the SSH key, request escalation rather than changing key permissions.

## Local Runtime Rules

Treat these as local user data, not source:

- `.env.local`
- `dev-proxy.config.json`
- `.duncan-generation-stats.json`
- `.duncan-shared-style-references.json`
- `*.log`
- `*.pid`
- `dist/`
- `node_modules/`

Ignoring them in Git is safe; deleting them changes the local system and needs a reason.

## Communication Style

When working for another user:

- Explain what is being protected before destructive or publish actions.
- State exactly what was committed, backed up, and pushed.
- Give the final GitHub URL, commit hash, version number, and backup path when available.
- If a GitHub authentication step requires the user, give only the next concrete action.

