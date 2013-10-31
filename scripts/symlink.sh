#!/bin/bash

# Symlinks all the files in each specified topic folders. Will clobber
# whatever files or links were there previously, without backing them up.
# #YOLO.

topics="vim shell ruby git"

echo -n "Creating new symlinks..."

for topic in $topics; do
  cd $HOME/.dotfiles/$topic
  for file in `ls`; do
    ln -sf $HOME/.dotfiles/$topic/$file $HOME/.$file
  done
done

echo "done"
