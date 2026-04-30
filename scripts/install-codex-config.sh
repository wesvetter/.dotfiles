#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CODEX_HOME="${HOME}/.codex"
GENERATED_SKILLS_DIR="${DOTFILES_DIR}/codex/generated/skills"

"${DOTFILES_DIR}/scripts/sync-claude-to-codex.mjs"

mkdir -p "${CODEX_HOME}/skills"

if [ -d "${GENERATED_SKILLS_DIR}" ]; then
  for skill_path in "${GENERATED_SKILLS_DIR}"/*; do
    [ -d "${skill_path}" ] || continue
    skill_name="$(basename "${skill_path}")"
    ln -sfn "${skill_path}" "${CODEX_HOME}/skills/${skill_name}"
    echo "Linked ${CODEX_HOME}/skills/${skill_name} -> ${skill_path}"
  done
fi

echo "Codex install complete"
echo "Use ${DOTFILES_DIR}/scripts/link-codex-agents.sh /path/to/repo to symlink AGENTS.md to claude/CLAUDE.md in other repos."
