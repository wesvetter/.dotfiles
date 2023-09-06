# Setting up a new MacBook Pro

⚠️ **IMPORTANT: The install script for symlinks will clobber existing files.**

From a fresh MBP machine:

*   Install Firefox (and AdBlock)
    -   Install 1Password extension
    -   Set DuckDuckGo as the default search engine
    -   Sync bookmarks
*   Install MacVim
*   Install iTerm2
*   Install Zsh, Oh-My-Zsh, [zsh-notify][gh-zsh-notify]
*   Clone dotfiles repo (this repo)
    -   Run brew install script
    -   Run symlink script
        ```
        $ cd scripts
        $ ./brew_installs.sh
        $ ./symlink.sh
        ```
*   Install [Fira Code font][gh-fira-code]
*   Install nvm, node
*   Install Apple Developer Tools, Xcode
*   Install Dropbox
*   Install/Configure Slack
    -   Hide channels by default
    -   Turn off email notifications
*   Install Dash
*   [Make gitk not super ugly](https://superuser.com/questions/620824/is-it-possible-to-have-git-gui-gitk-look-good-on-a-retina-macbook-pro)

[gh-zsh-notify]: https://github.com/marzocchi/zsh-notify#oh-my-zsh
[gh-fira-code]: https://github.com/tonsky/FiraCode


## macOS Settings:

*   Setup keyboard modifiers: map capslock to ctrl
*   Setup Hot Corners
    1.  Upper left - Mission Control (show all active windows)
    2.  Upper right - Lock Screen
    3.  Bottom right - Show Desktop
    4.  Bottom left - Application Windows (show all windows for the current app)
*   Change trackpad sensitivity, scroll direction
*   Hide dock automatically
*   Change screensaver, background, lock timeout



## Resources

*   http://blog.smalleycreative.com/tutorials/using-git-and-github-to-manage-your-dotfiles/
*   http://blog.sanctum.geek.nz/gracefully-degrading-vimrc/
*   http://blog.sanctum.geek.nz/managing-dot-files-with-git/
