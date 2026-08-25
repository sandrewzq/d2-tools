#!/bin/bash

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/nodejs/bin:/opt/homebrew/bin:/usr/local/bin:${PATH}"
cd "$repo_root"

port=53171
stale_pids="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$stale_pids" ]]; then
  kill $stale_pids 2>/dev/null || true
  sleep 0.5
fi

(
  for _ in {1..120}; do
    if curl -fsS "http://127.0.0.1:${port}" >/dev/null 2>&1; then
      open "http://127.0.0.1:${port}"
      exit 0
    fi
    sleep 0.5
  done
) &

pnpm dev:web "$@"
status=$?

if [[ "$status" -ne 0 ]]; then
  printf '\nWeb 启动失败，按回车关闭此窗口。'
  read -r
fi

exit "$status"
