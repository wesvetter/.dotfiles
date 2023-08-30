# Dotfiles

These are my "dotfiles" (configuration files that typically start with `.` and
often end with `rc`).

**IMPORTANT: The install script for symlinks will clobber existing files**

## Setting up a new MacBook Pro

From a fresh MBP machine:

*   Install Firefox (and AdBlock)
    -   Install 1Password extension
    -   Set DuckDuckGo as the default search engine
    -   Sync bookmarks
*   Install MacVim
*   Install iTerm2
*   Install Zsh, Oh-My-Zsh, [zsh-notify]
*   Clone dotfiles repo (this repo)
    -   Run brew install script
    -   Run symlink script
        ```
        $ cd scripts
        $ ./brew_installs.sh
        $ ./symlink.sh
        ```

*   Install nvm, node
*   Install Apple Developer Tools, Xcode
*   Install Dropbox
*   Install/Configure Slack
    -   Hide channels by default
    -   Turn off email notifications
*   Install Dash
*   [Make gitk not super ugly](https://superuser.com/questions/620824/is-it-possible-to-have-git-gui-gitk-look-good-on-a-retina-macbook-pro)

[zsh-notify]: https://github.com/marzocchi/zsh-notify

Mac Settings:

*   Map capslock to Ctrl
*   Setup Hot Corners
*   Change trackpad sensitivity
*   Hide dock automatically
*   Change screensaver, background, lock timeout



## Resources

*   http://blog.smalleycreative.com/tutorials/using-git-and-github-to-manage-your-dotfiles/
*   http://blog.sanctum.geek.nz/gracefully-degrading-vimrc/
*   http://blog.sanctum.geek.nz/managing-dot-files-with-git/
