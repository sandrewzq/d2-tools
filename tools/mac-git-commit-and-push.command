#!/bin/bash

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/nodejs/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

cd "$repo_root"
node scripts/mac-git-commit-and-push.mjs "$@"
status=$?

if [[ "$status" -ne 0 ]]; then
  printf '\nGit 提交推送失败，按回车关闭此窗口。'
  read -r
else
  # Finder 双击 .command 会打开一个独立 Terminal 窗口；成功后关闭这个脚本对应的窗口。
  window_name="$(basename "$0")"
  osascript -e "tell application \"Terminal\" to close (every window whose name contains \"${window_name}\")" >/dev/null 2>&1 || true
fi

exit "$status"
