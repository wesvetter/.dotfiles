#!/bin/bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y \
  git \
  vim \
  tmux \
  zsh \
  fzf \
  ack \
  jq \
  tree \
  wget \
  hub \
  xsel \
  pgformatter
