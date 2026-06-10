# Dotfiles

These are my "dotfiles" (configuration files that typically start with `.` and
often end with `rc`). They are roughly grouped by domain.

Configuration for setting up a new MacBook Pro can be found in `SETUP.md`.

## AI Agents

Claude remains the source of truth for portable agent guidance. Run
`./scripts/sync-claude-to-codex.mjs` to derive Codex artifacts, then
`./scripts/install-codex-config.sh` to symlink the generated Codex skills into
`~/.agents/skills/`. Repo-root `AGENTS.md` should symlink to
`claude/CLAUDE.md`.

Run `./scripts/install-dotfiles-git-hooks.sh` in this repo to enable the
repo-local `.githooks/pre-push` hook. That hook blocks pushes when commits in
the push change `claude/skills/**` but the committed Codex-generated skill
files are stale.
