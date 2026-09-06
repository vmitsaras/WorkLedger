param([switch]$Rollback)

# WL-1508K portable 0.33.3 only. Never changes installed Ollama/H rules.
$ErrorActionPreference = 'Stop'
$candidatePrincipal = [Security.Principal.WindowsPrincipal]::new(
    [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $candidatePrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'An administrator token is required for candidate firewall rules.'
}
$candidateRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../output/insights/wl1508k-runtime/0.33.3')).Path
$candidateFiles = @('ollama.exe', 'lib/ollama/llama-server.exe', 'lib/ollama/llama-quantize.exe')
foreach ($candidateFile in $candidateFiles) {
    $candidateProgram = [IO.Path]::GetFullPath((Join-Path $candidateRoot $candidateFile))
    if (-not $candidateProgram.StartsWith($candidateRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $candidateProgram -PathType Leaf)) {
        throw 'Candidate executable is missing or outside the portable installation.'
    }
    $candidateName = 'WorkLedger-WL1508K-0333-' + [IO.Path]::GetFileNameWithoutExtension($candidateProgram) + '-Outbound'
    $candidateExisting = Get-NetFirewallRule -PolicyStore PersistentStore -Name $candidateName -ErrorAction SilentlyContinue
    if ($candidateExisting) {
        $candidateApplication = $candidateExisting | Get-NetFirewallApplicationFilter
        if ($candidateApplication.Program -ne $candidateProgram -or
            $candidateExisting.Direction -ne 'Outbound' -or $candidateExisting.Action -ne 'Block') {
            throw 'Existing candidate rule differs; refusing to modify it.'
        }
        if ($Rollback) { $candidateExisting | Remove-NetFirewallRule }
        else { $candidateExisting | Set-NetFirewallRule -Enabled True -Profile Any }
    } elseif (-not $Rollback) {
        New-NetFirewallRule -PolicyStore PersistentStore -Name $candidateName -DisplayName $candidateName `
            -Description 'WL-1508K isolated portable qualification. Rollback: scripts/ollama-schema-firewall.ps1 -Rollback.' `
            -Program $candidateProgram -Direction Outbound -Action Block -Enabled True `
            -Profile Any -Protocol Any -RemoteAddress Any | Out-Null
    }
}
