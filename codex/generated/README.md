# Generated Codex artifacts

Claude remains the source of truth. These files are derived by `scripts/sync-claude-to-codex.mjs`.

Generated files:
- `codex/generated/skills/commit-message/SKILL.md`
- `codex/generated/skills/deslop/SKILL.md`
- `codex/generated/skills/local-reminder/SKILL.md`

Portable layout:
- `claude/CLAUDE.md` is the canonical instruction file, and repo-root `AGENTS.md` should symlink to it for Codex.
- `claude/skills/**` remains the source of truth for portable custom skills.

Install flow:
1. Run `./scripts/install-codex-config.sh` to symlink generated skills into `~/.agents/skills/`.
2. For this repo and any other repo that should inherit this guidance, symlink `AGENTS.md` to `claude/CLAUDE.md`.
3. `./scripts/link-codex-agents.sh /path/to/repo` creates that symlink for another repo.

