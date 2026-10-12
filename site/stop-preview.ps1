$ErrorActionPreference = 'Stop'
$taskPidPath = Join-Path $PSScriptRoot 'preview.pid'
if (-not (Test-Path -LiteralPath $taskPidPath)) { exit }
$taskId = [int](Get-Content -LiteralPath $taskPidPath)
$taskProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $taskId)
$taskExpectedScript = Join-Path $PSScriptRoot 'preview.py'
if ($taskProcess -and $taskProcess.CommandLine.Contains($taskExpectedScript)) { Stop-Process -Id $taskId }
Remove-Item -LiteralPath $taskPidPath -Force
