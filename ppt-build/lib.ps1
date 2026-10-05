# Helper functions for building slides through PowerPoint COM.
# All positions are in points (slide is 960 x 540).

$script:ASSETS = Join-Path $PSScriptRoot 'out\assets'

function C([string]$hex) {
  $hex = $hex.TrimStart('#')
  if ($hex -notmatch '^[0-9A-Fa-f]{6}$') { throw "Invalid colour '$hex' (called from $((Get-PSCallStack)[1].Location))" }
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return [int]($r + ($g -shl 8) + ($b -shl 16))
}

function D([hashtable]$o, [string]$k, $def) { if ($o.ContainsKey($k)) { return $o[$k] } return $def }

# Parses inline markup into plain text + styled runs.
# Tags: <b> bold, <i> italic, <u> underline, <c=HEX> colour, <s=PT> size, <f=Font> font, <a=URL> hyperlink
function Parse-Markup([string]$s) {
  $plain = New-Object System.Text.StringBuilder
  $runs = New-Object System.Collections.ArrayList
  $stack = New-Object System.Collections.ArrayList
  $pos = 0
  $re = [regex]'<(/?)(b|i|u|c|s|f|a)(?:=([^>]+))?>'
  foreach ($m in $re.Matches($s)) {
    [void]$plain.Append($s.Substring($pos, $m.Index - $pos))
    $pos = $m.Index + $m.Length
    $tag = $m.Groups[2].Value
    if ($m.Groups[1].Value -eq '') {
      [void]$stack.Add(@{ tag = $tag; val = $m.Groups[3].Value; start = $plain.Length })
    }
    else {
      for ($k = $stack.Count - 1; $k -ge 0; $k--) {
        if ($stack[$k].tag -eq $tag) {
          $e = $stack[$k]; $stack.RemoveAt($k)
          [void]$runs.Add(@{ tag = $e.tag; val = $e.val; start = $e.start; len = $plain.Length - $e.start })
          break
        }
      }
    }
  }
  [void]$plain.Append($s.Substring($pos))
  return @{ text = $plain.ToString(); runs = $runs }
}

# Writes paragraphs (array of markup strings) into a shape's text frame.
# Options: font size color bold italic align(1 L,2 C,3 R,4 J) anchor(1 top,3 mid,4 bottom)
#          ml mr mt mb (margins) after before within bullet(char code) bcolor indent
function Set-Text($s, $paras, [hashtable]$o = @{}) {
  if ($paras -is [string]) { $paras = @($paras) }
  $text = ''
  $allRuns = New-Object System.Collections.ArrayList
  for ($i = 0; $i -lt $paras.Count; $i++) {
    $p = Parse-Markup ([string]$paras[$i])
    foreach ($r in $p.runs) {
      [void]$allRuns.Add(@{ tag = $r.tag; val = $r.val; start = $r.start + $text.Length; len = $r.len })
    }
    $text += $p.text
    if ($i -lt $paras.Count - 1) { $text += "`r" }
  }
  $tf = $s.TextFrame2
  $tf.WordWrap = -1
  $tf.AutoSize = 0
  $tf.MarginLeft = [single](D $o 'ml' 0); $tf.MarginRight = [single](D $o 'mr' 0)
  $tf.MarginTop = [single](D $o 'mt' 0); $tf.MarginBottom = [single](D $o 'mb' 0)
  $tf.VerticalAnchor = [int](D $o 'anchor' 1)
  $tr = $tf.TextRange
  $tr.Text = $text
  $tr.Font.Name = (D $o 'font' 'Arial')
  $tr.Font.Size = [single](D $o 'size' 12)
  if (D $o 'bold' $false) { $tr.Font.Bold = -1 } else { $tr.Font.Bold = 0 }
  if (D $o 'italic' $false) { $tr.Font.Italic = -1 } else { $tr.Font.Italic = 0 }
  $tr.Font.Fill.Visible = -1
  $tr.Font.Fill.Solid()
  $tr.Font.Fill.ForeColor.RGB = (C (D $o 'color' '1A1A1A'))
  $pf = $tr.ParagraphFormat
  $pf.Alignment = [int](D $o 'align' 1)
  $pf.SpaceAfter = [single](D $o 'after' 0)
  $pf.SpaceBefore = [single](D $o 'before' 0)
  $pf.LineRuleWithin = -1
  $pf.SpaceWithin = [single](D $o 'within' 1.0)
  $bullet = [int](D $o 'bullet' 0)
  if ($bullet -ne 0) {
    $ind = [single](D $o 'indent' 11)
    $pf.Bullet.Visible = -1
    $pf.Bullet.Type = 1
    $pf.Bullet.Character = $bullet
    $pf.Bullet.UseTextFont = 0
    $pf.Bullet.Font.Name = (D $o 'bfont' 'Arial')
    $pf.Bullet.UseTextColor = 0
    $pf.Bullet.Font.Fill.ForeColor.RGB = (C (D $o 'bcolor' '1F497D'))
    $pf.Bullet.RelativeSize = [single](D $o 'bsize' 1.0)
    $pf.LeftIndent = $ind
    $pf.FirstLineIndent = [single](- $ind)
  }
  else {
    $pf.Bullet.Visible = 0
    $pf.LeftIndent = [single]0
    $pf.FirstLineIndent = [single]0
  }
  foreach ($r in $allRuns) {
    if ($r.len -le 0) { continue }
    $rg = $tr.Characters($r.start + 1, $r.len)
    switch ($r.tag) {
      'b' { $rg.Font.Bold = -1 }
      'i' { $rg.Font.Italic = -1 }
      'u' { $rg.Font.UnderlineStyle = 1 }
      'c' { $rg.Font.Fill.ForeColor.RGB = (C $r.val) }
      's' { $rg.Font.Size = [single]$r.val }
      'f' { $rg.Font.Name = $r.val }
      'a' { }
    }
  }
  # Hyperlinks go through the legacy TextRange (TextRange2 has no ActionSettings).
  foreach ($r in $allRuns) {
    if ($r.tag -ne 'a' -or $r.len -le 0) { continue }
    $legacy = $s.TextFrame.TextRange.Characters($r.start + 1, $r.len)
    $legacy.ActionSettings(1).Hyperlink.Address = $r.val
  }
  # Re-apply colours over hyperlinks (PowerPoint resets them to the theme link colour).
  foreach ($r in $allRuns) {
    if ($r.tag -eq 'c' -and $r.len -gt 0) {
      $tr.Characters($r.start + 1, $r.len).Font.Fill.ForeColor.RGB = (C $r.val)
    }
  }
}

function Add-Text($sl, [double]$x, [double]$y, [double]$w, [double]$h, $paras, [hashtable]$o = @{}) {
  $s = $sl.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $s.Fill.Visible = 0
  $s.Line.Visible = 0
  Set-Text $s $paras $o
  $s.Height = [single]$h
  $s.Top = [single]$y
  if ($o.ContainsKey('name')) { $s.Name = $o.name }
  return $s
}

# Shape types: 1 rect, 5 rounded rect, 9 oval, 7 triangle, 33 right arrow, 10 hexagon
function Add-Box($sl, [int]$type, [double]$x, [double]$y, [double]$w, [double]$h, [hashtable]$o = @{}) {
  $s = $sl.Shapes.AddShape($type, $x, $y, $w, $h)
  $s.Shadow.Visible = 0
  if ($o.ContainsKey('grad')) {
    $s.Fill.Visible = -1
    $s.Fill.ForeColor.RGB = (C $o.grad[0])
    $s.Fill.BackColor.RGB = (C $o.grad[1])
    $s.Fill.TwoColorGradient((D $o 'gstyle' 1), 1)
    $s.Fill.GradientStops.Item(1).Color.RGB = (C $o.grad[0])
    $s.Fill.GradientStops.Item(2).Color.RGB = (C $o.grad[1])
    if ($o.ContainsKey('gangle')) { $s.Fill.GradientAngle = [single]$o.gangle }
  }
  elseif ($o.ContainsKey('fill') -and $o.fill) {
    $s.Fill.Visible = -1
    $s.Fill.Solid()
    $s.Fill.ForeColor.RGB = (C $o.fill)
    $s.Fill.Transparency = [single](D $o 'alpha' 0)
  }
  else { $s.Fill.Visible = 0 }
  if ($o.ContainsKey('line') -and $o.line) {
    $s.Line.Visible = -1
    $s.Line.ForeColor.RGB = (C $o.line)
    $s.Line.Weight = [single](D $o 'lw' 1)
    if ($o.ContainsKey('dash')) { $s.Line.DashStyle = $o.dash }
  }
  else { $s.Line.Visible = 0 }
  if ($o.ContainsKey('r') -and $type -eq 5) {
    $m = [Math]::Min($w, $h)
    $s.Adjustments.Item(1) = [single][Math]::Min(0.5, $o.r / $m)
  }
  if ($o.ContainsKey('rot')) { $s.Rotation = [single]$o.rot }
  if ($o.ContainsKey('shadow')) {
    $s.Shadow.Visible = -1
    $s.Shadow.ForeColor.RGB = (C '1E293B')
    $s.Shadow.Transparency = [single]0.82
    $s.Shadow.Blur = [single]8
    $s.Shadow.OffsetX = [single]0
    $s.Shadow.OffsetY = [single]2
  }
  if ($o.ContainsKey('text')) {
    $to = @{}
    foreach ($k in $o.Keys) { if ($k -like 't_*') { $to[$k.Substring(2)] = $o[$k] } }
    if (-not $to.ContainsKey('anchor')) { $to['anchor'] = 3 }
    if (-not $to.ContainsKey('align')) { $to['align'] = 2 }
    Set-Text $s $o.text $to
  }
  else {
    $s.TextFrame2.TextRange.Text = ''
  }
  if ($o.ContainsKey('name')) { $s.Name = $o.name }
  return $s
}

function Add-Line($sl, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [hashtable]$o = @{}) {
  $s = $sl.Shapes.AddConnector(1, $x1, $y1, $x2, $y2)
  $s.Line.ForeColor.RGB = (C (D $o 'color' '1F497D'))
  $s.Line.Weight = [single](D $o 'w' 1.5)
  if ($o.ContainsKey('dash')) { $s.Line.DashStyle = $o.dash }
  if (D $o 'arrow' $false) {
    $s.Line.EndArrowheadStyle = 2
    $s.Line.EndArrowheadLength = 2
    $s.Line.EndArrowheadWidth = 2
  }
  return $s
}

# Small solid triangle pointing right, centred on (cx, cy).
function Add-Pointer($sl, [double]$cx, [double]$cy, [double]$size, [string]$color) {
  $s = Add-Box $sl 7 ($cx - $size / 2) ($cy - $size / 2) $size $size @{ fill = $color; rot = 90 }
  return $s
}

function Add-Icon($sl, [string]$name, [string]$hex, [double]$x, [double]$y, [double]$size, [string]$alt = '') {
  $svg = Join-Path $script:ASSETS ("icon-{0}-{1}.svg" -f $name, $hex)
  $png = Join-Path $script:ASSETS ("icon-{0}-{1}.png" -f $name, $hex)
  if (-not (Test-Path $png)) { throw "Missing icon asset $png" }
  $pic = $null
  try { $pic = $sl.Shapes.AddPicture($svg, 0, -1, $x, $y, $size, $size) } catch { $pic = $null }
  if ($null -eq $pic) { $pic = $sl.Shapes.AddPicture($png, 0, -1, $x, $y, $size, $size) }
  if ($alt -ne '') { $pic.AlternativeText = $alt } else { $pic.AlternativeText = "$name icon" }
  return $pic
}

function Add-Image($sl, [string]$file, [double]$x, [double]$y, [double]$w, [double]$h, [string]$alt) {
  $pic = $sl.Shapes.AddPicture((Join-Path $script:ASSETS $file), 0, -1, $x, $y, $w, $h)
  $pic.AlternativeText = $alt
  return $pic
}

# Common header for content slides: team oval, title, subtitle, smaller logo, footer text.
function Set-Header($sl, [string]$title, [string]$subtitle, [string]$footer) {
  $toDelete = @()
  foreach ($sh in @($sl.Shapes)) {
    $phType = -1
    try { $phType = $sh.PlaceholderFormat.Type } catch { $phType = -1 }
    $txt = ''
    if ($sh.HasTextFrame -and $sh.TextFrame.HasText) { $txt = $sh.TextFrame.TextRange.Text }
    if ($phType -eq 1) {
      $sh.Left = [single]150; $sh.Top = [single]4; $sh.Width = [single]660; $sh.Height = [single]50
      Set-Text $sh $title @{ font = 'Times New Roman'; size = 34; bold = $true; color = '000000'; align = 2; anchor = 3 }
    }
    elseif ($sh.Type -eq 13) {
      $sh.LockAspectRatio = -1
      $sh.Width = [single]118
      $sh.Left = [single]826; $sh.Top = [single]6
    }
    elseif ($txt -like '*Team*Name*') {
      $sh.Left = [single]20; $sh.Top = [single]18; $sh.Width = [single]112; $sh.Height = [single]46
      $sh.Line.ForeColor.RGB = (C '8064A2'); $sh.Line.Weight = [single]2
      Set-Text $sh 'TechKnights' @{ font = 'Calibri'; size = 15; bold = $true; color = '4B2E83'; align = 2; anchor = 3 }
    }
    elseif ($phType -eq 15) {
      Set-Text $sh $footer @{ font = 'Oswald'; size = 11; color = 'FFFFFF'; align = 2; anchor = 3 }
    }
    elseif ($sh.Type -eq 17) { $toDelete += $sh }
  }
  foreach ($d in $toDelete) { $d.Delete() }
  if ($subtitle -ne '') {
    [void](Add-Text $sl 150 54 660 24 $subtitle @{ size = 14; bold = $true; color = '1F497D'; align = 2; anchor = 3 })
  }
}
