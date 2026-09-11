#!/usr/bin/env bash

set -euo pipefail

# Cursor user rules must be .mdc with alwaysApply frontmatter. A raw symlink of
# CLAUDE.md would be treated as a manual @-mention rule, so this writes a thin
# wrapper that always applies and pulls in the live Claude file.

CLAUDE_MD="${HOME}/.claude/CLAUDE.md"
TARGET_DIR="${HOME}/.cursor/rules"
TARGET="${TARGET_DIR}/agents.mdc"

if [ ! -e "${CLAUDE_MD}" ]; then
  echo "Missing ${CLAUDE_MD}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

cat > "${TARGET}" <<EOF
---
alwaysApply: true
description: Global house rules from ~/.claude/CLAUDE.md
---

@${CLAUDE_MD}
EOF

echo "Wrote ${TARGET} (always-on wrapper for ${CLAUDE_MD})"
echo "Cursor install complete. Start a new Agent chat for the rule to load."
