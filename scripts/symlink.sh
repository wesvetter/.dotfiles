#!/bin/bash

# Symlinks all the files in each specified topic folders. Will clobber
# whatever files or links were there previously, without backing them up.
# #YOLO.


echo -n "Creating new symlinks..."

# copy topic folders
topics="vim shell ruby git"
for topic in $topics; do
  cd $HOME/.dotfiles/$topic
  for file in `ls`; do
    ln -sf $HOME/.dotfiles/$topic/$file $HOME/.$file
    echo "ln -sf $HOME/.dotfiles/$topic/$file $HOME/.$file"
  done
done

# copy "binary" files
cd $HOME/.dotfiles/bin
for bin in `ls`; do
  ln -sf $HOME/.dotfiles/bin/$bin $HOME/.bin/$bin
  #echo "ln -sf $HOME/.dotfiles/bin/$bin $HOME/.bin/$bin"
done

echo "done"
