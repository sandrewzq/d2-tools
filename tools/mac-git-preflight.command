#!/bin/bash

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/nodejs/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"

cd "$repo_root"
node scripts/git-preflight.mjs "$@"
status=$?

if [[ "$status" -ne 0 ]]; then
  printf '\nGit 预检失败，按回车关闭此窗口。'
  read -r
else
  printf '\nGit 预检完成，按回车关闭此窗口。'
  read -r
fi

exit "$status"
