param(
    [Parameter(Mandatory = $true)]
    [string]$InstallationDirectory,
    [switch]$Rollback
)

# WL-1508H: only the two named Ollama executable rules are managed here.
# Run from an elevated PowerShell. No model, test, profile, or unrelated rule is changed.
$ErrorActionPreference = 'Stop'
$pilotPrincipal = [Security.Principal.WindowsPrincipal]::new(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $pilotPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'An administrator token is required to manage the pilot firewall rules.'
}
$pilotDirectory = (Resolve-Path -LiteralPath $InstallationDirectory).Path
$pilotRules = @(
    @{ Name = 'WorkLedger-WL1508H-Ollama-Server-Outbound'; File = 'ollama.exe' },
    @{ Name = 'WorkLedger-WL1508H-Ollama-App-Outbound'; File = 'ollama app.exe' }
)
foreach ($pilotSpec in $pilotRules) {
    $pilotProgram = Join-Path $pilotDirectory $pilotSpec.File
    if (-not (Test-Path -LiteralPath $pilotProgram -PathType Leaf)) {
        throw "Missing expected executable: $($pilotSpec.File)"
    }
    $pilotExisting = Get-NetFirewallRule -PolicyStore PersistentStore -Name $pilotSpec.Name -ErrorAction SilentlyContinue
    if ($pilotExisting) {
        $pilotApplication = $pilotExisting | Get-NetFirewallApplicationFilter
        if ($pilotApplication.Program -ne $pilotProgram) {
            throw 'Existing rule targets a different installation; refusing to change it.'
        }
        if ($Rollback) {
            $pilotExisting | Remove-NetFirewallRule
            continue
        }
        if ($pilotExisting.Direction -ne 'Outbound' -or $pilotExisting.Action -ne 'Block') {
            throw 'Existing rule has unexpected semantics; refusing to replace it.'
        }
        $pilotExisting | Set-NetFirewallRule -Enabled True -Profile Any
    } elseif (-not $Rollback) {
        New-NetFirewallRule -PolicyStore PersistentStore -Name $pilotSpec.Name `
            -DisplayName "WorkLedger pilot: block outbound $($pilotSpec.File)" `
            -Description 'WL-1508H private local pilot. Blocks model downloads, cloud and updates from this executable. Roll back with the same script -Rollback.' `
            -Program $pilotProgram -Direction Outbound -Action Block -Enabled True `
            -Profile Any -Protocol Any -RemoteAddress Any | Out-Null
    }
}
