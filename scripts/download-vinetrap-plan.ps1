param(
  [string]$PlanPath = ".vinetrap-download-plan.json"
)

$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path -LiteralPath ".").Path
$plan = Get-Content -Raw -LiteralPath $PlanPath | ConvertFrom-Json
$items = @($plan.items)

if ($items.Count -eq 0) {
  throw "The download plan contains no items."
}

$completed = 0
$skipped = 0

foreach ($item in $items) {
  $destination = [IO.Path]::GetFullPath([string]$item.destination)
  if (-not $destination.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar)) {
    throw "Destination is outside the workspace."
  }

  $expectedBytes = [int64]$item.expectedBytes
  if (Test-Path -LiteralPath $destination) {
    $existingBytes = (Get-Item -LiteralPath $destination).Length
    if ($existingBytes -eq $expectedBytes) {
      $skipped += 1
      continue
    }
    throw "Existing file has the wrong size: $destination"
  }

  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
  $temporaryPath = "$destination.part"
  $temporaryBytes = if (Test-Path -LiteralPath $temporaryPath) {
    (Get-Item -LiteralPath $temporaryPath).Length
  } else {
    0
  }
  if ($temporaryBytes -ne $expectedBytes) {
    curl.exe --silent --show-error --fail --location --retry 2 --retry-delay 1 --output $temporaryPath ([string]$item.url)
    if ($LASTEXITCODE -ne 0) {
      throw "Download failed with curl exit code $LASTEXITCODE."
    }
  }

  $actualBytes = (Get-Item -LiteralPath $temporaryPath).Length
  if ($actualBytes -ne $expectedBytes) {
    throw "Downloaded file size mismatch: expected=$expectedBytes actual=$actualBytes"
  }

  Move-Item -LiteralPath $temporaryPath -Destination $destination
  $completed += 1
  Write-Output ("DOWNLOADED {0}/{1} {2} bytes" -f ($completed + $skipped), $items.Count, $actualBytes)
}

Write-Output ("PLAN_COMPLETE downloaded={0} skipped={1} total={2}" -f $completed, $skipped, $items.Count)
