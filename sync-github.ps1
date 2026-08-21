# One-shot: send local saves to GitHub main so the hosted site can rebuild.
# Skips .env files. If there is nothing new, it still pushes what is already committed.
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
  Write-Error "git is not available"
  exit 1
}

& $Git add -A
& $Git reset -q HEAD -- .env .env.local 2>$null

$staged = & $Git diff --cached --name-only
if (-not [string]::IsNullOrWhiteSpace($staged)) {
  & $Git -c user.name="etonsafaris" -c user.email="etonsafaris@users.noreply.github.com" commit -m "Update site from local save"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Commit failed."
    exit $LASTEXITCODE
  }
  Write-Output "Committed local changes."
} else {
  Write-Output "No new file changes to commit."
}

& $Git push origin HEAD
if ($LASTEXITCODE -ne 0) {
  Write-Error "Push failed. Check GitHub login / remote."
  exit $LASTEXITCODE
}

$sha = & $Git rev-parse --short HEAD
Write-Output "Pushed $sha to origin/main. The hosted website should start a new build from GitHub."
