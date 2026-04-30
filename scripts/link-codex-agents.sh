#!/usr/bin/env bash

set -euo pipefail

if [ "${#}" -ne 1 ]; then
  echo "Usage: $0 /path/to/repo" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_AGENTS="${DOTFILES_DIR}/claude/CLAUDE.md"
TARGET_REPO="${1}"
TARGET_AGENTS="${TARGET_REPO}/AGENTS.md"

if [ ! -d "${TARGET_REPO}" ]; then
  echo "Not a directory: ${TARGET_REPO}" >&2
  exit 1
fi

if git -C "${TARGET_REPO}" rev-parse --show-toplevel >/dev/null 2>&1; then
  TARGET_REPO="$(git -C "${TARGET_REPO}" rev-parse --show-toplevel)"
  TARGET_AGENTS="${TARGET_REPO}/AGENTS.md"
fi

if [ -e "${TARGET_AGENTS}" ] && [ ! -L "${TARGET_AGENTS}" ]; then
  echo "Refusing to replace existing non-symlink file: ${TARGET_AGENTS}" >&2
  exit 1
fi

ln -sfn "${SOURCE_AGENTS}" "${TARGET_AGENTS}"
echo "Linked ${TARGET_AGENTS} -> ${SOURCE_AGENTS}"
