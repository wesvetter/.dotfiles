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

# claude: top-level files live inside ~/.claude/, not as ~/.<file>.
# `skills/` is handled separately below so we don't clobber locally-
# installed skills (e.g. work-only ones) with a directory symlink.
mkdir -p $HOME/.claude
cd $HOME/.dotfiles/claude
for file in `ls`; do
  if [ "$file" = "skills" ]; then
    continue
  fi
  ln -sf $HOME/.dotfiles/claude/$file $HOME/.claude/$file
  echo "ln -sf $HOME/.dotfiles/claude/$file $HOME/.claude/$file"
done

# claude skills: symlink each skill subdirectory individually so other
# skills installed directly into ~/.claude/skills/ are left alone.
if [ -d $HOME/.dotfiles/claude/skills ]; then
  mkdir -p $HOME/.claude/skills
  cd $HOME/.dotfiles/claude/skills
  for skill in */; do
    skill="${skill%/}"
    ln -sfn $HOME/.dotfiles/claude/skills/$skill $HOME/.claude/skills/$skill
    echo "ln -sfn $HOME/.dotfiles/claude/skills/$skill $HOME/.claude/skills/$skill"
  done
fi

echo "done"
