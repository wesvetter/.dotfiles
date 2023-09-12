#!/bin/bash

# Installs Vim plugins using Vim's new package format (requires Vim 8+).

# Define an array of Git repository URLs for Vim plugins
declare -a urls=(
    "https://github.com/ctrlpvim/ctrlp.vim"
    "https://github.com/kchmck/vim-coffee-script"
    "https://github.com/mattn/emmet-vim"
    "https://github.com/mattn/gist-vim"
    "https://github.com/mattn/webapi-vim"
    "https://github.com/mbbill/undotree"
    "https://github.com/mileszs/ack.vim"
    "https://github.com/mustache/vim-mustache-handlebars"
    "https://github.com/plasticboy/vim-markdown"
    "https://github.com/sheerun/vim-polyglot"
    "https://github.com/sjl/gundo.vim"
    "https://github.com/tpope/vim-fugitive"
    "https://github.com/tpope/vim-repeat"
    "https://github.com/tpope/vim-surround"
    "https://github.com/iloginow/vim-stylus"
)

# Destination directory
dest_dir="$HOME/.vim/pack/plugins/start/"

# Create the destination directory if it doesn't exist
mkdir -p "$dest_dir"

# Change to the destination directory
cd "$dest_dir" || exit

# Loop over the URLs and clone each repository. The `--depth=1` options means
# that only the most recent commit will be cloned.
for url in "${urls[@]}"; do
    git clone --depth=1 "$url"
done

# Profit!
echo "Cloning has been completed."
