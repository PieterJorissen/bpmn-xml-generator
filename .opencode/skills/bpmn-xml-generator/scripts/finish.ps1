# Lays out and validates one BPMN file: adds the diagram, then checks the result.
# Run it the way SKILL.md section 7 shows. Keep this file ASCII - Windows PowerShell 5.1
# reads a script without a BOM as ANSI.
param(
    [Parameter(Mandatory)][string]$Skill,   # the skill's base directory; $PSScriptRoot is empty in a script block
    [Parameter(Mandatory)][string]$File
)
$ErrorActionPreference = 'Stop'
$Runner = Join-Path ([IO.Path]::GetTempPath()) 'bpmn-layout-runner'
New-Item -ItemType Directory -Force -Path $Runner | Out-Null

# Node from PATH if present; otherwise a portable copy under $Runner (no install, no admin).
if (Get-Command node -ErrorAction SilentlyContinue) {
    $NodeExe = 'node'
    $NpmCli  = $null
} else {
    $NodeVersion = 'v24.21.0'
    $NodeDir = Join-Path $Runner "node-$NodeVersion-win-x64"
    $NodeExe = Join-Path $NodeDir 'node.exe'
    $NpmCli  = Join-Path $NodeDir 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path $NodeExe)) {
        Write-Host "Node not found on PATH; downloading a portable copy to $Runner (no install, no admin)."
        $Zip = Join-Path $Runner 'node.zip'
        Invoke-WebRequest "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip" -OutFile $Zip -UseBasicParsing
        Expand-Archive -Path $Zip -DestinationPath $Runner -Force
        Remove-Item $Zip
    }
    if (-not (Test-Path $NodeExe)) { throw "Portable Node download failed; expected $NodeExe." }
}

if (-not (Test-Path (Join-Path $Runner 'node_modules\bpmn-auto-layout'))) {
    Push-Location $Runner
    try {
        if ($NpmCli) { & $NodeExe $NpmCli install bpmn-auto-layout@1.3.0 }
        else         { npm install bpmn-auto-layout@1.3.0 }
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $Runner 'node_modules\bpmn-auto-layout'))) {
    throw "bpmn-auto-layout is not installed in $Runner. The finish step cannot run."
}

# finish.mjs resolves its imports from the directory it sits in, so it runs from $Runner.
Copy-Item -LiteralPath (Join-Path $Skill 'scripts\finish.mjs') -Destination $Runner -Force
& $NodeExe (Join-Path $Runner 'finish.mjs') $File
if ($LASTEXITCODE -ne 0) { throw "Validation failed; see the findings above. Do not hand over this file." }
