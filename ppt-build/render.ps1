param(
  [Parameter(Mandatory = $true)][string]$Pptx,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$Width = 1600
)
# Renders every slide of a PPTX to PNG using PowerPoint COM.
$ErrorActionPreference = 'Stop'
$Pptx = (Resolve-Path $Pptx).Path
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path $OutDir).Path
Get-ChildItem $OutDir -Filter 'slide*.png' -ErrorAction SilentlyContinue | Remove-Item -Force

# Only quit PowerPoint at the end if this script started it.
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  # Open(FileName, ReadOnly, Untitled, WithWindow)
  $pres = $app.Presentations.Open($Pptx, -1, 0, 0)
  $ratio = $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth
  $h = [int]($Width * $ratio)
  $i = 1
  foreach ($s in $pres.Slides) {
    $file = Join-Path $OutDir ("slide{0:D2}.png" -f $i)
    $s.Export($file, 'PNG', $Width, $h)
    $i++
  }
  Write-Output "Rendered $($i - 1) slides to $OutDir"
}
finally {
  if ($null -ne $pres) { try { $pres.Close() } catch { } }
  if (-not $wasRunning) { $app.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
