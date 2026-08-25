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
  printf '\nGit 提交推送完成，按回车关闭此窗口。'
  read -r
fi

exit "$status"
