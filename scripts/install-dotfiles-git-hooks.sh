#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

git -C "${DOTFILES_DIR}" config core.hooksPath .githooks
chmod +x "${DOTFILES_DIR}/.githooks/pre-push"

echo "Configured repo-local Git hooks for ${DOTFILES_DIR}"
echo "core.hooksPath=.githooks"
