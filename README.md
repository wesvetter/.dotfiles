# Dotfiles

These are my "dotfiles" (configuration files that typically start with `.` and
often end with `rc`). They are roughly grouped by domain.

Configuration for setting up a new MacBook Pro can be found in `SETUP.md`.

Claude remains the source of truth for portable agent guidance. Run
`./scripts/sync-claude-to-codex.mjs` to derive Codex artifacts, then
`./scripts/install-codex-config.sh` to symlink the generated Codex skills into
`~/.codex/skills/`. Repo-root `AGENTS.md` should symlink to
`claude/CLAUDE.md`.
