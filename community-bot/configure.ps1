$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o ambiente Python.' }
}
& '.venv/Scripts/python.exe' -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências.' }
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
$secret = Read-Host 'Cole aqui o token do bot (entrada oculta; não envie no chat)' -AsSecureString
$handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $botToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
    if ($botToken -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Token vazio ou formato inválido.' }
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), "DISCORD_TOKEN=$botToken`nDISCORD_GUILD_ID=1559307218762072174`n")
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle)
    $botToken = $null
}
Write-Host 'Token salvo somente neste computador. Abra INICIAR-BOT.cmd e siga o guia.'
