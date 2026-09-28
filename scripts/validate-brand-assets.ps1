param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$expected = @{
  'assets/icon.png' = @(1024, 1024, $false)
  'assets/splash-icon.png' = @(1024, 1024, $true)
  'assets/android-icon-foreground.png' = @(1024, 1024, $true)
  'assets/android-icon-monochrome.png' = @(1024, 1024, $true)
  'assets/brand/android-tv-icon.png' = @(512, 512, $false)
  'assets/brand/android-tv-banner.png' = @(320, 180, $false)
  'assets/brand/tvos/icon-1280x768.png' = @(1280, 768, $false)
  'assets/brand/tvos/icon-400x240.png' = @(400, 240, $false)
  'assets/brand/tvos/icon-800x480.png' = @(800, 480, $false)
  'assets/brand/tvos/top-shelf-1920x720.png' = @(1920, 720, $false)
  'assets/brand/tvos/top-shelf-3840x1440.png' = @(3840, 1440, $false)
  'assets/brand/tvos/top-shelf-wide-2320x720.png' = @(2320, 720, $false)
  'assets/brand/tvos/top-shelf-wide-4640x1440.png' = @(4640, 1440, $false)
}

foreach ($relativePath in $expected.Keys) {
  $path = Join-Path $ProjectRoot $relativePath
  if (-not (Test-Path -LiteralPath $path)) { throw "Asset manquant : $relativePath" }
  $image = [System.Drawing.Image]::FromFile($path)
  try {
    $rule = $expected[$relativePath]
    if ($image.Width -ne $rule[0] -or $image.Height -ne $rule[1]) {
      throw "Dimensions invalides pour ${relativePath}: $($image.Width)x$($image.Height)"
    }
    $hasAlpha = [System.Drawing.Image]::IsAlphaPixelFormat($image.PixelFormat)
    if ($hasAlpha -ne $rule[2]) { throw "Canal alpha inattendu pour $relativePath" }
  } finally {
    $image.Dispose()
  }
}

Write-Output "Brand assets OK: $($expected.Count) fichiers vérifiés."
