<#
.SYNOPSIS
  Installs the bpmn-xml-generator skill for opencode.

.DESCRIPTION
  Downloads the skill into .opencode/skills/bpmn-xml-generator/ in the current
  directory, or into the opencode global config directory with -Global.

.EXAMPLE
  irm https://raw.githubusercontent.com/PieterJorissen/bpmn-xml-generator/main/install.ps1 | iex

.EXAMPLE
  ./install.ps1 -Global
#>
[CmdletBinding()]
param(
    [switch]$Global,
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$Skill   = 'bpmn-xml-generator'
$BaseUrl = "https://raw.githubusercontent.com/PieterJorissen/$Skill/$Branch/.opencode/skills/$Skill"

if ($Global) {
    $ConfigRoot = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { Join-Path $HOME '.config' }
    $Dest = Join-Path $ConfigRoot "opencode/skills/$Skill"
} else {
    $Dest = Join-Path (Get-Location) ".opencode/skills/$Skill"
}

Write-Host "Installing $Skill to $Dest"

New-Item -ItemType Directory -Force -Path (Join-Path $Dest 'references') | Out-Null

$Files = @(
    'SKILL.md'
    'references/elements.md'
    'references/examples.md'
    'references/validation-errors.md'
)

foreach ($File in $Files) {
    Invoke-WebRequest -Uri "$BaseUrl/$File" -OutFile (Join-Path $Dest $File) -UseBasicParsing
    Write-Host "  [ok] $File"
}

Write-Host "`nDone. Restart opencode (or start a new session) to activate the skill."
