#!/usr/bin/env bash
#
# tmux-send-all-windows.sh
#
# Usage:
#   ./tmux-send-all-windows.sh <tmux-window> <command>
# 
# Example:
#   ./tmux-send-all-windows.sh local-dev "echo 'hi there'"
#

# Must have at least a window name and a command
if [ $# -lt 2 ]; then
  echo "Usage: $0 <window_name> <command>"
  exit 1
fi

window_name="$1"
shift
cmd="$*"

# Join all positional parameters into one string
cmd="$*"

# List every window in every session (format: session:window_name)
tmux list-windows -a -F "#{session_name}:#{window_name}" | while read -r target; do
  # If the window name isn't the provided name, skip
  if [[ "$target" != *"$1"* ]]; then
    continue
  fi

  # Send the command followed by Enter (C-m) to that window
  tmux send-keys -t "$target" "$cmd" C-m
done
