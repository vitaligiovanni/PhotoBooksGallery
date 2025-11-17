param(
  [string]$Path = "${PSScriptRoot}\..\..\.env.sync"
)

$ErrorActionPreference = 'Stop'
if (!(Test-Path -Path $Path)) {
  throw ".env.sync not found at '$Path'. Create it from .env.sync.example and fill values."
}

Get-Content -Path $Path | ForEach-Object {
  if ($_ -match '^(\s*#|\s*$)') { return }
  $kv = $_.Split('=',2)
  if ($kv.Length -eq 2) {
    $k = $kv[0].Trim()
    $v = $kv[1]
    [Environment]::SetEnvironmentVariable($k, $v)
  }
}
