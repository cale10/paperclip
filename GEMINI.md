# GEMINI.md

Guidance and operating runbook for Gemini & Antigravity agents in this repository.

## Local Fork & Upstream Sync Architecture

This Paperclip instance maintains custom Antigravity, Hermes, and B2B skills integrations while tracking official Paperclip releases from upstream.

### Branch & Remote Roles
- **`upstream`**: `https://github.com/paperclipai/paperclip.git` (official public repository)
- **`origin`**: `git@github.com:cale10/paperclip.git` (personal GitHub repository)
- **`master`**: Clean public upstream tracking branch. Never commit custom modifications directly to `master`.
- **`custom/antigravity-integration`**: Dedicated custom integration branch containing:
  - Antigravity OpenAI bridge daemon (`scripts/antigravity-openai-bridge.mjs`, run via `pnpm run bridge:antigravity`).
  - Keyless model routing (Claude Sonnet 5.5 High primary with Gemini 3.8 Flash Medium fallback).
  - Hermes agent adapter fixes for local keyless OpenAI endpoints (`packages/adapters/hermes/`).
  - Gemini local adapter Windows/local runtime fixes (`packages/adapters/gemini-local/`).
  - B2B catalog skills in `skills/b2b-*/` (`b2b-deliverable-auditor`, `b2b-deliverables-pipeline`, `b2b-founder-interview-protocol`, `b2b-handbook-evaluator`).
  - Windows run scripts (`start-paperclip.ps1`, `start-paperclip.bat`, `start_tunnel.bat`, etc.).

---

## Operating Procedures

### Updating from Public Upstream (Never Redo Work)
When official Paperclip releases updates:

```sh
# 1. Fetch latest public changes from official Paperclip
git checkout master
git pull upstream master

# 2. Merge upstream updates into the custom branch
git checkout custom/antigravity-integration
git merge master

# 3. Reinstall & verify build
pnpm install
pnpm -r typecheck

# 4. Push updated custom branch to personal repo
git push origin custom/antigravity-integration
```

### Initial Push to Personal Remote
```sh
git remote add origin git@github.com:cale10/paperclip.git
git push -u origin custom/antigravity-integration
git push -u origin master
```

---

## Local Services Architecture

- **Antigravity OpenAI Bridge**: Listens on `http://127.0.0.1:8000/v1` (daemon). Run with `pnpm run bridge:antigravity`.
- **Paperclip Server**: Runs on `http://127.0.0.1:3100` (Postgres on 54329). Start via `powershell -File start-paperclip.ps1` or `pnpm dev`.
- **Hermes Agent**: Configured via `~/.hermes/config.yaml` with `provider: custom` and `base_url: http://127.0.0.1:8000/v1`.
