#!/bin/bash
set -euo pipefail

DOTFILES="$HOME/.dotfiles"

if [[ "$(uname)" != "Linux" ]]; then
  echo "This script is for Linux only."
  exit 1
fi

echo "==> Installing packages..."
bash "$DOTFILES/rpi/apt_installs.sh"

echo "==> Checking locale (required for UTF-8 support in tmux)..."
# Debian/Raspberry Pi OS often ships with en_US (non-UTF-8) by default.
# Without en_US.UTF-8, tmux won't display emoji/unicode correctly.
# Use 'sudo dpkg-reconfigure locales' to fix interactively if this step fails.
if locale -a 2>/dev/null | grep -q "en_US.utf8"; then
  echo "    en_US.UTF-8 already generated, skipping."
else
  if grep -q "^# en_US.UTF-8 UTF-8" /etc/locale.gen; then
    sudo sed -i 's/^# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
  elif ! grep -q "^en_US.UTF-8 UTF-8" /etc/locale.gen; then
    echo "en_US.UTF-8 UTF-8" | sudo tee -a /etc/locale.gen > /dev/null
  fi
  sudo locale-gen
  sudo update-locale LANG=en_US.UTF-8
  echo "    en_US.UTF-8 generated."
fi

echo "==> Installing Oh-My-Zsh..."
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  RUNZSH=no CHSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
else
  echo "    Oh-My-Zsh already installed, skipping."
fi

echo "==> Installing NVM..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
else
  echo "    NVM already installed, skipping."
fi

echo "==> Symlinking dotfiles..."
bash "$DOTFILES/scripts/symlink.sh"

echo "==> Installing Vim plugins..."
bash "$DOTFILES/scripts/install_vim_plugins.sh"

echo "==> Writing ~/.gitconfig.local..."
if [ ! -f "$HOME/.gitconfig.local" ]; then
  cat > "$HOME/.gitconfig.local" <<EOF
[credential]
  helper = store
EOF
else
  echo "    ~/.gitconfig.local already exists, skipping."
fi

echo "==> Creating ~/.zsh-local stub..."
if [ ! -f "$HOME/.zsh-local" ]; then
  cat > "$HOME/.zsh-local" <<EOF
# Machine-specific zsh config for $(hostname).
# Add project folder aliases, PATH modifications, secrets, etc. here.
EOF
else
  echo "    ~/.zsh-local already exists, skipping."
fi

echo "==> Creating ~/.vim-tmp..."
mkdir -p "$HOME/.vim-tmp"

echo "==> Tuning sshd for remote development..."
SSHD_CONF="/etc/ssh/sshd_config"
if ! grep -q "ClientAliveInterval" "$SSHD_CONF"; then
  sudo tee -a "$SSHD_CONF" > /dev/null <<EOF

# Remote dev keepalive settings (added by bootstrap.sh)
ClientAliveInterval 60
ClientAliveCountMax 10
TCPKeepAlive yes
UseDNS no
EOF
  sudo systemctl restart ssh
  echo "    sshd config updated and restarted."
else
  echo "    sshd already configured, skipping."
fi

echo "==> Setting default shell to zsh..."
if [ "$SHELL" != "$(which zsh)" ]; then
  chsh -s "$(which zsh)"
else
  echo "    zsh is already the default shell."
fi

echo ""
echo "Done! Manual steps remaining:"
echo "  1. Open a new shell (or run: exec zsh)"
echo "  2. Install Node via NVM: nvm install --lts"
echo "  3. Add project folder aliases to ~/.zsh-local"
echo "  4. On first 'git push', enter your GitHub credentials once to save them"
