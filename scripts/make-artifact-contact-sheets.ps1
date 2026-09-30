param(
  [string]$AuditPath = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ([string]::IsNullOrWhiteSpace($AuditPath)) {
  $AuditPath = Join-Path $projectRoot 'docs\audits\artifact-asset-audit.json'
}
$audit = Get-Content -LiteralPath $AuditPath -Raw -Encoding UTF8 | ConvertFrom-Json
$outputDir = Join-Path $projectRoot 'docs\audits\contact-sheets'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$rowById = @{}
foreach ($row in $audit.rows) { $rowById[$row.artifactId] = $row }

function Resolve-ItemImagePath {
  param($Item, [bool]$IsCandidate, [string]$ImageField)
  if ($IsCandidate) {
    return Join-Path $projectRoot ($Item.path -replace '/', '\')
  }
  return Join-Path $projectRoot ('public' + ($Item.$ImageField -replace '/', '\'))
}

function New-ContactSheet {
  param(
    [string]$Name,
    [array]$Items,
    [bool]$IsCandidate = $false,
    [string]$ImageField = 'imageSrc',
    [int]$Columns = 8
  )

  if ($Items.Count -eq 0) { return }
  $cellWidth = 190
  $cellHeight = 235
  $padding = 10
  $imageHeight = 180
  $rows = [Math]::Ceiling($Items.Count / $Columns)
  $bitmap = [System.Drawing.Bitmap]::new($Columns * $cellWidth, $rows * $cellHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(18, 16, 11))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $labelFont = [System.Drawing.Font]::new('Microsoft YaHei UI', 8)
  $idFont = [System.Drawing.Font]::new('Consolas', 8, [System.Drawing.FontStyle]::Bold)
  $labelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 239, 230, 207))
  $idBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 212, 58, 40))
  $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 239, 230, 207), 1)

  try {
    for ($index = 0; $index -lt $Items.Count; $index++) {
      $item = $Items[$index]
      $column = $index % $Columns
      $rowIndex = [Math]::Floor($index / $Columns)
      $x = $column * $cellWidth
      $y = $rowIndex * $cellHeight
      $graphics.DrawRectangle($borderPen, $x, $y, $cellWidth - 1, $cellHeight - 1)

      $imagePath = Resolve-ItemImagePath -Item $item -IsCandidate $IsCandidate -ImageField $ImageField
      if (Test-Path -LiteralPath $imagePath) {
        $image = [System.Drawing.Image]::FromFile($imagePath)
        try {
          $maxWidth = $cellWidth - ($padding * 2)
          $maxHeight = $imageHeight - ($padding * 2)
          $scale = [Math]::Min($maxWidth / $image.Width, $maxHeight / $image.Height)
          $drawWidth = [Math]::Max(1, [int]($image.Width * $scale))
          $drawHeight = [Math]::Max(1, [int]($image.Height * $scale))
          $drawX = $x + [int](($cellWidth - $drawWidth) / 2)
          $drawY = $y + $padding + [int](($maxHeight - $drawHeight) / 2)
          $graphics.DrawImage($image, $drawX, $drawY, $drawWidth, $drawHeight)
        } finally {
          $image.Dispose()
        }
      }

      if ($IsCandidate) {
        $id = $item.filename
        $nameLabel = $rowById[$item.artifactId].artifactName
      } else {
        $id = $item.artifactId
        $nameLabel = $item.artifactName
      }
      $graphics.DrawString($id, $idFont, $idBrush, $x + $padding, $y + $imageHeight + 2)
      $graphics.DrawString($nameLabel, $labelFont, $labelBrush, [System.Drawing.RectangleF]::new($x + $padding, $y + $imageHeight + 20, $cellWidth - ($padding * 2), 32))
    }

    $outputPath = Join-Path $outputDir "$Name.jpg"
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new($encoder, [long]90)
    try {
      $bitmap.Save($outputPath, $codec, $parameters)
    } finally {
      $parameters.Dispose()
    }
    [pscustomobject]@{ Name = $Name; Items = $Items.Count; Path = $outputPath }
  } finally {
    $borderPen.Dispose()
    $labelBrush.Dispose()
    $idBrush.Dispose()
    $labelFont.Dispose()
    $idFont.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$outputs = @()
$outputs += New-ContactSheet -Name 'p1-v2-cards' -Items @($audit.rows | Where-Object { $_.imageSrc -like '/artifacts-v2/p1/*' } | Sort-Object artifactId) -Columns 5
$outputs += New-ContactSheet -Name 'p2-source-v2-cards' -Items @($audit.rows | Where-Object { $_.imageSrc -like '/artifacts-v2/p2-source/*' } | Sort-Object artifactId) -Columns 6
$outputs += New-ContactSheet -Name 'production-ai' -Items @($audit.rows | Where-Object aiFlag -eq $true) -Columns 10
$outputs += New-ContactSheet -Name 'production-source' -Items @($audit.rows | Where-Object aiFlag -eq $false) -Columns 8
$outputs += New-ContactSheet -Name 'source-details' -Items @($audit.rows | Where-Object detailKind -eq 'source' | Sort-Object artifactId) -ImageField 'detailSrc' -Columns 5
$outputs += New-ContactSheet -Name 'scroll-details' -Items @($audit.rows | Where-Object shape -eq 'scroll' | Sort-Object artifactId) -ImageField 'detailSrc' -Columns 5
$outputs += New-ContactSheet -Name 'priority-p1' -Items @($audit.rows | Where-Object priority -eq 'P1') -Columns 5
$outputs += New-ContactSheet -Name 'ai-candidates' -Items @($audit.candidates) -IsCandidate $true -Columns 4
$allCards = @($audit.rows | Sort-Object artifactId)
for ($offset = 0; $offset -lt $allCards.Count; $offset += 40) {
  $last = [Math]::Min($offset + 39, $allCards.Count - 1)
  $page = [int]($offset / 40) + 1
  $outputs += New-ContactSheet -Name ('production-cards-{0:D2}' -f $page) -Items @($allCards[$offset..$last]) -Columns 5
}
$outputs | Format-Table -AutoSize
