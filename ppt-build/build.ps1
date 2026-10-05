param(
  [string]$Template = 'c:\Guardrail_hackathon\BITSHIFT_2026_PPT_Template.pptx',
  [string]$OutPptx = 'c:\Guardrail_hackathon\P2Shield_TechKnights_BITSHIFT2026.pptx'
)
# Builds the P2Shield idea-submission deck from the BITSHIFT 2026 template via PowerPoint COM.
# Prerequisite: node ppt-build/assets.mjs (icons, shield mark, screenshot crops).
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

# ---------- palette ----------
$NAVY = '1F497D'; $INK = '1A1A1A'; $MUTED = '55606E'
$PURPLE = '6F4FB0'; $RED = 'D9473F'; $GREEN = '2E9E5B'; $ORANGE = 'E07B00'
$MID = '1F6FB2'; $SKY = '2B8CD6'; $DARK = '1F2937'
$FOOTER = '@BITSHIFT Idea submission  ·  TechKnights  ·  P2Shield'
$ARROW = [char]0x2192   # →
$RUPEE = [char]0x20B9   # ₹
$DOT = [char]0x00B7     # ·
$NDASH = [char]0x2013   # –
$ELL = [char]0x2026     # …
$BUL = 8226             # •

$work = Join-Path $PSScriptRoot 'out\work.pptx'
Copy-Item $Template $work -Force

# Only quit PowerPoint at the end if this script started it.
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$app = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  $pres = $app.Presentations.Open($work, 0, 0, 0)
  # The instructions slide (7) is not part of the submission.
  $pres.Slides.Item(7).Delete()

  # =====================================================================
  # SLIDE 1 - TITLE PAGE
  # =====================================================================
  $s1 = $pres.Slides.Item(1)
  $del = @()
  foreach ($sh in @($s1.Shapes)) {
    $ph = -1; try { $ph = $sh.PlaceholderFormat.Type } catch { }
    if ($ph -eq 4 -or $sh.Type -eq 17) { $del += $sh }
  }
  foreach ($d in $del) { $d.Delete() }

  [void](Add-Text $s1 40 108 480 66 @("<c=$NAVY>P2</c><c=0070C0>Shield</c>") @{ font = 'Arial Black'; size = 48; color = $NAVY; anchor = 3 })
  [void](Add-Text $s1 42 174 470 44 'A pre-LLM privacy firewall that cleans every prompt on your own device, before any chatbot sees it.' @{ size = 15; color = '404040'; within = 1.05 })
  [void](Add-Box $s1 1 42 226 72 4 @{ grad = @('22D3EE', '6D28D9'); gangle = 0 })

  $tp = @(
    "Problem Statement Title $NDASH <c=$NAVY>Pre-LLM Privacy Firewall for Sensitive Data Protection</c>",
    "Theme $NDASH <c=$NAVY>AI / Web3</c>",
    "PS Category $NDASH <c=$NAVY>Software</c>",
    "Team Name $NDASH <c=$NAVY>TechKnights</c>"
  )
  [void](Add-Text $s1 40 250 470 230 $tp @{ size = 19; bold = $true; color = '000000'; bullet = $BUL; bcolor = '000000'; indent = 18; after = 16; within = 1.0 })

  # Shield mark inside the big template hexagon, with a few "protected value" chips around it.
  $mark = Add-Image $s1 'p2shield-mark.png' 566 178 182 209 'P2Shield logo: a shield protecting a chat message with masked text'
  $chips = @(
    @{ t = '[PERSON_1]'; x = 500; y = 196; c = $PURPLE },
    @{ t = '98*** ***10'; x = 712; y = 236; c = $MID },
    @{ t = '[REDACTED_AADHAAR]'; x = 478; y = 344; c = $RED },
    @{ t = '[SECRET_REMOVED]'; x = 694; y = 384; c = $DARK }
  )
  foreach ($ch in $chips) {
    $w = 9 + 6.4 * $ch.t.Length
    [void](Add-Box $s1 5 $ch.x $ch.y $w 22 @{ fill = 'FFFFFF'; line = $ch.c; lw = 1.25; r = 11; shadow = $true; text = $ch.t; t_font = 'Consolas'; t_size = 10.5; t_bold = $true; t_color = $ch.c })
  }

  # =====================================================================
  # SLIDE 2 - IDEA TITLE / PROPOSED SOLUTION
  # =====================================================================
  $s2 = $pres.Slides.Item(2)
  Set-Header $s2 'P2SHIELD' 'Clean every prompt on your own device, before the LLM ever sees it' $FOOTER

  # --- PROBLEM panel (left) ---
  [void](Add-Box $s2 5 18 96 288 396 @{ grad = @('E9E2F8', 'DDEBFB'); gangle = 90; r = 18 })
  [void](Add-Text $s2 34 104 220 36 'PROBLEM' @{ size = 26; bold = $true; color = '7A5CC2'; anchor = 3 })
  [void](Add-Icon $s2 'triangle-alert' $PURPLE 258 108 28 'Warning icon')
  $stats = @(
    @{ n = '77%'; c = $RED; t = 'of GenAI users paste data into prompts <c=6B7280>(LayerX 2025)</c>' },
    @{ n = '39.7%'; c = $ORANGE; t = 'of data shared with AI tools is sensitive <c=6B7280>(Cyberhaven 2026)</c>' },
    @{ n = "$($RUPEE)250 Cr"; c = $PURPLE; t = 'max DPDP Act penalty for failing to protect personal data' }
  )
  $y = 146
  foreach ($st in $stats) {
    [void](Add-Box $s2 5 32 $y 260 54 @{ fill = 'FFFFFF'; r = 10; shadow = $true })
    [void](Add-Text $s2 38 $y 98 54 $st.n @{ size = 21; bold = $true; color = $st.c; align = 2; anchor = 3 })
    [void](Add-Text $s2 138 ($y + 3) 148 48 $st.t @{ size = 10.5; color = $INK; anchor = 3; within = 1.0 })
    $y += 62
  }
  $prob = @(
    'Names, Aadhaar, card numbers, API keys and health records are pasted straight into chatbots',
    "Once sent, the data sits on third-party servers, outside the user's control",
    'Today''s options: ban AI outright, or route every prompt through a cloud DLP proxy'
  )
  [void](Add-Text $s2 34 338 262 148 $prob @{ size = 11.5; color = $INK; bullet = $BUL; bcolor = $PURPLE; indent = 12; after = 7; within = 1.02 })

  # --- Flow strip (top right) ---
  $flow = @(
    @{ i = 'message-square-text'; t = 'Your prompt'; c = $MID },
    @{ i = 'scan-search'; t = 'Detect 28 data types'; c = $SKY },
    @{ i = 'sliders-horizontal'; t = 'Apply privacy policy'; c = $PURPLE },
    @{ i = 'gauge'; t = "Score risk 0$($NDASH)100"; c = $ORANGE },
    @{ i = 'circle-check'; t = 'Safe prompt in the box'; c = $GREEN },
    @{ i = 'bot'; t = 'Send to any LLM'; c = $DARK }
  )
  $x = 316; $nw = 91; $gap = 16
  for ($k = 0; $k -lt $flow.Count; $k++) {
    $f = $flow[$k]
    [void](Add-Box $s2 5 $x 98 $nw 62 @{ fill = $f.c; r = 10 })
    [void](Add-Icon $s2 $f.i 'FFFFFF' ($x + $nw / 2 - 10) 104 20)
    [void](Add-Text $s2 ($x + 4) 126 ($nw - 8) 32 $f.t @{ size = 10; bold = $true; color = 'FFFFFF'; align = 2; anchor = 3; within = 0.95 })
    if ($k -lt $flow.Count - 1) { [void](Add-Pointer $s2 ($x + $nw + $gap / 2) 129 11 $NAVY) }
    $x += $nw + $gap
  }

  # --- Proposed Solution / Innovation boxes ---
  $sol = @(
    'A <b>Chrome extension</b>: a shield appears on every AI chat box',
    'One click finds <b>28 types</b> of sensitive data and rewrites the prompt in place',
    '<b>Mask, tokenize, redact, generalize</b>; secrets are always removed',
    "<b>Risk score</b> before $ARROW after, with Undo and per-item review",
    '<b>4 policy profiles</b>: Personal, Healthcare, Finance, Enterprise'
  )
  $inn = @(
    '<b>100% on-device</b>: no server, no account, zero network calls',
    'Reads <b>structure</b>: JSON, .env, headers, tables, code and prose',
    '<b>Checksums</b> cut false alarms (Luhn, Verhoeff, IBAN mod-97)',
    'Optional <b>on-device AI</b> (Gemini Nano) keeps only what the task needs',
    'The AI only labels; the <b>policy decides</b> every replacement'
  )
  foreach ($bx in @(@{ x = 316; h = 'Proposed Solution'; b = $sol }, @{ x = 634; h = 'Innovation & Uniqueness'; b = $inn })) {
    [void](Add-Box $s2 5 $bx.x 170 308 190 @{ fill = 'FFFFFF'; line = '000000'; lw = 2.25; r = 14 })
    [void](Add-Text $s2 ($bx.x + 10) 175 288 26 $bx.h @{ size = 16; bold = $true; color = '000000'; align = 2; anchor = 3 })
    [void](Add-Text $s2 ($bx.x + 14) 204 284 152 $bx.b @{ size = 11; color = $INK; bullet = $BUL; bcolor = '000000'; indent = 11; after = 4.5; within = 1.0 })
  }

  # --- Before / after example (real engine output) ---
  [void](Add-Text $s2 316 366 626 18 "How it addresses the problem $NDASH real output, Healthcare profile" @{ size = 11.5; bold = $true; color = $NAVY; anchor = 3 })
  [void](Add-Box $s2 5 316 386 264 106 @{ fill = 'FDEDEC'; line = 'F1B5B0'; lw = 1; r = 10 })
  [void](Add-Text $s2 326 391 80 14 'BEFORE' @{ size = 9; bold = $true; color = $RED; anchor = 3 })
  [void](Add-Box $s2 5 474 390 98 16 @{ fill = $RED; r = 8; text = "Risk 97 $DOT Critical"; t_size = 8.5; t_bold = $true; t_color = 'FFFFFF' })
  $NB = [char]0x00A0   # keep phone / Aadhaar numbers on one line
  $before = "My name is <b><c=$RED>Rahul$($NB)Sharma</c></b>, I'm <b><c=$RED>27</c></b>. Phone <b><c=$RED>98765$($NB)43210</c></b>, Aadhaar <b><c=$RED>2345$($NB)6789$($NB)0124</c></b>, email <b><c=$RED>rahul.sharma@gmail.com</c></b>. I have Type 2 diabetes. What should I ask my doctor?"
  [void](Add-Text $s2 326 410 246 78 $before @{ size = 10.5; color = $INK; within = 1.05 })

  [void](Add-Image $s2 'p2shield-mark.png' 591 398 38 44 'P2Shield')
  [void](Add-Box $s2 33 586 448 48 18 @{ fill = $NAVY })

  [void](Add-Box $s2 5 642 386 300 106 @{ fill = 'E7F6EC'; line = '9FD6B2'; lw = 1; r = 10 })
  [void](Add-Text $s2 652 391 80 14 'AFTER' @{ size = 9; bold = $true; color = $GREEN; anchor = 3 })
  [void](Add-Box $s2 5 846 390 88 16 @{ fill = $GREEN; r = 8; text = "Risk 23 $DOT Low"; t_size = 8.5; t_bold = $true; t_color = 'FFFFFF' })
  $after = "My name is <b><c=$GREEN>[PERSON_1]</c></b>, I'm <b><c=$GREEN>20-30</c></b>. Phone <b><c=$GREEN>[REDACTED_PHONE]</c></b>, Aadhaar <b><c=$GREEN>[REDACTED_AADHAAR]</c></b>, email <b><c=$GREEN>[REDACTED_EMAIL]</c></b>. I have <b><c=$NAVY>Type 2 diabetes</c></b>. What should I ask my doctor?"
  [void](Add-Text $s2 652 410 282 64 $after @{ size = 10.5; color = $INK; within = 1.05 })
  [void](Add-Text $s2 652 474 282 14 'Diagnosis kept: the answer needs it. Identity removed.' @{ size = 9; italic = $true; color = '2E6B47'; anchor = 3 })

  # =====================================================================
  # SLIDE 3 - TECHNICAL APPROACH
  # =====================================================================
  $s3 = $pres.Slides.Item(3)
  Set-Header $s3 'TECHNICAL APPROACH' 'A pure TypeScript engine inside a Chrome extension. Nothing leaves the browser.' $FOOTER

  # --- Architecture panel ---
  [void](Add-Box $s3 5 18 96 924 194 @{ fill = 'F5F7FB'; line = 'D5DCE8'; lw = 1; r = 12 })
  [void](Add-Box $s3 1 30 103 226 18 @{ fill = 'FFE45C' })
  [void](Add-Text $s3 34 103 222 18 'System Architecture & Process Flow' @{ size = 11.5; bold = $true; color = '000000'; anchor = 3 })

  $cy = 205
  function Node($sl, $x, $w, $h, $color, $icon, $title, $cap) {
    $top = $cy - $h / 2
    [void](Add-Box $sl 5 $x $top $w $h @{ fill = $color; r = 9 })
    [void](Add-Icon $sl $icon 'FFFFFF' ($x + $w / 2 - 9) ($top + 7) 18)
    [void](Add-Text $sl ($x + 4) ($top + 28) ($w - 8) 14 $title @{ size = 9.5; bold = $true; color = 'FFFFFF'; align = 2; anchor = 3 })
    [void](Add-Text $sl ($x + 4) ($top + 43) ($w - 8) ($h - 47) $cap @{ size = 8; color = 'FFFFFF'; align = 2; within = 0.95 })
  }
  Node $s3 30 84 92 $MID 'message-square-text' 'AI chat box' "ChatGPT, Claude, Gemini or any site"
  [void](Add-Pointer $s3 121 $cy 9 $NAVY)
  Node $s3 128 90 92 $SKY 'shield-check' 'Shield UI' "content script, closed Shadow DOM, Alt+Shift+S"
  [void](Add-Pointer $s3 225 $cy 9 $NAVY)

  # Core engine group
  [void](Add-Box $s3 5 232 128 536 154 @{ fill = 'FFFFFF'; line = $PURPLE; lw = 1.25; dash = 4; r = 10 })
  [void](Add-Text $s3 242 131 520 14 "CORE ENGINE  $DOT  on-device, pure TypeScript, no DOM" @{ size = 8.5; bold = $true; color = $PURPLE; anchor = 3 })
  $dets = @(
    @{ i = 'binary'; c = $MID; t = 'Rule detectors'; d = 'regex + checksums, 40+ secret formats' },
    @{ i = 'braces'; c = $MID; t = 'Field detector'; d = 'JSON, YAML, .env, headers, tables' },
    @{ i = 'file-search'; c = $MID; t = 'Heuristics'; d = 'names, medical, amounts, hosts' },
    @{ i = 'sparkles'; c = $PURPLE; t = 'Smart labels (optional)'; d = 'Gemini Nano via Prompt API' }
  )
  $dy = 148
  foreach ($d in $dets) {
    [void](Add-Box $s3 5 242 $dy 156 30 @{ fill = 'EEF3FB'; line = 'C9D6EA'; lw = 0.75; r = 6 })
    [void](Add-Icon $s3 $d.i $d.c 247 ($dy + 7) 16)
    [void](Add-Text $s3 268 ($dy + 2) 128 14 $d.t @{ size = 8.5; bold = $true; color = $NAVY; anchor = 3 })
    [void](Add-Text $s3 268 ($dy + 15) 128 13 $d.d @{ size = 7.5; color = $MUTED; anchor = 3 })
    $dy += 33
  }
  [void](Add-Line $s3 402 152 402 274 @{ color = $NAVY; w = 1.25 })
  [void](Add-Pointer $s3 409 $cy 9 $NAVY)

  $stages = @(
    @{ x = 416; c = $PURPLE; i = 'git-merge'; t = 'Resolver'; d = 'merge overlaps, keep the most specific' },
    @{ x = 504; c = $PURPLE; i = 'sliders-horizontal'; t = 'Policy engine'; d = 'action per data type and profile' },
    @{ x = 592; c = $ORANGE; i = 'gauge'; t = 'Risk scorer'; d = "0$($NDASH)100, before and after" },
    @{ x = 680; c = $GREEN; i = 'eraser'; t = 'Sanitizer'; d = 'mask, tokenize, redact, generalize' }
  )
  for ($k = 0; $k -lt $stages.Count; $k++) {
    $m = $stages[$k]
    Node $s3 $m.x 78 96 $m.c $m.i $m.t $m.d
    if ($k -lt $stages.Count - 1) { [void](Add-Pointer $s3 ($m.x + 83) $cy 8 $NAVY) }
  }
  [void](Add-Pointer $s3 775 $cy 9 $NAVY)
  Node $s3 782 76 92 $GREEN 'undo-2' 'Write back' 'safe text into the box, verified, with Undo'
  [void](Add-Pointer $s3 865 $cy 9 $NAVY)
  Node $s3 872 62 92 $DARK 'bot' 'LLM' 'gets only the safe prompt'

  # --- Bottom row: tech stack | privacy actions | prototype ---
  $by = 300; $bh = 192
  [void](Add-Box $s3 5 18 $by 270 $bh @{ fill = 'FFFFFF'; line = 'C9C3DC'; lw = 3.5; r = 16 })
  [void](Add-Text $s3 18 ($by + 6) 270 24 'Tech Stack' @{ size = 16; bold = $true; color = $PURPLE; align = 2; anchor = 3 })
  $stack = @(
    @('TypeScript', 'engine + UI'), @('Chrome MV3', 'extension platform'),
    @('Shadow DOM', 'isolated shield UI'), @('Prompt API', 'Gemini Nano, on-device'),
    @('chrome.storage', 'settings, org policy'), @('esbuild', 'bundler'),
    @('Vitest', '169 unit tests'), @('Playwright', '30 end-to-end checks')
  )
  for ($k = 0; $k -lt $stack.Count; $k++) {
    $col = $k % 2; $row = [Math]::Floor($k / 2)
    $px = 30 + $col * 126; $py = $by + 36 + $row * 37
    [void](Add-Box $s3 5 $px $py 120 32 @{ fill = 'EEF2FB'; r = 7 })
    [void](Add-Text $s3 ($px + 8) ($py + 3) 108 14 $stack[$k][0] @{ size = 10; bold = $true; color = $NAVY; anchor = 3 })
    [void](Add-Text $s3 ($px + 8) ($py + 17) 108 12 $stack[$k][1] @{ size = 8; color = $MUTED; anchor = 3 })
  }

  [void](Add-Box $s3 5 298 $by 300 $bh @{ fill = 'FFFFFF'; line = 'C9C3DC'; lw = 3.5; r = 16 })
  [void](Add-Text $s3 298 ($by + 6) 300 24 'Privacy Actions' @{ size = 16; bold = $true; color = $PURPLE; align = 2; anchor = 3 })
  $acts = @(
    @('Mask', $MID, "98765 43210 $ARROW 98*** ***10"),
    @('Tokenize', $PURPLE, "Rahul Sharma $ARROW [PERSON_1]"),
    @('Redact', $RED, "2345 6789 0124 $ARROW [REDACTED_AADHAAR]"),
    @('Generalize', $ORANGE, "27 $ARROW 20-30  $DOT  Jamshedpur $ARROW Jharkhand"),
    @('Remove secret', $DARK, "sk-proj-Ab3d$ELL $ARROW [SECRET_REMOVED]"),
    @('Keep', $GREEN, 'Type 2 diabetes (needed for the task)')
  )
  $ay = $by + 36
  foreach ($a in $acts) {
    [void](Add-Box $s3 5 310 $ay 74 20 @{ fill = $a[1]; r = 10; text = $a[0]; t_size = 8.5; t_bold = $true; t_color = 'FFFFFF' })
    [void](Add-Text $s3 390 $ay 204 20 $a[2] @{ font = 'Consolas'; size = 8.5; color = $INK; anchor = 3 })
    $ay += 24
  }
  [void](Add-Text $s3 310 ($by + 176) 284 12 'Secrets are removed in every profile and cannot be overridden.' @{ size = 8; italic = $true; color = $MUTED; anchor = 3 })

  [void](Add-Box $s3 5 608 $by 334 $bh @{ fill = 'FFFFFF'; line = 'C9C3DC'; lw = 3.5; r = 16 })
  [void](Add-Text $s3 608 ($by + 6) 334 24 'Working Prototype' @{ size = 16; bold = $true; color = $PURPLE; align = 2; anchor = 3 })
  $shot = Add-Image $s3 'shot-playground.png' 620 ($by + 34) 196 150 'Screenshot of the P2Shield playground: a developer prompt with API keys and a password scores risk 100 (Critical) before and 4 (Low) after; the safe version shows SECRET_REMOVED placeholders.'
  $shot.Line.Visible = -1; $shot.Line.ForeColor.RGB = (C 'D5DCE8'); $shot.Line.Weight = [single]0.75
  $feat = @(
    '<b>Shield</b> on every chat box',
    '<b>Alt+Shift+S</b> and right-click',
    '<b>Undo</b> + per-item review',
    '<b>Playground</b> for .txt .csv .json .log',
    '<b>Org policy</b> via managed storage'
  )
  [void](Add-Text $s3 824 ($by + 38) 112 148 $feat @{ size = 9; color = $INK; bullet = 10003; bfont = 'Segoe UI Symbol'; bcolor = $GREEN; indent = 11; after = 6; within = 1.0 })

  # =====================================================================
  # SLIDE 4 - FEASIBILITY AND VIABILITY
  # =====================================================================
  $s4 = $pres.Slides.Item(4)
  Set-Header $s4 'FEASIBILITY AND VIABILITY' 'Already built, tested and fast. No servers to run.' $FOOTER

  [void](Add-Box $s4 5 18 96 596 228 @{ grad = @('DCEAFB', 'EEF4FC'); gangle = 0; r = 16 })
  [void](Add-Text $s4 32 101 400 26 'Risks & Mitigation' @{ size = 17; bold = $true; color = '000000'; anchor = 3 })
  $risks = @(
    @{ i = 'app-window'; p = 'Chat sites keep changing their editors'; s = 'Simulated paste + read-back check; clipboard fallback; shortcut and right-click always work' },
    @{ i = 'triangle-alert'; p = 'False positives could break normal prompts'; s = 'Checksums + field-name context; clean prompts are tested to stay unchanged; per-item Undo' },
    @{ i = 'bot'; p = 'AI model may hallucinate or be prompt-injected'; s = 'Model only labels; every label must appear verbatim; policy decides; secrets are never "needed"' },
    @{ i = 'cpu'; p = 'Devices without on-device AI'; s = 'Basic mode works in every Chromium browser; Smart mode is optional and falls back after 0.7 s' }
  )
  $ry = 132
  foreach ($r in $risks) {
    [void](Add-Box $s4 5 32 $ry 214 42 @{ fill = '2E75B6'; r = 8 })
    [void](Add-Icon $s4 $r.i 'FFFFFF' 40 ($ry + 11) 20)
    [void](Add-Text $s4 68 $ry 172 42 $r.p @{ size = 10; bold = $true; color = 'FFFFFF'; anchor = 3; within = 0.98 })
    [void](Add-Box $s4 33 252 ($ry + 13) 24 16 @{ fill = $NAVY })
    [void](Add-Box $s4 5 282 $ry 320 42 @{ fill = 'E2F4E8'; line = 'B9E2C7'; lw = 0.75; r = 8 })
    [void](Add-Text $s4 292 $ry 304 42 $r.s @{ size = 9.5; color = $INK; anchor = 3; within = 0.98 })
    $ry += 47
  }

  [void](Add-Box $s4 5 624 96 318 228 @{ grad = @('E1D9F4', 'EFEAFA'); gangle = 90; r = 18 })
  [void](Add-Text $s4 624 101 318 26 'Technical Feasibility' @{ size = 17; bold = $true; color = '000000'; align = 2; anchor = 3 })
  $tech = @(
    'Working <b>Chrome extension</b>, demo chat page and playground',
    '<b>169 unit tests</b> + <b>30 end-to-end</b> checks, all passing',
    'Works on <b>ChatGPT, Claude, Gemini, Copilot</b> and more',
    '<b>No backend</b>: nothing to host, scale or breach',
    '<b>Org-wide policy</b> via Chrome managed storage'
  )
  [void](Add-Text $s4 640 132 290 136 $tech @{ size = 10.5; color = $INK; bullet = 10003; bfont = 'Segoe UI Symbol'; bcolor = $GREEN; indent = 14; after = 6; within = 1.0 })
  $badges = @(@('28', 'data types'), @('6', 'actions'), @('4', 'profiles'), @('40+', 'secret formats'))
  $bx = 636
  foreach ($bg in $badges) {
    [void](Add-Box $s4 5 $bx 272 70 42 @{ fill = 'FFFFFF'; r = 8; shadow = $true })
    [void](Add-Text $s4 $bx 274 70 22 $bg[0] @{ size = 16; bold = $true; color = $PURPLE; align = 2; anchor = 3 })
    [void](Add-Text $s4 $bx 295 70 14 $bg[1] @{ size = 8.5; color = $MUTED; align = 2; anchor = 3 })
    $bx += 74
  }

  # --- Chart 1: risk before vs after (real engine output) ---
  $cx0 = 18; $cyTop = 334; $cw = 352; $ch = 158
  [void](Add-Box $s4 5 $cx0 $cyTop $cw $ch @{ fill = 'FFFFFF'; line = 'D5DCE8'; lw = 1; r = 10 })
  [void](Add-Text $s4 30 ($cyTop + 6) 240 16 'Risk score: before vs after' @{ size = 11.5; bold = $true; color = $NAVY; anchor = 3 })
  [void](Add-Text $s4 30 ($cyTop + 21) 240 12 'real engine output on sample prompts' @{ size = 8; color = $MUTED; anchor = 3 })
  [void](Add-Box $s4 1 268 ($cyTop + 10) 8 8 @{ fill = $RED })
  [void](Add-Text $s4 279 ($cyTop + 7) 40 14 'Before' @{ size = 8; color = $INK; anchor = 3 })
  [void](Add-Box $s4 1 314 ($cyTop + 10) 8 8 @{ fill = $GREEN })
  [void](Add-Text $s4 325 ($cyTop + 7) 40 14 'After' @{ size = 8; color = $INK; anchor = 3 })
  $base = $cyTop + 132; $maxH = 82
  [void](Add-Line $s4 30 $base 360 $base @{ color = 'B8C2D3'; w = 0.75 })
  $data = @(
    @('Patient', 99, 41), @('Banking', 100, 45), @('Memo', 95, 49), @('Dev keys', 100, 4), @('JSON config', 100, 6)
  )
  $gx = 38
  foreach ($dpt in $data) {
    $hb = $maxH * $dpt[1] / 100; $ha = $maxH * $dpt[2] / 100
    [void](Add-Box $s4 1 $gx ($base - $hb) 22 $hb @{ fill = $RED })
    [void](Add-Box $s4 1 ($gx + 25) ($base - $ha) 22 $ha @{ fill = $GREEN })
    [void](Add-Text $s4 ($gx - 4) ($base - $hb - 13) 30 12 ([string]$dpt[1]) @{ size = 8; bold = $true; color = $RED; align = 2; anchor = 3 })
    [void](Add-Text $s4 ($gx + 21) ($base - $ha - 13) 30 12 ([string]$dpt[2]) @{ size = 8; bold = $true; color = $GREEN; align = 2; anchor = 3 })
    [void](Add-Text $s4 ($gx - 10) ($base + 3) 70 12 $dpt[0] @{ size = 8; color = $INK; align = 2; anchor = 3 })
    $gx += 64
  }

  # --- Chart 2: speed (median analysis time vs prompt size) ---
  $lx0 = 380; $lw0 = 276
  [void](Add-Box $s4 5 $lx0 $cyTop $lw0 $ch @{ fill = 'FFFFFF'; line = 'D5DCE8'; lw = 1; r = 10 })
  [void](Add-Text $s4 392 ($cyTop + 6) 250 16 'Speed: analysis time vs prompt size' @{ size = 11.5; bold = $true; color = $NAVY; anchor = 3 })
  [void](Add-Text $s4 392 ($cyTop + 21) 250 12 'median of 9 runs, Basic mode, Enterprise profile' @{ size = 8; color = $MUTED; anchor = 3 })
  $pts = @(@('1k', 1.1), @('2.5k', 1.9), @('5k', 2.6), @('10k', 4.2), @('20k', 7.7), @('40k', 13.8))
  $px0 = 414; $px1 = 640; $pyb = $cyTop + 132; $pyt = $cyTop + 46; $ymax = 15
  [void](Add-Line $s4 $px0 $pyb $px1 $pyb @{ color = 'B8C2D3'; w = 0.75 })
  foreach ($gv in @(5, 10, 15)) {
    $gy = $pyb - ($pyb - $pyt) * $gv / $ymax
    [void](Add-Line $s4 $px0 $gy $px1 $gy @{ color = 'E5E9F0'; w = 0.5 })
    [void](Add-Text $s4 ($px0 - 26) ($gy - 6) 22 12 "$gv" @{ size = 7.5; color = $MUTED; align = 3; anchor = 3 })
  }
  [void](Add-Text $s4 ($px0 - 30) ($pyt - 16) 40 12 'ms' @{ size = 7.5; color = $MUTED; align = 3; anchor = 3 })
  $step = ($px1 - $px0 - 16) / ($pts.Count - 1)
  $xy = @()
  for ($k = 0; $k -lt $pts.Count; $k++) {
    $xx = $px0 + 8 + $k * $step
    $yy = $pyb - ($pyb - $pyt) * $pts[$k][1] / $ymax
    $xy += , @($xx, $yy)
  }
  # area under the line
  $ff = $s4.Shapes.BuildFreeform(1, $xy[0][0], $pyb)
  foreach ($p in $xy) { $ff.AddNodes(0, 1, $p[0], $p[1]) }
  $ff.AddNodes(0, 1, $xy[$xy.Count - 1][0], $pyb)
  $ff.AddNodes(0, 1, $xy[0][0], $pyb)
  $area = $ff.ConvertToShape()
  $area.Fill.Visible = -1; $area.Fill.Solid(); $area.Fill.ForeColor.RGB = (C 'CFE3F7'); $area.Fill.Transparency = [single]0.2
  $area.Line.Visible = 0; $area.Shadow.Visible = 0
  $lf = $s4.Shapes.BuildFreeform(1, $xy[0][0], $xy[0][1])
  for ($k = 1; $k -lt $xy.Count; $k++) { $lf.AddNodes(0, 1, $xy[$k][0], $xy[$k][1]) }
  $line = $lf.ConvertToShape()
  $line.Fill.Visible = 0; $line.Line.ForeColor.RGB = (C $MID); $line.Line.Weight = [single]2.25; $line.Shadow.Visible = 0
  for ($k = 0; $k -lt $xy.Count; $k++) {
    [void](Add-Box $s4 9 ($xy[$k][0] - 3.5) ($xy[$k][1] - 3.5) 7 7 @{ fill = 'FFFFFF'; line = $MID; lw = 1.5 })
    [void](Add-Text $s4 ($xy[$k][0] - 18) ($pyb + 3) 36 12 $pts[$k][0] @{ size = 7.5; color = $INK; align = 2; anchor = 3 })
  }
  [void](Add-Text $s4 ($px1 - 70) ($pyb + 13) 70 11 'characters' @{ size = 7.5; color = $MUTED; align = 3; anchor = 3 })
  [void](Add-Box $s4 5 ($xy[1][0] - 6) ($pyt - 2) 120 30 @{ fill = 'FFF4E5'; line = 'F5C98A'; lw = 0.75; r = 6; text = '<b>20,000 chars in under 8 ms</b>'; t_size = 9; t_color = '7A4300' })
  [void](Add-Line $s4 ($xy[1][0] + 114) ($pyt + 13) ($xy[4][0] - 4) ($xy[4][1] - 3) @{ color = 'E0A04A'; w = 1; arrow = $true })

  # --- Economic viability ---
  [void](Add-Box $s4 5 666 $cyTop 276 $ch @{ grad = @('E1D9F4', 'EFEAFA'); gangle = 90; r = 16 })
  [void](Add-Text $s4 666 ($cyTop + 6) 276 22 'Economic Viability' @{ size = 14; bold = $true; color = '000000'; align = 2; anchor = 3 })
  $eco = @(
    '<b>Zero infrastructure</b>: runs on the user''s own device',
    '<b>No per-token cost</b>: the on-device AI is free',
    '<b>Free</b> for individuals; <b>per-seat plan</b> for organizations (managed policy, audit log)',
    '<b>Free, open-source tooling</b>: TypeScript, esbuild, Vitest, Playwright',
    "DLP market: <b>USD 3.4 B (2025) $ARROW 13.8 B (2033)</b>"
  )
  [void](Add-Text $s4 680 ($cyTop + 32) 252 122 $eco @{ size = 10; color = $INK; bullet = $BUL; bcolor = $PURPLE; indent = 11; after = 4; within = 1.0 })

  # =====================================================================
  # SLIDE 5 - IMPACT AND BENEFITS
  # =====================================================================
  $s5 = $pres.Slides.Item(5)
  Set-Header $s5 'IMPACT AND BENEFITS' ([string][char]0x201C + 'USE AI FREELY. SHARE ONLY WHAT THE TASK NEEDS.' + [string][char]0x201D) $FOOTER

  [void](Add-Text $s5 18 94 300 24 'WHO BENEFITS' @{ size = 17; bold = $true; color = '000000'; anchor = 3 })
  $cards = @(
    @{ x = 18; y = 122; w = 222; h = 84; f = 'CFE2F8'; i = 'user'; ic = $NAVY; t = 'Individuals & Students'; d = 'Ask AI about health, money or studies without revealing who you are' },
    @{ x = 248; y = 122; w = 222; h = 84; f = 'D3EEDD'; i = 'hospital'; ic = '1E7A46'; t = 'Patients & Hospitals'; d = 'Clinical facts stay, patient identity goes (Healthcare profile)' },
    @{ x = 18; y = 214; w = 222; h = 84; f = 'FBDCC4'; i = 'landmark'; ic = 'B45309'; t = 'Banks & Fintech'; d = 'Cards, accounts and PAN masked; salaries and amounts rounded' },
    @{ x = 248; y = 214; w = 222; h = 84; f = 'E0D5F3'; i = 'square-terminal'; ic = '5B3F8C'; t = 'Developers & IT Teams'; d = 'API keys, passwords and tokens stripped before debugging with AI' },
    @{ x = 18; y = 306; w = 452; h = 74; f = 'FBEBB0'; i = 'building-2'; ic = '8A6D00'; t = 'Enterprises & Government'; d = 'Adopt AI safely instead of banning it: one policy, pushed to every browser, with a metadata-only audit log' }
  )
  foreach ($cd in $cards) {
    [void](Add-Box $s5 5 $cd.x $cd.y $cd.w $cd.h @{ fill = $cd.f; r = 16 })
    [void](Add-Icon $s5 $cd.i $cd.ic ($cd.x + $cd.w - 34) ($cd.y + 10) 22)
    [void](Add-Text $s5 ($cd.x + 14) ($cd.y + 10) ($cd.w - 52) 20 $cd.t @{ size = 12.5; bold = $true; color = '000000'; anchor = 3 })
    [void](Add-Text $s5 ($cd.x + 14) ($cd.y + 32) ($cd.w - 26) ($cd.h - 36) $cd.d @{ size = 10.5; color = $INK; within = 1.0 })
  }
  [void](Add-Line $s5 480 100 480 380 @{ color = '000000'; w = 1.75; dash = 4 })

  [void](Add-Text $s5 494 94 300 24 'BENEFITS' @{ size = 17; bold = $true; color = '000000'; anchor = 3 })
  $bens = @(
    @{ i = 'hand-heart'; c = 'E46A6A'; t = 'Social'; d = 'Privacy by default for every AI user, so more people can use AI with confidence' },
    @{ i = 'indian-rupee'; c = $GREEN; t = 'Economic'; d = "Cuts breach and DPDP penalty exposure (up to $($RUPEE)250 Cr) with zero server spend" },
    @{ i = 'scale'; c = $PURPLE; t = 'Compliance'; d = 'Data minimisation by design (DPDP Act 2023, GDPR); the audit log stores counts, never text' },
    @{ i = 'leaf'; c = '1BA37A'; t = 'Environmental'; d = 'No proxy servers or extra data-centre hops; runs on devices people already have' }
  )
  $byy = 122
  foreach ($bn in $bens) {
    [void](Add-Box $s5 5 494 $byy 58 58 @{ fill = $bn.c; r = 10 })
    [void](Add-Icon $s5 $bn.i 'FFFFFF' 507 ($byy + 13) 32)
    [void](Add-Text $s5 562 $byy 380 58 @("<b><s=12.5>$($bn.t)</s></b>", $bn.d) @{ size = 10.5; color = $INK; anchor = 3; after = 2; within = 1.0 })
    $byy += 66
  }

  # Future scope strip
  [void](Add-Box $s5 5 18 390 924 102 @{ grad = @('E9E2F8', 'DDEBFB'); gangle = 0; r = 14 })
  [void](Add-Text $s5 30 394 300 22 'FUTURE SCOPE' @{ size = 14; bold = $true; color = '000000'; anchor = 3 })
  $fut = @(
    @('refresh-cw', 'Restore real values in AI replies'),
    @('scan-text', 'PDF, DOCX and OCR for images'),
    @('languages', 'Hindi and other Indian languages'),
    @('brain-circuit', 'Local NER model for names'),
    @('route', 'Org gateway for desktop apps'),
    @('file-lock', 'Tamper-evident audit log')
  )
  $fx = 30
  foreach ($fu in $fut) {
    [void](Add-Box $s5 5 $fx 420 143 62 @{ fill = 'FFFFFF'; r = 10; shadow = $true })
    [void](Add-Icon $s5 $fu[0] $NAVY ($fx + 10) 438 24)
    [void](Add-Text $s5 ($fx + 40) 420 98 62 $fu[1] @{ size = 10; bold = $true; color = $NAVY; anchor = 3; within = 1.0 })
    $fx += 150
  }

  # =====================================================================
  # SLIDE 6 - RESEARCH AND REFERENCES
  # =====================================================================
  $s6 = $pres.Slides.Item(6)
  Set-Header $s6 'RESEARCH AND REFERENCES' '' $FOOTER

  $LIGHTLINK = '1D3FA0'; $DARKLINK = 'A9D4FF'
  function Quad($sl, $x, $y, $dark, $icon, $head, $items) {
    if ($dark) { $g = @('0B0B2B', '3B39C9'); $tc = 'FFFFFF'; $lc = $DARKLINK; $ic = 'FFFFFF' }
    else { $g = @('BDF2F6', 'A9C0F2'); $tc = '000000'; $lc = $LIGHTLINK; $ic = $NAVY }
    [void](Add-Box $sl 1 $x $y 459 196 @{ grad = $g; gangle = 0 })
    [void](Add-Icon $sl $icon $ic ($x + 14) ($y + 9) 22)
    [void](Add-Text $sl ($x + 42) ($y + 6) 405 28 $head @{ size = 17; bold = $true; color = $tc; anchor = 3 })
    $paras = @()
    foreach ($it in $items) {
      $p = $it[0]
      if ($it.Count -gt 1 -and $it[1] -ne '') {
        $p += [string][char]11 + "<a=$($it[1])><c=$lc><s=8.5>$($it[2])</s></c></a>"
      }
      $paras += $p
    }
    [void](Add-Text $sl ($x + 16) ($y + 38) 430 154 $paras @{ size = 10; color = $tc; bullet = $BUL; bcolor = $tc; indent = 10; after = 5; within = 1.0 })
  }

  Quad $s6 18 96 $false 'book-open' 'INDUSTRY RESEARCH' @(
    @("<b>LayerX (2025)</b>, Enterprise AI & SaaS Data Security Report: 77% of GenAI users paste data into prompts; 82% from personal accounts", 'https://go.layerxsecurity.com/the-layerx-enterprise-ai-saas-data-security-report-2025', 'go.layerxsecurity.com/the-layerx-enterprise-ai-saas-data-security-report-2025'),
    @("<b>Cyberhaven Labs (2026)</b>, AI Adoption & Risk Report: 39.7% of data shared with AI tools is sensitive", 'https://www.cyberhaven.com/press-releases/cyberhaven-2026-ai-adoption-risk-report', 'cyberhaven.com/press-releases/cyberhaven-2026-ai-adoption-risk-report'),
    @("<b>TechCrunch (2023)</b>: Samsung bans generative AI after staff leaked internal code to ChatGPT", 'https://techcrunch.com/2023/05/02/samsung-bans-use-of-generative-ai-tools-like-chatgpt-after-april-internal-data-leak/', "techcrunch.com/2023/05/02/samsung-bans-use-of-generative-ai-tools$ELL")
  )
  Quad $s6 483 96 $true 'scale' 'STANDARDS & REGULATIONS' @(
    @("<b>OWASP Top 10 for LLM Applications 2025</b> $NDASH LLM02: Sensitive Information Disclosure", 'https://genai.owasp.org/llm-top-10/', 'genai.owasp.org/llm-top-10'),
    @("<b>Digital Personal Data Protection Act 2023</b> and DPDP Rules 2025 (MeitY)", 'https://www.meity.gov.in/data-protection-framework', 'meity.gov.in/data-protection-framework'),
    @("<b>NIST SP 800-122</b> $NDASH Guide to Protecting the Confidentiality of PII", 'https://csrc.nist.gov/pubs/sp/800/122/final', 'csrc.nist.gov/pubs/sp/800/122/final'),
    @("<b>GDPR Art. 25</b> $NDASH data protection by design and by default", 'https://gdpr-info.eu/art-25-gdpr/', 'gdpr-info.eu/art-25-gdpr')
  )
  Quad $s6 18 296 $true 'chart-bar' 'MARKET RESEARCH' @(
    @("<b>Data loss prevention market</b>: USD 3.4 B (2025) $ARROW USD 13.8 B by 2033, 19.0% CAGR (Grand View Research)", 'https://www.grandviewresearch.com/industry-analysis/data-loss-prevention-market', 'grandviewresearch.com/industry-analysis/data-loss-prevention-market'),
    @("<b>82% of AI pastes</b> come from unmanaged accounts that network DLP cannot see $ARROW the control has to live on the device (LayerX 2025)"),
    @("<b>Gap</b>: current tools block AI or proxy prompts through the cloud; on-device, policy-driven sanitizing is what P2Shield adds"),
    @("<b>Demand drivers</b>: DPDP compliance deadline (May 2027), enterprise AI rollout, regulated sectors such as health and banking")
  )
  Quad $s6 483 296 $false 'file-text' 'TECHNICAL DOCUMENTATION' @(
    @("<b>Chrome Prompt API</b> (Gemini Nano, on-device) for extensions", 'https://developer.chrome.com/docs/extensions/ai/prompt-api', 'developer.chrome.com/docs/extensions/ai/prompt-api'),
    @("<b>chrome.storage.managed</b> $NDASH organization policy for extensions", 'https://developer.chrome.com/docs/extensions/reference/api/storage', 'developer.chrome.com/docs/extensions/reference/api/storage'),
    @("<b>Microsoft Presidio</b> $NDASH open-source PII detection and anonymization (reference design)", 'https://microsoft.github.io/presidio/', 'microsoft.github.io/presidio'),
    @("<b>Checksums</b>: Luhn (ISO/IEC 7812), Verhoeff (Aadhaar), IBAN mod-97 (ISO 13616)"),
    @("<b>P2Shield prototype</b> $NDASH source code, tests and demo page", 'https://github.com/Rohittiger99/Guardrail_hackathon', 'github.com/Rohittiger99/Guardrail_hackathon')
  )

  # ---------- save ----------
  $pres.SaveAs($OutPptx)
  $pdf = [System.IO.Path]::ChangeExtension($OutPptx, '.pdf')
  $pres.SaveAs($pdf, 32)
  Write-Output "Saved $OutPptx"
  Write-Output "Saved $pdf"
}
finally {
  if ($null -ne $pres) { try { $pres.Close() } catch { } }
  if (-not $wasRunning) { $app.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
