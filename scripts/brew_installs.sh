#!/bin/bash

# It might be nice to install postgres, mysql, and openssl but leaving
# those off as they aren't always needed.
packages="git git-gui ack hub tmux tree wget fzf jq readline reattach-to-user-namespace pgformatter"

for package in $packages; do
  brew install $package
done

echo "Finished installing basic brew packaages."
