# Auto-commit and push saved project changes after a 30-second pause.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not $env:HOME) { $env:HOME = $env:USERPROFILE }
if (-not $env:GIT_CONFIG_GLOBAL) { $env:GIT_CONFIG_GLOBAL = Join-Path $env:USERPROFILE ".gitconfig" }

$Git = Join-Path $env:LOCALAPPDATA "Programs\MinGit\cmd\git.exe"
if (-not (Test-Path $Git)) {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd) { $Git = $cmd.Source }
}
if (-not (Test-Path $Git)) {
  Write-Error "git-watch: git is not available"
  exit 1
}

$Log = Join-Path $Root "git-watch.log"
$PollSeconds = 5
$DebounceSeconds = 90

function Write-WatchLog([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $Log -Value $line
  Write-Output $line
}

function Test-GitChanges {
  $status = & $Git status --porcelain
  return -not [string]::IsNullOrWhiteSpace($status)
}

Write-WatchLog "Watcher started in $Root"

while ($true) {
  if (Test-GitChanges) {
    Write-WatchLog "Change detected. Waiting ${DebounceSeconds}s before commit."
    Start-Sleep -Seconds $DebounceSeconds
    if (-not (Test-GitChanges)) { continue }

    & $Git add -A
    & $Git reset -q HEAD -- .env .env.local 2>$null

    $staged = & $Git diff --cached --name-only
    if ([string]::IsNullOrWhiteSpace($staged)) {
      Write-WatchLog "Nothing to commit after ignoring secret files."
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    & $Git -c user.name="etonsafaris" -c user.email="etonsafaris@users.noreply.github.com" commit -m "Automated update via watch script"
    if ($LASTEXITCODE -eq 0) {
      Write-WatchLog "Committed. Pushing to origin."
      & $Git push origin HEAD
      if ($LASTEXITCODE -eq 0) {
        Write-WatchLog "Push complete."
      } else {
        Write-WatchLog "Push failed. Will retry on the next change."
      }
    } else {
      Write-WatchLog "Nothing new to commit. Pushing current branch in case GitHub is behind."
      & $Git push origin HEAD
      if ($LASTEXITCODE -eq 0) {
        Write-WatchLog "Push complete (already up to date or sent)."
      } else {
        Write-WatchLog "Push failed. Will retry on the next change."
      }
    }
  }
  Start-Sleep -Seconds $PollSeconds
}
