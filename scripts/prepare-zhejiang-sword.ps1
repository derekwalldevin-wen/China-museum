$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$originalPath = Join-Path $sourceRoot 'assets\source-originals\zj-yzj-original.jpg'
$expectedSha1 = '66fa9c9b291a476e615e88d72eb90fddec3c475a'
if ((Get-FileHash -LiteralPath $originalPath -Algorithm SHA1).Hash.ToLowerInvariant() -ne $expectedSha1) { throw 'Original does not match the reviewed source checksum' }
$outputDir = Join-Path $sourceRoot 'public\artifact-sources\verified'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$originalImage = [System.Drawing.Image]::FromFile($originalPath)
try {
  if ($originalImage.Width -ne 5184 -or $originalImage.Height -ne 3456) { throw 'Unexpected original dimensions' }
  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  foreach ($variant in @(@{ Role='card'; Width=900 }, @{ Role='detail'; Width=2400 })) {
    $height = [int]($variant.Width * $originalImage.Height / $originalImage.Width)
    $bitmap = New-Object System.Drawing.Bitmap($variant.Width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($originalImage, 0, 0, $variant.Width, $height)
      $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
      $outputPath = Join-Path $outputDir ('zj-yzj-' + $variant.Role + '-cc0.jpg')
      $bitmap.Save($outputPath, $jpegCodec, $parameters)
      Write-Output ($variant.Role + ': ' + $variant.Width + 'x' + $height + ' ' + (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant())
    } finally { $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
  }
} finally { $originalImage.Dispose() }
