#!/usr/bin/env bash
# Auto-commit and push saved project changes after a 30-second pause.
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

if command -v git >/dev/null 2>&1; then
  GIT="git"
elif [ -x "$LOCALAPPDATA/Programs/MinGit/cmd/git.exe" ]; then
  GIT="$LOCALAPPDATA/Programs/MinGit/cmd/git.exe"
else
  echo "git-watch: git is not available" >&2
  exit 1
fi

LOG="$ROOT/git-watch.log"
POLL_SECONDS=5
DEBOUNCE_SECONDS=30

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"
}

has_changes() {
  [ -n "$("$GIT" status --porcelain)" ]
}

log "Watcher started in $ROOT"

while true; do
  if has_changes; then
    log "Change detected. Waiting ${DEBOUNCE_SECONDS}s before commit."
    sleep "$DEBOUNCE_SECONDS"
    if ! has_changes; then
      continue
    fi
    "$GIT" add -A
    "$GIT" reset -q HEAD -- .env .env.local .env*.local 2>/dev/null || true
    if [ -z "$("$GIT" diff --cached --name-only)" ]; then
      log "Nothing to commit after ignoring secret files."
      sleep "$POLL_SECONDS"
      continue
    fi
    if "$GIT" -c user.name="etonsafaris" -c user.email="etonsafaris@users.noreply.github.com" commit -m "Automated update via watch script"; then
      log "Committed. Pushing to origin."
      if "$GIT" push; then
        log "Push complete."
      else
        log "Push failed. Will retry on the next change."
      fi
    else
      log "Commit skipped (no staged changes or commit failed)."
    fi
  fi
  sleep "$POLL_SECONDS"
done
