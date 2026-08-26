#!/bin/bash

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/nodejs/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

cd "$repo_root"
node scripts/mac-git-auto-release.mjs "$@"
status=$?

if [[ "$status" -ne 0 ]]; then
  printf '\nMac Release 脚本失败，按回车关闭此窗口。'
  read -r
else
  window_name="$(basename "$0")"
  osascript -e "tell application \"Terminal\" to close (every window whose name contains \"${window_name}\")" >/dev/null 2>&1 || true
fi

exit "$status"
