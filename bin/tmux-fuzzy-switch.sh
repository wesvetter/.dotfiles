#!/usr/bin/env bash
# List all tmux windows across sessions and pipe to fzf
selection=$(tmux list-windows -a -F "#{session_name}:#{window_index} #{window_name}" \
            | fzf --prompt="Tmux Windows> ")

# If the user selected a window, extract its target (session:window_index) and switch
if [ -n "$selection" ]; then
  target=$(printf '%s' "$selection" | cut -d' ' -f1)
  tmux switch-client -t "$target"
fi
