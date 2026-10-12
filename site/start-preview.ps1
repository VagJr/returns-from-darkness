$ErrorActionPreference = 'Stop'
$taskSiteRoot = $PSScriptRoot
$taskPreviewScript = Join-Path $taskSiteRoot 'preview.py'
$taskPidPath = Join-Path $taskSiteRoot 'preview.pid'
if (Test-Path -LiteralPath $taskPidPath) {
    $taskExistingId = [int](Get-Content -LiteralPath $taskPidPath)
    $taskExisting = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $taskExistingId)
    if ($taskExisting -and $taskExisting.CommandLine.Contains($taskPreviewScript)) {
        Write-Output 'Site local: http://127.0.0.1:8096/'
        exit
    }
}
$taskPython = (Get-Command python -ErrorAction Stop).Source
$taskProcess = Start-Process -FilePath $taskPython -ArgumentList ('"' + $taskPreviewScript + '"') -WorkingDirectory $taskSiteRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskSiteRoot 'preview.log') -RedirectStandardError (Join-Path $taskSiteRoot 'preview-error.log') -PassThru
Start-Sleep -Milliseconds 700
$taskProcess.Refresh()
if ($taskProcess.HasExited) { throw (Get-Content -Raw -LiteralPath (Join-Path $taskSiteRoot 'preview-error.log')) }
$taskProcess.Id | Set-Content -LiteralPath $taskPidPath
Write-Output 'Site local: http://127.0.0.1:8096/'
