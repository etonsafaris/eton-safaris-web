# Push local site changes to GitHub so Vercel deploys.
# Double-click Deploy-Site.bat, or run: .\Deploy-Site.ps1
# Optional: .\Deploy-Site.ps1 -Message "Your commit message"

param(
  [string]$Message = "Update live site from local save"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Find-Git {
  $paths = [System.Collections.Generic.List[string]]::new()

  $fromPath = Get-Command git -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
  if ($fromPath) { [void]$paths.Add([string]$fromPath) }

  foreach ($candidate in @(
      "$env:LOCALAPPDATA\Programs\MinGit\cmd\git.exe",
      "$env:ProgramFiles\Git\cmd\git.exe",
      "${env:ProgramFiles(x86)}\Git\cmd\git.exe",
      "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    )) {
    if ($candidate) { [void]$paths.Add($candidate) }
  }

  foreach ($path in $paths) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }

  throw "Git not found. Install Git for Windows, then run this again."
}

$git = Find-Git
Write-Host "Using Git: $git"
Write-Host "Folder:    $PWD"
Write-Host ""

& $git @('status', '-sb')
Write-Host ""

& $git @('add', '-A')
& $git @('reset', '-q', 'HEAD', '--', '.env', '.env.local') 2>$null
& $git @('status', '--short')

$pending = & $git @('status', '--porcelain')
if (-not $pending) {
  Write-Host ""
  Write-Host "Nothing new to commit. Checking if main still needs a push..."
  & $git @('push', 'origin', 'main')
  if ($LASTEXITCODE -ne 0) { throw "git push failed (exit $LASTEXITCODE). Sign in to GitHub if prompted." }
  Write-Host ""
  Write-Host "Done. Open https://vercel.com/dashboard and wait until the deployment is Ready."
  exit 0
}

& $git @(
  '-c', 'user.name=etonsafaris',
  '-c', 'user.email=etonsafaris@users.noreply.github.com',
  'commit', '-m', $Message
)
if ($LASTEXITCODE -ne 0) { throw "git commit failed (exit $LASTEXITCODE)." }

& $git @('push', 'origin', 'main')
if ($LASTEXITCODE -ne 0) { throw "git push failed (exit $LASTEXITCODE). Sign in to GitHub if prompted." }

Write-Host ""
Write-Host "Pushed to https://github.com/etonsafaris/eton-safaris-web"
Write-Host "Vercel will build from main. Watch: https://vercel.com/dashboard"
Write-Host "When status is Ready, hard-refresh the live site."
