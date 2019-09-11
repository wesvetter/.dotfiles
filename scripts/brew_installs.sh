#!/bin/bash

# Requires homebrew to be installed first.
# TODO: figure out how to skip homebrew install and just install packages
# (for updating)

# install homebrew
#echo "Installing homebrew..."
#ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go)"
#echo "Finished installing homebrew."

# TODO: should probably do some brew doctor check before proceeding

# It might be nice to install postgres, mysql, and openssl but leaving
# those off as they aren't always needed.
packages="ack hub tmux tree wget"

for package in $packages; do
  brew install $package
done

echo "Finished installing basic brew packaages."
