#!/bin/bash

# Symlinks all the files in each specified topic folders. Will clobber
# whatever files or links were there previously, without backing them up.
# #YOLO.

echo -n "Creating new symlinks..."

# copy topic folders
topics="vim shell ruby git tmux js"
for topic in $topics; do
  cd $HOME/.dotfiles/$topic
  for file in `ls`; do
    ln -sf $HOME/.dotfiles/$topic/$file $HOME/.$file
    echo "ln -sf $HOME/.dotfiles/$topic/$file $HOME/.$file"
  done
done

echo "done"
