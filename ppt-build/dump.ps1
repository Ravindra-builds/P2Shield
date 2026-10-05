param([Parameter(Mandatory = $true)][string]$Pptx)
# Lists every shape on every slide (name, type, position in points, font, text).
$ErrorActionPreference = 'Stop'
$Pptx = (Resolve-Path $Pptx).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($Pptx, -1, 0, 0)
  "Slide size: {0} x {1} pt" -f $pres.PageSetup.SlideWidth, $pres.PageSetup.SlideHeight
  foreach ($s in $pres.Slides) {
    "=== Slide {0} layout={1} ({2})" -f $s.SlideIndex, $s.CustomLayout.Name, $s.Layout
    foreach ($sh in $s.Shapes) {
      $t = ''; $font = ''
      if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
        $t = $sh.TextFrame.TextRange.Text -replace "`r", ' | '
        $f = $sh.TextFrame.TextRange.Font
        $font = "{0} {1}pt b={2} rgb={3:X6}" -f $f.Name, $f.Size, $f.Bold, $f.Color.RGB
      }
      "  [{0}] type={1} ph={2} L={3:N1} T={4:N1} W={5:N1} H={6:N1} font=({7}) text='{8}'" -f $sh.Name, $sh.Type, $(try { $sh.PlaceholderFormat.Type } catch { '-' }), $sh.Left, $sh.Top, $sh.Width, $sh.Height, $font, $t
    }
  }
  $pres.Close()
}
finally {
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
