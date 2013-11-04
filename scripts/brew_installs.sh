#!/bin/bash

# Installs homebrew and some common utilities
# TODO: figure out how to skip homebrew install and just install packages
# (for updating)

# install homebrew
echo "Installing homebrew..."
ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go)"
echo "Finished installing homebrew."

# TODO: should probably do some brew doctor check before proceeding

packages="ack hub mysql qt tmux tree wget"
#mongodb postgres

for package in $packages; do
  brew install $package
done

echo "Finished installing basic brew packaages."
