#!/bin/bash

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/nodejs/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"
cd "$repo_root"

pnpm dev:desktop "$@"
status=$?

if [[ "$status" -ne 0 ]]; then
  printf '\nDesktop 启动失败，按回车关闭此窗口。'
  read -r
fi

exit "$status"
