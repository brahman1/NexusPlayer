param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class NexusAlphaCleaner {
  public static void KeepLargestComponent(string inputPath, string outputPath, byte alphaThreshold) {
    Bitmap source = null;
    Bitmap bitmap = null;
    try {
      source = new Bitmap(inputPath);
      bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
      using (var graphics = Graphics.FromImage(bitmap)) graphics.DrawImageUnscaled(source, 0, 0);
      var rectangle = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
      var data = bitmap.LockBits(rectangle, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var bytes = new byte[Math.Abs(data.Stride) * data.Height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      var count = bitmap.Width * bitmap.Height;
      var mask = new bool[count];
      for (var y = 0; y < bitmap.Height; y++) for (var x = 0; x < bitmap.Width; x++) {
        var pixel = y * data.Stride + x * 4;
        mask[y * bitmap.Width + x] = bytes[pixel + 3] >= alphaThreshold;
      }
      var visited = new bool[count];
      var largest = new List<int>();
      var queue = new Queue<int>();
      for (var start = 0; start < count; start++) {
        if (!mask[start] || visited[start]) continue;
        var component = new List<int>();
        visited[start] = true;
        queue.Enqueue(start);
        while (queue.Count > 0) {
          var current = queue.Dequeue();
          component.Add(current);
          var x = current % bitmap.Width;
          var y = current / bitmap.Width;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            var nx = x + dx; var ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= bitmap.Width || ny >= bitmap.Height) continue;
            var next = ny * bitmap.Width + nx;
            if (mask[next] && !visited[next]) { visited[next] = true; queue.Enqueue(next); }
          }
        }
        if (component.Count > largest.Count) largest = component;
      }
      var keep = new bool[count];
      foreach (var pixel in largest) keep[pixel] = true;
      for (var y = 0; y < bitmap.Height; y++) for (var x = 0; x < bitmap.Width; x++) {
        if (keep[y * bitmap.Width + x]) continue;
        var pixel = y * data.Stride + x * 4;
        bytes[pixel] = bytes[pixel + 1] = bytes[pixel + 2] = bytes[pixel + 3] = 0;
      }
      Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
      bitmap.UnlockBits(data);
      bitmap.Save(outputPath, ImageFormat.Png);
    } finally {
      if (bitmap != null) bitmap.Dispose();
      if (source != null) source.Dispose();
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

$assets = Join-Path $ProjectRoot 'assets'
$brand = Join-Path $assets 'brand'
$markMasterPath = Join-Path $brand 'nexus-mark-master.png'
$markPath = Join-Path $brand 'nexus-mark-clean.png'
$iconPath = Join-Path $brand 'nexus-icon-master.png'

[NexusAlphaCleaner]::KeepLargestComponent($markMasterPath, $markPath, 8)

function New-Canvas([int]$width, [int]$height) {
  return [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function New-OpaqueCanvas([int]$width, [int]$height) {
  return [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
}

function Set-Quality([System.Drawing.Graphics]$graphics) {
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
}

function Save-Png([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Export-Image([string]$sourcePath, [string]$destination, [int]$width, [int]$height) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $canvas = New-Canvas $width $height
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  Set-Quality $graphics
  $graphics.DrawImage($source, 0, 0, $width, $height)
  $graphics.Dispose()
  $source.Dispose()
  Save-Png $canvas $destination
}

function Export-OpaqueImage([string]$sourcePath, [string]$destination, [int]$width, [int]$height) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $canvas = New-OpaqueCanvas $width $height
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  Set-Quality $graphics
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#070A0F'))
  $graphics.DrawImage($source, 0, 0, $width, $height)
  $graphics.Dispose()
  $source.Dispose()
  Save-Png $canvas $destination
}

function Export-Monochrome([string]$sourcePath, [string]$destination, [int]$size) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $canvas = New-Canvas $size $size
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  Set-Quality $graphics
  $matrix = [System.Drawing.Imaging.ColorMatrix]::new(@(
    [single[]]@(0, 0, 0, 0, 0),
    [single[]]@(0, 0, 0, 0, 0),
    [single[]]@(0, 0, 0, 0, 0),
    [single[]]@(0, 0, 0, 1, 0),
    [single[]]@(1, 1, 1, 0, 1)
  ))
  $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
  $attributes.SetColorMatrix($matrix)
  $destinationRectangle = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
  $graphics.DrawImage($source, $destinationRectangle, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $attributes.Dispose()
  $graphics.Dispose()
  $source.Dispose()
  Save-Png $canvas $destination
}

function Export-TVAsset([string]$destination, [int]$width, [int]$height, [bool]$wordmark) {
  $mark = [System.Drawing.Image]::FromFile($markPath)
  $canvas = New-OpaqueCanvas $width $height
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  Set-Quality $graphics
  $rectangle = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rectangle, [System.Drawing.ColorTranslator]::FromHtml('#070A0F'), [System.Drawing.ColorTranslator]::FromHtml('#171137'), 12)
  $graphics.FillRectangle($background, $rectangle)
  $background.Dispose()

  if ($wordmark) {
    $markSize = [int]($height * 0.5)
    $fontSize = [single]($height * 0.18)
    $font = [System.Drawing.Font]::new('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textSize = $graphics.MeasureString('NexusPlayer', $font)
    $gap = [single]($width * 0.035)
    $totalWidth = [single]($markSize + $gap + $textSize.Width)
    $maxWidth = [single]($width * 0.84)
    if ($totalWidth -gt $maxWidth) {
      $scale = $maxWidth / $totalWidth
      $markSize = [int]($markSize * $scale)
      $font.Dispose()
      $fontSize = [single]($fontSize * $scale)
      $font = [System.Drawing.Font]::new('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      $textSize = $graphics.MeasureString('NexusPlayer', $font)
      $gap = [single]($gap * $scale)
      $totalWidth = [single]($markSize + $gap + $textSize.Width)
    }
    $markX = [int](($width - $totalWidth) / 2)
    $markY = [int](($height - $markSize) / 2)
    $graphics.DrawImage($mark, $markX, $markY, $markSize, $markSize)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#F7F9FC'))
    $graphics.DrawString('NexusPlayer', $font, $brush, [single]($markX + $markSize + $gap), [single](($height - $font.GetHeight($graphics)) / 2))
    $brush.Dispose()
    $font.Dispose()
  } else {
    $markSize = [int]($height * 0.68)
    $graphics.DrawImage($mark, [int](($width - $markSize) / 2), [int](($height - $markSize) / 2), $markSize, $markSize)
  }

  $graphics.Dispose()
  $mark.Dispose()
  Save-Png $canvas $destination
}

New-Item -ItemType Directory -Force -Path (Join-Path $brand 'tvos') | Out-Null

Export-OpaqueImage $iconPath (Join-Path $assets 'icon.png') 1024 1024
Export-OpaqueImage $iconPath (Join-Path $assets 'favicon.png') 256 256
Export-Image $markPath (Join-Path $assets 'splash-icon.png') 1024 1024
Export-Image $markPath (Join-Path $assets 'android-icon-foreground.png') 1024 1024
Export-Monochrome $markPath (Join-Path $assets 'android-icon-monochrome.png') 1024
Export-TVAsset (Join-Path $assets 'android-icon-background.png') 1024 1024 $false
Export-TVAsset (Join-Path $brand 'android-tv-icon.png') 512 512 $false
Export-TVAsset (Join-Path $brand 'android-tv-banner.png') 320 180 $true

Export-TVAsset (Join-Path $brand 'tvos/icon-1280x768.png') 1280 768 $false
Export-TVAsset (Join-Path $brand 'tvos/icon-400x240.png') 400 240 $false
Export-TVAsset (Join-Path $brand 'tvos/icon-800x480.png') 800 480 $false
Export-TVAsset (Join-Path $brand 'tvos/top-shelf-1920x720.png') 1920 720 $true
Export-TVAsset (Join-Path $brand 'tvos/top-shelf-3840x1440.png') 3840 1440 $true
Export-TVAsset (Join-Path $brand 'tvos/top-shelf-wide-2320x720.png') 2320 720 $true
Export-TVAsset (Join-Path $brand 'tvos/top-shelf-wide-4640x1440.png') 4640 1440 $true

Write-Output 'NexusPlayer brand assets generated.'
