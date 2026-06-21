# GitHub Release and Open-Source Workflow

## Clean Public Repository

When preparing a public GitHub repository:

1. Audit ignore rules.
2. Scan for secrets.
3. Remove unlicensed assets.
4. Prefer a new Git history if old commits may contain secrets.
5. Commit a clean initial state.
6. Push to a new empty GitHub repository.

## Suggested Ignore Rules

Ensure these are ignored:

```gitignore
.env
.env.*
!.env.example
!.env.local.example
dev-proxy.config.json
.duncan-generation-stats.json
.duncan-shared-style-references.json
*.pid
*.log
node_modules/
dist/
AGENTS.md
.agents/
skills/
backup-manifest.json
```

Only unignore `skills/` when the user explicitly wants to publish a skill package.

## Secret Scan Patterns

Search for common high-risk patterns without printing actual secret values in the final answer:

```powershell
rg -l --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' "(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY|POSTGRES_PASSWORD\s*=|OPENAI_API_KEY\s*=\s*[^\s<]|DEEPSEEK_API_KEY\s*=\s*[^\s<])" .
```

If a real secret was ever committed, do not simply delete it in a new commit. Rotate the secret and rebuild history or start a fresh repository.

## SSH Setup

Generate a dedicated key:

```powershell
cmd.exe /c "if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh" & if not exist "%USERPROFILE%\.ssh\aepi_github_ed25519" ssh-keygen -t ed25519 -C "noreply@amz945.com" -f "%USERPROFILE%\.ssh\aepi_github_ed25519" -N """
```

Copy public key:

```powershell
cmd.exe /c type "%USERPROFILE%\.ssh\aepi_github_ed25519.pub" | clip
```

GitHub page:

```text
https://github.com/settings/keys
```

Add it as `Authentication Key`, not `Signing key`.

Test:

```powershell
ssh -i "C:\Users\Administrator\.ssh\aepi_github_ed25519" -o IdentitiesOnly=yes -T git@github.com
```

Expected success includes:

```text
Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.
```

## Push Existing Repository

```powershell
git remote add origin git@github.com:<owner>/<repo>.git
git branch -M main
git config core.sshCommand "ssh -i C:/Users/Administrator/.ssh/aepi_github_ed25519 -o IdentitiesOnly=yes"
git push -u origin main
```

If remote already exists:

```powershell
git remote set-url origin git@github.com:<owner>/<repo>.git
git push
```

## Final Report

Report:

- GitHub URL
- branch
- commit hash
- version number if changed
- build/test result
- backup path if generated
